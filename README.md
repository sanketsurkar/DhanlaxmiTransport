# DhanlaxmiTransport

# TransportPro v3.1 – with Pop-up Notifications

**FastAPI + SQLite + plain HTML/CSS/JS.** Modern mobile-first UI, installable on the phone (PWA), no build step.
Drivers are paid per **verified trip**; odometer readings are optional.
**New in v3.1:** important pop-up alerts for Owner / Admin / Driver.

## 1. Run (office laptop – uses `uv`)

Double-click **`run.bat`**, or:

```powershell
cd C:\Python\TransportPro_v3.1
uv venv --python 3.12 .venv
.venv\Scripts\activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

App: http://127.0.0.1:8000 · API docs: http://127.0.0.1:8000/docs
Demo logins: `owner/owner123` · `admin/admin123` · `ramesh/driver123` · `suresh/driver123`

**Upgrading from v3:** you can keep your existing `transportpro.db`. Copy it into this folder and the new columns are added automatically on start.

## 2. Notifications – who gets what

| Event | Who | Type |
|---|---|---|
| New trip assigned / reassigned to you | Driver | **Pop-up** |
| Trip date, route or vehicle changed | Driver | **Pop-up** |
| Trip sent back (with reason) | Driver | **Pop-up** (red) |
| Trip cancelled (with reason) | Driver | **Pop-up** (red) |
| Office started / ended your trip | Driver | **Pop-up** |
| Salary paid | Driver | **Pop-up** (green) |
| Trip completed / resubmitted → "Trip to verify" | Owner + Admins | **Pop-up** |
| Trip started, trip verified, advance recorded | relevant user | Normal (bell + small message) |

### How alerts reach the user
1. **App open:** a pop-up card with Open/Dismiss, a beep and vibration, and the screen refreshes automatically (checks every 15 s and when the app comes back to the screen).
2. **App in a background tab:** a system notification from the browser.
3. **App closed (phone lock screen):** Web Push. Needs **HTTPS** (see 3).

Each user can control **Sound / Vibrate** and send a **test alert** on the *Profile* or *Notifications* page.
The bell icon shows the unread count. The Notifications page has **All / Important** filters and *Mark all read*.

## 3. Phone alerts when the app is closed (Web Push)
* Push keys are created automatically on first start (`vapid.json`, keep it private and don't share it).
* Browsers allow push only on **HTTPS** (or `http://localhost` on the laptop itself).
  `http://<laptop-IP>:8000` on a phone shows in-app pop-ups only.
* For phones, deploy free on **Render** (HTTPS included). Set the environment variables
  `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` (values from your `vapid.json`) and `SECRET_KEY`.
* Each user taps **Turn on phone alerts** → **Allow** once.
* Android Chrome works directly. On iPhone (iOS 16.4+), first use **Share → Add to Home Screen**, then open from the icon.
* Logout or a disabled user automatically stops alerts on that phone. A phone that blocks or uninstalls the app is removed automatically.

## 4. Trip flow
```
ASSIGNED ─Start─► STARTED ─End─► COMPLETED ─Verify─► VERIFIED ✔ (payroll + income)
   └──── Cancel ─────┴─► CANCELLED    └─Send back─► REJECTED ─Resubmit─► COMPLETED
```
End-trip distance: end − start odometer → typed actual km → planned km.

## 5. Tests
```powershell
uv pip install -r requirements-dev.txt
python tests/test_api.py            # 48 API + notification tests
python tests/test_push_delivery.py  # real encrypted push to a local fake push server
# UI (needs: playwright install chromium; server on port 8013 with a fresh DB)
python tests/test_ui.py
```

## 6. Structure
```
TransportPro_v3.1/
├── run.bat  requirements.txt  requirements-dev.txt  README.md  .gitignore
├── app/
│   ├── main.py config.py database.py models.py schemas.py security.py seed.py
│   ├── services/  notify.py  push.py  payroll.py
│   ├── routers/   auth users masters trips payroll dashboard notifications(+push)
│   └── static/    index.html app.css app.js sw.js manifest.json icon.svg
└── tests/  test_api.py  test_push_delivery.py  test_ui.py
```
