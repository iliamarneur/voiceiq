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
| Prix/min | 0.010-0.038 EUR | ~0.007-0.014 EUR | ~0.003-0.008 USD |
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
- Budget : 3-18 EUR ponctuel
- Canal : Google Ads "transcrire audio en texte", SEO
- Message : "Transcrivez un fichier audio pour 3 EUR, sans abonnement"

### Segment D : Professions liberales (avocats, medecins)
- Besoin : transcription confidentielle de consultations
- Budget : 49-99 EUR/mois
- Canal : ordres professionnels, presse specialisee
- Message : "Confidentialite totale pour vos consultations"

## 3. Offre & Pricing Strategy

### Strategie : 3 plans payes + One-shot

```
         Particuliers          PME/Solo           PME/Equipe         Education
         ──────────           ─────────           ──────────         ─────────
         One-shot             Basic               Pro                Team
         3-18 EUR             19 EUR/mois         49 EUR/mois        99 EUR/mois
         Ponctuel             500 min             3000 min           10000 min
```

### Logique de pricing
- **Cout reel** : ~0.003 EUR/min (GPU local)
- **Prix plan Pro** : 49 EUR / 3000 min = 0.016 EUR/min → **marge 81%**
- **Prix one-shot Standard** : 6 EUR / 60 min = 0.10 EUR/min → **marge 97%**
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
| Basic | 19 EUR | 500/mois | 0.038 EUR | Transcription, resume, points cles, actions, quiz, export PDF |
| Pro | 49 EUR | 3000/mois | 0.016 EUR | + tous profils, batch, PPTX, chat IA, priorite |
| Team | 99 EUR | 10000/mois | 0.0099 EUR | + multi-workspace, flashcards, API |

One-shot (6 formules) : Court (30 min, 3 EUR), Standard (60 min, 6 EUR), Long (90 min, 9 EUR), XLong (120 min, 12 EUR), XXLong (150 min, 15 EUR), XXXLong (180 min, 18 EUR)
Alertes : warning a 75%, critical a 90%

### 4.2 Points forts de la grille

1. **Progression logique des prix** : le prix/min baisse a chaque palier (0.038 → 0.016 → 0.0099), recompensant l'engagement
2. **One-shot accessible** : des 3 EUR pour une transcription ponctuelle, sans abonnement — ideal pour tester le service
3. **6 tiers one-shot clairs** : 3-18 EUR couvre tous les besoins de 30 min a 180 min, prix lineaire et previsible
4. **3 plans payes simples** : pas de plan gratuit qui dilue la valeur, chaque plan offre un vrai volume de minutes

### 4.3 Risques de perception et frustration

| Risque | Explication | Impact | Mitigation proposee |
|--------|------------|--------|---------------------|
| **Saut Basic → Pro** | L'ecart Basic (500 min) → Pro (3000 min) est un facteur 6x pour un facteur prix 2.6x — excellent rapport, mais le saut en prix absolu (19 → 49 EUR) peut freiner les independants | Moyen | Mettre en avant le prix/min ("0.016 EUR/min vs 0.038 EUR/min") sur la page pricing |
| **Decouverte sans abonnement** | Sans plan gratuit, les utilisateurs doivent payer pour tester — le one-shot des 3 EUR sert de porte d'entree a faible risque | Moyen | Mettre en avant le one-shot Court (3 EUR, 30 min) comme moyen de decouverte, avec un CTA clair "Essayer des 3 EUR" |
| **Pas de plan annuel** | Tous les plans sont mensuels — pas de reduction pour engagement annuel | Faible | Ajouter une option annuelle avec -20% (ex: Pro annuel = 39 EUR/mois = 468 EUR/an au lieu de 588 EUR) |
| **"Team" evoque grandes equipes** | Le nom "Equipe+ (Education)" est ambigu — c'est un plan premium, mais le nom suggere qu'il faut etre une equipe pour l'utiliser | Moyen | Renommer en "Premium" ou "Institution" ou laisser "Equipe+" mais ajouter un sous-texte "Pour les pros et etablissements" |

### 4.4 Recommandations structurelles (sans changer les prix)

**Recommandation 1 : Mettre le plan Pro en "sweet spot" visuel**
Le Pro est le meilleur rapport qualite-prix (0.016 EUR/min). Il doit etre :
- Visuellement mis en avant (badge "Populaire" ou "Meilleur rapport qualite-prix")
- Positionne au centre de la grille (colonne 3 sur 4)
- Avec un design legerement plus grand / plus colore que les autres
→ C'est deja le cas en partie dans PlansUsage.tsx (gradient violet), mais il manque un badge explicite.

