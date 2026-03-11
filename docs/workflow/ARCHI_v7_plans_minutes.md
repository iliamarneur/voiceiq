# Architect — Mission v7_plans_minutes

## PARTIE I — ARCHITECTURE v2 (refonte 2026-03-08)

---

## 1. Architecture globale

```
                         ┌─────────────────┐
                         │     Nginx        │ :80 / :443
                         │  (reverse proxy) │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
         ┌──────────▼──────────┐    ┌───────────▼────────────┐
         │   React Frontend    │    │    FastAPI Backend      │ :8002
         │   (Vite SPA)        │    │                        │
         │                     │    │    Routes:              │
         │   MODE SIMPLE:      │    │    ├── /api/public/*   │ (no auth)
         │   - OneShotSimple   │    │    ├── /api/user/*     │ (auth)
         │   - TransWaiting    │    │    ├── /api/admin/*    │ (admin)
         │   - TransResult     │    │    │                    │
         │   - PlansPublic     │    │    Services:            │
         │                     │    │    ├── transcription    │
         │   MODE APP:         │    │    ├── subscription     │
         │   - Dashboard       │    │    ├── oneshot          │
         │   - Upload          │    │    ├── feature_gate     │
         │   - PlansUsage      │    │    ├── stripe           │
         │   - OneShotAdvanced │    │    ├── export           │
         │   - TransView       │    │    ├── rgpd             │
         │   - Admin           │    │    └── admin            │
         │                     │    │                        │
         │   Store: Redux TK   │    │    Models (ORM)        │
         └─────────────────────┘    └───────────┬────────────┘
                                                │
                                   ┌────────────┴────────────┐
                                   │                         │
                          ┌────────▼────────┐    ┌──────────▼──────────┐
                          │  SQLite/Postgres │    │  Ollama LLM         │
                          │  (data)          │    │  :11434              │
                          └──────────────────┘    └──────────────────────┘
                                                            │
                                                   ┌────────▼────────┐
                                                   │  Faster-Whisper  │
                                                   │  (STT)           │
                                                   └─────────────────┘
```

## 2. Separation des modes : Simple vs App

### Principe

Le frontend expose **deux modes** servis par la meme SPA :

| Aspect | Mode Simple | Mode App |
|--------|-------------|----------|
| URL prefix | `/` | `/app/*` |
| Auth | Aucune (anonymous) | Requise (JWT ou session) |
| Sidebar | Non | Oui |
| User ID backend | `anonymous-{session}` | UUID reel |
| Features | One-shot only | Tout selon plan |
| Profils | Generique auto | Tous disponibles |

### Routing React

```tsx
<Routes>
  {/* Mode Simple — sans layout sidebar */}
  <Route element={<SimpleLayout />}>
    <Route path="/" element={<OneShotSimple />} />
    <Route path="/processing/:jobId" element={<TranscriptionWaiting />} />
    <Route path="/result/:id" element={<TranscriptionResult />} />
    <Route path="/plans" element={<PlansPublic />} />
  </Route>

  {/* Mode App — avec sidebar, auth requise */}
  <Route element={<AppLayout />}>
    <Route path="/app" element={<Dashboard />} />
    <Route path="/app/upload" element={<Upload />} />
    <Route path="/app/new" element={<NewEntry />} />
    <Route path="/app/transcription/:id" element={<TranscriptionView />} />
    <Route path="/app/plans" element={<PlansUsage />} />
    <Route path="/app/oneshot" element={<OneShotAdvanced />} />
    <Route path="/app/templates" element={<Templates />} />
    <Route path="/app/dictionaries" element={<Dictionaries />} />
    <Route path="/app/presets" element={<Presets />} />
    <Route path="/app/preferences" element={<Preferences />} />
    <Route path="/app/record" element={<Record />} />
    <Route path="/app/dictate" element={<Dictate />} />
    <Route path="/app/models" element={<Models />} />
    <Route path="/app/admin" element={<AdminDashboard />} />
  </Route>
</Routes>
```

### Layouts

```
SimpleLayout:
┌──────────────────────────────────────┐
│  [Logo]              [Login] [Plans] │  ← header minimal
├──────────────────────────────────────┤
│                                      │
│            <Outlet />                │  ← contenu pleine largeur
│                                      │
└──────────────────────────────────────┘

AppLayout:
┌──────┬───────────────────────────────┐
│      │                               │
│ Side │         <Outlet />            │
│ bar  │                               │
│      │                               │
│ Jauge│                               │
└──────┴───────────────────────────────┘
```

## 3. Architecture backend — Separation des routes

### 3.1 Routes publiques (no auth) — `/api/public/*`

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/public/plans | Liste des plans (affichage marketing) |
| GET | /api/public/oneshot/tiers | Tarifs one-shot |
| POST | /api/public/oneshot/estimate | Estimer tier pour une duree |
| POST | /api/public/oneshot/order | Creer commande (+ stub paiement) |
| POST | /api/public/oneshot/upload | Upload fichier one-shot |
| GET | /api/public/jobs/{id} | Statut du job (polling) |
| GET | /api/public/transcriptions/{id} | Resultat one-shot (read-only) |
| GET | /api/public/transcriptions/{id}/export/{format} | Export one-shot |
| POST | /api/stripe/webhook | Webhook Stripe |
| GET | /api/health | Health check |

