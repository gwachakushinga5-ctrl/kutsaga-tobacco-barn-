# Azure backend incident — scan launches failing (unresolved)

**Status:** Open. Frontend is working; Azure backend is down.
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

> **Urgent — Azure scan launches failing with 500**
>
> The production dashboard cannot launch unattended scans. `POST /api/v1/admin/macro-scans` returns a
> bare `500 Internal Server Error` for every boundary, even with a valid admin token and the minimal
> body `{"boundary_id":"harare"}`. `POST /api/v1/scans` also returns 500. No new job is created.
>
> Health/readiness are green (`database: ok`, `redis: ok`, `model: production:a2546977`), but all 78
> existing macro jobs are stuck (75 PENDING, 2 RUNNING, 1 COMPLETED) with `progress_status:
> INTERRUPTED`, some with 0 tiles processed since 20 Nov 2026. The events endpoint hangs and the
> resume endpoint dispatches but does not recover jobs.
>
> Please check the container app **Log stream** for the launch exception, clear the stuck jobs, and
> restart the container app / worker. The frontend is working correctly — the fault is in the Azure app.
>
> Azure app: `kutsaga-app.livelybush-d14e9c76.switzerlandnorth.azurecontainerapps.io`
