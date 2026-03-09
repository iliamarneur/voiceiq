# Security / Compliance — Mission v7_plans_minutes

## 1. Revue de securite

### 1.1 Authentification
| Point | Statut | Commentaire |
|-------|--------|-------------|
| Auth utilisateur | STUB | user_id="default", pas d'auth reelle |
| Protection routes API | ABSENT | Toutes les routes sont publiques |
| Token/Session | ABSENT | Pas de JWT ni session |
| Rate limiting | FAIT (partiel) | 10 req/min/IP sur endpoints billing et webhook |

**Recommandations prioritaires :**
- Implementer JWT auth (ou OAuth2 avec provider externe)
- Proteger tous les endpoints /api/* avec middleware auth
- ~~Ajouter rate limiting~~ FAIT sur billing/webhook (etendre a tous les endpoints)

### 1.2 Validation des inputs
| Endpoint | Validation | Statut |
|----------|-----------|--------|
| POST /api/upload | Type MIME, taille max | OK |
| PUT /api/subscription/plan | plan_id dans liste | OK |
| POST /api/subscription/add-minutes | pack_id dans liste | OK |
| POST /api/oneshot/order | tier dans liste | OK |
| POST /api/oneshot/estimate | duration_minutes > 0 | OK |
| POST /api/upload/batch | Limite nombre fichiers | A VERIFIER |

**Points OK :** Les schemas Pydantic valident les inputs sur les routes billing.
**A verifier :** Limite batch upload (DoS potentiel si illimite).

### 1.3 Endpoints sensibles
| Endpoint | Risque | Mitigation |
|----------|--------|------------|
| PUT /api/subscription/plan | Changement plan | Stripe checkout si configure, stub sinon |
| POST /api/subscription/add-minutes | Achat minutes | Stripe checkout si configure, stub sinon |
| POST /api/oneshot/order | Commande one-shot | Stripe checkout si configure, stub sinon |
| POST /api/stripe/webhook | Webhook Stripe | Signature verifiee, idempotent, rate limited |
| DELETE /api/transcriptions/{id} | Suppression donnees | Auth requise |
| POST /api/upload | Upload malveillant | Validation MIME + scan |

**Risque principal :** Sans auth, n'importe qui peut changer de plan, ajouter des minutes, creer des commandes gratuites. Acceptable en dev, critique a corriger avant prod.

### 1.4 Secrets et configuration
| Element | Stockage | Statut |
|---------|----------|--------|
| .env | Gitignore | OK (.env.example fourni) |
| DB credentials | .env | OK |
| Stripe keys | .env (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) | OK (.env.example mis a jour) |
| Ollama endpoint | Hardcode ou .env | OK |

**OK :** Variables Stripe ajoutees au `.env.example` avec valeurs placeholder.

### 1.5 Logs et audit
| Element | Statut | Commentaire |
|---------|--------|-------------|
| UsageLog | OK | Chaque transcription loguee |
| Access logs | Partiel | Uvicorn logs, pas structure |
| Audit trail (billing) | FAIT | Modele BillingEvent avec idempotence (stripe_event_id unique) |
| Error logging | Basique | Print/logging standard |

**Recommandations :**
- ~~Ajouter un audit log pour toutes les actions billing~~ FAIT (BillingEvent)
- Structurer les logs (JSON) pour ingestion monitoring
- Ne JAMAIS loguer les tokens, secrets, ou donnees personnelles

## 2. Donnees sensibles

### 2.1 Donnees traitees
| Type | Sensibilite | Stockage | Retention |
|------|-------------|----------|-----------|
| Audio uploads | Haute (voix = biometrie) | Disque local `/uploads/` | Indefinie |
| Transcriptions | Haute (contenu meetings) | SQLite DB | Indefinie |
| Infos abonnement | Moyenne | SQLite DB | Indefinie |
| Usage logs | Faible | SQLite DB | Indefinie |

### 2.2 Recommandations RGPD
- **Politique de retention** : definir duree max de stockage audio (ex: 90 jours apres derniere consultation)
- ~~**Droit a l'effacement** : endpoint DELETE pour supprimer toutes les donnees d'un utilisateur~~ FAIT (`DELETE /api/account`)
- ~~**Export donnees** : endpoint pour telecharger toutes les donnees d'un utilisateur (RGPD art. 20)~~ FAIT (`GET /api/account/export`)
- **DPA** : Data Processing Agreement a rediger pour les clients entreprise
- **Consentement** : case a cocher explicite au signup pour le traitement des donnees audio

### 2.3 Profil medical/legal
Les profils medical et legal traitent des donnees potentiellement sensibles (sante, juridique).
- **Medical** : conformite HDS (Hebergement Donnees de Sante) requise en France pour stockage cloud
- **Legal** : secret professionnel, donnees client confidentielles
- **Mitigation** : traitement 100% local = pas de transfert cloud, mais documentation necessaire

## 3. Securite infrastructure

| Element | Statut | Recommandation |
|---------|--------|----------------|
| HTTPS | Non (dev) | Obligatoire en prod (Let's Encrypt) |
| CORS | Permissif | Restreindre aux domaines autorises |
| CSP headers | Absent | Ajouter Content-Security-Policy |
| Docker isolation | OK | Containers separes backend/frontend |
| Volume permissions | OK | Volume natif Docker |
| Network | Docker bridge | OK pour dev, review pour prod |

## 4. Checklist pre-production

- [ ] Auth JWT/OAuth implementee
- [ ] Rate limiting configure
- [ ] HTTPS actif
- [ ] CORS restreint
- [ ] CSP headers ajoutes
- [ ] Stripe webhook signature validee
- [ ] Audit log billing actif
- [ ] Politique retention donnees definie
- [x] Endpoint suppression compte utilisateur (`DELETE /api/account`)
- [x] Endpoint export donnees RGPD (`GET /api/account/export`)
- [ ] Scan dependances (pip-audit, npm audit)
- [ ] Tests de securite (OWASP ZAP basique)
- [ ] Backup DB automatise
- [ ] Monitoring erreurs (Sentry ou equivalent)

## 5. Score de securite actuel

| Categorie | Score | Commentaire |
|-----------|-------|-------------|
| Auth | 1/5 | Pas d'auth reelle |
| Input validation | 4/5 | Pydantic schemas OK |
| Data protection | 3/5 | Local OK, mais pas de retention policy |
| Logging/Audit | 2/5 | Usage logs OK, audit billing manquant |
| Infrastructure | 3/5 | Docker OK, HTTPS/CORS manquants |
| **Global** | **2.6/5** | **Acceptable pour dev, insuffisant pour prod** |
