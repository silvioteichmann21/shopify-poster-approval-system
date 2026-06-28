## Poster approval backend (Cloudflare Worker + D1)

- Customer: `https://YOUR_WORKER/approve/:token` (approve / edits / decline)
- Admin: `https://YOUR_WORKER/admin` (order + image URL → links)
- Home: `https://YOUR_WORKER/` (links to admin + install)

### Prereqs

- Cloudflare + Wrangler
- Shopify app (Dev Dashboard) with OAuth, **Custom distribution**, App URL + redirect to this Worker
- **Shopify Payments → Manual capture**

### Setup

```bash
cd approval-worker
npm install
npx wrangler d1 create poster_approvals
```

Put `database_id` in `wrangler.toml` under `[[d1_databases]]`. Use binding name **`DB`** (or `poster_approvals` — the Worker supports both).

**Remote D1 migrations:**

```bash
npx wrangler d1 migrations apply poster_approvals --remote
```

**`wrangler.toml` `[vars]`:** `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_API_KEY` (Client ID), `SHOPIFY_API_VERSION`, `PUBLIC_BASE_URL`, optional `ADMIN_NOTIFY_EMAIL`, optional `ADMIN_WEBHOOK_URL`, optional `THEME_APPROVAL_PAGE_URL` (full Shopify page URL for the bridge, e.g. `https://yoursite.com/pages/poster-approval`).

**Secrets:**

```bash
npx wrangler secret put SHOPIFY_API_SECRET
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put KLAVIYO_PRIVATE_API_KEY   # optional
```

Deploy: `npx wrangler deploy`  
Install on store: open `/auth/install?shop=YOURSHOP.myshopify.com` or your Partner **custom install link**.

### Klaviyo

With `KLAVIYO_PRIVATE_API_KEY` set, the Worker sends **Events API** events with a **profile email** so flows can trigger.

**Customer** (profile = order customer email — needs a valid email on the order):

| Metric | When |
|--------|------|
| `poster_preview_ready` | You create/update preview in admin |
| `poster_edits_requested` | Customer requests changes |
| `poster_approved` | Customer approves (capture) |
| `poster_declined` | Customer declines (void) |

**You** (profile = `ADMIN_NOTIFY_EMAIL` — must match a real Klaviyo profile or Klaviyo will still create one for that email):

| Metric | When |
|--------|------|
| `poster_admin_preview_ready` | Same as preview ready |
| `poster_admin_edits_requested` | Same as edits |
| `poster_admin_approved` | Same as approved |
| `poster_admin_declined` | Same as declined |

Event **properties** include things like `order_id`, `order_name`, `customer_email`, `approve_url`, `theme_bridge_url`, `preview_image_url`, `revision_note` (edits), etc.

**Duplicate events:** Klaviyo ignores a second event with the same `unique_id`. Preview upserts now use a **new** `unique_id` on each click so “Create / update” can trigger the flow again.

**Admin JSON:** After `/admin/api/upsert`, check **`klaviyo_customer`**: `event_sent: true` means Klaviyo accepted the API call. If `false`, read `reason` / `detail` (wrong API key, suppressed profile, etc.). Flow **preview** in Klaviyo can look fine while live sends fail due to spam, suppressions, or marketing-consent settings on the email step.

In Klaviyo: **Flows → create** → trigger **Metric** → pick the metric name → build your email using event properties.

**Important:** `ADMIN_NOTIFY_EMAIL` must be set to your address and that profile must exist (or Klaviyo will create it). Without `KLAVIYO_PRIVATE_API_KEY` or a valid admin email, the admin-side metrics above are skipped — use the next options.

### Admin alerts without Klaviyo

1. **Shopify order note** — On approve, decline, or revision request, the Worker **appends** a dated block to the order’s **Note** in Shopify Admin (`[Poster approval — ISO timestamp] …`). You see it on the order and can enable Shopify staff notifications for new order notes if you want email/push from Shopify.

2. **Webhook** — Set optional `ADMIN_WEBHOOK_URL` (var or secret). On each customer action the Worker POSTs JSON: `event` (`poster_customer_edits_requested` | `poster_customer_approved` | `poster_customer_declined`), `order_id`, `order_name`, `customer_email`, `approval_token`, `approve_url`, optional `revision_note`, `sent_at`. If the URL is a **Slack Incoming Webhook** (`hooks.slack.com/...`), the body is formatted as `{ "text": "..." }` instead.

### Theme bridge

Set `THEME_APPROVAL_PAGE_URL` so the admin JSON includes a ready `theme_bridge_url` for emails. In the theme, set **Approval app base URL** to this Worker’s base URL on the poster-approval page template.

### Preview images

Admin only requires a non-empty `preview_image_url`; it is not validated server-side. For reliable display on the customer page, use a direct image URL (e.g. **Shopify Admin → Content → Files → Copy link**).
