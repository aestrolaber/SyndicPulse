# SyndicPulse — Desktop (Air-Gapped) Licensing Strategy

> Reference doc for the offline/local deployment option.
> Relevant when a prospect requests a self-hosted desktop version instead of the cloud SaaS.

---

## The Problem

A desktop version of SyndicPulse can be copied, shared, or resold by the purchasing syndic to other syndics — bypassing your per-building revenue model. This document covers the technical and legal levers available to prevent that.

---

## Option 1 — Online License Activation (Recommended)

Even for an "air-gapped" deployment, one internet touchpoint is used: **first-run activation**.

### How it works

1. On install, the app generates a **machine fingerprint** (hash of MAC address + disk serial number + hostname)
2. The user enters their **license key** (issued by you at purchase)
3. The app calls your license server: `POST https://license.syndicpulse.ma/activate`
   - Payload: `{ key, fingerprint, buildingIds[] }`
   - Response: a signed JWT (`activation_token`) tied to that fingerprint
4. The token is stored locally (encrypted) — app runs offline from this point
5. Token has a **30-day TTL** and refreshes silently in the background when internet is available
6. If the token expires without a refresh → **7-day grace period** → app locks to read-only

### What this blocks

| Threat | Protection |
|--------|-----------|
| Copying installed folder to another machine | Fingerprint mismatch → token invalid |
| Sharing license key with a second syndic | Two activations detected → you revoke one remotely |
| Non-renewal | Token expires → read-only, then locked |
| Physical transfer of hardware | You control deactivation from your dashboard |

### Tech stack

| Component | Tool |
|-----------|------|
| Machine fingerprint | `node-machine-id` npm package |
| Token signing | `jose` (JWT, asymmetric RS256) |
| License server | Supabase edge function or lightweight Node/Express endpoint |
| License DB | Supabase `licenses` table: `key`, `fingerprint`, `building_ids`, `activated_at`, `revoked` |

---

## Option 2 — Transparency Portal as Natural Enforcement Gate

This is the **strongest lever with zero extra dev cost** — and it applies immediately.

### Logic

The resident transparency portal pushes data to **your domain** (`portal.syndicpulse.ma/{slug}`).
To publish, the desktop app calls your API with the client's **license key in the header**.

```
POST https://portal.syndicpulse.ma/api/sync
Authorization: Bearer {license_key}
```

**You control the API.** If the license is revoked, the sync fails. If two machines use the same key, you detect it and block one.

### Why this matters

- Even if the client physically copies the app to another syndic, the **transparency feature stops working the moment you revoke**
- The transparency portal is the main resident-facing value proposition — losing it is a strong deterrent
- No additional app changes needed: just enforce the key on your sync API

---

## Option 3 — Per-Building Signed License Key (No Server Required)

The license key cryptographically encodes the **allowed building IDs**.

### Key format

```
NRWST-ATLAS-2026-{base64(RSA_signature_of_building_ids)}
```

- App decrypts the key at startup using your **embedded public key**
- Extracted building IDs are the only ones the app will manage
- The app refuses to create or import buildings outside the licensed set
- No internet required — the key IS the license

### Limitation

If someone shares both the key AND the installer, a second syndic can use it for the same building codes. Combine with Option 1 (fingerprint binding) for full protection.

---

## Option 4 — Legal Layer (Essential Regardless of Tech Choice)

Technology alone is not enough. The legal layer is your fallback and your proof trail.

### EULA clauses to include

- License is issued to one **legal entity** (company name + ICE/RC number in Morocco)
- License covers a specific list of **building addresses** — not transferable
- Redistribution, resale, or sublicensing to third parties is a breach of contract
- You retain the right to audit activation logs and remotely deactivate

### Invoicing practice

- Issue invoices **per building**, not per installation
- Each invoice references the building address and the syndic's legal name
- This creates a paper trail: if a second syndic uses the software, it's a breach of a named contract

---

## Recommended Architecture for Desktop Deployment

```
┌─────────────────────────────────────────────────────────┐
│                  Client's Desktop Machine               │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │   Electron   │◄──►│  PocketBase (port 8090)      │  │
│  │  (wraps the  │    │  SQLite DB — all local data  │  │
│  │  React app)  │    └──────────────────────────────┘  │
│  └──────┬───────┘                                       │
│         │ license check (startup)                       │
└─────────┼───────────────────────────────────────────────┘
          │
          ▼  (internet only for these two calls)
┌─────────────────────────────────────────────────────────┐
│              Your Cloud Infrastructure                  │
│                                                         │
│  license.syndicpulse.ma  ──  Activation & revocation   │
│  portal.syndicpulse.ma   ──  Resident transparency sync │
└─────────────────────────────────────────────────────────┘
```

### Stack summary

| Layer | Tool | Notes |
|-------|------|-------|
| Desktop wrapper | Electron | Compiles JS — not source-accessible like a browser |
| Local backend | PocketBase | Single binary, SQLite, runs on port 8090 |
| License fingerprint | `node-machine-id` | Cross-platform hardware ID |
| Token crypto | `jose` (RS256 JWT) | Private key stays on your server only |
| License server | Supabase edge function | `licenses` table with activation log |
| Copy protection | Native Node addon (`.node`) | License check compiled to binary — harder to reverse |
| Transparency push | `portal.syndicpulse.ma` API | Your server validates key on every sync |

---

## Phased Implementation Plan

### Phase 1 — Now (minimal effort, ~80% protection)
- [ ] Ship with a **hardcoded building-code whitelist** per installation (baked in at build time)
- [ ] Enforce license key on the transparency portal sync API
- [ ] Include a signed EULA at install time (checkbox)
- [ ] Per-building invoicing with legal names

### Phase 2 — Before scaling to 5+ clients
- [ ] Build the license activation endpoint (Supabase edge function)
- [ ] Integrate `node-machine-id` fingerprinting in the Electron app
- [ ] 30-day JWT token with silent refresh
- [ ] Admin dashboard: view all active installs, revoke remotely

### Phase 3 — Mature product
- [ ] Move license check logic into a compiled native Node addon
- [ ] Cryptographically signed per-building license keys (Option 3) as a backup
- [ ] Automated suspension on payment failure (integrate with your billing)

---

## Related Docs

- [`CloudVsAirgapped.md`](./CloudVsAirgapped.md) — cloud vs. local deployment trade-offs
- [`admin_user_manual.md`](./admin_user_manual.md) — end-user documentation

---

*Last updated: Mars 2026 · SyndicPulse internal*
