# Cloudflare development deployment

## Scope

This runbook deploys the immutable MathChakChak frontend and its fail-closed
same-origin API bridge to `https://dev.mathchakchak-product.workers.dev`. It
does not deploy the Node API, PostgreSQL, production traffic, AI provider calls,
or an unverified custom domain.

## Authentication

Use Cloudflare OAuth through Wrangler. Do not put API tokens in this repository.
If a stale `CLOUDFLARE_API_TOKEN` environment variable overrides OAuth, remove or
replace it outside the repository before deployment.

## Verification and deployment

```powershell
npm.cmd run cloudflare:dry-run
npm.cmd run cloudflare:deploy:development
```

After deployment, verify the exact URL printed by Wrangler:

```powershell
Invoke-WebRequest -UseBasicParsing 'https://<worker>.workers.dev/'
Invoke-WebRequest -UseBasicParsing 'https://<worker>.workers.dev/readyz'
```

Current development endpoint:

```text
https://dev.mathchakchak-product.workers.dev
```

Expected `/readyz` truth boundary:

- frontend: `READY`
- api: `BLOCKED_EXTERNAL`
- api_bridge: `NOT_CONFIGURED`
- database: `BLOCKED_EXTERNAL`
- production_release: `false`

## API bridge activation

The browser continues to call same-origin `/api/*`. The Worker forwards those
requests only when `API_ORIGIN` contains a separate, pathless HTTPS origin. The
bridge rejects credentials in the URL, local/private hosts, a path/query/hash,
and the frontend's own origin. It removes inbound Cloudflare and forwarded-IP
headers, preserves authorization and idempotency headers, and never follows an
upstream redirect automatically.

After the Node API and PostgreSQL have their own verified development
deployment, configure the origin outside this repository:

```powershell
npx.cmd wrangler secret put API_ORIGIN
npm.cmd run cloudflare:deploy:development
```

Enter a value shaped like `https://api.<approved-domain>` without a path. Then
verify all of the following before changing any release status:

1. Worker `/readyz` returns `api_bridge=CONNECTED`, `api=READY`, and
   `database=READY` based on a live backend `/readyz` response.
2. Worker `/api/v1/locales` returns 200 through the bridge.
3. A mutation endpoint preserves its idempotency key and authorization scope.
4. Eight-locale browser journeys and PostgreSQL restart persistence pass.
5. No API origin, credential, or session secret is committed to Git.

If the origin is absent the Worker returns `API_NOT_CONNECTED` (503). An invalid
origin returns `API_CONFIGURATION_INVALID` (503), and a transport failure
returns `API_UPSTREAM_UNAVAILABLE` (502).

## Custom domain promotion

The preferred endpoint is `https://dev.mathchakchak.com`. Before promotion:

1. Register `mathchakchak.com` through an approved registrar transaction.
2. Activate the domain as a Cloudflare zone in the same account as the Worker.
3. Confirm that `dev.mathchakchak.com` has no existing conflicting CNAME.
4. Add the following route to `wrangler.jsonc` and deploy:

```json
"routes": [
  {
    "pattern": "dev.mathchakchak.com",
    "custom_domain": true
  }
]
```

Keep the `workers.dev` endpoint enabled until DNS, certificate, health, static
asset, and rollback checks pass on the custom domain.

## Full-product follow-up gate

The API bridge is only the connection layer. A full-product Cloudflare
deployment still requires a Cloudflare-compatible API runtime plus an externally
reachable PostgreSQL service, schema migration evidence, a secret-managed
session key, allowed-origin configuration, and end-to-end smoke tests.
Cloudflare Hyperdrive may accelerate an existing PostgreSQL connection but does
not provision or replace PostgreSQL.
