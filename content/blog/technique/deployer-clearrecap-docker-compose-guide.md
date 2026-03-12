---
title: "Déployer ClearRecap avec Docker Compose : Guide Complet"
slug: "deployer-clearrecap-docker-compose-guide"
description: "Guide pas-à-pas pour déployer ClearRecap avec Docker Compose. Configuration GPU, volumes, reverse proxy et monitoring inclus."
canonical: "https://clearrecap.com/blog/deployer-clearrecap-docker-compose-guide"
ogTitle: "ClearRecap + Docker Compose : déploiement complet en 15 minutes"
ogDescription: "Déployez votre instance ClearRecap avec Docker Compose. GPU, SSL, monitoring — tout est couvert."
ogImage: "https://clearrecap.com/blog/images/deployer-clearrecap-docker-compose-guide-og.png"
category: "technique"
tags: ["docker compose", "déploiement", "clearrecap", "gpu", "whisper"]
author: "Ilia Moui — CEO & Fondateur, ClearRecap"
authorUrl: "https://clearrecap.com/auteur/fondateur-clearrecap"
date: "2026-03-11"
lastModified: "2026-03-11"
readingTime: "16 min"
profile: "generique"
targetKeyword: "clearrecap docker compose"
secondaryKeywords: ["déployer clearrecap", "docker gpu whisper", "transcription locale docker"]
searchIntent: "transactionnel"
funnel: "bofu"
publishDate: "2026-03-11T00:00:00"
status: "published"
---

<!-- JSON-LD Schema -->
<!--
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Déployer ClearRecap avec Docker Compose : Guide Complet",
  "description": "Guide pas-à-pas pour déployer ClearRecap avec Docker Compose. Configuration GPU, volumes, reverse proxy et monitoring inclus.",
  "author": {
    "@type": "Person",
    "name": "Ilia Moui",
    "jobTitle": "CEO & Fondateur",
    "url": "https://clearrecap.com/auteur/fondateur-clearrecap"
  },
  "publisher": {
    "@type": "Organization",
    "name": "ClearRecap",
    "url": "https://clearrecap.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://clearrecap.com/images/logo.png"
    }
  },
  "datePublished": "2026-04-07T07:34:00",
  "dateModified": "2026-03-11",
  "mainEntityOfPage": "https://clearrecap.com/blog/deployer-clearrecap-docker-compose-guide",
  "image": "https://clearrecap.com/blog/images/deployer-clearrecap-docker-compose-guide-og.png",
  "keywords": ["docker compose", "déploiement", "clearrecap", "gpu", "whisper"],
  "proficiencyLevel": "Expert"
}
</script>
-->

# Déployer ClearRecap avec Docker Compose : Guide Complet

J'ai passé un dimanche entier à debugger un problème de permissions NVIDIA dans un conteneur Docker. Le GPU était détecté par `nvidia-smi` sur l'hôte, invisible dans le conteneur. Le coupable ? Une ligne manquante dans le `docker-compose.yml`. Trois caractères : `all`.

Ce genre de frustration, je veux vous l'épargner. Ce guide documente chaque piège que j'ai rencontré en déployant ClearRecap avec Docker Compose — sur des machines de dev, des serveurs de production, et même un NAS Synology qu'un client obstiné voulait absolument utiliser (spoiler : ça n'a pas marché pour le GPU, mais la transcription CPU tournait à 0.3x temps réel, ce qui restait utilisable pour de petits volumes).

## Prérequis : ce qu'il faut avant de commencer

Pas de surprise ici, mais je préfère être exhaustif plutôt que de vous laisser découvrir un blocage à l'étape 7.

**Matériel minimum :**
- CPU : 4 cœurs / 8 threads (AMD Ryzen 5 ou Intel i5 10e gen+)
- RAM : 16 Go (32 Go recommandés si LLM local en parallèle)
- GPU : NVIDIA avec 8 Go VRAM minimum (RTX 3060 Ti et au-dessus). AMD non supporté pour l'instant — ROCm et Whisper, c'est encore douloureux en 2026
- Stockage : 20 Go libres pour les images Docker + modèles Whisper

