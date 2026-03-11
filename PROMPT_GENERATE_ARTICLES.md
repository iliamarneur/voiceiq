Tu as le fichier `CLAUDE_CONTENT_ENGINE.md` dans ce projet. Il contient toutes les règles de rédaction, les 30 articles à produire avec leurs frontmatters, et les contraintes anti-détection IA.

## Ta mission

Exécute les étapes suivantes dans l'ordre. Chaque étape doit être complétée avant de passer à la suivante. Fais un commit git après chaque groupe de 5 articles.

---

### ÉTAPE 1 — Structure des dossiers

Crée l'arborescence suivante si elle n'existe pas :

```
content/
  blog/
    souverainete/
    medical/
    juridique/
    business/
    education/
    technique/
    comparatif/
    grand-public/
scripts/
  auto_publish.py
  publish_config.json
```

---

### ÉTAPE 2 — Script de publication automatique

Crée `scripts/auto_publish.py` :

```python
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
            <h1 style="margin: 0; font-size: 20px;">📰 Nouvel article publié</h1>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="margin-top: 0; color: #1e3a5f;">{title}</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 120px;">Catégorie</td>
                    <td style="padding: 8px 0; font-weight: 600;">{category}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Date prévue</td>
                    <td style="padding: 8px 0;">{publish_date}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Publié le</td>
                    <td style="padding: 8px 0;">{datetime.now(timezone.utc).strftime('%d/%m/%Y à %H:%M UTC')}</td>
                </tr>
            </table>
            <a href="{article_url}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
                Voir l'article →
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
    msg.attach(MIMEText(f"Nouvel article publié : {title}\nLien : {article_url}", "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        smtp_password = os.environ.get(email_cfg["smtp_password_env"], "")
        with smtplib.SMTP(email_cfg["smtp_host"], email_cfg["smtp_port"]) as server:
            server.starttls()
            server.login(email_cfg["smtp_user"], smtp_password)
            server.sendmail(email_cfg["from_address"], email_cfg["admin_email"], msg.as_string())
        print(f"📧 Email envoyé à {email_cfg['admin_email']}")
    except Exception as e:
        print(f"⚠️  Erreur envoi email : {e}")

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

            # Si pas de timezone, considérer UTC
            if publish_date.tzinfo is None:
                publish_date = publish_date.replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError):
            continue

        # Vérifier si c'est l'heure de publier
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
            print(f"✅ Publié : {fm.get('title', md_file.name)}")

            # Notification email à l'admin
            send_publish_notification(
                title=fm.get("title", ""),
                slug=fm.get("slug", ""),
                category=fm.get("category", ""),
                publish_date=publish_date_str
            )

    if published_count == 0:
        print(f"ℹ️  Aucun article à publier pour le moment ({now.strftime('%Y-%m-%d %H:%M UTC')})")
    else:
        print(f"\n📰 {published_count} article(s) publié(s)")

if __name__ == "__main__":
    run()
```

Crée `scripts/publish_config.json` :

```json
{
  "check_interval_minutes": 30,
  "blog_directory": "content/blog",
  "log_file": "scripts/publish_log.jsonl",
  "timezone": "UTC",
  "notify_on_publish": true,
  "crontab_example": "*/30 * * * * cd /app && python scripts/auto_publish.py >> /var/log/clearrecap-publisher.log 2>&1",
  "email": {
    "enabled": true,
    "smtp_host": "smtp.example.com",
    "smtp_port": 587,
    "smtp_user": "noreply@clearrecap.com",
    "smtp_password_env": "SMTP_PASSWORD",
    "from_address": "ClearRecap Blog <noreply@clearrecap.com>",
    "admin_email": "ilia@clearrecap.com",
    "subject_template": "📰 Nouvel article publié : {title}"
  }
}
```

---

### ÉTAPE 3 — Intégration dans le backend FastAPI

Crée ou modifie le endpoint blog dans le backend pour :

1. **Lister les articles publiés** : `GET /api/blog/articles`
   - Ne retourne que les articles avec `status: "published"`
   - Retourne : title, slug, description, category, tags, author, publishDate, readingTime
   - Tri par publishDate décroissant (plus récent en premier)

2. **Récupérer un article** : `GET /api/blog/articles/{slug}`
   - Retourne le contenu Markdown complet + frontmatter
   - 404 si draft ou inexistant

3. **Endpoint admin : statut de publication** : `GET /api/admin/blog/schedule`
   - Liste tous les articles (draft + published) avec leur statut et date prévue
   - Requiert le rôle admin

---

### ÉTAPE 4 — Composant frontend Blog

Crée les composants React pour le blog :

1. **`BlogList.tsx`** — Page `/blog`
   - Liste des articles publiés en grille responsive
   - Filtrage par catégorie (tabs : Tous, Souveraineté, Médical, Juridique, Business, Éducation, Technique, Comparatif, Grand Public)
   - Carte d'article : titre, description, catégorie (badge couleur), date, temps de lecture
   - Pagination ou infinite scroll
   - SEO : balise `<title>`, meta description, schema BlogPosting

2. **`BlogArticle.tsx`** — Page `/blog/{slug}`
   - Rendu Markdown → HTML (utiliser react-markdown ou similar)
   - Table des matières auto-générée (H2/H3)
   - Temps de lecture estimé
   - Navigation vers article précédent/suivant
   - CTA en bas d'article (contextuel selon la catégorie)
   - Schema Article JSON-LD (depuis le frontmatter)
   - Partage social (LinkedIn, Twitter, copier le lien)

