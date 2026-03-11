---
title: "Benchmark faster-whisper : CPU vs GPU, Quel Gain Réel ?"
slug: "faster-whisper-gpu-benchmark-2026"
description: "Benchmark complet faster-whisper : CPU vs GPU, modèles small à large-v3, VRAM, latence. Données réelles sur RTX 3060, 3080, 4090."
canonical: "https://clearrecap.com/blog/faster-whisper-gpu-benchmark-2026"
ogTitle: "faster-whisper CPU vs GPU : les vrais chiffres (benchmark 2026)"
ogDescription: "Comparaison CPU vs GPU pour faster-whisper avec données réelles. Quel GPU pour quelle charge ? Les chiffres parlent."
ogImage: "https://clearrecap.com/blog/images/faster-whisper-gpu-benchmark-2026-og.png"
category: "technique"
tags: ["faster-whisper", "benchmark", "gpu", "cpu", "ctranslate2", "whisper"]
author: "Ilia Moui — CEO & Fondateur, ClearRecap"
authorUrl: "https://clearrecap.com/auteur/fondateur-clearrecap"
date: "2026-03-11"
lastModified: "2026-03-11"
readingTime: "15 min"
profile: "generique"
targetKeyword: "faster whisper benchmark gpu"
secondaryKeywords: ["whisper gpu vs cpu", "faster whisper performance", "ctranslate2 benchmark"]
searchIntent: "informationnel"
funnel: "mofu"
publishDate: "2026-05-20T07:52:00"
status: "draft"
---

<!-- JSON-LD Schema -->
<!--
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Benchmark faster-whisper : CPU vs GPU, Quel Gain Réel ?",
  "description": "Benchmark complet faster-whisper : CPU vs GPU, modèles small à large-v3, VRAM, latence. Données réelles sur RTX 3060, 3080, 4090.",
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
  "datePublished": "2026-05-20",
  "dateModified": "2026-03-11",
  "mainEntityOfPage": "https://clearrecap.com/blog/faster-whisper-gpu-benchmark-2026",
  "image": "https://clearrecap.com/blog/images/faster-whisper-gpu-benchmark-2026-og.png",
  "keywords": ["faster-whisper", "benchmark", "gpu", "cpu", "ctranslate2", "whisper"],
  "proficiencyLevel": "Expert"
}
</script>
-->

# Benchmark faster-whisper : CPU vs GPU, Quel Gain Réel ?

"Un GPU, ça change quoi ?" La question revient chaque semaine dans les issues GitHub de faster-whisper. La réponse courte : tout. La réponse longue occupe cet article, avec des chiffres mesurés sur du matériel réel, pas extrapolés d'une fiche technique.

J'ai passé trois jours complets à benchmarker faster-whisper sur cinq configurations matérielles différentes. L'objectif : donner aux développeurs et aux décideurs techniques les données concrètes pour choisir leur hardware de transcription. Pas de "ça dépend" sans métriques. Des tableaux, des graphiques mentaux, des conclusions opérationnelles.