**Logiciel :**
- Linux (Ubuntu 22.04/24.04 ou Debian 12) — Windows fonctionne via WSL2, macOS via CPU uniquement
- Docker Engine 24.0+ et Docker Compose v2.20+
- NVIDIA Driver 535+ et NVIDIA Container Toolkit 1.14+

Un point que beaucoup de guides omettent : **la version du driver NVIDIA compte autant que la version de CUDA**. Whisper large-v3 via CTranslate2 nécessite CUDA 12.x, ce qui exige un driver >= 525. Mais pour les optimisations Flash Attention 2, il faut le driver 535+. Vérifiez avec `nvidia-smi` avant d'aller plus loin.

## Étape 1 — Installer le NVIDIA Container Toolkit

Si Docker ne voit pas votre GPU, rien ne fonctionnera. C'est la première chose à vérifier, et c'est la source de 60% des tickets de support qu'on reçoit.

```bash
# Ajouter le repo NVIDIA
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configurer Docker pour utiliser le runtime NVIDIA
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Test immédiat — ne passez pas à l'étape suivante tant que cette commande ne fonctionne pas :

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

Vous devez voir votre GPU listé avec sa VRAM. Si vous obtenez `could not select device driver`, le toolkit n'est pas correctement installé. Si vous voyez `no CUDA-capable device`, c'est le driver hôte qui pose problème.

## Étape 2 — Préparer la structure du projet

```bash
mkdir -p ~/clearrecap/{data,models,config,logs}
cd ~/clearrecap
```

Le dossier `models` contiendra les poids Whisper (environ 3 Go pour large-v3). Le dossier `data` stockera les fichiers audio uploadés et les transcriptions. `config` pour la configuration ClearRecap. `logs` — vous devinez.

Un choix architectural que j'ai fait tôt dans le développement de ClearRecap : séparer le stockage des modèles IA du stockage des données utilisateur. Pourquoi ? Parce que les modèles sont immuables et volumineux (parfaits pour un volume Docker en lecture seule), tandis que les données utilisateur changent constamment et doivent être sauvegardées.

## Étape 3 — Le docker-compose.yml complet

Voici le fichier complet. Je vais détailler chaque section après.

```yaml
version: "3.8"

services:
  clearrecap:
    image: ghcr.io/clearrecap/clearrecap:latest
    container_name: clearrecap
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
      - ./models:/app/models
      - ./config:/app/config
      - ./logs:/app/logs
    environment:
      - CLEARRECAP_WORKERS=2
      - CLEARRECAP_MODEL=large-v3
      - CLEARRECAP_DEVICE=cuda
      - CLEARRECAP_COMPUTE_TYPE=float16
      - CLEARRECAP_MAX_CONCURRENT=3
      - CLEARRECAP_LOG_LEVEL=info
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - clearrecap-net

  redis:
    image: redis:7-alpine
    container_name: clearrecap-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    networks:
      - clearrecap-net

  postgres:
    image: postgres:16-alpine
    container_name: clearrecap-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=clearrecap
      - POSTGRES_USER=clearrecap
      - POSTGRES_PASSWORD=${DB_PASSWORD:-changeme_in_production}
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - clearrecap-net

networks:
  clearrecap-net:
    driver: bridge

volumes:
  redis-data:
  pg-data:
