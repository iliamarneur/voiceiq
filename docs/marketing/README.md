# docs/marketing/ — Contenu Marketing VoiceIQ

Ce dossier contient tous les livrables marketing produits par les agents **MarketingStrategist** et **Copywriter**.

## Structure

```
docs/marketing/
├── README.md                          ← Ce fichier
├── workflow_agents_marketing.md       ← Workflow de collaboration entre agents
├── personas/                          ← Fiches personas cibles
│   ├── persona_independant_artisan.md
│   ├── persona_prof_formateur.md
│   └── persona_particulier_oneshot.md
├── positionnement/                    ← Docs de positionnement par segment
│   ├── positionnement_pme.md
│   ├── positionnement_education.md
│   └── positionnement_oneshot.md
├── pricing/                           ← Strategie pricing et comparatifs
│   ├── pricing_v7.md
│   └── comparatif_plans.md
├── landing/                           ← Briefs + textes finaux des landing pages
│   ├── brief_landing_pme.md           (brief MarketingStrategist)
│   ├── landing_pme_copy.md            (texte Copywriter)
│   ├── brief_landing_profs.md
│   ├── landing_profs_copy.md
│   ├── brief_page_plans_tarifs.md
│   └── plans_tarifs_copy.md
├── emails/                            ← Sequences emails
│   ├── brief_onboarding_sequence.md
│   ├── emails_onboarding_v1.md
│   └── emails_conversion_oneshot.md
└── ui_copy/                           ← Micro-copy pour l'interface
    ├── ui_copy_page_nouveau.md
    ├── ui_copy_page_upload.md
    ├── ui_copy_page_plans.md
    └── ui_copy_sidebar.md
```

## Agents

### MarketingStrategist
- **Role** : Strategie marketing, personas, positionnement, pricing, briefs
- **Produit** : Fiches personas, docs positionnement, briefs landing/email
- **Ne modifie jamais de code**

### Copywriter
- **Role** : Redaction marketing, textes landing, emails, UI copy
- **Consomme** : Les briefs du MarketingStrategist
- **Produit** : Textes prets a integrer
- **Ne modifie jamais de code**

## Convention de nommage

- `brief_*.md` = Brief strategique (input du Copywriter)
- `*_copy.md` = Texte final redige (output du Copywriter)
- `ui_copy_*.md` = Micro-copy pour l'interface (tagge par page/composant)
- `persona_*.md` = Fiche persona
- `positionnement_*.md` = Document de positionnement
- `pricing_*.md` = Document pricing/tarification

## Comment utiliser ces docs

- **PM** : Valide personas, positionnement, pricing
- **UX** : Utilise les textes UI copy pour les maquettes
- **Frontend** : Copie les textes UI dans les composants React
- **Docs** : Reprend les textes pour la doc utilisateur
- **Orchestrateur** : Lance MarketingStrategist puis Copywriter dans le pipeline
