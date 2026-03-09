# UX Designer — Mission v7_plans_minutes

## PARTIE I — ARCHITECTURE UX v2 (refonte 2026-03-08)

---

## 1. Vision produit

1. **One-shot = porte d'entree principale** : un non-tech doit pouvoir transcrire 1 fichier en 3 clics, sans compte, sans jargon, sans sidebar.
2. **Progressive disclosure** : on ne montre les profils metiers, analyses avancees et plans que quand l'utilisateur est pret a les decouvrir.
3. **Deux modes d'interface** : mode "Simple" (one-shot, landing, resultat) et mode "App" (dashboard, sidebar, features completes).
4. **L'ecran d'attente est un outil de conversion** : pendant la transcription, on explique ce qu'il va recevoir et ce que le produit sait faire — sans rien demander.
5. **Le resultat ouvre la conversation** : apres le resultat, on propose "merci c'est tout" OU "je fais ca souvent → decouvrir les plans".
6. **Admin = role, pas app separee** : un toggle dans la sidebar donne acces au monitoring, pas une interface a part.
7. **Zero usine a gaz** : chaque ecran a 1 objectif, 1 CTA principal, 0-1 lien secondaire.

---

## 2. Personas

### Persona A — Julie, non-tech, "juste 1 fichier"

**Profil** : Independante, a enregistre un entretien client sur son telephone, veut le texte.
**Savoir technique** : Sait utiliser Gmail et WhatsApp. Ne sait pas ce qu'est un "profil d'analyse".
**Besoin** : "Je veux le texte de mon audio, c'est tout."
**Sensibilite prix** : Prete a payer 3-5 EUR si c'est rapide et clair.
**Friction max toleree** : 2 decisions, 3 clics.

**Flow ideal (6 etapes) :**
1. Arrive sur `/` (landing one-shot) — voit "Transcrivez votre fichier audio"
2. Depose son fichier — voit l'estimation ("~12 min, 3 EUR")
3. Clique "Transcrire mon fichier — 3 EUR"
4. Ecran d'attente — apprend ce qu'elle va recevoir (texte, resume, points cles)
5. Resultat — lit sa transcription, telecharge le PDF
6. Bandeau discret : "Besoin regulier ? Decouvrez les abonnements →" — elle ignore ou clique

### Persona B — Marc, PME, fichiers chaque semaine

**Profil** : Directeur d'agence, fait transcrire des reunions clients et des briefs internes.
**Savoir technique** : A l'aise avec les apps SaaS. Connait Notion, Slack, Google Meet.
**Besoin** : "Je veux automatiser la transcription de mes reunions avec des actions et un resume."
**Sensibilite prix** : Budget outils ~100 EUR/mois. Compare avec Otter, Fireflies.
**Friction toleree** : Prend le temps de configurer si ca lui fait gagner du temps ensuite.

**Flow ideal (8 etapes) :**
1. Decouvre via one-shot (ou lien direct /plans)
2. S'inscrit, decouvre le plan Gratuit (60 min)
3. Upload un premier fichier, profil "Generique"
4. Voit le resultat — decouvre resume, points cles
5. 2e fichier → choisit profil "Business" → voit les actions et le plan d'actions
6. Atteint 75% quota → alerte → decouvre les plans
7. Passe au Pro (49 EUR/2000 min) — debloquer dictation, templates, exports avances
8. Routine : upload hebdo, exports PDF, chat avec la transcription

### Persona C — Admin (toi)

**Profil** : Owner/dev, gere la plateforme et teste tout.
**Besoin** : "Je veux voir le monitoring, les stats, les erreurs, et pouvoir tout controler."
**Flow ideal (5 etapes) :**
1. Login → Dashboard normal
2. Toggle "Mode Admin" dans la sidebar
3. Voir : stats globales (MRR, minutes, users, erreurs), logs billing, queue jobs
4. Pouvoir changer le plan d'un user, reset son quota, voir ses transcriptions
5. Voir les backends actifs (Whisper, Ollama) et leur sante

---

## 3. Architecture d'ecrans

### 3.1 Carte des ecrans