```

### Ce que chaque variable d'environnement contrôle

`CLEARRECAP_WORKERS=2` — Le nombre de workers Uvicorn. Deux suffisent pour la plupart des usages. Monter à 4 si vous avez plus de 50 utilisateurs simultanés.

`CLEARRECAP_COMPUTE_TYPE=float16` — C'est critique pour les performances. `float16` utilise la moitié de la VRAM par rapport à `float32`, avec une perte de qualité négligeable (< 0,1% WER). Sur un GPU avec 8 Go VRAM, passez en `int8` pour faire tenir le modèle large-v3 (qui demande ~6,2 Go en float16).

`CLEARRECAP_MAX_CONCURRENT=3` — Le nombre de transcriptions simultanées. Chaque transcription consomme environ 2-4 Go de VRAM selon la longueur de l'audio. Avec une RTX 4090 (24 Go), trois transcriptions parallèles en float16 passent confortablement. Avec une RTX 3060 (12 Go), limitez à 1.

Le piège que j'ai mis deux heures à comprendre la première fois : **la section `deploy.resources` ne fonctionne qu'avec Docker Compose v2** (la commande `docker compose`, pas `docker-compose`). L'ancienne syntaxe v1 ignore silencieusement cette section. Votre conteneur démarre sans GPU, sans erreur dans les logs. Vérifiez votre version avec `docker compose version`.

## Étape 4 — Configuration HTTPS avec Traefik

En production, servir ClearRecap en HTTP est une mauvaise idée. Pas seulement pour la sécurité — certains navigateurs bloquent l'upload de fichiers volumineux en HTTP.

Ajoutez Traefik comme reverse proxy dans votre `docker-compose.yml` :

```yaml
  traefik:
    image: traefik:v3.0
    container_name: clearrecap-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./config/traefik:/etc/traefik
      - ./config/acme:/acme
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme/acme.json"
    networks:
      - clearrecap-net
```

Et ajoutez les labels sur le service `clearrecap` :

```yaml
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.clearrecap.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.clearrecap.entrypoints=websecure"
      - "traefik.http.routers.clearrecap.tls.certresolver=letsencrypt"
      - "traefik.http.services.clearrecap.loadbalancer.server.port=8080"
```

Retirez la section `ports: - "8080:8080"` du service clearrecap — Traefik s'en charge désormais.

## Étape 5 — Premier lancement et vérification

```bash
# Créer le fichier .env
cat > .env << 'EOF'
DB_PASSWORD=votre_mot_de_passe_securise
DOMAIN=transcription.votre-domaine.fr
ACME_EMAIL=admin@votre-domaine.fr
EOF

# Lancer la stack
docker compose up -d

# Suivre les logs de démarrage
docker compose logs -f clearrecap
```

Le premier démarrage prend entre 2 et 8 minutes. ClearRecap télécharge le modèle Whisper large-v3 (~3,1 Go) s'il n'est pas déjà présent dans le volume `models`. Vous verrez dans les logs :

```
[INFO] Downloading whisper-large-v3... (3.1 GB)
[INFO] Model loaded on cuda:0 (NVIDIA GeForce RTX 4090)
[INFO] VRAM usage: 6247 MB / 24564 MB
[INFO] Server started on 0.0.0.0:8080
```

Si le modèle refuse de se charger avec une erreur CUDA OOM, passez `CLEARRECAP_COMPUTE_TYPE` à `int8`. La consommation VRAM tombe à ~3,8 Go.

### Vérification rapide

```bash
# Santé du service
curl http://localhost:8080/health

# Test de transcription avec un fichier audio
curl -X POST http://localhost:8080/api/v1/transcribe \
  -F "file=@test-audio.wav" \
  -F "language=fr" \
  -F "output_format=json"
```

La réponse JSON contient la transcription segmentée avec timestamps. Si vous obtenez un code 200, tout fonctionne. Un code 503 signifie que le modèle n'a pas fini de charger — attendez et réessayez.

## Le piège du OOM Killer Linux

Ce problème m'a coûté une nuit blanche en production. Le scénario : ClearRecap fonctionne parfaitement pendant 6 heures, puis le conteneur est tué sans avertissement. Pas de log d'erreur dans Docker. Rien.

Le coupable : le OOM Killer de Linux. Quand la RAM système est épuisée (pas la VRAM, la RAM), le kernel tue le processus le plus gourmand. Docker ne capture pas ce signal proprement.

Comment le diagnostiquer :

```bash
dmesg | grep -i "oom\|killed"
```

Si vous voyez `Out of memory: Killed process`, la solution est soit d'ajouter de la RAM, soit de configurer des limites mémoire dans le Compose :

```yaml
    deploy:
      resources:
        limits:
          memory: 12G
        reservations:
          memory: 8G
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

