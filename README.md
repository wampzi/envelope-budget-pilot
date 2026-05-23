# Envelope Budget Pilot

Envelope Budget Pilot is a lightweight budgeting app with envelope planning, spending tracking, CSV statement import, profile preferences, and optional account-backed data sync.

## Web app

The app can still run as static files. In static file mode and in the Android WebView app, all data stays on the user's device through browser/WebView storage.

For the web app, account creation can use either Supabase online sync or the local laptop Python backend.

## Supabase online database

Supabase is the recommended free online database option for the hosted web app.

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run [supabase/schema.sql](supabase/schema.sql).
4. In the app Settings screen, enter the project URL and anon public key.
5. Create an account or sign in.

The app uses Supabase Auth for credentials and stores the budget state in `budget_snapshots` with row level security so each user can access only their own data.

Only use the Supabase anon public key in the app. Never paste a Supabase service role key into the frontend.

## Laptop backend database

The backend uses only Python standard library modules and stores data on this laptop in SQLite at `backend/budget_app.sqlite3`.

It stores:

- user accounts and hashed credentials
- login sessions
- profile and display preferences
- envelopes and monthly budget values
- transaction records and references

Passwords are hashed with PBKDF2-SHA256 and per-user salts before being stored.

## Run locally

From this folder in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\run-backend.ps1
```

Then open the laptop-backed app:

```text
http://127.0.0.1:8000
```

The Android app does not use Supabase or the laptop backend by default. Android data stays on the user's device.
