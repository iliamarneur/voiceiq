---
title: "Transcription Médicale : Générer une Note SOAP par IA Locale"
slug: "transcription-medicale-note-soap-ia"
description: "Comment générer automatiquement des notes SOAP à partir de consultations audio avec une IA locale. Guide pour médecins et établissements de santé."
canonical: "https://clearrecap.com/blog/transcription-medicale-note-soap-ia"
ogTitle: "Notes SOAP automatiques par IA locale : le guide pour médecins"
ogDescription: "Générez des notes SOAP structurées à partir de vos consultations audio, sans envoyer de données patient dans le cloud."
ogImage: "https://clearrecap.com/blog/images/transcription-medicale-note-soap-ia-og.png"
category: "medical"
tags: ["transcription médicale", "note soap", "ia médicale locale", "dossier patient"]
author: "Ilia Moui — CEO & Fondateur, ClearRecap"
authorUrl: "https://clearrecap.com/auteur/fondateur-clearrecap"
date: "2026-03-11"
lastModified: "2026-03-11"
readingTime: "15 min"
profile: "medical"
targetKeyword: "transcription médicale ia"
secondaryKeywords: ["note soap automatique", "dictée médicale ia", "transcription consultation"]
searchIntent: "informationnel"
funnel: "mofu"
publishDate: "2026-03-11T00:00:00"
status: "published"
---

<!-- JSON-LD Schema -->
<!--
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Transcription Médicale : Générer une Note SOAP par IA Locale",
  "description": "Comment générer automatiquement des notes SOAP à partir de consultations audio avec une IA locale. Guide pour médecins et établissements de santé.",
  "image": "https://clearrecap.com/blog/images/transcription-medicale-note-soap-ia-og.png",
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
      "url": "https://clearrecap.com/logo.png"
    }
  },
  "datePublished": "2026-03-25",
  "dateModified": "2026-03-11",
  "mainEntityOfPage": "https://clearrecap.com/blog/transcription-medicale-note-soap-ia",
  "keywords": ["transcription médicale", "note soap", "ia médicale locale", "dossier patient"],
  "about": {
    "@type": "MedicalEntity",
    "name": "Medical Transcription",
    "description": "AI-powered medical transcription for SOAP notes"
  }
}
</script>
-->

# Transcription Médicale : Générer une Note SOAP par IA Locale

Un médecin généraliste passe en moyenne 16 minutes par consultation. Il en consacre 7 à la rédaction du compte rendu. Presque la moitié. Ce chiffre vient d'une étude DREES de 2024 sur les pratiques administratives des médecins libéraux, et chaque praticien que je croise me confirme que c'est plutôt optimiste.

Quand nous avons commencé à développer le module médical de ClearRecap, cette absurdité temporelle était notre point de départ. Pas la technologie. Pas le marché. Le fait qu'un médecin passe autant de temps à écrire qu'à soigner.

Mais transformer une consultation audio en note SOAP structurée, c'est un problème infiniment plus complexe qu'une transcription brute. Et le faire en local, sans envoyer les données patient dans le cloud ? C'est un défi technique que peu d'éditeurs ont relevé. Je vais vous expliquer pourquoi, et comment nous y avons travaillé.

## Qu'est-ce qu'une note SOAP, et pourquoi c'est le format qui compte

Pour les non-initiés, SOAP n'a rien à voir avec le savon ni avec les web services. C'est un format de documentation clinique inventé par le Dr Lawrence Weed en 1964 — ce qui en fait un des standards les plus anciens encore activement utilisés en médecine.

**S** pour Subjectif. Ce que le patient rapporte. "J'ai mal à la tête depuis trois jours, c'est pire le matin, le paracétamol ne fait rien."

**O** pour Objectif. Ce que le médecin observe et mesure. Tension 14/9, température 37,2, raideur de la nuque absente, réflexes normaux.

**A** pour Assessment (évaluation). Le diagnostic ou les hypothèses diagnostiques. Céphalées de tension probables, migraine sans aura à exclure.

**P** pour Plan. Les décisions thérapeutiques et le suivi. Prescription d'ibuprofène 400 mg, bilan sanguin, rendez-vous de contrôle à 15 jours, adresser en neurologie si persistance.

Ce format a un avantage majeur : il sépare les faits rapportés par le patient, les observations cliniques, le raisonnement médical, et les actions. Cette séparation n'est pas académique. Elle permet aux autres praticiens de comprendre instantanément où en est le patient, elle structure le raisonnement diagnostique, et elle constitue un élément de preuve médico-légale en cas de litige.

Le problème ? Rédiger une note SOAP correcte prend du temps. Beaucoup de praticiens se rabattent sur des notes libres ("patient vu ce jour, céphalées, prescrit ibuprofène") qui perdent toute la richesse de la consultation.

