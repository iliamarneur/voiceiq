# Marketing Strategist — Mission v7_plans_minutes

## 1. Positionnement

### Tagline
**"Transcription IA locale. Vos donnees restent chez vous."**

### Positionnement marche
VoiceIQ se positionne comme l'alternative **locale et confidentielle** aux services cloud (Otter.ai, Deepgram, Rev.ai) pour les professionnels soucieux de la confidentialite de leurs donnees.

| Axe | VoiceIQ | Otter.ai | Deepgram/Rev.ai |
|-----|---------|----------|-----------------|
| Traitement | 100% local | Cloud | Cloud API |
| Confidentialite | Totale | Donnees sur serveurs US | Donnees sur serveurs |
| Prix/min | ~0.025 EUR | ~0.007-0.014 EUR | ~0.003-0.008 USD |
| Analyse IA | Resume, actions, quiz, flashcards | Resume, actions | Transcription pure |
| Cible | PME, profs, liberaux FR | Entreprises US | Developpeurs |
| Langue | Multi (Whisper) | EN principalement | Multi |

### Differentiation cle
1. **Confidentialite** : aucune donnee ne quitte l'infrastructure du client
2. **Analyse contextuelle** : pas juste de la transcription, mais des analyses metier (business, education, medical, legal)
3. **Pricing simple** : plans clairs + one-shot, pas de pricing API complexe
4. **Francophone** : interface et support en francais

## 2. Segments cibles

### Segment A : PME & Independants (cible principale)
- Taille : 1-50 employes
- Besoin : comptes-rendus reunions, appels clients
- Budget : 19-49 EUR/mois
- Canal : LinkedIn, Google Ads "transcription reunion", SEO
- Message : "Gagnez 2h/semaine sur vos comptes-rendus"

### Segment B : Education / Formation
- Taille : enseignants individuels ou etablissements
- Besoin : supports pedagogiques automatiques (quiz, flashcards)
- Budget : 19 EUR (individuel) ou 99 EUR (etablissement)
- Canal : reseaux profs, salons education, partenariats academiques
- Message : "Transformez vos cours en supports pedagogiques en 2 minutes"

### Segment C : Particuliers / Usage ponctuel
- Besoin : transcription occasionnelle (interview, memo vocal)
- Budget : 3-5 EUR ponctuel
- Canal : Google Ads "transcrire audio en texte", SEO
- Message : "Transcrivez un fichier audio pour 3 EUR, sans abonnement"

### Segment D : Professions liberales (avocats, medecins)
- Besoin : transcription confidentielle de consultations
- Budget : 49-99 EUR/mois
- Canal : ordres professionnels, presse specialisee
- Message : "Confidentialite totale pour vos consultations"

## 3. Offre & Pricing Strategy

### Strategie : Good-Better-Best + One-shot

```
         Particuliers          PME/Solo           PME/Equipe         Education
         ──────────           ─────────           ──────────         ─────────
         One-shot             Basic               Pro                Team
         3-5 EUR              19 EUR/mois         49 EUR/mois        99 EUR/mois
         Ponctuel             300 min             2000 min           5000 min
```

### Logique de pricing
- **Cout reel** : ~0.003 EUR/min (GPU local)
- **Prix plan Pro** : 49 EUR / 2000 min = 0.0245 EUR/min → **marge 88%**
- **Prix one-shot** : 4 EUR / 60 min = 0.067 EUR/min → **marge 96%**
- **Reference marche** : Otter.ai Pro a ~17 USD pour 1200 min = 0.014 USD/min

VoiceIQ est legerement plus cher que Otter.ai par minute, mais offre :
- Confidentialite locale (argument premium)
- Analyses IA contextuelles (pas juste transcription)
- Multi-profils metier

---

## 4. Perception pricing / valeur — Analyse Passe 2

### 4.1 Grille actuelle (plans.json)

| Plan | Prix | Minutes | Prix/min | Features cles |
|------|------|---------|----------|---------------|
| Gratuit | 0 EUR | 60/mois | gratuit | Transcription, resume, points cles |
| Basic | 19 EUR | 300/mois | 0.063 EUR | + actions, quiz, chat, export PDF |
| Pro | 49 EUR | 2000/mois | 0.025 EUR | + tous profils, batch, PPTX, priorite |
| Team | 99 EUR | 5000/mois | 0.020 EUR | + multi-workspace, flashcards, API |

Packs extra : S (100 min, 3 EUR, 0.03/min), M (500 min, 12 EUR, 0.024/min), L (2000 min, 40 EUR, 0.02/min)
One-shot : Court (30 min, 3 EUR), Standard (60 min, 4 EUR), Long (90 min, 5 EUR)
Alertes : warning a 75%, critical a 90%

