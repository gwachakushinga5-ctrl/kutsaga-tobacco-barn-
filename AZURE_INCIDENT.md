# Azure backend incident — full outage (unresolved)

**Status:** Open. Frontend is working; Azure backend is down — database now failing, login 500.

## ESCALATION — 23 Nov 2026, later: login now failing, database down

The outage has escalated from scan-launch failures to a **full authentication outage**:

| Request | Result |
| --- | --- |
| `POST /api/v1/auth/login` (direct to Azure) | `500 Internal Server Error` |
| `POST /api/v1/auth/login` (via Vercel proxy) | `500 Internal Server Error` |
| `GET /health/ready` (3 consecutive checks) | `503 {"status":"degraded","checks":{"database":"error","redis":"ok"},"model":"production:a2546977"}` |
| `GET /health` (liveness) | `200 {"status":"ok","checks":{}}` |

The **database is now unreachable from the container** while Redis remains OK and the process is
still alive. This is why login returns 500 — it needs the DB to look up users. No frontend change
can restore this; it requires operator action on the database / Azure Container App.

This is no longer just "scans don't start" — **nobody can log in at all**. Treat as urgent.
**Detected:** 23 Nov 2026
**Production dashboard:** https://kutsaga-tobacco-barn-public-ten.vercel.app
**Azure app:** `kutsaga-app.livelybush-d14e9c76.switzerlandnorth.azurecontainerapps.io`
(region: Switzerland North. Note: `livelybush-d14e9c76` is an Azure **auto-generated** environment
name — it is not a company or person; public searches found no owner there.)

## Summary

Unattended macro scans cannot be launched. Both scan-creation endpoints return a bare
`500 Internal Server Error` regardless of boundary or payload. No new job is created on failure.
Existing jobs are all stuck with `progress_status: INTERRUPTED` and the events endpoint hangs.

## Evidence

Reproduced repeatedly with a valid admin Bearer token (token redacted):

| Request | Result |
| --- | --- |
| `POST /api/v1/admin/macro-scans` `{"boundary_id":"harare"}` | `500 Internal Server Error` |
| Same for `bulawayo`, `manicaland`, `mashonaland_west`, named/threshold variants | `500 Internal Server Error` |
| `POST /api/v1/scans` with a valid Polygon AOI | `500 Internal Server Error` |
| `GET /api/v1/admin/macro-scans` | `200` — 78 jobs |
| `POST /api/v1/admin/macro-scans/{id}/resume` | `202 {"status":"DISPATCHED"}` but job stays `PENDING` / `INTERRUPTED` |
| `GET /api/v1/scans/{id}/events` | request hangs / times out |
| `GET /health/ready` | `200 {"status":"ok","checks":{"database":"ok","redis":"ok"},"model":"production:a2546977"}` |

Job state (unchanged across all attempts):

- Total **78**: **75 PENDING**, **2 RUNNING**, **1 COMPLETED**
- All inspected jobs have `progress_status: INTERRUPTED`
- RUNNING jobs show `processed_tiles: 0` (and one `16372 / 20592`) — no forward progress
- Created 20 Nov 2026; all 75 PENDING jobs are `MACRO: MACRO: Mashonaland West`
- Job count before and after failed launches: **78 → 78** (nothing created)

## Interpretation

Reads and authentication are healthy; the write/create path and the worker/queue path are broken.
`progress_status: INTERRUPTED` on every job plus a hanging events endpoint indicates the scan
worker(s) are not consuming the queue. The launch 500 is a server-side unhandled exception in the
Azure app — the frontend request matches Azure's own OpenAPI schema (`MacroLaunchRequest`).

## Required action (Azure Portal — `kutsaga-app` container app)

1. Open **Log stream** / **Logs** and find the exception raised on `POST /api/v1/admin/macro-scans`.
2. Check the scan queue/worker and Redis state; clear or reset the 75 stuck PENDING + 2 RUNNING jobs.
3. **Restart the container app** (and dependent worker/queue) after clearing the backlog.
4. Re-test: `POST /api/v1/admin/macro-scans` with `{"boundary_id":"harare"}` should return `202`/`201`,
   and a new job should appear in `GET /api/v1/admin/macro-scans`.

There is no cancel/clear endpoint in the deployed API, so this cannot be done from the dashboard.
Resume was tested and does not recover the jobs.

## Impact / what still works

- Works: login, reading detections, Global Registry, approvals/rejections, review filters, map.
- Broken: all new scan launches (macro and AOI), live processing of queued jobs.

## Finding the Azure owner

Searched already with no result: web/LinkedIn for "livelybush", GitHub user/org lookups, the Azure
OpenAPI spec (no contact field), local Azure CLI config (`~/.azure` absent), Chrome history (no Azure
Portal visits), and local setup files. The GitHub account `gwachakushinga5-ctrl` only holds the
frontend/data projects, none with backend deploy config.

Most reliable next steps for the account holder:

1. **Search Gmail/inbox** for: `Azure`, `Microsoft`, `portal.azure.com`, `kutsaga-app`,
   `azurecontainerapps`, `subscription`, `invoice`. The Azure portal invitation or billing receipt
   names the subscription owner/ billing contact.
2. **Check saved browser logins** for `portal.azure.com` / `login.microsoftonline.com` — the stored
   username is the account with access.
3. **Trace who gave you the Azure URL, the model `production:a2546977`, or the admin login** — that
   person is the owner or can name them.
4. **Check the Azure app's Access Control (IAM)** once any account can open the portal — the Owner
   role assignment gives the name directly.

## Forwardable message

> **URGENT — Azure backend full outage: login and scans both returning 500**
>
> The production dashboard is unusable: **nobody can log in**. `POST /api/v1/auth/login` returns
> `500 Internal Server Error` both directly and through the Vercel proxy.
> `GET /health/ready` now returns `503` with `{"database":"error","redis":"ok"}` on three consecutive
> checks (liveness `/health` is still 200). Earlier in the day readiness was green — the database
> connection has since failed.
>
> Scan launches are also broken: `POST /api/v1/admin/macro-scans` returns a bare 500 for every
> boundary even with a valid admin token and minimal body `{"boundary_id":"harare"}`. All 78 macro
> jobs are stuck (38 PENDING, 36 PENDING/INTERRUPTED, 2 RUNNING/INTERRUPTED, 1 COMPLETED). Resume
> returns 202 but workers never process tiles; the events endpoint closes the connection prematurely.
>
> Please check the **database connectivity** from the container app (credentials, firewall, the
> database server itself), read the container **Log stream**, and restart the container app / worker.
> The frontend is working correctly — the fault is entirely in the Azure app/infrastructure.
>
> Azure app: `kutsaga-app.livelybush-d14e9c76.switzerlandnorth.azurecontainerapps.io`
