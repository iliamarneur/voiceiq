# VoiceIQ v3.1 — Profiles Overview

## 5 Profils Verticaux

---

### 1. Generique (`generic`)

**Cible** : Podcasts, interviews, notes vocales, conferences, tout audio non categorise.

**Use cases** :
- Prendre des notes automatiques d'un podcast
- Resumer une conference / webinar
- Creer des fiches de revision a partir d'un enregistrement
- Extraire les idees cles d'une interview

**Analyses (9)** :
| Type | Label | Description |
|------|-------|-------------|
| summary | Resume | Titre, introduction, points principaux, conclusion |
| keypoints | Points cles | Points cles thematiques regroupes par sujet |
| actions | Actions | Actions, decisions, questions ouvertes |
| flashcards | Fiches | Flashcards question/reponse |
| quiz | Quiz | QCM 5-6 questions avec explications |
| mindmap | Carte mentale | Mindmap hierarchique (Markmap) |
| slides | Slides | Presentation 6-10 slides |
| infographic | Infographie | Donnees pour Vega-Lite chart |
| tables | Tableaux | Donnees structurees en tableaux |

**Exports** : JSON, MD, TXT, SRT, VTT, PPTX

**Templates par defaut** : Aucun

---

### 2. Business / Reunions (`business`)

**Cible** : Reunions d'equipe, calls clients, COMEX, standups, retrospectives, negotiations commerciales.

**Use cases** :
- Generer un CR de reunion pret a envoyer
- Extraire toutes les actions avec responsables et deadlines
- Suivre les KPIs mentionnes en reunion
- Identifier les risques et blocages
- Produire un email de suivi automatique
- Cartographier les parties prenantes d'un projet

**Analyses (9)** :
| Type | Label | Description |
|------|-------|-------------|
| summary | Compte-rendu | CR structure : participants, agenda, points discutes, conclusions |
| actions | Actions & Decisions | Actions avec owner/deadline/priorite, decisions avec justification, questions ouvertes |
| keypoints | Points cles | Points cles par domaine business (strategie, finance, RH...) avec impact |
| kpi | KPIs & Chiffres | Metriques, tendances, cibles, resume financier |
| risks | Risques & Blocages | Risques par categorie avec probabilite/impact/mitigation + blocages |
| followup | Email de suivi | Email pret a envoyer avec tableau d'actions |
| slides | Slides de synthese | Presentation executive max 8 slides |
| stakeholder_map | Carte des parties prenantes | Parties prenantes, influence, positions, dynamiques |
| tables | Tableaux de bord | Tableaux actions/decisions/KPIs structures |

**Exports** : JSON, MD, PPTX, TXT

**Templates par defaut** :
- CR Express 10 lignes
- Email client formel
- COMEX Summary

---

### 3. Education (`education`)

**Cible** : Cours universitaires, formations professionnelles, conferences pedagogiques, MOOCs, tutoriels.

**Use cases** :
- Creer des fiches de revision a partir d'un cours enregistre
- Generer un quiz d'auto-evaluation par chapitre
- Construire un glossaire du vocabulaire technique
- Creer des exercices pratiques
- Produire un support de cours en slides

**Analyses (9)** :
| Type | Label | Description |
|------|-------|-------------|
| summary | Resume pedagogique | Titre, niveau, prerequis, objectifs, concepts avec exemples, takeaways |
| flashcards | Fiches de revision | Fiches par chapitre avec difficulte et mnemotechniques |
| quiz | Quiz par section | QCM 8-10 questions multi-niveaux (connaissance → analyse) |
| mindmap | Carte des concepts | Carte conceptuelle hierarchique avec liens inter-concepts |
| glossary | Glossaire | Termes techniques avec definitions, exemples, termes associes |
| chapters | Chapitrage pedagogique | Chapitres avec objectifs, resume, concepts, temps d'etude estime |
| keypoints | Notions essentielles | Notions par theme avec connexions et applications reelles |
| exercises | Exercices pratiques | 4-6 exercices progressifs avec indices et solutions |
| slides | Support de cours | Diapositives pedagogiques avec notes |

**Exports** : JSON, MD, PPTX, TXT