### 4.2 Points forts de la grille

1. **Progression logique des prix** : le prix/min baisse a chaque palier (0.063 → 0.025 → 0.020), recompensant l'engagement
2. **Plan gratuit genereux** : 60 min/mois permet de traiter ~1 reunion ou cours par semaine — suffisant pour tester
3. **One-shot bien positionne** : 3-5 EUR est un prix psychologiquement faible, accessible sans reflexion
4. **Packs extra coherents** : les prix/min sont alignes avec le plan equivalent (pack L = meme prix/min que le plan Team)

### 4.3 Risques de perception et frustration

| Risque | Explication | Impact | Mitigation proposee |
|--------|------------|--------|---------------------|
| **Saut Basic → Pro** | L'ecart Basic (300 min) → Pro (2000 min) est un facteur 6.7x pour un facteur prix 2.6x — excellent rapport, mais le saut en prix absolu (19 → 49 EUR) peut freiner les independants | Moyen | Mettre en avant le prix/min ("0.025 EUR/min vs 0.063 EUR/min") sur la page pricing |
| **Free trop limite en features** | Le plan gratuit n'inclut que 3 features (transcription, resume, keypoints) — un utilisateur qui decouvre ne voit pas la valeur des actions, du chat, du quiz | Haut | Proposer 1-2 "degustations" : permettre 3 analyses avancees gratuites (quiz, actions) pour montrer la valeur |
| **Confusion one-shot vs pack** | Le pack S (100 min, 3 EUR) a le meme prix qu'un one-shot S (30 min, 3 EUR) — mais l'un donne 100 min et l'autre 30 min. Un utilisateur pourrait se sentir arnaque par le one-shot | Moyen | Clarifier la distinction : le one-shot est "sans compte, sans engagement", le pack necessite un compte. Le one-shot paye la commodite |
| **Pas de plan annuel** | Tous les plans sont mensuels — pas de reduction pour engagement annuel | Faible | Ajouter une option annuelle avec -20% (ex: Pro annuel = 39 EUR/mois = 468 EUR/an au lieu de 588 EUR) |
| **"Team" evoque grandes equipes** | Le nom "Equipe+ (Education)" est ambigu — c'est un plan premium, mais le nom suggere qu'il faut etre une equipe pour l'utiliser | Moyen | Renommer en "Premium" ou "Institution" ou laisser "Equipe+" mais ajouter un sous-texte "Pour les pros et etablissements" |

### 4.4 Recommandations structurelles (sans changer les prix)

**Recommandation 1 : Mettre le plan Pro en "sweet spot" visuel**
Le Pro est le meilleur rapport qualite-prix (0.025 EUR/min). Il doit etre :
- Visuellement mis en avant (badge "Populaire" ou "Meilleur rapport qualite-prix")
- Positionne au centre de la grille (colonne 3 sur 4)
- Avec un design legerement plus grand / plus colore que les autres
→ C'est deja le cas en partie dans PlansUsage.tsx (gradient violet), mais il manque un badge explicite.

**Recommandation 2 : Clarifier la separation one-shot vs abonnement**
- Sur la page One-shot : ne pas mentionner les packs extra (ça brouille le message)
- Sur la page Plans : ne pas mentionner le one-shot dans la grille de plans, mais avoir un lien clair "Besoin d'une seule transcription ? →"
- Deux entrees distinctes dans la sidebar (deja fait : "Plans & Usage" et "One-shot")

**Recommandation 3 : Ajouter un comparateur prix/min**
Sur la page pricing, afficher pour chaque plan :
- Le prix par minute (ex: "0.025 EUR/min" pour Pro)
- L'equivalent en reunions (ex: "~44 reunions de 45 min / mois")
- La comparaison avec le one-shot (ex: "7x moins cher qu'en one-shot")

### 4.5 Messages cles pour marketing + in-app

| Contexte | Message principal | Message secondaire |
|----------|------------------|--------------------|
| Landing PME | "Gagnez 2h par semaine sur vos comptes-rendus" | "Transcription IA + analyse automatique. 100% local." |
| Landing Education | "Generez quiz et flashcards a partir de vos cours" | "Deposez un enregistrement, recevez vos supports." |
| Page One-shot | "Transcrivez un fichier pour 3 EUR. Sans compte." | "Paiement securise. Resultat en 2-5 minutes." |
| Page Plans (hero) | "Choisissez votre rythme" | "60 minutes offertes. Changez ou annulez a tout moment." |
| Alerte quota 75% | "Plus que {X} minutes ce mois-ci" | "Ajoutez des minutes pour continuer sans interruption." |
| Alerte quota 100% | "Quota atteint pour ce mois" | "Rechargez en 1 clic ou passez au plan superieur." |
| Email onboarding J+0 | "Bienvenue ! 60 minutes vous attendent." | "Deposez votre premier fichier en 30 secondes." |
| Email J+10 | "Vous avez utilise {X}% de vos minutes" | "Passez au plan Basic pour 300 min/mois." |
| CTA sidebar (plan epuise) | "Rechargez vos minutes" | "Des 3 EUR pour 100 minutes." |