3. **`BlogScheduleAdmin.tsx`** — Page `/admin/blog-schedule`
   - Tableau des 30 articles avec colonnes : #, Titre, Catégorie, Statut (draft/published), Date prévue, Date effective
   - Barre de progression : X/30 articles publiés
   - Prochain article à publier (countdown)
   - Bouton "Forcer la publication" (admin uniquement)
   - Bouton "Lancer auto_publish.py maintenant"
   - Log des publications récentes (depuis publish_log.jsonl)

---

### ÉTAPE 5 — Génération des 30 articles

C'est l'étape la plus importante. Pour CHAQUE article :

1. **Lis attentivement le `CLAUDE_CONTENT_ENGINE.md`** pour les règles de rédaction
2. **Recherche le sujet** : avant d'écrire, utilise tes connaissances pour identifier ce que les articles concurrents couvrent et ce qu'ils manquent
3. **Applique le framework DEPTH** : Déclencheur → Expertise → Preuve → Transformation → Horizon
4. **Respecte TOUTES les règles anti-détection** :
   - Variation de longueur de phrases (burstiness)
   - Mots imprévisibles (perplexité)
   - Structure non-linéaire
   - Minimum 5 marqueurs d'authenticité par article
   - Aucun mot/expression de la liste noire IA
5. **SEO on-page** : mot-clé dans H1 + premier paragraphe + 1 H2 + URL
6. **Maillage interne** : 3-5 liens internes par article
7. **Frontmatter complet** : utilise les frontmatters définis dans CLAUDE_CONTENT_ENGINE.md
8. **Schema JSON-LD** : en commentaire HTML dans chaque fichier

**Ordre de génération :**
- Articles 1 à 5 → commit
- Articles 6 à 10 → commit
- Articles 11 à 15 → commit
- Articles 16 à 20 → commit
- Articles 21 à 25 → commit
- Articles 26 à 30 → commit

**Pour les articles grand-public** (9-15, 26, 30) :
- Applique les règles spécifiques du cluster grand-public (zéro jargon, 1200-1800 mots, CTA one-shot 3 EUR)
- Ces articles sont plus courts et plus visuels que les articles experts

**Pour les articles experts** (1-8, 16-25, 27-29) :
- 2500-3500 mots minimum
- Profondeur technique supérieure
- Sources et références réglementaires

---

### ÉTAPE 6 — Sitemap blog

Ajoute les URLs du blog dans le `sitemap.xml` :
- Chaque article publié a une entrée `<url>` avec `<lastmod>` correspondant à `publishDate`
- Le sitemap se met à jour dynamiquement quand un article passe en "published"
- Priorité : articles piliers = 0.8, articles satellites = 0.6

---

### ÉTAPE 7 — Crontab / Scheduler

Configure le système de publication automatique :

**Option A — Crontab (si serveur Linux) :**
```bash
# Ajouter au crontab
(crontab -l 2>/dev/null; echo "*/30 * * * * cd /chemin/vers/clearrecap && python scripts/auto_publish.py >> /var/log/clearrecap-publisher.log 2>&1") | crontab -
```

**Option B — Docker (si Docker Compose) :**
Ajouter un service dans `docker-compose.yml` :
```yaml
  publisher:
    build: .
    command: >
      sh -c "while true; do python scripts/auto_publish.py; sleep 1800; done"
    volumes:
      - ./content:/app/content
      - ./scripts:/app/scripts
    depends_on:
      - backend
    restart: unless-stopped
```

**Option C — APScheduler dans le backend FastAPI :**
Ajouter un job récurrent directement dans l'app FastAPI via APScheduler :
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
scheduler.add_job(auto_publish_check, 'interval', minutes=30)
scheduler.start()
```

Implémente les 3 options et documente-les. L'utilisateur choisira celle qui convient à son setup.

**Variables d'environnement à ajouter dans `.env` :**
```bash
# Email notifications auto-publisher
SMTP_PASSWORD=ton_mot_de_passe_smtp
```

L'email de notification est envoyé automatiquement après chaque publication. Il contient le titre, la catégorie, la date et un lien direct vers l'article. L'admin peut désactiver les notifications en mettant `"enabled": false` dans `publish_config.json`.

---

### ÉTAPE 8 — Vérification finale

Après avoir généré les 30 articles :

1. **Checklist globale** : vérifie que chaque article passe la checklist du CLAUDE_CONTENT_ENGINE.md
2. **Maillage interne** : vérifie que tous les liens internes pointent vers des slugs qui existent
3. **Frontmatter** : vérifie que les 30 articles ont un frontmatter complet et valide
4. **Publication** : vérifie que tous les articles sont en status: "draft" avec leur publishDate correcte
5. **Rapport** : génère un fichier `content/blog/GENERATION_REPORT.md` avec :
   - Tableau récapitulatif des 30 articles (titre, cluster, mots, statut checklist)
   - Nombre total de mots
   - Carte de maillage interne (quel article linke vers quoi)
   - Prochaine date de publication
   - Problèmes détectés et corrections appliquées

---

## Commandes rapides

Tu peux aussi recevoir ces commandes :
- `Génère article: [numéro]` → Génère uniquement l'article N
- `Génère batch: [N-M]` → Génère les articles N à M
- `Génère batch: tous` → Lance toute la séquence (étapes 1 à 8)
- `Statut publication` → Affiche l'état de chaque article (draft/published/date)
- `Vérifie maillage` → Audit des liens internes
- `Force publish: [slug]` → Passe un article en published immédiatement
