# TheBucketList — Runbook

> Operational procedures for staging and production environments.
> Keep this document updated after every incident.

---

## Environments

| Env | URL | Supabase Project | Deploy trigger |
|---|---|---|---|
| Local | localhost:8081 | `supabase start` | `make up` |
| Staging | staging.bucketlist.pages.dev | `bucketlist-staging` | Push to `main` |
| Production | bucketlist.pages.dev | `bucketlist-prod` | Tag `vX.Y.Z` + manual approval |

---

## 1. Deploy to Staging

Happens automatically when code is merged to `main`:
1. GitHub Actions CI runs (lint + typecheck + jest + pgTAP)
2. On pass: Cloudflare Pages builds and deploys `apps/mobile` (web export)
3. Verify: https://staging.bucketlist.pages.dev/design-system

**Manual deploy:**
```bash
cd apps/mobile
npx expo export --platform web --output-dir ../../web-build
npx wrangler pages deploy ../../web-build --project-name bucketlist-staging
```

---

## 2. Deploy to Production

1. Create and push a tag: `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Actions `release-apk.yml` triggers
3. Go to **GitHub** → **Actions** → approve the `production` environment deployment
4. Wait for APK build + GitHub Release creation
5. CF Pages production deployment also triggers
6. Verify: https://bucketlist.pages.dev

---

## 3. Rollback Production

### Web (Cloudflare Pages)
1. Go to **Cloudflare Dashboard** → Pages → `bucketlist-prod`
2. **Deployments** tab → find the last good deployment
3. Click **⋮** → **Rollback to this deployment**

### Database
1. Restore from backup (see section 5)
2. Run `supabase db push --project-ref PROD_REF` with the correct migration set

---

## 4. Apply Database Migrations (Production)

```bash
# Dry run first
supabase db diff --project-ref PROD_REF

# Apply
supabase db push --project-ref PROD_REF

# Verify
supabase db push --project-ref PROD_REF --dry-run
```

---

## 5. Database Backup & Restore

### Manual backup
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PGPASSWORD="$DB_PASSWORD" pg_dump \
  "$SUPABASE_DB_URL_PROD" \
  --no-password \
  --format=custom \
  --no-acl \
  --no-owner \
  -f "backup_${TIMESTAMP}.dump"

# Encrypt
gpg --symmetric --batch --passphrase "$BACKUP_PASSPHRASE" "backup_${TIMESTAMP}.dump"
rm "backup_${TIMESTAMP}.dump"
```

### Restore from backup
```bash
# Decrypt
gpg --decrypt backup_20261005_060000.dump.gpg > restore.dump

# Restore (⚠️ this overwrites all data)
PGPASSWORD="$DB_PASSWORD" pg_restore \
  --no-password \
  --clean \
  --if-exists \
  -d "$SUPABASE_DB_URL_PROD" \
  restore.dump

rm restore.dump
```

> Automated backups run weekly via GitHub Actions `anti-pause.yml`. Artifacts retained 30 days.

---

## 6. Quota Alert Response

### Trigger: Storage > 700 MB (70% of 1 GB)

1. Check **Supabase Dashboard** → Storage → which bucket is largest
2. Identify top users by `storage_used_bytes`:
   ```sql
   SELECT id, username, storage_used_bytes
   FROM profiles
   ORDER BY storage_used_bytes DESC
   LIMIT 10;
   ```
3. Options:
   - Reduce `app_config.storage_quota_bytes` (takes effect immediately, server-enforced)
   - Email top users to delete old photos
   - Upgrade to Supabase Pro ($25/mo → 100 GB Storage)

### Trigger: Database > 400 MB

1. Check table sizes:
   ```sql
   SELECT schemaname, tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```
2. Top offender is likely `feed_events` or `notifications` — add archival job.

### Trigger: Egress > 4 GB/month

1. Check if thumbnails are being served instead of full photos for list views
2. Verify `expo-image` cache is working (check network tab in DevTools)
3. Add more aggressive cache headers to Storage bucket

---

## 7. Supabase Project Paused

If a project was inactive for 7+ days and got paused:
1. Go to https://supabase.com → dashboard → find the paused project
2. Click **Restore** (takes 1–2 minutes)
3. Update the GitHub Actions anti-pause schedule to prevent recurrence

---

## 8. Auth Issues

### Users can't receive magic links
1. Check Brevo dashboard → email count for today
2. Check Inbucket (local) or mail provider logs
3. Verify SMTP settings in Supabase Dashboard → Auth → SMTP

### Google OAuth failing on Android
1. Verify SHA-1 is registered in Firebase console (see `SETUP.md` section 8)
2. Check that `google-services.json` is correct and matches the package name `com.bucketlist.app`
3. Verify `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in `.env`

---

## 9. FCM Push Not Delivering

1. Check Edge Function `send-push` logs in Supabase Dashboard → Edge Functions
2. Verify `FCM_SERVICE_ACCOUNT_JSON` secret is set: `supabase secrets list`
3. Test FCM directly:
   ```bash
   # Get a token from push_tokens table
   # Call FCM HTTP v1 directly with the token
   curl -X POST \
     https://fcm.googleapis.com/v1/projects/YOUR_PROJECT/messages:send \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json" \
     -d '{"message":{"token":"DEVICE_TOKEN","notification":{"title":"Test","body":"Test"}}}'
   ```

---

## 10. Incident Response Template

```
## Incident: [title]
**Date:** YYYY-MM-DD HH:MM UTC
**Severity:** P1 (down) / P2 (degraded) / P3 (minor)
**Duration:** X minutes
**Impact:** X users affected

### Timeline
- HH:MM — Issue detected
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Resolved

### Root Cause
...

### Fix
...

### Prevention
...
```