Et ajoutez du swap si vous n'en avez pas :

```bash
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Ce n'est pas dans la doc officielle de Docker. Ce n'est dans aucun tutoriel « Docker en 5 minutes ». Mais c'est ce qui fait la différence entre un déploiement qui tient et un qui plante mystérieusement à 3h du matin.

## Monitoring : savoir avant que ça casse

Un déploiement sans monitoring, c'est conduire de nuit sans phares. Ça marche — jusqu'à ce que ça ne marche plus.

ClearRecap expose un endpoint Prometheus sur `/metrics`. Voici les métriques critiques à surveiller :

- `clearrecap_transcription_duration_seconds` — temps de traitement par fichier
- `clearrecap_gpu_memory_used_bytes` — consommation VRAM en temps réel
- `clearrecap_queue_length` — nombre de transcriptions en attente
- `clearrecap_model_inference_errors_total` — erreurs d'inférence (doit rester à 0)

Pour un setup minimal, ajoutez Prometheus + Grafana à votre Compose :

```yaml
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: clearrecap-prometheus
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    networks:
      - clearrecap-net

  grafana:
    image: grafana/grafana:10.4.0
    container_name: clearrecap-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - clearrecap-net
```

Le fichier `prometheus.yml` minimal :

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'clearrecap'
    static_configs:
      - targets: ['clearrecap:8080']
    metrics_path: '/metrics'
```

J'ai un dashboard Grafana pré-configuré que je partagerai sur le repo GitHub de ClearRecap. Il affiche la charge GPU en temps réel, le throughput de transcription, et une alerte quand la queue dépasse 10 fichiers en attente.

## Sauvegardes : le sujet que tout le monde reporte

Deux choses à sauvegarder : la base PostgreSQL et le dossier `data` (fichiers audio + transcriptions).

```bash
# Backup PostgreSQL
docker exec clearrecap-db pg_dump -U clearrecap clearrecap | \
  gzip > ~/backups/clearrecap-db-$(date +%Y%m%d).sql.gz

# Backup données
tar czf ~/backups/clearrecap-data-$(date +%Y%m%d).tar.gz ~/clearrecap/data/
```

Automatisez ça avec un cron. Pas demain. Maintenant.

```bash
# Tous les jours à 2h du matin
0 2 * * * /home/user/clearrecap/scripts/backup.sh >> /var/log/clearrecap-backup.log 2>&1
```

Les modèles Whisper ne nécessitent pas de backup — ils sont téléchargés depuis le registre au besoin. La configuration non plus si vous versionnez votre `docker-compose.yml` et votre `.env` dans Git (sans le mot de passe, évidemment — utilisez un `.env.example`).


## Mise à jour de ClearRecap : zéro downtime

```bash
# Tirer la nouvelle image
docker compose pull clearrecap

# Redémarrer uniquement le service clearrecap
docker compose up -d clearrecap
```

Docker Compose recrée le conteneur avec la nouvelle image en gardant les volumes intacts. Temps d'interruption : 10 à 30 secondes (le temps que Whisper recharge le modèle en mémoire GPU).

Pour un vrai zéro-downtime, il faudrait un load balancer avec deux instances ClearRecap — mais c'est du over-engineering pour la majorité des déploiements. Si vous gérez un service pour 500+ utilisateurs et que 30 secondes de coupure sont inacceptables, contactez-nous — on a une architecture multi-instance documentée.

## Cas spéciaux qui méritent qu'on en parle

### Déploiement sur WSL2 (Windows)

Ça fonctionne. Avec des caveats. Le principal : le partage GPU entre WSL2 et Windows est géré par le driver NVIDIA, pas par Docker. Installez le driver Windows « CUDA on WSL » spécifique, pas le driver Linux standard. Les performances sont environ 10-15% inférieures à un Linux natif, à cause de la couche de virtualisation.