### 4.6 Propositions d'A/B tests

#### Test 1 : Duree du plan gratuit (impact sur conversion)
- **Variante A** (actuelle) : 60 min/mois
- **Variante B** : 90 min/mois
- **Variante C** : 30 min/mois mais avec 3 analyses avancees offertes (quiz, actions, chat)
- **Metrique cle** : taux de conversion Gratuit → Basic dans les 30 premiers jours
- **Hypothese** : la Variante C convertit mieux car l'utilisateur decouvre la valeur des features avancees

#### Test 2 : Copy de l'alerte quota (impact sur achat de packs)
- **Variante A** (actuelle) : "Il vous reste {X} minutes sur votre plan."
- **Variante B** : "Plus que {X} minutes. Ajoutez 100 min pour 3 EUR — moins cher qu'un cafe."
- **Variante C** : "Plus que {X} minutes. A votre rythme actuel, vous serez a court dans ~{Y} jours."
- **Metrique cle** : taux de clic sur le CTA alerte → achat de pack ou upgrade plan
- **Hypothese** : la Variante B (ancrage prix cafe) ou C (projection temporelle) declenchent plus d'action que le message neutre

#### Test 3 : Page One-shot — Simple vs Power (impact sur completion)
- **Variante A** : parcours simplifie (upload → prix → payer, pas de choix de profil ni de grille de tiers)
- **Variante B** (actuelle) : parcours complet avec grille de tiers, profil, recapitulatif
- **Metrique cle** : taux de completion du parcours one-shot (fichier depose → paiement effectue)
- **Hypothese** : la Variante A a un meilleur taux de completion mais un panier moyen plus bas

---

## 5. Funnel acquisition

```
1. Decouverte     → SEO, Ads, bouche a oreille
2. Essai gratuit  → 60 min/mois, inscription email seule
3. Activation     → Premier fichier transcrit en < 5 min
4. Engagement     → 3+ fichiers dans les 14 premiers jours
5. Conversion     → Alerte quota + CTA upgrade
6. Retention      → Valeur recurrente (CR hebdo, cours mensuels)
7. Expansion      → Packs extra, upgrade plan, recommandation
```

### Metriques funnel cibles
| Etape | Taux cible | Action si en dessous |
|-------|-----------|---------------------|
| Visite → Signup | 5-8% | Optimiser landing, A/B test CTA |
| Signup → 1er fichier | 60%+ | Onboarding email J+1, simplifier upload |
| 1er fichier → 3 fichiers (14j) | 40%+ | Emails J+3, J+7 avec use cases |
| Gratuit → Payant | 8-12% | Alertes quota, valeur ajoutee visible |
| Churn mensuel | < 5% | Emails retention, enquete depart |

## 6. Calendrier marketing (3 mois)

### Mois 1 : Fondations
- Landing page PME + Education deployees
- SEO : 5 articles blog (transcription reunion, CR automatique, etc.)
- Setup Google Ads (mots-cles : "transcrire audio", "compte-rendu reunion IA")
- Email onboarding sequence (5 emails sur 14 jours)

### Mois 2 : Traction
- Page one-shot + landing particuliers
- LinkedIn : 2 posts/semaine (use cases, temoignages)
- Partenariats : 2-3 blogueurs/influenceurs productivite
- First 50 users → feedback + temoignages
- Deploiement A/B test 1 (duree plan gratuit)

### Mois 3 : Optimisation
- A/B tests landing page (hero, CTA, pricing)
- A/B test 2 (copy alertes quota)
- A/B test 3 (page one-shot simple vs power)
- Retargeting Ads (visiteurs non convertis)
- Programme referral (parrainage = 50 min gratuites)
- Premier cas client detaille (etude de cas PME)

## 7. Canaux de communication

| Canal | Segment | Contenu | Frequence |
|-------|---------|---------|-----------|
| Blog/SEO | Tous | Articles How-to, comparatifs | 2/semaine |
| Google Ads | PME, particuliers | Landing pages ciblees | Continu |
| LinkedIn | PME, liberaux | Use cases, temoignages | 2/semaine |
| Email | Users inscrits | Onboarding, tips, upgrade | Sequence auto |
| Twitter/X | Tech, early adopters | Features, updates | 1/semaine |
| Partenariats | Education | Etablissements, ESPE | Ponctuel |
