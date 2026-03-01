# Cloud vs Airgapped Deployment — SyndicPulse

> Decision pending client confirmation. No code changes until a deployment mode is chosen.

---

## Why this question exists

Some Moroccan syndic managers may refuse cloud deployment due to:
- Fear of data leaks or unauthorized access
- General skepticism about storing resident/financial data on foreign servers
- Low tech literacy — distrust of anything "on the internet"
- Legal exposure: Loi 18-00 requires financial transparency to residents, so data must be accessible and auditable at all times

Both modes are fully supported by the current architecture.

---

## Option A — Cloud (Supabase)

**Stack**: Vite + React → Vercel · Supabase (PostgreSQL + Auth + RLS) · Twilio WhatsApp

| Aspect | Detail |
|---|---|
| Data location | Supabase servers (EU region configurable) |
| Internet required | Yes — always |
| Auth | Supabase Auth (JWT, RLS per building) |
| Your access as developer | Supabase dashboard + service role key |
| Backup | Automatic (Supabase handles it) |
| Multi-building | Single deployment serves all buildings |
| WhatsApp reminders | Native via Twilio API |
| Upgrades | Push to GitHub → Vercel auto-deploys |
| Monthly cost | Supabase free tier up to 50k rows · Vercel free · Twilio pay-per-message |

**Code status**: mock client in `src/lib/supabase.js` — swap for real credentials when ready.

---

## Option B — Airgapped / Local (PocketBase)

**Stack**: Vite + React (static build) served by PocketBase · SQLite · No internet

### What PocketBase gives you
- Single `.exe` binary (~30 MB), no Node, no Docker, no install wizard
- Built-in auth, REST API, admin dashboard at `/_/`
- Serves your static React build from `pb_public/`
- SQLite database in `pb_data/data.db` — one file, portable

### Folder layout on client PC
```
C:\SyndicPulse\
  pocketbase.exe
  pb_data\
    data.db           ← all residents, payments, tickets, disputes
  pb_public\
    index.html        ← built React app
    assets\
```

Client opens browser → `http://localhost:8090` — zero internet.

### Running as a Windows Service
Install once during setup so it starts automatically on boot:
```bat
sc create SyndicPulse binPath="C:\SyndicPulse\pocketbase.exe serve" start=auto
sc start SyndicPulse
```
Invisible to the client, survives reboots.

---

## Developer Access (Backdoor Strategy)

### Recommended: PocketBase superadmin + TeamViewer

PocketBase has a **superadmin layer** (`/_/` dashboard) separate from app users.

- During installation, **you** set the superadmin email/password
- Store it in your password manager — client never sees it
- For support: client opens TeamViewer/AnyDesk → you connect → `localhost:8090/_/`
- Document in contract: client must not change the superadmin password without notifying you

### App-level fallback
Keep `admin@syndicpulse.ma / admin` as `super_admin` role in your app auth.
- Client-facing users are always `syndic_manager`
- You are the only holder of `super_admin` credentials
- Already implemented — no code change needed

### What NOT to do
- Do not hardcode a network-reachable backdoor (a port the app listens on remotely) — security liability
- Do not rely solely on app-level credentials (DB wipe = lockout)

---

## Data Management Offline

| Concern | Solution |
|---|---|
| Daily backup | `.bat` script copying `pb_data/data.db` to a dated folder or USB |
| Disaster recovery | Restore by replacing `data.db` — one file copy |
| Schema upgrade | PocketBase migrations system — runs on binary update |
| App upgrade | Replace `pocketbase.exe` + `pb_public/` — data file untouched |
| Transparency export (Loi 18-00) | Existing PDF/Excel export buttons work locally — no cloud needed |

### Backup script (drop in `C:\SyndicPulse\`)
```bat
@echo off
set DEST=C:\SyndicPulse\backups\%date:~-4%-%date:~3,2%-%date:~0,2%
mkdir "%DEST%"
copy "C:\SyndicPulse\pb_data\data.db" "%DEST%\data.db"
```
Schedule via Windows Task Scheduler → daily at 03:00.

---

## Side-by-side Comparison

| | Cloud (Supabase + Vercel) | Airgapped (PocketBase) |
|---|---|---|
| Data location | Supabase EU servers | Client's PC only |
| Internet needed | Always | Never |
| Auth | Supabase Auth (JWT) | PocketBase Auth |
| Your access | Dashboard + service key | TeamViewer + superadmin |
| Backup responsibility | Supabase (automatic) | You / client |
| Multi-building central view | One URL for all | Separate install per building |
| WhatsApp reminders | Twilio API (native) | Not possible (no internet) |
| Upgrades | Push to GitHub → live in 2 min | Visit or TeamViewer session |
| Tech barrier for client | Browser + internet | Browser + Windows service |
| Estimated monthly cost | ~$0–20 (free tiers) | $0 (one-time setup fee) |
| Data leak surface | Supabase + Vercel infra | Zero — never leaves the PC |

---

## Code Changes Required (Airgapped)

Only **two files** change:

| File | Change |
|---|---|
| `src/lib/supabase.js` | Replace mock/Supabase client with PocketBase JS SDK (`pocketbase` npm package) — same interface pattern |
| `index.html` | Remove CDN Tailwind (`<script src="https://cdn.tailwindcss.com">`) → install `tailwindcss` via npm and build it in |

Everything else — auth roles, pages, mockData structure, RLS logic — maps directly onto PocketBase collections and rules.

---

## Recommendation

| Client type | Recommended mode |
|---|---|
| Tech-savvy, multiple buildings, wants WhatsApp | Cloud (Supabase) |
| Skeptical, small building, no internet desire | Airgapped (PocketBase) |
| Undecided | Start with Cloud — PocketBase swap is a 1-day migration |

**Hold on PocketBase implementation until client confirms.** The Supabase mock is intentionally designed to make this swap a single-file change.
