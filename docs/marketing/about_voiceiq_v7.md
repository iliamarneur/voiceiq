# A propos de VoiceIQ — v7.0

**VoiceIQ** est une plateforme 100% locale de transcription et d'analyse audio.
Uploadez un fichier, enregistrez depuis votre micro ou dictez en direct — obtenez une transcription precise via Whisper, puis des analyses IA adaptees a votre contexte metier grace aux 5 profils verticaux (Generique, Business, Education, Medical, Juridique).

Avec la v7, choisissez le plan adapte a votre usage : de la decouverte gratuite (30 min/mois) au plan Team (5 000 min/mois). Suivez votre consommation en temps reel, achetez des packs de minutes supplementaires ou passez une commande ponctuelle sans abonnement.

Chaque profil active un pipeline d'analyse specifique avec des prompts optimises. Le tout sans aucune donnee envoyee a l'exterieur.

## Chiffres cles

- **40+ fonctionnalites** disponibles
- **5 profils metier** avec analyses dediees
- **3 modes d'entree** : fichier, micro, dictee
- **4 plans** : Free, Basic, Pro, Team
- **12 langues** supportees
- **7 formats d'export** : JSON, MD, TXT, SRT, VTT, PPTX, PDF

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Python 3.12 + FastAPI |
| Transcription | faster-whisper (local) |
| LLM | Ollama (llama3.2 serveur) |
| Frontend | React 18 + TypeScript |
| UI | Tailwind CSS + Framer Motion |
| Database | SQLite (aiosqlite) |
| Deploy | Docker Compose |