**Recommandation 2 : Clarifier la separation one-shot vs abonnement**
- Sur la page One-shot : presenter les 6 tiers clairement (Court a XXXLong, 3-18 EUR)
- Sur la page Plans : ne pas mentionner le one-shot dans la grille de plans, mais avoir un lien clair "Besoin d'une seule transcription ? →"
- Deux entrees distinctes dans la sidebar (deja fait : "Plans & Usage" et "One-shot")

**Recommandation 3 : Ajouter un comparateur prix/min**
Sur la page pricing, afficher pour chaque plan :
- Le prix par minute (ex: "0.016 EUR/min" pour Pro)
- L'equivalent en reunions (ex: "~66 reunions de 45 min / mois")
- La comparaison avec le one-shot (ex: "7x moins cher qu'en one-shot")

### 4.5 Messages cles pour marketing + in-app

| Contexte | Message principal | Message secondaire |
|----------|------------------|--------------------|
| Landing PME | "Gagnez 2h par semaine sur vos comptes-rendus" | "Transcription IA + analyse automatique. 100% local." |
| Landing Education | "Generez quiz et flashcards a partir de vos cours" | "Deposez un enregistrement, recevez vos supports." |
| Page One-shot | "Transcrivez un fichier pour 3 EUR. Sans abonnement." | "Paiement securise. Resultat en 2-5 minutes." |
| Page Plans (hero) | "Choisissez votre rythme" | "Des 19 EUR/mois. Changez ou annulez a tout moment." |
| Alerte quota 75% | "Plus que {X} minutes ce mois-ci" | "Ajoutez des minutes pour continuer sans interruption." |
| Alerte quota 100% | "Quota atteint pour ce mois" | "Rechargez en 1 clic ou passez au plan superieur." |
| Email onboarding J+0 | "Bienvenue — choisissez un abonnement pour commencer" | "Deposez votre premier fichier en 30 secondes." |
| Email J+10 | "Vous avez utilise {X}% de vos minutes" | "Passez au plan Basic pour 500 min/mois." |
| CTA sidebar (plan epuise) | "Rechargez vos minutes" | "Passez au plan superieur ou utilisez le one-shot." |

### 4.6 Propositions d'A/B tests

#### Test 1 : CTA one-shot sur la landing (impact sur conversion)
- **Variante A** (actuelle) : "Essayer le one-shot des 3 EUR"
- **Variante B** : "Commencer des 3 EUR — sans abonnement"
- **Variante C** : "Transcrivez votre premier fichier pour 3 EUR"
- **Metrique cle** : taux de clic CTA → completion one-shot dans les 7 premiers jours
- **Hypothese** : la Variante C (orientee action) convertit mieux car elle est plus concrete

#### Test 2 : Copy de l'alerte quota (impact sur achat de packs)
- **Variante A** (actuelle) : "Il vous reste {X} minutes sur votre plan."
- **Variante B** : "Plus que {X} minutes. Passez au plan superieur pour plus de minutes a meilleur prix."
- **Variante C** : "Plus que {X} minutes. A votre rythme actuel, vous serez a court dans ~{Y} jours."
- **Metrique cle** : taux de clic sur le CTA alerte → upgrade plan
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
2. Essai one-shot → Premiere transcription des 3 EUR, sans abonnement
3. Activation     → Premier fichier transcrit en < 5 min
4. Engagement     → 2+ one-shots ou souscription plan Basic
5. Conversion     → CTA upgrade vers plan mensuel
6. Retention      → Valeur recurrente (CR hebdo, cours mensuels)
7. Expansion      → Upgrade plan, recommandation
```

### Metriques funnel cibles
| Etape | Taux cible | Action si en dessous |
|-------|-----------|---------------------|
| Visite → 1er one-shot | 3-5% | Optimiser landing, A/B test CTA |
| 1er one-shot → inscription | 40%+ | Email post-achat, valeur ajoutee visible |
| Inscription → plan mensuel | 15-25% | Onboarding email, comparaison prix/min |
| One-shot → abonnement (30j) | 10-15% | Emails J+3, J+7 avec use cases + economies |
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
- Deploiement A/B test 1 (CTA one-shot sur la landing)

### Mois 3 : Optimisation
- A/B tests landing page (hero, CTA, pricing)
- A/B test 2 (copy alertes quota)
- A/B test 3 (page one-shot simple vs power)
- Retargeting Ads (visiteurs non convertis)
- Programme referral (parrainage = 1 one-shot Court offert)
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
