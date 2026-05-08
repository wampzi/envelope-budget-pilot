$ErrorActionPreference = "Stop"

$Python = "C:/Users/User/AppData/Local/Microsoft/WindowsApps/python3.13.exe"
& $Python backend/server.py --host 127.0.0.1 --port 8000