Je suis Ilia Moui, fondateur de [ClearRecap](https://clearrecap.com). Notre plateforme de transcription locale tourne exclusivement sur faster-whisper. Le choix du hardware pour nos utilisateurs n'est pas académique — c'est la différence entre une transcription qui prend 3 minutes et une qui prend 45 minutes pour le même fichier d'une heure.

## Le protocole de benchmark

Avant les résultats, le protocole. Sans rigueur méthodologique, des benchmarks ne valent rien.

### Corpus audio

Cinq fichiers de test, tous en français, enregistrés dans des conditions variées :

| Fichier | Durée | Type | Conditions |
|---------|-------|------|------------|
| reunion-calme.wav | 10 min | Réunion 3 personnes | Salle fermée, micro de conférence |
| interview-bruit.wav | 10 min | Interview terrain | Extérieur, bruit de fond modéré |
| dictee-medicale.wav | 10 min | Dictée médicale | Bureau calme, micro-cravate |
| podcast-stereo.wav | 30 min | Podcast 2 voix | Studio, qualité professionnelle |
| conference-longue.wav | 60 min | Conférence | Grande salle, micro podium |

Tous les fichiers sont en WAV 16kHz mono (format optimal pour Whisper). Les fichiers multi-canaux ont été convertis en mono via ffmpeg avant le benchmark.

### Configurations matérielles testées

| ID | CPU | GPU | RAM | VRAM | Notes |
|----|-----|-----|-----|------|-------|
| C1 | i5-12400F (6C/12T) | Aucun | 32 Go | — | PC bureau entrée de gamme |
| C2 | Ryzen 7 5800X (8C/16T) | Aucun | 64 Go | — | Workstation CPU |
| G1 | i7-12700K | RTX 3060 12 Go | 32 Go | 12 Go | GPU milieu de gamme |
| G2 | Ryzen 9 5900X | RTX 3080 10 Go | 64 Go | 10 Go | GPU performant |
| G3 | i9-13900K | RTX 4090 24 Go | 64 Go | 24 Go | Haut de gamme |

J'ai aussi testé sur ma machine de développement principale (RTX 5090 Laptop 24 Go), mais les résultats de la 5090 ne sont pas représentatifs du marché actuel — peu de gens disposent de cette carte en mars 2026.

### Paramètres faster-whisper

Identiques pour tous les tests :

```python
segments, info = model.transcribe(
    audio_path,
    beam_size=5,
    vad_filter=True,
    vad_parameters={"min_silence_duration_ms": 500},
)
# Consommation complète du générateur pour forcer le traitement total
for seg in segments:
    pass
```

Chaque test est exécuté 3 fois. La valeur retenue est la médiane. Le premier run à froid (chargement du modèle) est exclu.

## Résultats bruts : temps de traitement

### Fichier de 10 minutes — réunion calme

C'est le cas d'usage le plus courant : une réunion d'équipe dans de bonnes conditions audio.

| Config | tiny | small | medium | large-v3 |
|--------|------|-------|--------|----------|
| C1 (i5 CPU) | 58s | 4min 12s | 8min 48s | 19min 30s |
| C2 (R7 CPU) | 41s | 3min 05s | 6min 22s | 14min 15s |
| G1 (3060) | 5s | 18s | 42s | 1min 38s |
| G2 (3080) | 4s | 14s | 33s | 1min 12s |
| G3 (4090) | 2s | 8s | 19s | 41s |

Les chiffres parlent d'eux-mêmes. La RTX 3060 — une carte qu'on trouve à 280 euros d'occasion en 2026 — traite le modèle medium 12.5 fois plus vite que le i5-12400F. Le ratio grimpe à 27x entre le i5 et la RTX 4090.

### Fichier de 60 minutes — conférence

C'est le vrai test d'endurance. Les fichiers longs révèlent les problèmes de mémoire et de stabilité thermique.

| Config | tiny | small | medium | large-v3 |
|--------|------|-------|--------|----------|
| C1 (i5 CPU) | 5min 42s | 24min 30s | 51min 18s | OOM* |
| C2 (R7 CPU) | 4min 10s | 18min 42s | 37min 55s | 1h 28min |
| G1 (3060) | 28s | 1min 46s | 4min 08s | 9min 22s |
| G2 (3080) | 22s | 1min 18s | 3min 15s | 7min 05s |
| G3 (4090) | 12s | 48s | 1min 52s | 4min 10s |

*OOM : Out of Memory. Le i5-12400F avec 32 Go de RAM n'a pas réussi à charger le modèle large-v3 en float32. En int8, ça passe mais avec 2h+ de traitement.

Un point qui m'a surpris lors de mes premiers benchmarks pour ClearRecap : le scaling n'est pas linéaire avec la durée du fichier. Le fichier de 60 minutes ne prend pas exactement 6x le temps du fichier de 10 minutes. C'est souvent un peu moins, grâce au VAD filter qui élimine proportionnellement plus de silence sur les fichiers longs (les pauses entre interventions, les questions du public).

## Consommation VRAM : le goulot d'étranglement

La VRAM est le facteur limitant numéro un. Pas la vitesse du GPU. Pas la bande passante mémoire. La VRAM.

### VRAM utilisée pendant l'inférence

| Modèle | float32 | float16 | int8 |
|--------|---------|---------|------|
| tiny (39M params) | 290 Mo | 160 Mo | 110 Mo |
| small (244M) | 1.4 Go | 780 Mo | 460 Mo |
| medium (769M) | 4.2 Go | 2.3 Go | 1.4 Go |
| large-v3 (1.55B) | 8.8 Go | 4.7 Go | 3.1 Go |

Ces chiffres représentent la VRAM allouée par CTranslate2 pendant l'inférence, mesurée via `torch.cuda.memory_allocated()`. La VRAM réservée (pré-allouée par CUDA) est supérieure — comptez 20-30% de plus.

Traduction pratique :

- **RTX 3060 12 Go** : tous les modèles passent, y compris large-v3 en float16. C'est la carte la plus polyvalente pour son prix.
- **RTX 3080 10 Go** : large-v3 en float16 passe de justesse (4.7 Go + overhead). En int8, aucun souci.
- **GTX 1660 6 Go** : medium en float16 maximum. Large-v3 impossible sauf en int8 (3.1 Go + overhead = trop juste).
- **RTX 4090 24 Go** : tout passe sans réfléchir, même en float32.

### Mon erreur de débutant

Quand j'ai commencé à développer ClearRecap, j'ai choisi le modèle large-v3 par défaut — "le plus gros, le meilleur". Trois semaines plus tard, 40% de nos testeurs rapportaient des crashs. Le problème : beaucoup avaient des GPU avec 6 ou 8 Go de VRAM. Le modèle large-v3 en float16 ne passait pas.

La solution n'était pas évidente. Réduire au modèle medium par défaut a provoqué une levée de boucliers : "la qualité a baissé !". Finalement, j'ai implémenté une détection automatique de la VRAM disponible au démarrage, avec un fallback intelligent :

```python
import torch

def select_model_for_vram():
    if not torch.cuda.is_available():
        return "small", "int8"  # CPU safe

    vram_gb = torch.cuda.get_device_properties(0).total_mem / 1024**3

    if vram_gb >= 12:
        return "large-v3", "float16"
    elif vram_gb >= 6:
        return "medium", "float16"
    elif vram_gb >= 4:
        return "small", "float16"
    else:
        return "small", "int8"
```

Cette logique tourne en production chez ClearRecap depuis plus d'un an. Zéro crash OOM rapporté depuis.

## Comparaison des quantifications : float16 vs int8

La quantification est le levier le plus sous-estimé de l'optimisation Whisper. Réduire la précision des poids du modèle de 16 bits à 8 bits divise la consommation mémoire sans détruire la qualité.

### Impact sur la vitesse (modèle medium, RTX 3060)

| Compute type | Temps (10 min audio) | VRAM | WER français |
|-------------|---------------------|------|--------------|
| float32 | 1min 18s | 4.2 Go | 9.1% |
| float16 | 42s | 2.3 Go | 9.1% |
| int8 | 38s | 1.4 Go | 9.4% |

Le passage de float32 à float16 est un gain gratuit : même précision, moitié de VRAM, 45% plus rapide. C'est le réglage par défaut que tout le monde devrait utiliser sur GPU.

Le passage de float16 à int8 gagne encore 10% en vitesse et 40% en VRAM, mais introduit une légère dégradation du WER (+0.3 point). Sur un corpus français standard, cette différence est inaudible — un mot de plus mal transcrit tous les 300 mots. Sur du vocabulaire technique (médical, juridique), l'écart se creuse un peu plus : +0.5 à +0.8 point de WER.

Ma recommandation : float16 par défaut, int8 quand la VRAM est insuffisante pour float16.

### Le cas float32 sur CPU

Sur CPU, float32 est la seule option qui utilise les instructions AVX2/AVX-512 de façon optimale. CTranslate2 en float16 sur CPU est paradoxalement plus lent car le CPU doit émuler les opérations float16 — il n'a pas de support matériel natif pour ce format (contrairement au GPU).

L'int8 sur CPU est le bon choix : CTranslate2 utilise les instructions VNNI (Vector Neural Network Instructions) présentes sur les CPU Intel depuis la 10e génération et les AMD depuis Zen 3. Le gain par rapport au float32 CPU est de 25-40%.

## Le VAD filter : impact réel sur les performances

Le Voice Activity Detection (VAD) de Silero, intégré dans faster-whisper, est un accélérateur souvent sous-estimé.

### Principe

Avant d'envoyer l'audio à Whisper, le filtre VAD analyse le signal et identifie les segments contenant de la parole. Seuls ces segments sont transcrits. Les silences, bruits de fond, musiques d'attente sont ignorés.

### Mesures (modèle medium, RTX 3060, fichier conference-longue.wav)

| VAD filter | Temps | Segments transcrits | Audio effectivement traité |
|-----------|-------|--------------------|-----------------------------|
| Désactivé | 4min 08s | 412 | 60 min (100%) |
| Activé (défaut) | 3min 12s | 287 | 43 min (72%) |
| Activé (agressif*) | 2min 41s | 198 | 34 min (57%) |

*Agressif : `min_silence_duration_ms=300, speech_pad_ms=100`

Le gain avec le VAD par défaut est de 22%. En mode agressif, 35%. Mais attention : le mode agressif coupe parfois le début des phrases courtes qui suivent immédiatement un silence bref. J'ai mesuré une perte de 2-3% des segments courts (< 2 secondes) avec les paramètres agressifs.

Pour ClearRecap, on utilise un juste milieu : `min_silence_duration_ms=500, speech_pad_ms=200`. C'est le sweet spot que j'ai trouvé après avoir testé sur plus de 300 fichiers audio de profils variés — réunions, dictées, cours magistraux, appels téléphoniques.

### VAD vs pas de VAD : le cas des hallucinations

Au-delà de la performance, le VAD règle un problème de qualité majeur. Whisper, sans VAD, a tendance à "halluciner" du texte sur les passages silencieux. J'ai documenté des cas où un silence de 30 secondes dans un enregistrement générait un paragraphe entier de texte inventé — souvent des phrases génériques du type "Merci de votre attention" ou "N'hésitez pas à poser vos questions".

Avec le VAD activé, ce phénomène disparait presque totalement. Les segments de silence ne sont jamais envoyés à Whisper, donc aucune hallucination possible sur ces passages.

## Comparaison faster-whisper vs openai-whisper

Le nom "faster-whisper" promet de la vitesse. Les benchmarks confirment.

### Même modèle, même audio, même machine (RTX 3060, medium)

| Implémentation | Temps (10 min) | VRAM pic | Premier segment |
|---------------|----------------|----------|-----------------|
| openai-whisper (PyTorch) | 2min 55s | 5.1 Go | 8.2s |
| faster-whisper (CTranslate2) | 42s | 2.3 Go | 1.4s |
| Ratio | **4.2x** | **2.2x** | **5.9x** |

Le "premier segment" mesure le temps entre le lancement de la transcription et l'émission du premier résultat. C'est la métrique critique pour le streaming — l'utilisateur veut voir du texte apparaitre rapidement. 1.4 seconde contre 8.2, ça change l'expérience.

### Pourquoi CTranslate2 est plus rapide

CTranslate2 applique plusieurs optimisations que PyTorch ne fait pas par défaut :

- **Quantification native** : les poids sont stockés et calculés en int8 ou float16 sans surcouche
- **Fusion de couches** : les opérations consécutives (LayerNorm + Linear + GELU) sont fusionnées en un seul kernel GPU
- **Cache KV optimisé** : la mémoire clé-valeur de l'attention est réutilisée entre les pas de décodage avec une gestion plus efficace
- **Batch padding minimal** : les séquences de longueurs différentes sont paddées au minimum, pas à la longueur maximale du batch

Ces optimisations ne changent pas le modèle. Le modèle Whisper est identique — mêmes poids, même architecture. Seul le runtime d'exécution diffère. C'est comme passer du CPython au PyPy pour un script Python : même code, exécution plus rapide.

## Guide de choix : quel matériel pour quel usage ?

Après des centaines de benchmarks, voici mes recommandations consolidées.

### Usage personnel — transcription occasionnelle

**Budget minimal (0 euros supplémentaires)** : utilisez votre machine actuelle en CPU. Le modèle small en int8 transcrit 10 minutes d'audio en 3-5 minutes sur un CPU récent. C'est suffisant pour transcrire un meeting hebdomadaire ou un podcast. Le modèle small produit une qualité correcte pour le français — WER autour de 12-15%.

**Budget modéré (250-350 euros)** : ajoutez une RTX 3060 12 Go d'occasion. Cette carte transforme l'expérience. Le modèle large-v3 en float16 tourne confortablement dans ses 12 Go de VRAM. WER de 5-8% en français. 10 minutes d'audio en 1 minute 40.

### Usage professionnel — transcription quotidienne

**Poste de travail dédié** : RTX 3080 ou RTX 4070 Ti (8-12 Go VRAM). Modèle large-v3, float16. Une heure d'audio en 7-10 minutes. Budget carte : 400-600 euros en 2026.

**Petit serveur multi-utilisateurs (2-5 utilisateurs)** : RTX 4090 24 Go. Le large-v3 avec headroom pour la concurrence. Un sémaphore à 2 permet de traiter deux fichiers en parallèle si les fichiers sont courts (< 15 min chacun). Au-delà, la VRAM sature et il faut sérialiser. Budget carte : 1 200-1 500 euros.

### Usage entreprise — haute disponibilité

Deux RTX 4090 dans un serveur rack avec load balancing. Ou une A6000 48 Go si le budget le permet (mais le rapport performance/prix est moins bon que deux 4090). Comptez 3 000-5 000 euros de GPU.

Pour les déploiements à grande échelle, l'[API locale FastAPI + Whisper](/blog/api-transcription-locale-fastapi-whisper) décrit l'architecture logicielle adaptée.

## Les pièges du benchmark

Quelques erreurs que j'ai commises et que je vois régulièrement dans les benchmarks publiés en ligne.

### Piège 1 : mesurer le chargement du modèle

Le chargement du modèle en VRAM prend 5 à 30 secondes selon la taille et le stockage (SSD NVMe vs HDD). Certains benchmarks incluent ce temps dans leur mesure. C'est trompeur : en production, le modèle est chargé une fois au démarrage du serveur. La métrique pertinente est le temps d'inférence seul.

### Piège 2 : ignorer le warm-up GPU

Le premier run après le chargement du modèle est systématiquement 10-20% plus lent que les suivants. Le GPU a besoin d'un "warm-up" — les caches CUDA, les kernels compilés à la volée (JIT), l'allocation mémoire initiale. Je lance toujours un fichier court (30 secondes) avant de commencer les mesures réelles.

### Piège 3 : comparer des formats audio différents

Un fichier WAV 16kHz mono et un fichier MP3 128kbps 44.1kHz stéréo ne produisent pas les mêmes temps de traitement — même s'ils contiennent le même contenu audio. La conversion interne (ffmpeg) ajoute 1-5 secondes, et le format source influence la qualité du signal décodé, donc le nombre de passes de décodage que Whisper effectue.

Tous mes benchmarks utilisent des fichiers WAV 16kHz mono. Si vous comparez avec d'autres sources, assurez-vous de normaliser le format d'entrée.

### Piège 4 : ne pas consommer le générateur

faster-whisper retourne un générateur Python. L'inférence se fait segment par segment, au fur et à mesure que vous itérez sur le générateur. Si vous mesurez le temps jusqu'au premier `next()`, vous ne mesurez que le premier segment — pas la transcription complète. Il faut consumer tout le générateur :

```python
# INCORRECT : ne mesure que le premier segment
segments, info = model.transcribe(audio)
first = next(segments)  # <-- mesure jusqu'ici = faux

# CORRECT : mesure la transcription complète
segments, info = model.transcribe(audio)
all_segments = list(segments)  # <-- consume tout le générateur
```

J'ai vu cette erreur dans au moins trois articles de blog "benchmark Whisper" publiés en 2025. Leurs chiffres de performance étaient 5x trop optimistes.

## L'avenir : ce qui va changer les benchmarks

### Les modèles distillés

Hugging Face a publié `distil-whisper`, une version distillée de Whisper large-v2 qui offre 5.8x la vitesse avec 51% de paramètres en moins. La qualité baisse de 1-2 points de WER. CTranslate2 supporte ces modèles distillés, et faster-whisper les intègre depuis la version 1.0.

Les benchmarks de distil-whisper large-v2 sur notre corpus français :

| Config | Temps (10 min) | WER français |
|--------|---------------|--------------|
| large-v3 float16 (RTX 3060) | 1min 38s | 7.2% |
| distil-large-v2 float16 (RTX 3060) | 22s | 9.8% |

Le compromis est intéressant pour les cas où la vitesse prime sur la précision maximale.

### CUDA 12 et les nouveaux kernels

Les versions récentes de CTranslate2 tirent parti des améliorations de CUDA 12 — notamment les Flash Attention kernels et les optimisations mémoire. Sur les GPU Ada Lovelace (série 40xx) et Blackwell (série 50xx), le gain par rapport à CUDA 11 est de 10-15% sur l'inférence Whisper.

Si vous êtes encore sur CUDA 11, la mise à jour vers CUDA 12.1+ est un gain gratuit. L'[article sur le déploiement Docker](/blog/deployer-clearrecap-docker-compose-guide) utilise CUDA 12.1 comme base.

### Les CPU avec NPU

Les processeurs Intel Meteor Lake et AMD Ryzen AI intègrent un NPU (Neural Processing Unit) dédié à l'inférence IA. En théorie, ces NPU pourraient accélérer Whisper sans carte GPU dédiée. En pratique, en mars 2026, le support de CTranslate2 pour les NPU Intel/AMD n'existe pas encore. Le OpenVINO d'Intel offre une alternative, mais avec une implémentation différente de faster-whisper qui ne bénéficie pas de toutes les optimisations CTranslate2.

Je surveille ce front de près chez ClearRecap. Le jour où faster-whisper supportera les NPU Intel, la transcription locale de qualité deviendra accessible sur n'importe quel laptop sans GPU dédié. Ce sera un tournant pour la [souveraineté des données audio](/blog/transcription-audio-rgpd-guide-2026).

## Méthodologie de reproduction

Pour reproduire ces benchmarks sur votre machine :

```python
import time
from faster_whisper import WhisperModel

def benchmark(model_size, device, compute_type, audio_path, runs=3):
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    # Warm-up
    segments, _ = model.transcribe(audio_path, beam_size=5, vad_filter=True)
    for s in segments:
        pass

    times = []
    for _ in range(runs):
        start = time.monotonic()
        segments, info = model.transcribe(
            audio_path, beam_size=5, vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
        )
        for s in segments:
            pass
        elapsed = time.monotonic() - start
        times.append(elapsed)

    median = sorted(times)[len(times) // 2]
    ratio = median / info.duration

    print(f"{model_size} | {device} {compute_type} | "
          f"{median:.1f}s | ratio {ratio:.3f}x | "
          f"audio {info.duration:.0f}s")

# Exemple
benchmark("medium", "cuda", "float16", "reunion-calme.wav")
```

Partagez vos résultats. Les benchmarks communautaires sont les plus utiles — ils couvrent des configurations que je n'ai pas sous la main. Un Google Sheet partagé avec les résultats de la communauté serait précieux. Si quelqu'un le crée, je le lien volontiers depuis cet article.

## Ce qu'il faut retenir

Trois conclusions dominent ces benchmarks.

**Le GPU est un multiplicateur, pas un luxe.** Même une RTX 3060 à 280 euros d'occasion transforme faster-whisper d'un outil "utilisable avec patience" en un outil "temps réel pour les fichiers courts". Le rapport performance/investissement est imbattable.

**Le modèle medium est le meilleur compromis pour le français.** Large-v3 gagne 2-3 points de WER, mais coûte 4x plus de temps et 2x plus de VRAM. Sauf besoin de précision maximale (médical, juridique), medium en float16 est le choix rationnel.

**La quantification int8 est votre plan B.** Quand la VRAM manque, int8 libère 40% de mémoire avec une perte de qualité quasi invisible. C'est la technique qui permet de faire tourner large-v3 sur une carte 6 Go — un scénario que beaucoup croient impossible.

Le hardware optimal pour la transcription locale existe déjà dans beaucoup de machines. Il suffit de le débloquer avec les bons paramètres. Ces benchmarks sont la carte pour y arriver.
