# TheBucketList — Costs & Free Tier Monitoring

> All services are 100% free. No credit card required for any of them.
> Last updated: 2026-10-05

---

## Services Summary

| Service | Plan | Free Limit | Monthly Spend | Monitor | Upgrade Signal |
|---|---|---|---|---|---|
| Supabase | Free | See below | $0 | Dashboard | Any limit at 80% |
| Cloudflare Pages | Free | Unlimited bandwidth | $0 | CF Analytics | >500 builds/month |
| Firebase (FCM) | Spark | Unlimited FCM | $0 | Firebase Console | N/A (FCM is free) |
| Google OAuth | Free | 50K requests/day | $0 | Google Cloud Console | >40K/day |
| Brevo SMTP | Free | 300 emails/day | $0 | Brevo dashboard | >250/day |
| Nominatim/Photon | Free (OSM) | Fair use (debounced) | $0 | Self-monitor response times | Abuse notices |
| Sentry | Free | 5K errors/month | $0 | Sentry | >4K errors/month |
| GitHub Actions | Free | 2K min/month (public) | $0 | GitHub Settings | >1.5K min/month |

---

## Supabase Free Tier Limits

| Resource | Limit | Current Usage | Monitor | Upgrade Signal |
|---|---|---|---|---|
| Storage | 1 GB | — | Dashboard → Storage | >700 MB (70%) |
| Database | 500 MB | — | Dashboard → Database | >400 MB |
| Egress | 5 GB/month | — | Dashboard → Billing | >4 GB/month |
| MAU (Monthly Active Users) | 50,000 | — | Dashboard → Auth | >40,000 |
| Edge Function invocations | 500,000/month | — | Dashboard → Functions | >400,000 |
| Realtime messages | 2M/month | — | Dashboard → Realtime | >1.6M |
| Active projects | 2 | 2 (staging + prod) | — | At limit |
| Pause threshold | 7 days inactivity | — | GitHub Actions anti-pause cron | Project paused alert |

### Anti-pause strategy
GitHub Actions cron runs every 5 days (`.github/workflows/anti-pause.yml`) and pings both staging and production projects via a lightweight REST query on `app_config`. This resets the inactivity timer.

---

## Per-user Storage Budget

```
Per user quota:    50 MB   (defined in app_config.storage_quota_bytes)
Photo target:     200 KB   (main image, WEBP compressed)
Thumbnail target:  40 KB   (list thumbnail, WEBP compressed)

Per completion: ~240 KB × 3 photos = ~720 KB max
Completions per user before quota: ~69
Users before hitting 1 GB: ~20 at full quota

Global alert: triggered when total used > 700 MB (70% of 1 GB)
```

### Egress reduction measures
1. Thumbnails (≤40 KB) shown in all list and feed views — only load full photo in detail view.
2. `expo-image` with `cachePolicy="disk"` — aggressive local caching.
3. `Cache-Control: public, max-age=31536000, immutable` on Storage CDN (Supabase default).
4. Client-side compression before upload — reduces both storage and transfer.

---

## Monitoring Checklist (weekly)

- [ ] Supabase Dashboard → Storage usage < 700 MB
- [ ] Supabase Dashboard → Egress < 4 GB
- [ ] Supabase Dashboard → Database size < 400 MB
- [ ] Firebase Console → FCM delivery rate > 95%
- [ ] Brevo → Daily email count < 250
- [ ] Sentry → Error count < 4,000/month
- [ ] GitHub Actions → Minutes used < 1,500

---

## Upgrade Paths (if needed)

| Service | Free → Paid | Monthly Cost | Trigger |
|---|---|---|---|
| Supabase | Pro plan | $25/month | Database >400 MB or egress >4 GB |
| Cloudflare Pages | — (unlimited) | — | N/A |
| Firebase | — (FCM always free) | — | N/A |
| Brevo | Starter | $25/month | >250 emails/day |
| Sentry | Team | $26/month | >4K errors/month |

> **Priority upgrade:** Supabase Pro ($25/mo) removes the pause risk, adds daily backups, and increases all limits significantly. Recommended before reaching 100 active users.
