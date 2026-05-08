# Envelope Budget Pilot

Envelope Budget Pilot is a lightweight budgeting app with envelope planning, spending tracking, CSV statement import, profile preferences, and optional laptop-only account-backed data sync.

## Web app

The app can still run as static files. In static file mode and in the Android WebView app, all data stays on the user's device through browser/WebView storage.

Account creation and database sync are only for the local laptop web app running through the Python backend.

## Backend database

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

The GitHub Pages version and Android app do not host a database. Android data stays on the user's device.
