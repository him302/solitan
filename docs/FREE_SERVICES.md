# Free-service dependencies

Running cost target: **₹0**, with no service that requires billing activation, a credit
card, or a trial that expires into a charge.

This is enforced in code, not just documented. `provider-policy.service.ts` and
`env.validation.ts` reject paid provider values, and `FREE_LOCAL_MODE=true` is the only
accepted value for that flag — there is no paid mode to switch into by accident.

---

## What Solitan actually depends on

| Concern | Choice | Cost | Needs an account? | Needs network? |
|---|---|---|---|---|
| Database | PostgreSQL + PostGIS (Docker) | Free, open source | No | No |
| Cache / realtime adapter | Redis (Docker) | Free, open source | No | No |
| API runtime | NestJS on Node | Free, open source | No | No |
| Realtime transport | Socket.IO | Free, open source | No | No |
| Mobile | Expo / React Native | Free tier sufficient | Expo Go only | For dev server |
| Admin web | Next.js | Free, open source | No | No |
| Distance / geo | PostGIS `ST_Distance` | Free | No | No |
| Map tiles | **None by default** | Free | No | No |
| Geocoding | Local provider — reports unavailable | Free | No | No |
| OTP delivery | `dev` provider — logs the code | Free | No | No |
| Notifications | In-app rows + `expo-notifications` locally | Free | No | No |
| Payments | **Disabled** | Free | No | No |
| SMS / WhatsApp / email | **Disabled** | Free | No | No |
| Analytics | Local structured logs | Free | No | No |
| AI assistant | Local knowledge base | Free | No | **No** |
| AI assistant (optional) | Google Gemini | Free tier — see below | Yes | Yes |
| Image storage | Local assets | Free | No | No |

Everything except the optional Gemini integration runs with **no account and no internet**.

---

## The one optional external service

### Google Gemini

**Off by default.** Both `ASSISTANT_PROVIDER=gemini` and `GEMINI_API_KEY` must be set.
Absent either, the assistant uses its local knowledge base and says so on every answer.

**What was verified (November 2026):**

- Google does publish a free tier that does **not** require a billing account. The paid
  Tier 1 is what requires a linked, active billing account.
- Google does **not** publish per-model free-tier quotas in its public documentation; it
  directs you to the rate-limit page for your own project in AI Studio.
- Third-party summaries **contradict each other** — one reports ~10 requests/minute and
  1,500/day for Flash, another reports 20/day for one model and 500/day for another.
- Pro models were **reportedly removed from the free tier in April 2026**; Flash models
  have remained eligible.
- Exceeding a limit returns **HTTP 429**. Daily counters reset at midnight Pacific.

**What this project therefore does:**

- Encodes **no quota figure anywhere.** The only safe assumption is that a 429 can arrive
  at any moment.
- Treats 429 as an ordinary outcome, falling back to the local assistant with
  `fallbackReason: 'quota_exceeded'` which the UI shows.
- Makes **exactly one attempt with no retries.** Retrying a rate-limited free-tier endpoint
  is how a free tier turns into a billed one.
- Uses an 8-second timeout and caps output tokens.
- Defaults to a Flash model, overridable via `GEMINI_MODEL` because eligibility changes.
- Sends the key as an `x-goog-api-key` header, never a query parameter, so it cannot land
  in a proxy or access log.
- Reads the key from server environment only. It is never returned to a client, so it
  cannot leak into a mobile bundle.

**Before enabling it, check your own project's rate-limit page.** Do not rely on the
figures above, including the ones quoted here.

Sources consulted:
[Gemini API rate limits](https://gemini-api.apidog.io/doc-965865) ·
[free-tier limits guide](https://www.memetik.ai/guides/gemini-api-free-tier-limits) ·
[free-tier quotas 2026](https://tinkerllm.com/blog/gemini-api-free-tier-limits-rate-quotas/) ·
[pricing summary](https://creditforstartups.com/pricing/gemini-api-pricing)

---

## Deliberately not used

| Service | Why not |
|---|---|
| Google Maps / Places | Requires billing activation |
| Mapbox | Free tier, but needs an account and a key, and bills past it |
| Twilio / MSG91 / any SMS gateway | Paid per message |
| WhatsApp Business API | Paid, and requires business verification |
| SendGrid / Mailgun / SES | Paid past a trial; needs domain verification |
| Razorpay / Stripe / PayPal | Payments are out of scope for the pilot |
| Firebase Cloud Messaging | Free, but needs a Google project and `google-services.json` |
| Expo push notifications | Free, but needs an Expo project ID and the external service |
| Sentry / PostHog / Mixpanel | Free tiers exist; local logs suffice for a pilot |
| Cloudinary / S3 / any object storage | Local assets suffice |
| Any hosted Postgres (Supabase, Neon, Railway) | Containers are free and work offline |

FCM and Expo push are listed as *not used* rather than *unavailable*: both are genuinely
free, and either would be a reasonable addition. They are excluded because each introduces
an external account and credential set, which conflicts with the fully-offline demo
requirement. The consequence is documented in [LIMITATIONS.md](LIMITATIONS.md).

---

## If you deploy this

The ₹0 target covers development and the pilot. A real deployment needs hosting, and the
honest options are:

- **A single small VPS** (~₹400–800/month) running the containers and the API. Cheapest and
  fully under your control.
- **A free-tier PaaS.** Workable, but free tiers sleep when idle, which is bad for a queue
  app that must deliver realtime updates.
- **Android APK distributed directly.** No store fee. Google Play charges a one-time $25
  developer registration.

No hosting choice is baked into this codebase.

---

## Verifying the policy at runtime

```bash
curl http://localhost:3000/api/v1/health/providers
```

Returns which provider is active for each concern and the list of external hosts the API
may call — empty in free-local mode.