*Les quatre composantes d'une note SOAP et ce qu'elles contiennent*

## Le pipeline technique : de l'audio brut à la note structurée

Générer une note SOAP automatique à partir d'un enregistrement audio, ce n'est pas juste "transcrire puis reformater". C'est un pipeline en quatre étapes, chacune avec ses propres défis.

### Étape 1 : Transcription avec diarization médicale

La transcription médicale par IA commence par la reconnaissance vocale, mais avec une particularité cruciale : la diarization, c'est-à-dire l'identification de qui parle. Dans une consultation, il faut distinguer la voix du médecin de celle du patient (et parfois d'un accompagnant, d'un interne, d'une infirmière).

Nous utilisons Whisper v3-large pour la transcription brute, couplé à pyannote.audio 3.1 pour la diarization. Le modèle pyannote est particulièrement performant sur les dialogues à deux interlocuteurs — exactement le cas d'une consultation. Sur nos tests avec 200 enregistrements de consultations simulées (acteurs, pas vrais patients — je précise), le taux de bonne attribution locuteur dépasse 94 % quand la qualité audio est correcte (micro-cravate ou micro de bureau à moins d'un mètre).

Le mot clé ici : "qualité audio correcte". Un dictaphone posé au fond d'une poche de blouse blanche, avec le bruit de la climatisation et les pas dans le couloir ? Le taux tombe à 78 %. Nous avons appris ça au prix de semaines de debugging, à chercher un bug logiciel qui n'en était pas un. Le problème était toujours le micro.

### Étape 2 : Reconnaissance du vocabulaire médical

"Le patient présente une dyspnée d'effort stade 2 NYHA avec un BNP à 450." Essayez de transcrire ça avec un modèle généraliste. Vous obtiendrez probablement "le patient présente une dispnée defort stade 2 nia avec un BMP à 450". Trois erreurs en une phrase, dont deux sur des termes cliniques critiques.

Whisper v3-large se débrouille honorablement avec le vocabulaire médical français courant, mais bute sur les acronymes (NYHA, BNP, ECBU, BGSA), les noms de médicaments (amoxicilline ça passe, ézétimibe/rosuvastatine beaucoup moins), et les termes anatomo-pathologiques rares.

Notre approche dans ClearRecap : un post-traitement par dictionnaire médical. Nous maintenons une table de correspondance de 12 400 termes médicaux français avec leurs variantes phonétiques. Quand Whisper produit "la zone calciparine", le post-traitement corrige en "Lorazépam" en se basant sur le contexte sémantique — un anxiolytique dans un contexte psychiatrique fait plus de sens qu'une zone anatomique inexistante.

Ce dictionnaire tourne en local évidemment. Il fait 2,3 Mo. Pas besoin d'API cloud pour corriger "ézétimid" en "ézétimibe".

### Étape 3 : Structuration SOAP par LLM local

C'est l'étape la plus délicate. Une fois la transcription corrigée, il faut la transformer en note SOAP. Pour ça, il faut un modèle de langage capable de comprendre le contenu médical et de le répartir dans les quatre catégories.

Nous avons testé plusieurs approches. Un modèle à base de règles (regex + mots-clés) ? Fragile. "J'ai mal au ventre" va dans le S, mais "il me dit qu'il a mal au ventre" aussi — sauf que c'est le médecin qui parle et rapporte les propos du patient, pas le patient lui-même. Les règles simples ne captent pas ces nuances.

Un LLM cloud (GPT-4, Claude) ? Excellente qualité de structuration. Mais envoyer le verbatim d'une consultation médicale vers un serveur américain ? L'article L.1110-4 du Code de la santé publique est catégorique : le secret médical couvre "toutes les informations venues à la connaissance du professionnel de santé". Le médecin qui envoie la transcription d'une consultation vers un LLM cloud viole potentiellement le secret médical. Point.

Notre choix : un LLM local de 8 milliards de paramètres (basé sur Mistral, fine-tuné sur des notes SOAP synthétiques). Il tourne en quantification Q5_K_M, occupe 5,5 Go de VRAM, et produit une note SOAP structurée en 8 à 15 secondes. La qualité n'égale pas GPT-4 sur les cas complexes, mais pour 85 % des consultations de médecine générale, le résultat est directement utilisable avec des corrections mineures.

Un détail technique qui a pris trois semaines à résoudre : le prompt engineering pour le modèle local est radicalement différent de celui pour les grands modèles cloud. Un prompt qui donne un résultat impeccable avec GPT-4 produit des hallucinations avec un modèle 8B. Nous avons dû développer un format de prompt spécifique, très contraint, avec des exemples few-shot intégrés et des garde-fous explicites ("ne jamais inventer de valeurs numériques absentes de la transcription").

### Étape 4 : Validation et intégration DMP