```
MODE SIMPLE (sans sidebar, sans auth)
======================================
/                   → OneShotSimple (landing + upload + paiement)
/processing/:jobId  → TranscriptionWaiting (ecran d'attente)
/result/:id         → TranscriptionResult (resultat + upsell)
/plans              → PlansPublic (grille plans publique, CTA inscription)

MODE APP (sidebar, auth)
======================================
/app                → Dashboard (transcriptions + stats)
/app/upload         → Upload (batch, profils, options)
/app/new            → NewEntry (upload / record / dictate)
/app/transcription/:id → TranscriptionView (resultat complet)
/app/plans          → PlansUsage (gestion plan + conso + packs)
/app/oneshot        → OneShotAdvanced (variante B, profils, recap)
/app/templates      → Templates
/app/dictionaries   → Dictionaries
/app/presets        → Presets
/app/preferences    → Preferences (dont RGPD : export/suppression)
/app/record         → Record
/app/dictate        → Dictate
/app/models         → Models (dev only)
/app/admin          → AdminDashboard (admin only)
```

### 3.2 Navigation

**Mode Simple (visiteur non-tech)** :
- Pas de sidebar
- Header minimal : logo + "Se connecter" + "Voir les plans"
- Navigation lineaire : landing → estimation → paiement → attente → resultat

**Mode App (user connecte) — Sidebar** :

```
┌─ VoiceIQ v7 ─────────────────┐
│                                │
│  PRINCIPAL                     │
│  ● Dashboard                   │
│  ● Nouveau +                   │
│  ● One-shot                    │
│                                │
│  OUTILS                        │
│  ○ Templates         [Pro]     │
│  ○ Dictionnaires     [Pro]     │
│  ○ Presets           [Pro]     │
│                                │
│  COMPTE                        │
│  ○ Plans & Usage               │
│  ○ Preferences                 │
│                                │
│  ─── Admin ──── (si admin)     │
│  ○ Monitoring                  │
│  ○ Modeles & IA                │
│                                │
│  ┌─ Plan Pro ──────────────┐   │
│  │ ████████░░  1247/2000   │   │
│  │            +200 extra   │   │
│  └─────────────────────────┘   │
└────────────────────────────────┘
```

**Regles de visibilite :**
- "Templates", "Dictionnaires", "Presets" : visibles pour tous, badge [Pro] si non debloque
- "Monitoring", "Modeles & IA" : visibles uniquement si role admin
- Jauge minutes : toujours visible en bas de sidebar
- Section "OUTILS" : collapsed par defaut au premier login, expanded apres premier usage

### 3.3 Progressive disclosure par ecran