### 3.2 Routes user (auth) — `/api/*` (existantes, inchangees)

Toutes les routes actuelles restent identiques :
- `/api/subscription`, `/api/plans`, `/api/upload`, `/api/transcriptions/*`
- `/api/usage/*`, `/api/oneshot/*`, `/api/dictionaries/*`, `/api/templates/*`
- `/api/subscription/alerts`, `/api/subscription/features`
- `/api/account/export`, `/api/account` (DELETE)

### 3.3 Routes admin — `/api/admin/*` (nouvelles)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/admin/stats | MRR, users, minutes, erreurs, conversions |
| GET | /api/admin/users | Liste users avec plan, usage, derniere activite |
| GET | /api/admin/users/{id} | Detail user (transcriptions, billing events) |
| PUT | /api/admin/users/{id}/plan | Forcer changement plan |
| PUT | /api/admin/users/{id}/reset-minutes | Reset quota |
| GET | /api/admin/jobs/queue | Queue des jobs en cours |
| GET | /api/admin/billing/events | Logs billing globaux |
| GET | /api/admin/backends | Sante des backends (Whisper, Ollama) |

### 3.4 Middleware auth (a implementer)

```python
# Trois niveaux d'auth
@app.middleware("http")
async def auth_middleware(request, call_next):
    path = request.url.path

    # Public routes — no auth
    if path.startswith("/api/public/") or path == "/api/health" or path == "/api/stripe/webhook":
        return await call_next(request)

    # Admin routes — require admin role
    if path.startswith("/api/admin/"):
        user = await get_authenticated_user(request)
        if not user or user.role != "admin":
            raise HTTPException(403, "Admin required")
        request.state.user = user
        return await call_next(request)

    # User routes — require auth
    user = await get_authenticated_user(request)
    if not user:
        raise HTTPException(401, "Authentication required")
    request.state.user = user
    return await call_next(request)
```

**Note** : En v7 dev, le middleware peut etre desactive (tout passe en user "default"). La structure de routes est preparee pour le jour ou l'auth est activee.

## 4. Modeles de donnees (ajouts v2)

### User (nouveau, pour auth future)

```python
class User(Base):
    __tablename__ = "users"
    id: str                  # UUID
    email: str               # unique
    name: str
    role: str = "user"       # "user" | "admin"
    created_at: datetime
    last_login: datetime
```

### AnonymousSession (nouveau, pour one-shot sans auth)

```python
class AnonymousSession(Base):
    __tablename__ = "anonymous_sessions"
    id: str                  # UUID auto
    session_token: str       # cookie/header token
    oneshot_order_id: str    # FK → OneshotOrder
    transcription_id: str    # FK → Transcription (nullable)
    created_at: datetime
    expires_at: datetime     # +24h
```

**Objectif** : permettre a un visiteur anonymous de retrouver son resultat one-shot pendant 24h via un token de session, sans creer de compte.

### Modeles existants inchanges

- Plan, UserSubscription, UsageLog, OneshotOrder, BillingEvent
- Job, Transcription, Analysis, ChatMessage, Chapter, etc.

## 5. Composants frontend — Architecture

### 5.1 Structure des fichiers (cible)

```
frontend/src/
├── layouts/
│   ├── SimpleLayout.tsx         ← header minimal, pas de sidebar
│   └── AppLayout.tsx            ← sidebar + header + jauge
│
├── pages/
│   ├── simple/                  ← Mode Simple (visiteur)
│   │   ├── OneShotSimple.tsx    ← landing + upload + prix + CTA
│   │   ├── TranscriptionWaiting.tsx  ← ecran d'attente (decouverte)
│   │   ├── TranscriptionResult.tsx   ← resultat + export + upsell
│   │   └── PlansPublic.tsx      ← grille plans (marketing)
│   │
│   ├── app/                     ← Mode App (user connecte)
│   │   ├── Dashboard.tsx
│   │   ├── Upload.tsx
│   │   ├── NewEntry.tsx
│   │   ├── TranscriptionView.tsx
│   │   ├── PlansUsage.tsx
│   │   ├── OneShotAdvanced.tsx  ← variante B avec profils
│   │   ├── Templates.tsx
│   │   ├── Dictionaries.tsx
│   │   ├── Presets.tsx
│   │   ├── Preferences.tsx      ← inclut RGPD export/delete
│   │   ├── Record.tsx
│   │   ├── Dictate.tsx
│   │   └── Models.tsx
│   │
│   └── admin/
│       └── AdminDashboard.tsx   ← monitoring + gestion users
│
├── components/
│   ├── shared/                  ← composants reutilises partout
│   │   ├── DropZone.tsx
│   │   ├── TranscriptionProgress.tsx
│   │   ├── ProfileSelector.tsx
│   │   └── PriceCard.tsx
│   │
│   ├── app/                     ← composants mode App
│   │   ├── Sidebar.tsx
│   │   ├── QuotaAlert.tsx
│   │   ├── MinutesEstimate.tsx
│   │   ├── MinutesGauge.tsx
│   │   └── BackendSelector.tsx
│   │
│   └── simple/                  ← composants mode Simple
│       ├── SimpleHeader.tsx
│       ├── UpsellBanner.tsx
│       └── DiscoverySection.tsx ← "Le saviez-vous" dans l'attente
│
├── store/
│   ├── index.ts
│   └── subscriptionSlice.ts
│
├── api/
│   ├── public.ts               ← appels /api/public/*
│   ├── subscription.ts
│   ├── oneshot.ts
│   └── admin.ts
│
├── types.ts
├── App.tsx
└── index.tsx
```