**Templates par defaut** :
- Fiches Anki (format Q;R pour import)
- Resume 1 page
- Fiche de revision examen

---

### 4. Medical / Sante (`medical`)

**Cible** : Consultations medicales, staffs, transmissions, comptes-rendus d'hospitalisation, dictees medicales.

**Use cases** :
- Structurer une consultation au format SOAP
- Anonymiser automatiquement les donnees patient (PII)
- Extraire les prescriptions et posologies
- Identifier les red flags et points de vigilance
- Generer un plan de suivi patient
- Rediger un courrier a un confrere

**Analyses (7)** :
| Type | Label | Description |
|------|-------|-------------|
| soap | Note SOAP | Structure Subjective/Objective/Assessment/Plan avec niveau d'urgence |
| summary | Resume clinique | Contexte, motif, anamnese, examen, diagnostic, traitement, suivi |
| pii_redaction | Redaction PII | Detection et remplacement des donnees personnelles (RGPD/HIPAA) |
| prescriptions | Prescriptions & Traitements | Medicaments, posologies, durees, voies, allergies, interactions |
| watchpoints | Points de vigilance | Red flags, contre-indications, alertes par niveau de gravite |
| followup | Plan de suivi | RDV, examens a programmer, monitoring, criteres d'urgence |
| keypoints | Points cles cliniques | Points cles par categorie (symptomes, diagnostic, traitement, suivi) |

**Exports** : JSON, MD, TXT

**Templates par defaut** :
- Courrier confrere (style medical professionnel)
- Note SOAP express (2-3 lignes par section)

**Particularites techniques** :
- Prompts orientes terminologie medicale
- Analyse PII avec remplacement anonymise
- Structure SOAP normalisee
- Detection des red flags cliniques

---

### 5. Juridique (`legal`)

**Cible** : Audiences, depositions, negociations contractuelles, reunions avec avocat, mediations, arbitrages.

**Use cases** :
- Extraire les clauses d'un contrat discute oralement
- Lister les obligations par partie avec echeances
- Identifier les risques juridiques et les quantifier
- Collecter les references legales citees
- Generer une note d'audience formelle
- Creer un tableau d'obligations contractuelles

**Analyses (7)** :
| Type | Label | Description |
|------|-------|-------------|
| summary | Synthese juridique | Parties, objet, arguments par partie, base legale, issue |
| clauses | Clauses & Stipulations | Clauses par type (obligation, garantie, penalite, resiliation...) |
| obligations | Obligations par partie | Tableau debiteur/crediteur/obligation/type/echeance/consequence |
| deadlines | Echeances & Delais | Dates, prescriptions, recours par criticite avec base legale |
| risks | Risques juridiques | Risques par categorie avec probabilite/impact/mitigation |
| references | References legales | Articles de loi, jurisprudence, conventions citees avec contexte |
| actions | Actions & Decisions | Actions avec priorite, decisions avec base legale, points en suspens |

**Exports** : JSON, MD, TXT

**Templates par defaut** :
- Note d'audience (style juridique formel)
- Tableau d'obligations (format tabulaire pour dossier client)

**Particularites techniques** :
- Prompts en terminologie juridique francaise
- Classification des clauses par type juridique
- Evaluation des risques avec base legale
- Chronologie des echeances avec criticite

---

## Architecture technique

```
backend/app/profiles/
├── generic.json      # 9 analyses, tous exports
├── business.json     # 9 analyses, focus CR/actions/KPI
├── education.json    # 9 analyses, focus pedagogie
├── medical.json      # 7 analyses, focus SOAP/PII/prescriptions
└── legal.json        # 7 analyses, focus clauses/obligations/risques
```

**Ajout d'un nouveau profil** :
1. Creer un fichier JSON dans `backend/app/profiles/`
2. Definir : id, name, description, icon, color, analyses (type + label + prompt), exports, default_templates
3. Appeler `POST /api/profiles/reload` ou redemarrer le backend
4. Le profil apparait automatiquement dans le selecteur d'upload

**API** :
- `GET /api/profiles` — Liste tous les profils
- `GET /api/profiles/{id}` — Detail d'un profil
- `GET /api/profiles/{id}/analyses` — Analyses d'un profil
- `POST /api/profiles/reload` — Hot-reload des profils
