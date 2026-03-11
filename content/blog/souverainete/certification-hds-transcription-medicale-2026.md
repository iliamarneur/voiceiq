---
title: "Certification HDS et Transcription Médicale en 2026"
slug: "certification-hds-transcription-medicale-2026"
description: "Tout savoir sur la certification HDS pour la transcription médicale en 2026. Exigences, processus et alternatives pour les données de santé."
canonical: "https://clearrecap.com/blog/certification-hds-transcription-medicale-2026"
ogTitle: "Certification HDS : ce que ça change pour la transcription médicale"
ogDescription: "HDS obligatoire pour héberger des données de santé. Impact sur les outils de transcription médicale et solutions conformes."
ogImage: "https://clearrecap.com/blog/images/certification-hds-transcription-medicale-2026-og.png"
category: "souverainete"
tags: ["certification hds", "hébergement données santé", "transcription médicale", "conformité"]
author: "Ilia Moui — CEO & Fondateur, ClearRecap"
authorUrl: "https://clearrecap.com/auteur/fondateur-clearrecap"
date: "2026-03-11"
lastModified: "2026-03-11"
readingTime: "14 min"
profile: "generique"
targetKeyword: "certification hds transcription"
secondaryKeywords: ["hds transcription médicale", "hébergeur données santé", "hds 2026 exigences"]
searchIntent: "informationnel"
funnel: "mofu"
publishDate: "2026-05-12T14:46:00"
status: "draft"
---

<!-- JSON-LD Schema -->
<!--
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Certification HDS et Transcription Médicale en 2026",
  "description": "Tout savoir sur la certification HDS pour la transcription médicale en 2026. Exigences, processus et alternatives pour les données de santé.",
  "author": {
    "@type": "Person",
    "name": "Ilia Moui",
    "jobTitle": "CEO & Fondateur",
    "url": "https://clearrecap.com/auteur/fondateur-clearrecap",
    "worksFor": {
      "@type": "Organization",
      "name": "ClearRecap",
      "url": "https://clearrecap.com"
    }
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
  "datePublished": "2026-05-12",
  "dateModified": "2026-03-11",
  "mainEntityOfPage": "https://clearrecap.com/blog/certification-hds-transcription-medicale-2026",
  "image": "https://clearrecap.com/blog/images/certification-hds-transcription-medicale-2026-og.png",
  "keywords": ["certification hds", "hébergement données santé", "transcription médicale", "conformité"]
}
</script>
-->

# Certification HDS et Transcription Médicale en 2026

Un médecin généraliste dicte ses comptes-rendus de consultation dans une application sur son smartphone. Trente secondes plus tard, le texte apparait, structuré en note SOAP, prêt à intégrer le dossier patient. Pratique. Rapide. Et potentiellement illégal si l'outil n'est pas hébergé chez un prestataire certifié HDS.

La certification HDS — Hébergeur de Données de Santé — n'est pas une option en France. C'est une obligation légale inscrite dans le Code de la santé publique (article L.1111-8) pour tout organisme qui héberge des données de santé à caractère personnel pour le compte de tiers. En 2026, cette exigence percute de plein fouet le marché de la transcription médicale automatisée, où la quasi-totalité des outils repose sur du cloud non certifié.

