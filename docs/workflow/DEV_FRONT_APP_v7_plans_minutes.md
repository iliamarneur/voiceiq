# Frontend App Developer — Mission v7_plans_minutes

## PARTIE I — ARCHITECTURE v2 (refonte 2026-03-08)

---

## 1. Nouveaux composants et pages

### 1.1 Layouts

**SimpleLayout.tsx** — pour le mode visiteur (one-shot sans sidebar)

```tsx
function SimpleLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          VoiceIQ
        </Link>
        <div className="flex gap-4 text-sm">
          <Link to="/app" className="text-gray-400 hover:text-white">Se connecter</Link>
          <Link to="/plans" className="text-indigo-400 hover:text-indigo-300">Les plans →</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-600 py-4">
        VoiceIQ · Vos donnees restent 100% locales.
      </footer>
    </div>
  );
}
```

**AppLayout.tsx** — sidebar existante, restructuree en 3 sections

```tsx
function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <QuotaAlert />
    </div>
  );
}
```

### 1.2 Pages Mode Simple

**OneShotSimple.tsx** — page principale visiteur (route `/`)

```
Etats : idle → fileSelected → estimating → ready → paying → processing → done → error

idle:
  - Hero : "Transcrivez votre fichier audio."
  - DropZone (grande, centree)
  - Section "Comment ca marche" (3 etapes)
  - Reassurance donnees locales

fileSelected → estimating:
  - Fichier affiche (nom + taille)
  - Spinner "Estimation en cours..."
  - Appel POST /api/public/oneshot/estimate

ready:
  - Recap : prix + 3 bullets (ce qu'il recoit)
  - CTA : "Transcrire mon fichier — X EUR"
  - Reassurance sous CTA

paying:
  - Appel POST /api/public/oneshot/order
  - Puis POST /api/public/oneshot/upload
  - Redirect vers /processing/{jobId}?token={session_token}

error:
  - Message d'erreur
  - Bouton "Reessayer" (conserve le fichier)
```

**TranscriptionWaiting.tsx** — ecran d'attente

```
Props : jobId (from URL), sessionToken (from URL query)

- Poll GET /api/public/jobs/{jobId}?session_token=... toutes les 3s
- Affiche timeline 4 etapes (fichier recu, transcription, resume, analyses)
- Affiche 3 bullets benefices
- Section "Le saviez-vous ?" (decouverte profils/abonnements, texte only)
- Reassurance donnees locales
- Quand status=completed : "C'est pret !" (1.5s) → redirect /result/{transcriptionId}
```

**TranscriptionResult.tsx** — resultat one-shot

```
Props : id (from URL), sessionToken (from URL query)

- Fetch GET /api/public/transcriptions/{id}?session_token=...
- Affiche : transcription texte (scrollable), resume, points cles
- Si tier Standard ou superieur : affiche aussi actions
- Si tier Long ou superieur : affiche aussi quiz
- Boutons export : [PDF] [TXT] [Copier]
- UpsellBanner en bas (dismissible)
```

**PlansPublic.tsx** — grille plans publique

```
- Fetch GET /api/public/plans
- Grille 3 colonnes (Basic, Pro, Equipe+)
- CTA sur chaque plan : "S'inscrire" → redirect vers /app (ou signup futur)
- Pas de gestion d'achat (juste marketing)
```

### 1.3 Composants Mode Simple

**SimpleHeader.tsx** — deja dans SimpleLayout

**UpsellBanner.tsx** — bandeau conversion one-shot → plan

```tsx
interface UpsellBannerProps {
  onDismiss: () => void;
}

function UpsellBanner({ onDismiss }: UpsellBannerProps) {
  // 4 arguments : prix/min, profils, chat IA, exports
  // CTA : "Decouvrir les abonnements →" → /plans
  // Lien : "C'est tout, merci." → onDismiss
  // Style : bg-gray-900, border-gray-700, rounded-xl, p-6
}
```

**DiscoverySection.tsx** — "Le saviez-vous" dans l'ecran d'attente

```tsx
function DiscoverySection() {
  // Texte informatif sur les profils metiers et abonnements
  // PAS de CTA, PAS de bouton — juste du texte
  // Style : bg-gray-900/50, border-l-2 border-indigo-500, p-4
  return (
    <div className="mt-8 bg-gray-900/50 border-l-2 border-indigo-500 p-4 rounded-r-lg">
      <p className="text-sm font-medium text-gray-300 mb-2">Le saviez-vous ?</p>
      <p className="text-sm text-gray-400 leading-relaxed">
        VoiceIQ peut aussi analyser des reunions business, des cours, des consultations medicales...
        Avec un abonnement, vous accedez a des profils metiers specialises,
        du chat IA pour poser des questions sur vos transcriptions,
        et des exports avances (PDF, PPTX, sous-titres).
      </p>
    </div>
  );
}
```

### 1.4 Sidebar restructuree

```tsx
// Sidebar sections
const SECTIONS = {
  principal: [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/app/new', icon: Plus, label: 'Nouveau' },
    { path: '/app/oneshot', icon: Zap, label: 'One-shot' },
  ],
  outils: [
    { path: '/app/templates', icon: FileText, label: 'Templates', gate: 'templates' },
    { path: '/app/dictionaries', icon: BookOpen, label: 'Dictionnaires', gate: 'dictionaries' },
    { path: '/app/presets', icon: Sliders, label: 'Presets', gate: 'presets' },
  ],
  compte: [
    { path: '/app/plans', icon: CreditCard, label: 'Plans & Usage' },
    { path: '/app/preferences', icon: Settings, label: 'Preferences' },
  ],
  admin: [
    { path: '/app/admin', icon: BarChart3, label: 'Monitoring' },
    { path: '/app/models', icon: Cpu, label: 'Modeles & IA' },
  ],
};

// Gated items show [Pro] badge if feature not in current plan
// Admin section only visible if user.role === "admin"
```