| Ecran | Visible par defaut | Apres premier succes | Options avancees (hover/clic) |
|-------|-------------------|---------------------|-------------------------------|
| OneShotSimple | Drop zone + prix | — | Rien (pas d'options) |
| Upload | Drop zone + profil generique | Autres profils, priority, preset, langue | Backend selector (dev) |
| Dashboard | Liste transcriptions + stats | Filtres par profil/langue | Export batch (Team) |
| PlansUsage | Plan actuel + jauge | Historique usage, graphique 30j | Packs extra, comparaison |
| TranscriptionView | Texte + Resume + Points cles | Actions, Chat (si plan) | Mindmap, Slides, Quiz (si Pro) |
| Preferences | Profil par defaut, langue | — | RGPD (export/suppression) |

---

## 4. Tunnel One-shot "parfait" pour non-tech

### Principes

1. **1 page, 4 etats** (pas 4 pages) — pas de navigation, pas de chargement entre etapes
2. **Zero decision obligatoire** sauf "deposer le fichier"
3. **Le prix apparait automatiquement** apres le depot
4. **Pas de jargon** : pas de "tier", "one-shot", "profil", "pipeline"
5. **La page est la landing** : `/` = one-shot simple

### Etat 1 — Accueil (aucun fichier)

```
+------------------------------------------------------------------+
|  [VoiceIQ logo]                    [Se connecter] [Les plans →]  |
+------------------------------------------------------------------+
|                                                                    |
|           Transcrivez votre fichier audio.                        |
|           Deposez, on s'occupe du reste.                          |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |                                                              |   |
|  |         🎙  Glissez votre fichier ici                       |   |
|  |              ou cliquez pour parcourir                       |   |
|  |                                                              |   |
|  |         MP3, WAV, M4A, MP4... jusqu'a 500 Mo                |   |
|  |                                                              |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|           Vos donnees restent 100% sur votre machine.             |
|                                                                    |
|  ─── Comment ca marche ────────────────────────────────           |
|  1. Deposez votre fichier                                         |
|  2. On estime la duree et le prix                                 |
|  3. Vous recevez texte + resume + points cles                     |
|                                                                    |
+------------------------------------------------------------------+
```

**Headline** : "Transcrivez votre fichier audio."
**Sous-texte** : "Deposez, on s'occupe du reste."
**CTA** : aucun (le drop zone EST le CTA)
**Lien secondaire** : "Se connecter" / "Les plans →" dans le header

### Etat 2 — Fichier depose (estimation + prix)

```
+------------------------------------------------------------------+
|                                                                    |
|           Transcrivez votre fichier audio.                        |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  ✓  reunion-client.mp3                                      |   |
|  |     34 Mo · ~34 minutes estimees          [Changer]         |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  Votre transcription                                        |   |
|  |                                                              |   |
|  |  Prix : 4 EUR                                                |   |
|  |  Duree max : 60 minutes                                     |   |
|  |                                                              |   |
|  |  Vous recevrez :                                             |   |
|  |  ✓ Transcription complete de votre audio                    |   |
|  |  ✓ Resume en quelques lignes                                |   |
|  |  ✓ Points cles et actions a suivre                          |   |
|  |                                                              |   |
|  |  [ Transcrire mon fichier — 4 EUR ]                         |   |
|  |                                                              |   |
|  |  Paiement securise · Resultat en 2-5 min · Sans abonnement  |   |
|  +------------------------------------------------------------+   |
|                                                                    |
+------------------------------------------------------------------+
```

**Headline** : inchange
**Info fichier** : nom + taille + duree estimee + bouton "Changer"
**Prix** : gros, clair, avec "EUR"
**Ce qu'il recoit** : 3 bullets simples
**CTA** : "Transcrire mon fichier — 4 EUR"
**Reassurance** : sous le CTA, petits caracteres
**Pas de** : selecteur de profil, choix de tier, options avancees

### Etat 3 — Transcription en cours

```
+------------------------------------------------------------------+
|                                                                    |
|        [Pulse indigo anime]                                        |
|                                                                    |
|        Nous preparons vos resultats                                |
|        reunion-client.mp3 · ~34 min                                |
|                                                                    |
|        ● Fichier recu                                              |
|          Votre audio est bien arrive.                              |
|        ◉ Transcription en cours                                    |
|          Nous transformons l'audio en texte.                       |
|        ○ Resume                                                    |
|        ○ Points cles                                               |
|                                                                    |
|        Environ 2 a 5 minutes.                                      |
|                                                                    |
|        ─── Ce que vous allez obtenir ───                           |
|        ✓ Le texte complet, mot a mot                               |
|        ✓ Un resume clair en quelques lignes                        |
|        ✓ Les points cles et les actions a suivre                   |
|                                                                    |
|        ─── Le saviez-vous ? ───                                    |
|        VoiceIQ peut aussi analyser des reunions business,          |
|        des cours, des consultations medicales...                   |
|        Avec un abonnement, vous accedez a des profils             |
|        metiers, du chat IA, et des exports avances.               |
|                                                                    |
|        Vos donnees restent 100% locales sur votre machine.        |
|                                                                    |
+------------------------------------------------------------------+
```

**Titre** : "Nous preparons vos resultats"
**Timeline** : 4 etapes simples
**Benefices** : 3 bullets
**Decouverte produit** : section "Le saviez-vous ?" — mention des profils metiers et abonnements, SANS CTA, SANS bouton, juste du texte informatif
**Zero interaction** : rien a cliquer

### Etat 4 — Resultat + ouverture plans

```
+------------------------------------------------------------------+
|  [VoiceIQ logo]                    [Se connecter] [Les plans →]  |
+------------------------------------------------------------------+
|                                                                    |
|  C'est pret !  reunion-client.mp3                                 |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  TRANSCRIPTION                                               |   |
|  |  [...texte complet, scrollable...]                           |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  +--- RESUME ----+  +--- POINTS CLES ---+  +--- ACTIONS ---+     |
|  |  L'entretien  |  | • Budget valide   |  | → Envoyer le  |     |
|  |  porte sur... |  | • Deadline mars   |  |   devis avant |     |
|  |  Marc a...    |  | • Equipe de 3     |  |   vendredi    |     |
|  +---------------+  +-------------------+  +--------------+      |
|                                                                    |
|  [ Telecharger PDF ]  [ Telecharger TXT ]  [ Copier le texte ]   |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  Vous avez des fichiers a transcrire regulierement ?         |   |
|  |                                                              |   |
|  |  Avec un abonnement VoiceIQ :                               |   |
|  |  ✓ Des 0.06 EUR/min (7x moins cher que le one-shot)        |   |
|  |  ✓ Profils metiers (reunion, cours, medical, juridique)     |   |
|  |  ✓ Chat IA pour poser des questions sur vos transcriptions  |   |
|  |  ✓ Exports avances (PDF, PPTX, SRT)                        |   |
|  |                                                              |   |
|  |  [ Decouvrir les abonnements → ]     C'est tout, merci.     |   |
|  +------------------------------------------------------------+   |
|                                                                    |
+------------------------------------------------------------------+
```

**Ce qui est affiche** : transcription + resume + points cles + actions (les 3 analyses gratuites)
**Export** : PDF et TXT directement accessibles (pas besoin de plan)
**Upsell** : bandeau en bas, soft, avec 4 arguments concrets + CTA + sortie "C'est tout, merci"
**Pas de** : popup, obligation de s'inscrire, blocage de fonctionnalite

### Difference persona A vs persona B sur /oneshot

| Element | A (non-tech, /) | B (user connecte, /app/oneshot) |
|---------|-----------------|----------------------------------|
| Selecteur profil | Cache (auto: generique) | Visible (5 profils) |
| Choix de tier | Cache (auto-detecte) | Visible (grille 3 colonnes) |
| Recap detaille | Prix + 3 bullets | Fichier + profil + tier + features + prix |
| Backend selector | Cache | Visible (dev) |
| Comparaison prix | Apres resultat (bandeau soft) | Avant paiement (section bas) |
| Sidebar | Absente | Presente |

---

## 5. Wireframes ecrans App (user connecte)

### 5.1 Dashboard simplifie

```
+------------------------------------------------------------------+
|  Dashboard                                    [ + Nouveau ]       |
+------------------------------------------------------------------+
|  +------+ +------+ +------+ +------+                              |
|  | 24   | | 8h20 | | 3    | | 156  |                             |
|  | trans.| | duree| | lang.| | anal.|                             |
|  +------+ +------+ +------+ +------+                              |
|                                                                    |
|  [Rechercher...]                                                   |
|                                                                    |
|  reunion-client.mp3           Business   45:20   il y a 2h       |
|  brief-creatif.m4a            Generique  12:05   hier            |
|  cours-marketing-S4.wav       Education  1:23:10 il y a 3j       |
|                                                                    |
+------------------------------------------------------------------+
```

### 5.2 Page Plans & Usage (refonte)

```
+------------------------------------------------------------------+
|  Mon abonnement                                                    |
+------------------------------------------------------------------+
|  +------------------------------------------------------------+   |
|  |  Plan Pro                          49 EUR/mois              |   |
|  |  ████████████░░░░  1247 / 2000 min  (+200 extra)           |   |
|  |  Renouvellement : 1er avril 2026                            |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  +--- Usage ce mois ---+  +--- Par profil ----+                  |
|  |  ▅▃▇▅▂▆▃▅▇▂▃▅▇▃  |  | Business    680 min |                |
|  |  (graphique 30j)    |  | Education   320 min |                |
|  |  24 transcriptions  |  | Generique   247 min |                |
|  +---------------------+  +--------------------+                  |
|                                                                    |
|  ─── Recharger ───                                                |
|  [Pack S 100min 3EUR] [Pack M 500min 12EUR] [Pack L 2000min 40EUR]|
|                                                                    |
|  ─── Changer de plan ───                                          |
|  [Gratuit 0EUR] [Basic 19EUR] [Pro ★ actuel] [Equipe+ 99EUR]    |
|                                                                    |
+------------------------------------------------------------------+
```

---

## PARTIE II — HISTORIQUE (Passes 1-4 preservees)

(voir git history pour le contenu original des sections 1-7)

---

## Checklist UX pre-production (mise a jour)

### Tunnel One-shot Simple
- [ ] La page `/` est le one-shot simple (pas le dashboard)
- [ ] Aucun selecteur de profil visible pour un visiteur
- [ ] Le prix apparait automatiquement apres depot du fichier
- [ ] Le CTA principal = "Transcrire mon fichier — X EUR"
- [ ] L'ecran d'attente mentionne les profils metiers (texte, pas CTA)
- [ ] Le resultat propose l'export PDF/TXT sans inscription
- [ ] L'upsell est un bandeau soft en bas du resultat, pas un popup
- [ ] Le lien "C'est tout, merci" ferme le bandeau upsell

### Transition Simple → App
- [ ] Apres clic "Decouvrir les abonnements", redirection vers /plans (public)
- [ ] Apres inscription, le one-shot precedent est visible dans le dashboard
- [ ] Le profil "Generique" est pre-selectionne au premier upload en mode App

### Mode App
- [ ] La sidebar groupe les items en 3 sections : Principal / Outils / Compte
- [ ] Les items "Outils" montrent un badge [Pro] si non debloque
- [ ] La section Admin n'apparait que pour les admins
- [ ] La jauge minutes est toujours visible en bas de sidebar

---

## Passe QA & Ameliorations UX (2026-03-08)

### Ameliorations implementees (priorite haute → basse)

| # | Amelioration | Impact | Fichiers |
|---|-------------|--------|----------|
| 1 | Accents francais corriges (~50+ chaines) | Credibilite produit, marche francophone | 12 fichiers frontend |
| 2 | Feedback erreur export (TranscriptionResult) | L'utilisateur sait pourquoi le telechargement echoue | TranscriptionResult.tsx |
| 3 | Feedback erreur save (Preferences) | L'utilisateur sait si ses preferences sont enregistrees | Preferences.tsx |
| 4 | Validation duree one-shot (max 90 min) | Evite des fichiers trop longs qui bloquent le pipeline | main.py |
| 5 | Nettoyage sessions anonymes (auto 1h) | Evite l'accumulation de sessions expirees en base | main.py |

### Recommandations UX restantes (a traiter plus tard)

| # | Priorite | Recommandation |
|---|----------|----------------|
| 1 | P1 | Ajouter un toast de confirmation apres export PDF/TXT reussi |
| 2 | P1 | Skeleton loaders au lieu de spinner simple sur Dashboard et PlansUsage |
| 3 | P2 | Animation de transition entre les 4 etats du tunnel one-shot |
| 4 | P2 | Tooltip explicatif sur les badges [Pro] dans la sidebar |
| 5 | P3 | Mode sombre coherent sur les pages Simple (actuellement toujours dark) |

---

## Retour QA interactive (2026-03-08)

### Ce qui marche bien
1. **Tunnel one-shot simple** (`/`) : flow fluide en 4 etats, zero decision obligatoire, drop zone → estimation → paiement → attente → resultat. UX conforme aux wireframes.
2. **Ecran d'attente** : timeline 4 etapes, benefits, section "Le saviez-vous", reassurance confidentialite — zero friction pendant l'attente.
3. **PlansUsage** : banniere plan actuel claire, jauge visuelle, stats usage, grille plans avec badge "Recommande" bien mis en valeur.
4. **Preferences RGPD** : export JSON + suppression double-confirmation — conforme RGPD Art. 17 & 20.
5. **Admin dashboard** : stats aggregees + auto-refresh 15s — monitoring operationnel.

### Ce qui reste fragile
1. **Jauge sidebar** ne se refresh pas en temps reel apres un upload ou un changement de plan — il faut recharger la page. A terme : event bus ou polling leger.
2. **Labels sidebar** inconsistants FR/EN : "Dashboard", "Upload", "Templates", "Presets" restent en anglais. Pas bloquant (termes tech reconnus) mais manque de coherence.
3. **Erreurs silencieuses** : certains catch blocks font `console.error` sans feedback utilisateur (ex: PlansUsage load, QuotaAlert fetch). Les actions principales sont maintenant couvertes (save, export, changePlan, buyExtraMinutes).
4. **Mode Simple toujours en dark** : pas de toggle light/dark pour les visiteurs. Le mode App a le toggle dans la sidebar.
5. **Oneshot App vs Simple** : le flow App (`/app/oneshot`) a des options avancees (profils, backend selector) mais le tunnel Simple (`/`) est volontairement minimal — la difference est voulue mais pourrait surprendre un user qui decouvre le mode App apres le one-shot.