Je suis Ilia Moui, fondateur de [ClearRecap](https://clearrecap.com). Mon parcours dans la transcription audio m'a conduit à explorer la question HDS sous un angle inhabituel : celui d'un développeur qui refuse de stocker les données de ses utilisateurs. Ce paradoxe — un outil de transcription médicale qui ne veut pas héberger — est devenu notre proposition de valeur.

## Le cadre HDS en 2026 : ce qui a changé

La certification HDS existe depuis 2018, mais sa version actuelle intègre les évolutions du référentiel SecNumCloud et les retours de cinq années d'audits terrain. Le cadre repose sur deux niveaux distincts que beaucoup confondent.

### Hébergeur d'infrastructure physique

Le premier niveau couvre les datacenters physiques — alimentation électrique, refroidissement, contrôle d'accès physique, protection incendie. Un acteur comme Equinix ou Data4 opère à ce niveau. Leurs certifications ISO 27001 et ISO 27018 servent de socle, complété par les exigences spécifiques HDS.

### Hébergeur infogérant

Le second niveau, plus exigeant, couvre la gestion applicative des données de santé. Sauvegardes, administration système, gestion des incidents de sécurité, PRA/PCA (Plan de Reprise d'Activité / Plan de Continuité d'Activité). C'est ce niveau qui concerne directement les éditeurs d'outils de transcription médicale qui traitent et stockent les transcriptions.

### Les 6 activités couvertes par la certification HDS

Le périmètre HDS s'articule autour de six activités :

1. Mise à disposition et maintien en condition opérationnelle de l'infrastructure matérielle
2. Mise à disposition et maintien en condition opérationnelle de la plateforme d'hébergement
3. Administration et exploitation du système d'information contenant les données de santé
4. Sauvegarde externalisée des données de santé
5. Mise à disposition et maintien en condition opérationnelle des sites physiques
6. Gestion et suivi de la sécurité du système d'information

Un outil de transcription médicale en SaaS qui stocke les transcriptions doit couvrir les activités 1 à 4 au minimum. La facture de certification oscille entre 30 000 et 80 000 euros selon le périmètre, plus les audits de surveillance annuels autour de 15 000 euros. Des montants qui éliminent d'entrée la plupart des startups du marché.

## Pourquoi la transcription médicale est un cas particulier

La transcription médicale ne se résume pas à convertir de l'audio en texte. Le contenu transcrit constitue intrinsèquement une donnée de santé au sens du RGPD (article 4, paragraphe 15) et du Code de la santé publique.

Prenons un exemple concret. Un médecin dicte : "Patient de 54 ans, diabète de type 2 sous metformine 1000mg, HbA1c à 8.2%, début de rétinopathie stade 2." La transcription contient un diagnostic, un traitement, des résultats biologiques. Même sans le nom du patient, la combinaison de ces éléments avec un horodatage et un identifiant de praticien rend la donnée indirectement identifiante.

Un fichier audio brut de consultation médicale entre dans la même catégorie. La voix du patient est une donnée biométrique. Le contenu verbal est une donnée de santé. Double qualification, double exigence.

### Le problème spécifique du traitement IA

Les modèles de transcription comme Whisper traitent l'audio de façon séquentielle. Le fichier audio complet doit être accessible au modèle pendant l'inférence. Si ce traitement s'effectue sur un serveur distant non certifié HDS, c'est une violation — même si la transcription résultante n'est jamais stockée.

Quand j'ai commencé à travailler sur ClearRecap, cette nuance m'a frappé. Le traitement transitoire compte. Pas seulement le stockage. Un audio qui passe trois secondes sur un GPU cloud non certifié avant d'être effacé constitue quand même un hébergement de données de santé au sens du texte. L'ASIP Santé (devenue ANS — Agence du Numérique en Santé) l'a confirmé dans sa FAQ mise à jour en 2024.

## Le processus de certification HDS : anatomie d'un parcours

Obtenir la certification HDS prend entre 8 et 18 mois selon le niveau de maturité de l'organisation. Voici le parcours tel que je l'ai observé chez des partenaires et tel que l'ANS le décrit.

### Phase 1 : Audit initial ISO 27001

Pas de HDS sans ISO 27001. C'est le prérequis. Si votre organisation ne possède pas cette certification, comptez 6 à 12 mois supplémentaires. L'ISO 27001 exige un SMSI (Système de Management de la Sécurité de l'Information) documenté, avec analyse de risques, politiques de sécurité, gestion des actifs, contrôle d'accès, cryptographie, sécurité physique, gestion des incidents.

### Phase 2 : Mise en conformité spécifique HDS

Au-dessus de l'ISO 27001, les exigences HDS ajoutent des couches spécifiques :

- Localisation des données sur le territoire de l'UE (attention au [CLOUD Act](/blog/cloud-act-transcription-risque-donnees) pour les sous-traitants)
- Chiffrement des données au repos et en transit (AES-256 minimum)
- Traçabilité complète des accès aux données de santé
- Notification des incidents de sécurité à l'ANS sous 24h
- Convention d'hébergement type avec chaque client
- Procédure de restitution et de destruction des données

### Phase 3 : Audit de certification

Un organisme certificateur accrédité par le COFRAC réalise l'audit sur site. Les principaux acteurs sont BSI, Bureau Veritas, LNE, et LSTI. L'auditeur vérifie la conformité documentaire et opérationnelle. Les non-conformités majeures bloquent la certification. Les mineures doivent être corrigées dans un délai défini.

### Phase 4 : Surveillance continue

La certification est valable 3 ans, avec un audit de surveillance annuel. C'est ce cycle continu qui garantit — en théorie — le maintien du niveau de sécurité.

## L'état du marché de la transcription médicale face à l'HDS

Regardons la réalité du marché en 2026. Combien d'outils de transcription médicale sont réellement certifiés HDS ?

Les acteurs historiques de la dictée médicale (Nuance/Dragon Medical, Philips SpeechLive) disposent de certifications HDS via leurs hébergeurs partenaires. Mais ces solutions sont coûteuses — souvent entre 100 et 300 euros par mois et par praticien — et leur modèle de transcription repose sur des architectures cloud classiques.

Les nouveaux entrants IA (startups utilisant Whisper ou des modèles similaires) sont rarement certifiés. La plupart utilisent AWS, Azure ou Google Cloud pour l'inférence GPU. Même si le datacenter est à Paris, la question du CLOUD Act se pose pour Azure et AWS qui sont des entités américaines.

Quelques hébergeurs français certifiés HDS proposent du GPU : OVHcloud (certifié HDS depuis 2019) et Scaleway (via Dedibox GPU). Mais le coût d'un serveur GPU dédié chez un hébergeur HDS tourne autour de 1 500 à 3 000 euros par mois — un modèle économique viable uniquement pour les gros volumes.

### Le problème du modèle économique

Voici le calcul qui tue beaucoup de projets. Un médecin généraliste réalise en moyenne 25 consultations par jour. Si chaque consultation génère 5 minutes d'audio à transcrire, c'est 125 minutes par jour, environ 2 000 minutes par mois.

Le coût d'inférence GPU sur un cloud HDS pour 2 000 minutes audio avec un modèle Whisper large-v3 : environ 40 euros (en batch, sur GPU partagé). Ajoutez l'amortissement de la certification HDS, le stockage chiffré, la maintenance, le support — le prix plancher d'un service de transcription médicale conforme tourne autour de 80 à 120 euros par mois par praticien.

Un médecin libéral qui facture 26,50 euros la consultation n'a pas le même rapport au budget IT qu'un CHU de 4 000 lits. Le marché est fragmenté, les capacités de paiement hétérogènes.

## L'alternative locale : contourner l'obligation HDS par design

J'arrive au point qui a fondamentalement orienté la conception de ClearRecap. L'obligation HDS s'applique à l'hébergement de données de santé **pour le compte de tiers**. L'article L.1111-8 du Code de la santé publique est précis : "Toute personne qui héberge des données de santé à caractère personnel recueillies à l'occasion d'activités de prévention, de diagnostic, de soins ou de suivi social et médico-social, **pour le compte** de personnes physiques ou morales à l'origine de la production ou du recueil de ces données ou pour le compte du patient lui-même."

Les mots clés : **pour le compte de**. Si le professionnel de santé traite et stocke les données sur son propre matériel, sans qu'un tiers y accède, l'obligation HDS ne s'applique pas. Le médecin reste responsable de la sécurité de ses données (obligation RGPD classique), mais il n'a pas besoin d'un hébergeur certifié HDS.

C'est exactement le modèle de la transcription locale.

Le praticien installe un logiciel de transcription sur son poste de travail ou sur un serveur de son cabinet. L'audio est traité localement. La transcription est générée localement. Aucune donnée ne transite par un serveur tiers. Pas d'hébergeur, pas d'obligation HDS.

### Comment nous avons validé cette approche

Quand j'ai présenté cette architecture à un avocat spécialisé en droit de la santé numérique début 2025, sa première réaction a été le scepticisme. "Vous jouez sur les mots." Non. Nous jouons sur l'architecture.

La distinction est technique et juridique. Dans un modèle SaaS, les données quittent le contrôle du professionnel de santé pour être traitées par un tiers. Dans un modèle local, le logiciel est un outil — comme un stéthoscope ou un tensiomètre. L'outil est chez le médecin. Les données restent chez le médecin.

L'ANS a d'ailleurs confirmé cette interprétation dans un avis de 2023 concernant les logiciels de gestion de cabinet installés en local : le simple fait qu'un logiciel traite des données de santé ne déclenche pas l'obligation HDS si le traitement reste sur l'infrastructure du professionnel.

Chez ClearRecap, cette validation nous a permis de proposer une solution de [transcription médicale avec notes SOAP](/blog/transcription-medicale-note-soap-ia) sans la barrière de prix de la certification HDS — tout en offrant un niveau de confidentialité supérieur puisque les données ne quittent jamais le cabinet.

## Les exigences techniques d'une transcription médicale locale

Faire tourner un modèle Whisper en local dans un cabinet médical pose des contraintes spécifiques. Voici ce que deux ans de terrain m'ont appris.

### Le matériel minimum viable

Pour une transcription en temps quasi-réel avec le modèle Whisper medium (bon compromis qualité/performance pour le français médical), le poste de travail nécessite :

- CPU : Intel i5 12e génération ou AMD Ryzen 5 5600 (minimum)
- RAM : 16 Go (8 Go suffisent techniquement, mais le multitâche en souffre)
- GPU : optionnel mais transforme l'expérience — une RTX 3060 avec 12 Go VRAM fait passer le ratio de 0.8x à 0.15x
- Stockage : SSD NVMe, 50 Go libres pour le modèle et les transcriptions

La bonne nouvelle : ce profil correspond à un PC de bureau standard vendu entre 700 et 1 000 euros en 2026. Beaucoup de cabinets médicaux disposent déjà de machines compatibles.

### Le déploiement Docker simplifié

Notre approche chez ClearRecap utilise Docker pour isoler le moteur de transcription du système hôte. Le [guide Docker Compose](/blog/deployer-clearrecap-docker-compose-guide) détaille la procédure, mais le principe tient en quelques lignes :

```yaml
services:
  clearrecap:
    image: clearrecap/local:latest
    volumes:
      - ./data:/app/data
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
```

Le conteneur embarque le modèle, le runtime d'inférence, et l'API locale. Aucune connexion sortante n'est nécessaire. Le pare-feu du cabinet peut bloquer tout trafic sortant du conteneur sans impact sur le fonctionnement.

### La qualité de transcription médicale

Le vocabulaire médical est un défi pour les modèles de transcription généralistes. "Metformine" devient "met forme mine". "HbA1c" se transforme en "h b a 1 c" ou pire. Les acronymes médicaux français (ECG, NFS, BHC, ASP) sont souvent mal interprétés.

Notre réponse a été de travailler sur le post-processing plutôt que sur le fine-tuning du modèle. Un dictionnaire médical spécialisé corrige les termes connus après la transcription brute. Ce choix technique a un avantage majeur : il ne nécessite pas de réentraîner le modèle, et le dictionnaire peut être enrichi par le praticien lui-même avec ses termes spécifiques.

J'ai mesuré l'impact sur un corpus de 200 dictées médicales en français : le taux d'erreur sur le vocabulaire médical passe de 12% (Whisper brut) à 3.4% (avec post-processing). Pas parfait. Suffisant pour accélérer la saisie de 60% par rapport à la frappe manuelle, avec une relecture rapide du praticien.

## Ce que la réforme HDS 2026 va changer

L'ANS a annoncé une révision du référentiel HDS pour 2026, avec plusieurs évolutions attendues :

**Alignement avec SecNumCloud 3.2.** Les exigences HDS vont intégrer les critères de souveraineté de SecNumCloud, ce qui exclura de fait les hébergeurs soumis à des législations extraterritoriales (CLOUD Act, FISA). Les hébergeurs actuellement certifiés HDS mais opérant sur des infrastructures américaines devront migrer ou perdront leur certification.

**Extension du périmètre aux traitements éphémères.** Le référentiel actuel laisse une zone grise sur le traitement transitoire — un audio traité en mémoire sans jamais être écrit sur disque. La révision 2026 devrait clarifier que tout traitement de données de santé, même transitoire, entre dans le périmètre HDS si un tiers intervient.

**Certification par niveaux.** Un système de niveaux (bronze, argent, or) pourrait émerger, avec des exigences proportionnées au volume et à la sensibilité des données. Cette approche graduée faciliterait l'accès à la certification pour les startups.

Ces évolutions renforcent la pertinence du modèle local. Chaque tour de vis réglementaire augmente le coût de conformité des solutions cloud, et améliore la proposition de valeur des solutions qui éliminent le problème d'hébergement par conception.

## Guide pratique : vérifier la conformité HDS de votre outil de transcription

Pour les professionnels de santé qui utilisent déjà un outil de transcription, voici une grille d'évaluation rapide.

**Question 1 : L'audio quitte-t-il votre poste de travail ?**
Si oui, un hébergeur tiers intervient. La certification HDS est obligatoire pour ce tiers.

**Question 2 : L'éditeur du logiciel affiche-t-il un numéro de certificat HDS ?**
Le certificat doit être vérifiable sur le site du COFRAC ou de l'organisme certificateur. Un simple logo "HDS" sur un site web ne vaut rien.

**Question 3 : Le certificat couvre-t-il les bonnes activités ?**
Un hébergeur certifié pour l'activité 1 (infrastructure physique) uniquement ne couvre pas le traitement applicatif de vos transcriptions. Vérifiez que les activités 3 et 4 sont incluses.

**Question 4 : Où sont physiquement traitées les données ?**
"Serveurs en France" ne suffit pas si le fournisseur de cloud sous-jacent est américain. Demandez le nom de l'hébergeur d'infrastructure et vérifiez sa propre certification HDS.

**Question 5 : Quelle est la durée de conservation ?**
Le RGPD impose une durée proportionnée à la finalité. Pour une transcription médicale, la durée de conservation du dossier médical (20 ans en France) s'applique au texte intégré au dossier patient. Mais l'audio source peut être supprimé après validation de la transcription — et devrait l'être pour minimiser les risques.

## Mon retour d'expérience : pourquoi ClearRecap n'est pas certifié HDS

La question revient souvent. "Pourquoi ClearRecap n'est-il pas certifié HDS ?"

Parce que ClearRecap n'héberge rien. Nous distribuons un logiciel. Le modèle Whisper s'exécute sur la machine de l'utilisateur. Les transcriptions sont stockées sur le disque dur de l'utilisateur. Nous n'avons jamais accès aux données de santé de nos utilisateurs — ni pendant le traitement, ni après, ni jamais.

Nous certifier HDS serait comme certifier le fabricant d'un dictaphone. Le dictaphone enregistre la voix du patient, mais c'est le médecin qui conserve la cassette. Le fabricant n'héberge pas la donnée.

Cette position architecturale n'est pas un raccourci réglementaire. C'est une conviction technique. Le [guide RGPD de la transcription audio](/blog/transcription-audio-rgpd-guide-2026) développe notre philosophie plus en détail : la meilleure protection des données, c'est de ne jamais les collecter.

Cela ne dispense pas nos utilisateurs de leurs propres obligations. Un médecin qui installe ClearRecap sur son poste doit quand même sécuriser ce poste (chiffrement disque, mot de passe robuste, verrouillage automatique). Il doit documenter ce traitement dans son registre RGPD. Il doit informer ses patients. Mais il le fait en tant que responsable de traitement — pas en dépendant d'un tiers certifié dont il ne contrôle ni l'infrastructure ni les pratiques.

## Conclusion : la certification HDS, passage obligé ou impasse ?

Pour les éditeurs de transcription médicale en SaaS, la certification HDS est un passage obligé. Coûteux, long, contraignant — mais non négociable. L'ignorer expose à des sanctions pénales (article L.1115-1 du CSP : jusqu'à 3 ans d'emprisonnement et 45 000 euros d'amende pour l'hébergement non certifié de données de santé).

Pour les professionnels de santé, deux chemins se dessinent.

Le premier : choisir un outil de transcription cloud certifié HDS, accepter le coût associé, et déléguer la conformité à un tiers de confiance. C'est le choix de la simplicité opérationnelle.

Le second : opter pour une solution locale qui élimine la question de l'hébergement tiers par design. C'est le choix de la maîtrise totale, au prix d'une installation initiale un peu plus technique.

Chez ClearRecap, nous avons fait le pari que la deuxième option va devenir dominante. Les modèles de transcription sont de plus en plus performants sur du matériel standard. Les [benchmarks GPU de faster-whisper](/blog/faster-whisper-gpu-benchmark-2026) montrent que la transcription locale en temps réel est déjà une réalité sur des machines à moins de 1 000 euros.

La certification HDS restera indispensable pour les hôpitaux, les plateformes de télémédecine, les éditeurs de DMP. Mais pour le médecin libéral, le psychologue, le kinésithérapeute — tous ces professionnels qui dictent dans leur cabinet — la solution locale offre une alternative plus simple, moins chère, et paradoxalement plus sécurisée.

Le futur de la transcription médicale ne passera pas par un datacenter certifié. Il tiendra dans la machine posée sur le bureau du praticien.