### 1.5 Page Admin (nouvelle)

**AdminDashboard.tsx**

```
Sections :

1. Stats cards (4 colonnes)
   - MRR (en EUR)
   - Users actifs
   - Minutes consommees (ce mois)
   - Taux d'erreur (24h)

2. Queue jobs en cours
   - Tableau : job_id, fichier, status, priority, duree estimee
   - Refresh auto 10s

3. Backends
   - Whisper : status (ok/down), modele charge, VRAM utilise
   - Ollama : status, modele actif, latence ping

4. Derniers billing events
   - Tableau : date, type, montant, status
```

## 2. Plan d'implementation par passes

### Passe 1 — Tunnel One-shot Simple (priorite haute)

**Objectif** : un visiteur peut transcrire un fichier depuis `/` sans sidebar.

**Fichiers a creer :**
| Fichier | Description |
|---------|-------------|
| `src/layouts/SimpleLayout.tsx` | Header minimal + footer |
| `src/pages/simple/OneShotSimple.tsx` | Landing + upload + prix + CTA |
| `src/pages/simple/TranscriptionWaiting.tsx` | Ecran d'attente avec decouverte |
| `src/pages/simple/TranscriptionResult.tsx` | Resultat + export + upsell |
| `src/pages/simple/PlansPublic.tsx` | Grille plans marketing |
| `src/components/simple/UpsellBanner.tsx` | Bandeau conversion |
| `src/components/simple/DiscoverySection.tsx` | Texte decouverte |
| `src/components/shared/DropZone.tsx` | Extract du drop zone existant |

**Fichiers a modifier :**
| Fichier | Changement |
|---------|-----------|
| `src/App.tsx` | Ajouter SimpleLayout + routes `/`, `/processing`, `/result`, `/plans` |
| `src/api/public.ts` | Nouveau fichier : appels `/api/public/*` |

**Backend (Passe 1 backend) :**
| Fichier | Changement |
|---------|-----------|
| `backend/app/main.py` | Ajouter routes `/api/public/*` (alias) |
| `backend/app/models.py` | Ajouter `AnonymousSession` |
| `backend/app/services/anonymous_service.py` | Nouveau : gestion sessions anonymes |
| `backend/tests/test_anonymous.py` | Tests sessions + routes publiques |

**Risques :** Aucun — les routes existantes ne sont pas modifiees.

**Questions pour toi :** Aucune (pas de changement de prix ni de securite prod).

### Passe 2 — Restructuration sidebar + feature gating UX

**Objectif** : la sidebar est organisee en sections, les features gatees montrent un badge [Pro].

**Fichiers a modifier :**
| Fichier | Changement |
|---------|-----------|
| `src/App.tsx` | Refactorer les routes sous `/app/*` avec AppLayout |
| `src/App.tsx` (sidebar) | Extraire dans `src/components/app/Sidebar.tsx` |
| `src/components/app/Sidebar.tsx` | 3 sections + badges gating + section admin conditionnelle |

**Risque :** Les URLs changent de `/upload` a `/app/upload`. Besoin de redirects 301 ou de garder les deux pendant la transition.

**Decision (je decide, ajustable plus tard) :** On garde les anciennes routes comme alias pendant 1 mois via `<Navigate>` React, puis on les supprime.

### Passe 3 — Refonte PlansUsage + Preferences RGPD

**Objectif** : la page Plans est simplifiee (plan actuel + jauge + usage + changement de plan). La page Preferences integre l'export et la suppression RGPD.

**Fichiers a modifier :**
| Fichier | Changement |
|---------|-----------|
| `src/pages/app/PlansUsage.tsx` | Refonte layout : banniere plan + graphique + plans (3 colonnes, pas de packs extra) |
| `src/pages/app/Preferences.tsx` | Ajouter section "Donnees personnelles" avec export/suppression |

### Passe 4 — Admin Dashboard

**Objectif** : page admin avec monitoring et gestion.

**Fichiers a creer :**
| Fichier | Description |
|---------|-------------|
| `src/pages/admin/AdminDashboard.tsx` | Stats + queue + backends + billing |
| `src/api/admin.ts` | Appels `/api/admin/*` |

**Backend :**
| Fichier | Changement |
|---------|-----------|
| `backend/app/main.py` | Routes `/api/admin/*` |
| `backend/app/services/admin_service.py` | Stats, health, queue |
| `backend/tests/test_admin.py` | Tests admin |

**Risques :** Aucun impact sur les utilisateurs normaux.

---

## PARTIE II — IMPLEMENTATION v1 (historique)

### Etat actuel (inchange)
- PlansUsage.tsx : plan + jauge + grille 3 plans (Basic/Pro/Equipe+) + usage
- Upload.tsx : drop zone + profils + priority + preset + langue + estimation + progress
- Oneshot.tsx : Variante B (grille tiers, profils, recap, reassurance, comparaison)
- QuotaAlert.tsx : toast niveaux warning/critical/blocked, dismiss sessionStorage
- MinutesEstimate.tsx : estimation minutes, CTA si insuffisant
- TranscriptionProgress.tsx : timeline 4 etapes, benefices, reassurance
- types.ts : tous les types v7

### Passe 3 implementation (2026-03-07)
- Oneshot reecrit en Variante B
- QuotaAlert avec CTA differencies
- MinutesEstimate avec labels corriges
- types.ts avec OneshotTier.label