La note SOAP générée n'est pas directement injectée dans le dossier patient. Jamais. Le médecin la relit, la corrige si nécessaire, la valide. Ce n'est pas une limitation technique : c'est une obligation déontologique et légale. L'article R.4127-69 du Code de la santé publique dispose que le médecin est personnellement responsable de la tenue du dossier médical.

ClearRecap génère la note dans un format compatible HL7 FHIR R4, exportable en JSON ou en texte structuré pour copier-coller dans le logiciel métier. L'intégration directe avec les principaux logiciels de gestion de cabinet (Doctolib Pro, Weda, Crossway) est sur notre feuille de route — elle nécessite des partenariats que nous sommes en train de construire.

*Le pipeline ClearRecap de l'audio brut à la note SOAP validée*

## La dictée médicale IA en local : contraintes matérielles réelles

Soyons honnêtes sur ce point. La transcription médicale IA en local a des prérequis matériels. Whisper v3-large + pyannote + le LLM de structuration tournent simultanément. Ça demande des ressources.

Configuration minimale testée : un PC avec un GPU NVIDIA RTX 3060 (12 Go VRAM) et 16 Go de RAM. Sur cette configuration, une consultation de 20 minutes est transcrite et structurée en note SOAP en 4 minutes environ. C'est utilisable, mais pas instantané.

Configuration recommandée : un GPU avec 16+ Go de VRAM (RTX 4070 Ti, RTX 4080, ou Apple M2 Pro/Max). Le même fichier de 20 minutes tombe à 1 min 40 s. Beaucoup plus fluide pour un usage intensif.

Sur notre machine de développement (RTX 5090, 24 Go VRAM), le traitement complet prend 52 secondes pour 20 minutes d'audio. Un médecin qui finit sa consultation, lance le traitement, et va chercher son café revient devant une note SOAP prête à valider.

L'investissement matériel peut sembler élevé. Mais comparons. Un abonnement à un service de dictée médicale cloud coûte entre 80 et 200 euros par mois et par praticien. Sur trois ans, c'est 2 880 à 7 200 euros — plus que le prix d'une carte graphique RTX 4070 Ti (environ 850 euros). Et avec la solution locale, vous ne payez qu'une fois, vous gardez le contrôle de vos données patient, et l'outil fonctionne hors connexion.

## Le secret médical à l'ère numérique : ce que dit la loi

Je reviens sur le cadre légal parce qu'il est structurant. Le secret médical en France n'est pas un concept vague. C'est un pilier du droit de la santé, inscrit dans plusieurs textes.

L'article L.1110-4 du Code de la santé publique couvre "l'ensemble des informations concernant la personne venues à la connaissance du professionnel, de tout membre du personnel de ces établissements ou organismes et de toute autre personne en relation, de par ses activités, avec ces établissements ou organismes". Un prestataire cloud qui traite l'audio d'une consultation est "en relation avec" l'établissement de santé. Il est soumis au secret.

Mais voilà le problème. L'article 226-13 du Code pénal sanctionne la révélation du secret d'un an d'emprisonnement et 15 000 euros d'amende. Envoyer un fichier audio de consultation vers un serveur tiers, c'est une "révélation" au sens pénal si le prestataire n'est pas lui-même soumis au secret et n'offre pas les garanties appropriées.

La certification HDS (Hébergement de Données de Santé) est obligatoire pour tout prestataire hébergeant des données de santé à caractère personnel (article L.1111-8 CSP). Combien de services de transcription cloud grand public sont certifiés HDS ? Très peu. Et ceux qui le sont facturent en conséquence.

Avec ClearRecap en local, la question HDS ne se pose pas. Les données ne quittent pas la machine du praticien. Il n'y a pas d'hébergement externalisé. Le praticien est responsable de la sécurité de son propre poste — ce qui est déjà le cas pour son logiciel de gestion de cabinet.

### Le cas particulier de la téléconsultation

Un médecin qui réalise une téléconsultation via Doctolib ou un autre outil enregistre-t-il la consultation ? Souvent non, par défaut. Mais certains praticiens souhaiteraient enregistrer pour faciliter la rédaction du compte rendu.

Problème technique : l'audio de la téléconsultation transite déjà par un serveur (celui de Doctolib, par exemple). Ajouter une transcription cloud crée un deuxième transfert de données de santé vers un deuxième prestataire. Le risque se multiplie.

Notre recommandation : capturer l'audio localement (en sortie audio du poste) et le transcrire localement. ClearRecap peut capturer le flux audio système, ce qui permet de transcrire une téléconsultation sans qu'aucune donnée supplémentaire ne quitte le poste du médecin.

## Retour d'expérience : les erreurs que le modèle fait (et ne fait pas)

Transparent avec vous : le système n'est pas parfait. Voici les catégories d'erreurs que nous observons, classées par fréquence.

