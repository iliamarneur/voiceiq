# Frontend Site Marketing — Mission v7_plans_minutes

## 1. Structure du site vitrine

Le site marketing est une landing page multi-sections, deployable en statique (ou integre au frontend React).

### Architecture proposee

```
/                   → Landing page principale (PME)
/education          → Landing page Education/Profs
/oneshot            → Landing page One-shot particuliers
/pricing            → Page tarifs detaillee
/product            → Page produit (features)
/about              → A propos
/signup             → Inscription (redirige vers app)
```

## 2. Landing page principale (PME / Independants)

### Section 1 : Hero
```
+------------------------------------------------------------------+
|                                                                    |
|  Transformez vos reunions en comptes-rendus                       |
|  intelligents en 2 minutes.                                       |
|                                                                    |
|  Transcription IA locale + analyse automatique.                   |
|  Vos donnees restent chez vous.                                   |
|                                                                    |
|  [Commencer dès 3 EUR]   [Voir une demo]                          |
|                                                                    |
|  Dès 3 EUR par transcription                                      |
|                                                                    |
|  +------------------------------------------------------+         |
|  |  [Screenshot app : transcription + resume]            |         |
|  +------------------------------------------------------+         |
|                                                                    |
+------------------------------------------------------------------+
```

### Section 2 : Social proof
```
Ils nous font confiance :
[Logo 1] [Logo 2] [Logo 3] [Logo 4] [Logo 5]
"J'ai gagne 3h par semaine sur mes comptes-rendus" — Marie D., consultante
```

### Section 3 : Comment ca marche (3 etapes)
```
1. Deposez           2. VoiceIQ analyse       3. Exploitez
   votre audio          et transcrit              vos resultats

[icone upload]      [icone IA/engrenage]      [icone document]

Glissez un fichier  Transcription Whisper     Resume, points cles,
audio ou video.     + analyse IA contextuelle actions, quiz, export
                    selon votre profil metier PDF, PPTX, SRT...
```

### Section 4 : Benefices cles (pas features)
```
+------------------+ +------------------+ +------------------+
| Gagnez du temps  | | 100% confidentiel| | Prix transparent |
|                  | |                  | |                  |
| 2h/semaine en    | | Traitement local | | Des 3 EUR        |
| moyenne sur vos  | | sur votre infra. | | Payez ce que     |
| comptes-rendus.  | | Rien ne sort.    | | vous utilisez.   |
+------------------+ +------------------+ +------------------+

+------------------+ +------------------+ +------------------+
| Multi-profils    | | Export pro       | | IA contextuelle  |
|                  | |                  | |                  |
| Business, educ,  | | PDF, PPTX, SRT, | | Resume, actions, |
| medical, legal.  | | VTT, Markdown.  | | quiz, flashcards.|
+------------------+ +------------------+ +------------------+
```

### Section 5 : Pricing preview
```
Choisissez votre formule

[Basic - 19EUR]     [Pro - 49EUR]      [Équipe+ - 99EUR]
  500 min        ★ 3000 min ★          10000 min

                             [Voir tous les details →]

Besoin ponctuel ? [Essayer le one-shot dès 3 EUR →]
```

### Section 6 : Temoignages
```
"VoiceIQ a change notre facon de documenter nos reunions client."
— Pierre L., directeur commercial, 45 employes

"Je genere mes quiz de fin de chapitre en 2 minutes au lieu de 30."
— Sophie M., professeure de SVT
```

### Section 7 : FAQ
```
Q: Mes donnees sont-elles envoyees dans le cloud ?
R: Non. VoiceIQ fonctionne 100% en local sur votre infrastructure.

Q: Puis-je essayer sans m'engager ?
R: Oui, le one-shot permet une transcription ponctuelle dès 3 EUR, sans abonnement.

Q: Quels formats audio sont supportes ?
R: MP3, WAV, M4A, FLAC, OGG, MP4, MKV et 10+ autres formats.

Q: Comment fonctionne la facturation ?
R: Abonnement mensuel avec minutes incluses, ou achat ponctuel (one-shot).
```

### Section 8 : CTA final
```
Pret a gagner du temps ?

[Commencer dès 3 EUR]

Annulation a tout moment
```

## 3. Landing Education

Adaptations par rapport a la landing PME :
- Hero : "Transformez vos cours en supports pedagogiques intelligents"
- Benefices : quiz automatiques, flashcards, chapitrage
- Pricing : mettre en avant le plan Team (etablissement)
- Temoignages : enseignants, formateurs
- CTA : "Essayez avec votre prochain cours"

## 4. Page Tarifs detaillee

```
+------------------------------------------------------------------+
|  Tarifs simples et transparents                                    |
|                                                                    |
|  [Mensuel]  [Annuel (-20%)]                                      |
|                                                                    |
|  +-----------+ +--[POPULAIRE]--+ +-----------+                    |
|  | Basic     | | Pro           | | Équipe+   |                    |
|  | 19 EUR/mo | | 49 EUR/mo     | | 99 EUR/mo |                    |
|  | 500 min   | | 3000 min      | | 10000 min |                    |
|  |           | |               | |           |                    |
|  | [Feature comparison table - voir COPY pour details]      |     |
|  |           | |               | |           |                    |
|  | [Choisir] | | [Choisir]     | | [Contacter]|                   |
|  +-----------+ +---------------+ +-----------+                    |
|                                                                    |
|  ONE-SHOT (sans abonnement)                                       |
|  Court 3 EUR/30min | Standard 6 EUR/60min | Long 9 EUR/90min     |
|  XLong 12 EUR/120min | XXLong 15 EUR/150min | XXXLong 18 EUR/180min |
|                                                                    |
|  FAQ Tarifs                                                        |
|  [...]                                                             |
+------------------------------------------------------------------+
```

## 5. Stack technique site

Option A (recommandee) : Pages integrees au frontend React existant
- Avantage : pas de deploy separe, meme stack
- Route `/`, `/education`, `/pricing` rendues cote client
- SEO : prerendering avec vite-plugin-ssr ou react-snap

Option B : Site statique separe (Astro/Next.js)
- Plus performant SEO
- Maintenance separee
- A considerer quand le trafic justifie le SSR

**Recommandation : Option A pour le MVP, migration Option B plus tard si besoin SEO.**

## 6. Responsive design

- Mobile-first : toutes les sections empilees verticalement
- Grille plans : 1 colonne mobile, 2 colonnes tablette, 3 colonnes desktop
- Hero : image sous le texte en mobile
- Navigation : hamburger menu mobile
- CTA : boutons full-width en mobile