### 5.2 Composants cles

**OneShotSimple** (page principale visiteur) :
- Etat = `idle | fileSelected | estimating | ready | paying | processing | done | error`
- Pas de selecteur profil (force "generic")
- Pas de choix de tier (auto-detecte)
- Le recap est simplifie (prix + 3 bullets)
- Apres paiement, transition vers TranscriptionWaiting

**OneShotAdvanced** (page user connecte) :
- Herite du flow actuel Oneshot.tsx (Variante B)
- Ajoute : selecteur profil, choix de tier, recap detaille, comparaison

**TranscriptionWaiting** (ecran d'attente) :
- Recoit un `jobId` en param
- Poll `/api/public/jobs/{id}` toutes les 3s
- Affiche timeline 4 etapes + benefices + section decouverte
- Quand done : transition 1.5s "C'est pret !" → redirect `/result/{id}`

**TranscriptionResult** (resultat one-shot) :
- Affiche : transcription, resume, points cles (analyses incluses dans le tier)
- Boutons export : PDF, TXT, Copier
- Bandeau upsell en bas (UpsellBanner)
- Pas de sidebar, pas d'onglets complexes

**UpsellBanner** (conversion one-shot → plan) :
- 4 arguments (prix/min, profils, chat IA, exports)
- CTA : "Decouvrir les abonnements →"
- Lien secondaire : "C'est tout, merci." (dismiss)

**AdminDashboard** :
- Stats globales (MRR, users actifs, minutes consommees, taux erreur)
- Queue jobs en cours
- Liste users avec plan et usage
- Logs billing
- Sante backends

## 6. Decisions architecturales v2

### DA-6 : Deux modes frontend, un seul backend

Le backend ne sait pas si la requete vient du mode Simple ou App. Les routes `/api/public/*` sont simplement non-authentifiees. Le frontend gere la presentation.

### DA-7 : Session anonyme pour one-shot

Un visiteur sans compte recoit un `session_token` (cookie httpOnly). Ce token lui permet de :
- Retrouver son resultat pendant 24h
- Telecharger ses exports
- Ne PAS voir les resultats d'autres visiteurs

Le token est cree au moment de l'order one-shot et expire apres 24h.

### DA-8 : Migration progressive des routes

Pour ne pas tout casser d'un coup :
1. Les routes actuelles (`/api/*`) restent identiques
2. On ajoute des alias `/api/public/*` qui pointent vers les memes handlers
3. Le middleware auth n'est active que quand `AUTH_ENABLED=true` dans .env
4. En dev, tout continue de fonctionner comme avant

### DA-9 : Admin = flag user, pas app separee

Le role admin est un champ `role` sur le modele User. Le frontend affiche la section Admin dans la sidebar si `user.role === "admin"`. Pas besoin d'une app ou d'un domaine separe.

### DA-10 : One-shot simple = meme pipeline que Upload

Le one-shot simple utilise exactement le meme pipeline de transcription que l'upload normal :
1. `POST /api/public/oneshot/order` → cree l'order
2. `POST /api/public/oneshot/upload` → cree le job (meme code que `/api/upload`)
3. Le job passe dans la meme queue, avec le meme Whisper + Ollama
4. Le resultat est une Transcription normale avec `oneshot_order_id` set

---

## PARTIE II — ARCHITECTURE v1 (historique)

### Modeles existants (inchanges)
- Plan, UserSubscription, UsageLog, OneshotOrder, BillingEvent
- Job, Transcription, Analysis, ChatMessage, Chapter, Template
- SpeakerLabel, UserDictionary, DictionaryEntry, AudioPreset, UserCorrection
- UserPreferences, DictationSession

### Decisions architecturales v1 (DA-1 a DA-5)
- DA-1 : Consommation minutes (plan → exceeded, pas d'extra packs)
- DA-2 : Stub paiement (auto-validate en dev)
- DA-3 : Multi-tenant ready (user_id partout)
- DA-4 : Reset mensuel (check a chaque appel)
- DA-5 : Performance locale (GPU, pas d'API cloud)
