#!/usr/bin/env python3
"""
ClearRecap Auto-Publisher
Vérifie toutes les 30 min si des articles en draft ont atteint leur publishDate.
Passe automatiquement de status: draft → status: published.
Logs dans scripts/publish_log.jsonl
"""

import os
import re
import json
import yaml
from datetime import datetime, timezone
from pathlib import Path

BLOG_DIR = Path(__file__).parent.parent / "content" / "blog"
LOG_FILE = Path(__file__).parent / "publish_log.jsonl"

def get_frontmatter(filepath):
    """Extrait le frontmatter YAML d'un fichier .md"""
    text = filepath.read_text(encoding="utf-8")
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', text, re.DOTALL)
    if not match:
        return None, text
    fm = yaml.safe_load(match.group(1))
    return fm, text

def update_status(filepath, text, old_status="draft", new_status="published"):
    """Remplace le status dans le frontmatter"""
    updated = text.replace(f'status: "{old_status}"', f'status: "{new_status}"', 1)
    if updated == text:
        updated = text.replace(f"status: {old_status}", f"status: {new_status}", 1)
    filepath.write_text(updated, encoding="utf-8")

def log_event(event):
    """Append un événement dans le fichier de log JSONL"""
    event["logged_at"] = datetime.now(timezone.utc).isoformat()
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")

def send_publish_notification(title, slug, category, publish_date):
    """Envoie un email à l'admin quand un article est publié"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    config_path = Path(__file__).parent / "publish_config.json"
    with open(config_path, "r") as f:
        config = json.load(f)

    email_cfg = config.get("email", {})
    if not email_cfg.get("enabled", False):
        return

    article_url = f"https://clearrecap.com/blog/{slug}"

    subject = email_cfg["subject_template"].format(title=title)

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a87); padding: 20px; border-radius: 12px 12px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 20px;">Nouvel article publie</h1>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="margin-top: 0; color: #1e3a5f;">{title}</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 120px;">Categorie</td>
                    <td style="padding: 8px 0; font-weight: 600;">{category}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Date prevue</td>
                    <td style="padding: 8px 0;">{publish_date}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Publie le</td>
                    <td style="padding: 8px 0;">{datetime.now(timezone.utc).strftime('%d/%m/%Y a %H:%M UTC')}</td>
                </tr>
            </table>
            <a href="{article_url}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
                Voir l'article
            </a>
            <p style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 13px;">
                ClearRecap Auto-Publisher — Publication automatique #{slug}
            </p>
        </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = email_cfg["from_address"]
    msg["To"] = email_cfg["admin_email"]
    msg.attach(MIMEText(f"Nouvel article publie : {title}\nLien : {article_url}", "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        smtp_password = os.environ.get(email_cfg["smtp_password_env"], "")
        use_ssl = email_cfg.get("smtp_ssl", False)
        if use_ssl:
            with smtplib.SMTP_SSL(email_cfg["smtp_host"], email_cfg["smtp_port"]) as server:
                server.login(email_cfg["smtp_user"], smtp_password)
                server.sendmail(email_cfg["smtp_user"], email_cfg["admin_email"], msg.as_string())
        else:
            with smtplib.SMTP(email_cfg["smtp_host"], email_cfg["smtp_port"]) as server:
                server.starttls()
                server.login(email_cfg["smtp_user"], smtp_password)
                server.sendmail(email_cfg["smtp_user"], email_cfg["admin_email"], msg.as_string())
        print(f"Email envoye a {email_cfg['admin_email']}")
    except Exception as e:
        print(f"Erreur envoi email : {e}")

def run():
    now = datetime.now(timezone.utc)
    published_count = 0

    for md_file in BLOG_DIR.rglob("*.md"):
        fm, text = get_frontmatter(md_file)
        if fm is None:
            continue

        status = fm.get("status", "published")
        if status != "draft":
            continue

        publish_date_str = fm.get("publishDate")
        if not publish_date_str:
            continue

        # Parse la date de publication
        try:
            if isinstance(publish_date_str, datetime):
                publish_date = publish_date_str
            else:
                publish_date = datetime.fromisoformat(publish_date_str.replace("Z", "+00:00"))

            # Si pas de timezone, considerer UTC
            if publish_date.tzinfo is None:
                publish_date = publish_date.replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError):
            continue

        # Verifier si c'est l'heure de publier
        if now >= publish_date:
            update_status(md_file, text)
            published_count += 1

            event = {
                "action": "publish",
                "file": str(md_file.relative_to(BLOG_DIR)),
                "title": fm.get("title", ""),
                "slug": fm.get("slug", ""),
                "scheduled_for": publish_date_str,
                "published_at": now.isoformat()
            }
            log_event(event)
            print(f"Publie : {fm.get('title', md_file.name)}")

            # Notification email a l'admin
            send_publish_notification(
                title=fm.get("title", ""),
                slug=fm.get("slug", ""),
                category=fm.get("category", ""),
                publish_date=publish_date_str
            )

    if published_count == 0:
        print(f"Aucun article a publier pour le moment ({now.strftime('%Y-%m-%d %H:%M UTC')})")
    else:
        print(f"\n{published_count} article(s) publie(s)")

if __name__ == "__main__":
    run()
