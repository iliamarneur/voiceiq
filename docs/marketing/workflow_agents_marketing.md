# Workflow Agents Marketing — VoiceIQ

## Vue d'ensemble

Deux agents marketing collaborent pour produire le contenu de positionnement et de commercialisation de VoiceIQ. Ils ne touchent pas au code applicatif.

```
PM / Product Owner
       |
       v
MarketingStrategist ──────> Copywriter
  (strategie, briefs)         (textes finaux)
       |                          |
       v                          v
  docs/marketing/             docs/marketing/
  personas/                   landing/
  positionnement/             emails/
  pricing/                    ui_copy/
```

## Etape 1 — MarketingStrategist

### Inputs
- Specs produit : `docs/SPEC_V7_OFFRES_MINUTES.md`
- Decisions PM (plans, pricing, features par plan)
- Retours utilisateurs ou metriques d'usage

### Livrables
1. **Fiches personas** → `docs/marketing/personas/`
   - `persona_independant_artisan.md`
   - `persona_prof_formateur.md`
   - `persona_particulier_oneshot.md`

2. **Positionnement** → `docs/marketing/positionnement/`
   - `positionnement_pme.md`
   - `positionnement_education.md`
   - `positionnement_oneshot.md`

3. **Strategie pricing** → `docs/marketing/pricing/`
   - `pricing_v7.md`
   - `comparatif_plans.md`

4. **Briefs landing pages** → `docs/marketing/landing/`
   - `brief_landing_pme.md`
   - `brief_landing_profs.md`
   - `brief_landing_oneshot.md`
   - `brief_page_plans_tarifs.md`

5. **Briefs emails** → `docs/marketing/emails/`
   - `brief_onboarding_sequence.md`
   - `brief_conversion_oneshot_abo.md`

## Etape 2 — Copywriter

### Inputs
- Briefs du MarketingStrategist (docs/marketing/landing/brief_*.md)
- Fiches personas (docs/marketing/personas/)
- Specs produit pour verifier les features

### Livrables
1. **Textes landing pages** → `docs/marketing/landing/`
   - `landing_pme_copy.md`
   - `landing_profs_copy.md`
   - `landing_oneshot_copy.md`
   - `plans_tarifs_copy.md`

2. **Emails** → `docs/marketing/emails/`
   - `emails_onboarding_v1.md`
   - `emails_conversion_oneshot.md`
   - `emails_reengagement.md`

3. **UI Copy** → `docs/marketing/ui_copy/`
   - `ui_copy_page_nouveau.md`
   - `ui_copy_page_upload.md`
   - `ui_copy_page_plans.md`
   - `ui_copy_sidebar.md`
   - `ui_copy_oneshot.md`

## Interactions avec les autres agents

| Agent | Relation avec Marketing |
|-------|------------------------|
| **PM** | Fournit les specs produit, valide le positionnement et le pricing |
| **Architect** | Confirme les contraintes techniques (limites, features disponibles) |
| **UX** | Consomme l'UI copy pour l'integrer dans les maquettes |
| **Frontend** | Consomme l'UI copy pour l'integrer dans le code React |
| **Docs** | Peut reprendre les textes marketing pour la documentation utilisateur |

## Regles de collaboration

1. **Le MarketingStrategist produit AVANT le Copywriter** : pas de texte sans brief
2. **Le Copywriter ne modifie pas les briefs** : il les consomme et produit ses textes a cote
3. **Aucun des deux ne touche au code** : uniquement des fichiers .md dans docs/marketing/
4. **Le PM valide** les livrables strategiques (personas, positionnement, pricing)
5. **Les textes UI sont tagges** par page/composant pour faciliter l'integration par le Frontend

## Pipeline type

```
1. PM definit le besoin : "On lance la page Plans & Tarifs"
2. MarketingStrategist ecrit :
   - docs/marketing/pricing/comparatif_plans.md
   - docs/marketing/landing/brief_page_plans_tarifs.md
3. Copywriter ecrit :
   - docs/marketing/landing/plans_tarifs_copy.md
   - docs/marketing/ui_copy/ui_copy_page_plans.md
4. UX/Frontend integre les textes dans l'app
```
