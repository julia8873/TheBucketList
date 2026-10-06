# TheBucketList — Setup Guide

> **Objetivo:** un desarrollador nuevo puede ejecutar la app completa con Docker Desktop + Android Studio en < 30 minutos.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Docker Desktop | ≥ 4.30 | With WSL2 backend on Windows |
| Node.js | ≥ 20 LTS | `winget install OpenJS.NodeJS.LTS` |
| Android Studio | Hedgehog+ | For AVD (emulator) |
| Supabase CLI | ≥ 1.190 | `npm install -g supabase` |
| GNU Make | any | Windows: via WSL2 or `winget install GnuWin32.Make` |

---

## 1. Clone & Configure

```bash
git clone https://github.com/YOUR_ORG/bucketlist.git
cd bucketlist
cp .env.example .env
# Fill in .env — see sections below for each service
```

---

## 2. Windows (WSL2) — Specific Steps

1. **Install WSL2:** `wsl --install` (restart required)
2. **Docker Desktop:** enable WSL2 backend in Settings → General
3. **Node.js in WSL2:** install via `nvm` inside WSL2, NOT the Windows installer:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   nvm install 20
   nvm use 20
   ```
4. **Supabase CLI:**
   ```bash
   npm install -g supabase
   ```
5. **Run from WSL2 terminal** (not PowerShell) for all `make` commands.

---

## 3. macOS

```bash
brew install node@20 supabase/tap/supabase
xcode-select --install  # for build tools
```

---

## 4. Linux

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g supabase
```

---

## 5. Start Local Stack

```bash
make up
```

This runs:
1. `supabase start` — starts Postgres 15, Auth, PostgREST, Realtime, Storage, Studio, Inbucket
2. `docker compose up -d` — starts Metro bundler (port 8081)

Services:
- **Metro bundler:** http://localhost:8081
- **Supabase Studio:** http://localhost:54323
- **Inbucket (email testing):** http://localhost:54324

---

## 6. Create Android Virtual Device (AVD)

1. Open **Android Studio**
2. Go to **Device Manager** (icon in toolbar or View → Tool Windows → Device Manager)
3. Click **Create Device**
4. Select: **Pixel 8** → **Next**
5. Download **API 35** (Android 15, x86_64) → Select → **Next**
6. AVD Name: `Pixel_8_API_35`
7. **Show Advanced Settings** → set **RAM: 3072 MB**, **VM heap: 512 MB**
8. **Graphics:** Hardware – GLES 2.0
9. **Finish**

> **Windows with Intel/AMD:** Enable hardware virtualization in BIOS. Intel HAXM is auto-installed.
> **Windows with ARM:** Use an ARM64 system image instead.

Start the AVD by clicking ▶ in Device Manager before running `make android`.

---

## 7. Run on Android Emulator

```bash
make android
```

This runs `expo run:android` which:
1. Runs `expo prebuild --platform android`
2. Builds the dev client APK via Gradle
3. Installs it on the running AVD

> **First run:** Gradle downloads ~1 GB of dependencies. Subsequent runs are fast.

---

## 8. Google OAuth on Android (Development Build)

Google Sign-In on Android requires the app's SHA-1 fingerprint registered in Firebase.

### Get the debug keystore SHA-1

**macOS/Linux:**
```bash
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android \
  | grep SHA1
```

**Windows (PowerShell):**
```powershell
& "$env:JAVA_HOME\bin\keytool.exe" -list -v `
  -keystore "$env:USERPROFILE\.android\debug.keystore" `
  -alias androiddebugkey `
  -storepass android `
  -keypass android | Select-String "SHA1"
```

### Register in Firebase Console
1. Go to **Firebase Console** → Your project → **Project Settings**
2. Under **Your apps** → Android app (`com.bucketlist.app`)
3. Click **Add fingerprint** → paste the SHA1 → **Save**

### Configure .env
```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-yyy.apps.googleusercontent.com
```

---

## 9. Firebase Project Setup (FCM Push Notifications)

1. Go to https://console.firebase.google.com → **Add project** → `bucketlist-dev`
2. **No Google Analytics** needed (free plan)
3. **Add Android app:** package name `com.bucketlist.app`
4. Download `google-services.json` → place in `apps/mobile/google-services.json`
   > ⚠️ This file is in `.gitignore`. NEVER commit it.
5. **Project Settings** → **Cloud Messaging** → note the **Server key** (not used for HTTP v1, but keep it)
6. **Project Settings** → **Service accounts** → **Generate new private key** → save as `firebase-service-account.json`
   > This goes into Supabase secrets (not the repo):
   ```bash
   supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat firebase-service-account.json)"
   ```

---

## 10. Brevo SMTP (Transactional Emails)

1. Create free account at https://app.brevo.com
2. Go to **SMTP & API** → **SMTP** → note the credentials
3. Configure in **Supabase Dashboard** → Project → **Auth** → **SMTP Settings**:
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - User: your Brevo login email
   - Password: your Brevo SMTP key (starts with `xsmtp...`)
   - Sender email: `noreply@yourdomain.com`

---

## 11. Supabase Production Setup

1. Create account at https://supabase.com (no credit card)
2. Create **two projects** (free tier allows 2):
   - `bucketlist-staging` → region: **eu-west-1**
   - `bucketlist-prod` → region: **eu-west-1**
3. Apply migrations:
   ```bash
   supabase db push --project-ref YOUR_STAGING_REF
   supabase db push --project-ref YOUR_PROD_REF
   ```
4. Add to `.env` (then to GitHub secrets):
   ```env
   EXPO_PUBLIC_SUPABASE_URL_STAGING=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING=eyJ...
   EXPO_PUBLIC_SUPABASE_URL_PROD=https://yyy.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD=eyJ...
   ```

---

## 12. Regenerating android/ folder

The `android/` folder is generated by `expo prebuild` and is **not committed** (in `.gitignore`).

To regenerate:
```bash
cd apps/mobile
npx expo prebuild --platform android --clean
```

This is deterministic given the same `app.json` and `package.json`. Run it after:
- Updating `expo` SDK version
- Adding/removing native plugins
- Changing `app.json` Android config

---

## 13. Useful Commands

```bash
make up          # Start everything
make down        # Stop everything
make reset-db    # Drop DB + re-run migrations + seed
make seed        # Re-run seed only
make logs        # Tail all Docker logs
make test        # Lint + typecheck + jest + pgTAP
make apk         # Build APK inside Docker (no local SDK needed)
make web         # Build PWA + serve at localhost:3000
make studio      # Open Supabase Studio in browser
make inbucket    # Open local email inbox in browser
```
