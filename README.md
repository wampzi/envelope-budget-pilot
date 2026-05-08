# Envelope Budget Pilot

Envelope Budget Pilot is a lightweight budgeting app with envelope planning, spending tracking, CSV statement import, profile preferences, and account-backed data sync.

## Web app

The app can still run as static files, but account creation and database sync require the Python backend.

## Backend database

The backend uses only Python standard library modules and stores data in SQLite at `backend/budget_app.sqlite3`.

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

Then open:

```text
http://127.0.0.1:8000
```

The GitHub Pages version can show the account UI, but GitHub Pages cannot host the backend database. For public multi-user login, deploy `backend/server.py` to a Python host and point the app to that backend URL.