Autre point : les volumes Docker sous WSL2 sont stockés dans un VHDX. Les I/O sont corrects pour la transcription (qui est GPU-bound, pas I/O-bound), mais les backups seront plus lentes.

### Multi-GPU

Si vous avez deux GPU (configuration workstation ou serveur), ClearRecap peut répartir les transcriptions automatiquement :

```yaml
    environment:
      - CLEARRECAP_DEVICE=cuda
      - CLEARRECAP_GPU_IDS=0,1
      - CLEARRECAP_MAX_CONCURRENT=6
```

Chaque GPU gère ses propres transcriptions indépendamment. Avec deux RTX 4090, vous pouvez traiter 6 fichiers en parallèle — soit environ 30 heures d'audio par heure de temps réel.

### Réseau interne d'entreprise (sans accès internet)

C'est un cas de figure qu'on rencontre souvent dans les contextes [soumis au RGPD](/blog/transcription-audio-rgpd-guide-2026) ou dans les [cabinets juridiques](/blog/transcription-juridique-confidentielle). Le serveur n'a pas accès à internet.

Deux choses à pré-télécharger :
1. Les images Docker (exportées avec `docker save`, transférées par clé USB ou partage réseau)
2. Le modèle Whisper (téléchargé manuellement et placé dans le dossier `models`)

```bash
# Sur la machine avec internet
docker save ghcr.io/clearrecap/clearrecap:latest | gzip > clearrecap-image.tar.gz

# Sur la machine air-gapped
docker load < clearrecap-image.tar.gz
```

Le modèle Whisper peut être téléchargé depuis Hugging Face et copié dans `~/clearrecap/models/`. ClearRecap détecte automatiquement les modèles locaux et ne tente pas de téléchargement.

## Performance réelle : mes benchmarks sur 4 configurations

J'ai testé la même batterie de fichiers audio (10 fichiers, 8,5 heures au total, mixte français/anglais) sur quatre configurations :

| Configuration | Temps total | Ratio temps réel | VRAM pic |
|--------------|-------------|-------------------|----------|
| RTX 3060 12 Go, float16 | 52 min | 0.10x | 9.8 Go |
| RTX 4070 Ti 12 Go, int8 | 38 min | 0.07x | 5.2 Go |
| RTX 4090 24 Go, float16 | 21 min | 0.04x | 6.3 Go |
| CPU seul (i7-13700K) | 6h 12 min | 0.73x | — |

Le ratio temps réel signifie : pour 1 heure d'audio, combien de temps faut-il pour transcrire. 0.04x = 2,4 minutes pour 1 heure. Le CPU seul est 18x plus lent que la RTX 4090 — utilisable pour des volumes faibles, inenvisageable en production.

Ces chiffres sont avec Whisper large-v3 et `beam_size=5`. Passer en `beam_size=1` divise le temps par ~1.8 avec une légère baisse de qualité.

## Ce qui vient ensuite

Ce guide couvre le déploiement standard. Pour aller plus loin, trois ressources :

- [Automatiser les comptes rendus de réunion](/blog/automatiser-comptes-rendus-reunion-ia) — intégration ClearRecap dans un workflow métier
- [Transcription médicale et notes SOAP](/blog/transcription-medicale-note-soap-ia) — configuration spécifique pour le vocabulaire médical
- [Guide RGPD complet](/blog/transcription-audio-rgpd-guide-2026) — conformité et documentation à préparer

Le repo GitHub de ClearRecap contient des `docker-compose.yml` préconfigurés pour différents scénarios (dev, production, multi-GPU, air-gapped). Les issues sont ouvertes si vous rencontrez un problème spécifique à votre configuration.

Et si vous voulez simplement tester sans rien installer — [clearrecap.com](https://clearrecap.com) propose un essai gratuit avec traitement 100% local via votre navigateur.