**Erreurs de transcription sur les noms de médicaments rares.** Le dictionnaire de post-traitement couvre les 3 000 molécules les plus prescrites en France, mais un dermatologue qui prescrit du tacalcitol aura probablement une correction manuelle à faire. Nous enrichissons le dictionnaire en continu.

**Attribution incorrecte du locuteur dans les consultations agitées.** Quand le patient et le médecin se coupent la parole fréquemment, la diarization se dégrade. En pédiatrie, avec un enfant qui pleure en fond sonore, c'est particulièrement difficile. Nos tests montrent un taux d'erreur de 18 % sur l'attribution locuteur dans ces conditions.

**Confusion entre S et O dans les cas ambigus.** "Le patient marche avec une boiterie." C'est subjectif (rapporté par le patient) ou objectif (observé par le médecin) ? Ça dépend de qui le dit. Le modèle se trompe environ 8 % du temps sur ces cas limites. Un médecin humain corrige en deux secondes, mais c'est une imperfection qu'il faut assumer.

**Hallucinations sur les valeurs numériques.** C'est l'erreur la plus dangereuse et celle sur laquelle nous avons mis le plus de garde-fous. Si le médecin dit "tension 14/9" et que le modèle écrit "tension 14/8", c'est une erreur cliniquement significative. Notre prompt contraint le modèle à ne produire que des valeurs explicitement présentes dans la transcription. Sur nos tests, le taux d'hallucination numérique est tombé à 0,3 % — mais 0,3 %, c'est encore trop pour un usage sans relecture. D'où la validation obligatoire par le médecin.

## Configurer ClearRecap pour un usage médical

Le profil médical de ClearRecap active plusieurs fonctionnalités spécifiques. Le dictionnaire médical français. Le mode diarization deux locuteurs optimisé pour le format consultation. Le template SOAP pour la structuration. Et un mode "chiffrement au repos" qui protège les fichiers audio et les transcriptions avec une clé locale.

La configuration se fait en quelques lignes dans le fichier `clearrecap.yaml` :

```yaml
profile: medical
language: fr
diarization:
  enabled: true
  speakers: 2      # médecin + patient
  model: pyannote-3.1
transcription:
  model: whisper-v3-large
  medical_dict: true
  post_processing: medical-fr
structuration:
  format: soap
  llm: mistral-medical-8b-q5
  validation_required: true
encryption:
  at_rest: true
  algorithm: AES-256-GCM
```

Le déploiement complet prend environ 15 minutes sur une machine neuve. Notre [guide Docker Compose](/blog/deployer-clearrecap-docker-compose-guide) détaille la procédure pas à pas, y compris pour les établissements qui veulent déployer sur un serveur local partagé entre plusieurs praticiens.

## L'avenir de la transcription consultation : ce qui change en 2026-2027

Le Ségur du numérique en santé a accéléré l'interopérabilité des systèmes d'information de santé. La vague 2 du Ségur, déployée en 2025, impose le format FHIR pour les échanges de données de santé. Les notes SOAP générées par ClearRecap sont nativement compatibles FHIR R4 — un choix technique que nous avons fait dès le début du développement, en anticipant cette obligation.

Le AI Act européen classe les dispositifs médicaux logiciels (SaMD) utilisant l'IA comme "à haut risque" (Annexe III, point 5). Un outil qui génère des notes SOAP sera probablement concerné. Nous anticipons les obligations de documentation technique, de gestion des risques (ISO 14971), et de surveillance post-commercialisation. Ce travail de conformité réglementaire est en cours.

Mon point de vue personnel : dans cinq ans, la dictée médicale IA sera aussi banale que le stéthoscope numérique. La question n'est pas si les médecins adopteront ces outils, mais quels outils respecteront le secret médical. Les solutions locales ont un avantage structurel sur ce terrain.

*L'environnement réglementaire de la transcription médicale en 2026-2027*

## Pour les médecins qui veulent tester

Si vous êtes praticien et que cette approche vous intéresse, trois points d'entrée possibles.

Notre [page tarifs](/pricing) détaille les options pour les praticiens individuels et les établissements. Pas d'abonnement par minute — un prix fixe, votre machine, vos données.

Le [comparatif ClearRecap vs HappyScribe](/blog/clearrecap-vs-happyscribe-comparatif-2026) vous aidera à comprendre les différences concrètes si vous utilisez déjà un service cloud.

Pour le contexte réglementaire complet (RGPD, secret médical, HDS), notre [guide RGPD et transcription audio](/blog/transcription-audio-rgpd-guide-2026) couvre le sujet en détail.

Et une question que je pose aux médecins qui hésitent : combien de temps passez-vous chaque jour à rédiger ? Si la réponse est "trop", alors sept minutes de votre temps pour installer l'outil pourraient vous en faire gagner des centaines.
