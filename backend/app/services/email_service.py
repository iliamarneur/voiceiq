"""Email service — transactional emails for ClearRecap.

Supports two modes:
- SMTP mode: sends real emails via configured SMTP server
- Console mode (default): logs emails to console (dev/test)

Templates: welcome, quota_warning, quota_critical, account_deleted
"""
import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "ClearRecap <noreply@clearrecap.fr>")
EMAIL_ENABLED = bool(SMTP_HOST and SMTP_USER)

APP_NAME = "ClearRecap"
APP_URL = os.environ.get("APP_BASE_URL", "http://localhost:5173")


@dataclass
class EmailMessage:
    to: str
    subject: str
    html: str
    text: str = ""


# ── Templates ─────────────────────────────────────────────
def _wrap_html(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f8fafc; }}
.container {{ max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
.logo {{ color: #6366f1; font-size: 22px; font-weight: 700; margin-bottom: 24px; }}
h1 {{ font-size: 20px; color: #1e293b; margin: 0 0 16px; }}
p {{ color: #475569; line-height: 1.6; margin: 0 0 12px; }}
.btn {{ display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }}
.footer {{ text-align: center; color: #94a3b8; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }}
</style></head><body>
<div class="container">
<div class="logo">{APP_NAME}</div>
{body}
<div class="footer">{APP_NAME} — Vos données restent 100% locales.</div>
</div></body></html>"""


def template_welcome(name: str, email: str) -> EmailMessage:
    body = f"""<h1>Bienvenue sur {APP_NAME}, {name} !</h1>
<p>Votre compte a été créé avec succès.</p>
<p>Choisissez un abonnement pour accéder à toutes les fonctionnalités, ou utilisez le mode one-shot dès 3 € par fichier.</p>
<p><a class="btn" href="{APP_URL}/app/plans">Choisir mon abonnement</a></p>
<p>Besoin d'un essai rapide ? Le <a href="{APP_URL}/">mode one-shot</a> est toujours disponible sans abonnement.</p>"""
    return EmailMessage(
        to=email,
        subject=f"Bienvenue sur {APP_NAME} !",
        html=_wrap_html("Bienvenue", body),
        text=f"Bienvenue sur {APP_NAME}, {name} ! Choisissez votre abonnement : {APP_URL}/app/plans ou essayez le one-shot dès 3 € : {APP_URL}/",
    )


def template_quota_warning(name: str, email: str, percent: int, minutes_remaining: int, plan_name: str) -> EmailMessage:
    body = f"""<h1>Votre quota approche de la limite</h1>
<p>Bonjour {name},</p>
<p>Vous avez utilisé <strong>{percent}%</strong> de vos minutes sur le plan <strong>{plan_name}</strong>.</p>
<p>Il vous reste <strong>{minutes_remaining} minutes</strong> ce mois-ci.</p>
<p>Pour continuer à transcrire sans interruption :</p>
<p><a class="btn" href="{APP_URL}/app/plans">Voir les options</a></p>
<p>Vous pouvez passer au plan supérieur à tout moment.</p>"""
    return EmailMessage(
        to=email,
        subject=f"{APP_NAME} — {percent}% de votre quota utilisé",
        html=_wrap_html("Alerte quota", body),
        text=f"Bonjour {name}, vous avez utilisé {percent}% de vos minutes ({minutes_remaining} restantes) sur {plan_name}. Options : {APP_URL}/app/plans",
    )


def template_quota_critical(name: str, email: str, minutes_remaining: int, plan_name: str) -> EmailMessage:
    body = f"""<h1>Quota presque épuisé</h1>
<p>Bonjour {name},</p>
<p>Il ne vous reste que <strong>{minutes_remaining} minutes</strong> sur votre plan <strong>{plan_name}</strong>.</p>
<p>Une fois le quota atteint, les nouvelles transcriptions seront bloquées.</p>
<p><a class="btn" href="{APP_URL}/app/plans">Recharger maintenant</a></p>"""
    return EmailMessage(
        to=email,
        subject=f"{APP_NAME} — Quota presque épuisé",
        html=_wrap_html("Quota critique", body),
        text=f"Bonjour {name}, il ne reste que {minutes_remaining} minutes sur {plan_name}. Rechargez : {APP_URL}/app/plans",
    )


def template_account_deleted(name: str, email: str) -> EmailMessage:
    body = f"""<h1>Compte supprimé</h1>
<p>Bonjour {name},</p>
<p>Votre compte {APP_NAME} et toutes les données associées ont été supprimés conformément à votre demande (RGPD Art. 17).</p>
<p>Données supprimées :</p>
<ul>
<li>Transcriptions et analyses</li>
<li>Fichiers audio</li>
<li>Historique de facturation</li>
<li>Préférences et dictionnaires</li>
</ul>
<p>Cette action est irréversible. Si vous souhaitez utiliser {APP_NAME} à nouveau, vous pouvez créer un nouveau compte.</p>"""
    return EmailMessage(
        to=email,
        subject=f"{APP_NAME} — Compte supprimé",
        html=_wrap_html("Compte supprimé", body),
        text=f"Bonjour {name}, votre compte {APP_NAME} a été supprimé avec toutes les données (RGPD Art. 17).",
    )


# ── Send ──────────────────────────────────────────────────
def send_email(msg: EmailMessage) -> bool:
    """Send an email. Returns True on success."""
    if not EMAIL_ENABLED:
        # Console mode — log the email
        logger.info(f"[EMAIL STUB] To: {msg.to} | Subject: {msg.subject}")
        logger.debug(f"[EMAIL STUB] Body: {msg.text}")
        return True

    try:
        mime = MIMEMultipart("alternative")
        mime["From"] = SMTP_FROM
        mime["To"] = msg.to
        mime["Subject"] = msg.subject
        mime.attach(MIMEText(msg.text, "plain", "utf-8"))
        mime.attach(MIMEText(msg.html, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(mime)

        logger.info(f"Email sent to {msg.to}: {msg.subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {msg.to}: {e}")
        return False


# ── Convenience hooks ─────────────────────────────────────
def send_welcome(name: str, email: str) -> bool:
    return send_email(template_welcome(name, email))


def send_quota_warning(name: str, email: str, percent: int, minutes_remaining: int, plan_name: str) -> bool:
    return send_email(template_quota_warning(name, email, percent, minutes_remaining, plan_name))


def send_quota_critical(name: str, email: str, minutes_remaining: int, plan_name: str) -> bool:
    return send_email(template_quota_critical(name, email, minutes_remaining, plan_name))


def send_account_deleted(name: str, email: str) -> bool:
    return send_email(template_account_deleted(name, email))


def template_password_reset(email: str, reset_link: str) -> EmailMessage:
    body = f"""<h1>Réinitialisation de votre mot de passe</h1>
<p>Bonjour,</p>
<p>Vous avez demandé la réinitialisation de votre mot de passe {APP_NAME}.</p>
<p>Cliquez sur le lien pour réinitialiser votre mot de passe :</p>
<p><a class="btn" href="{reset_link}">Réinitialiser mon mot de passe</a></p>
<p>Ce lien est valable 30 minutes. Si vous n'avez pas fait cette demande, ignorez cet email.</p>"""
    return EmailMessage(
        to=email,
        subject=f"{APP_NAME} — Réinitialisation de mot de passe",
        html=_wrap_html("Réinitialisation", body),
        text=f"Réinitialisez votre mot de passe {APP_NAME} : {reset_link} (valable 30 min)",
    )


def send_password_reset(to_email: str, reset_link: str) -> bool:
    return send_email(template_password_reset(to_email, reset_link))
