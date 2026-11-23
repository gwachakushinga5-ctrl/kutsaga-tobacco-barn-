# Kutsaga Tobacco Barn Dashboard

Vite + React dashboard for tobacco barn detection. The frontend is static; API calls go to the deployed Azure backend through a same-origin proxy.

## Local development

```bash
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:3000` and proxies `/api/*` and `/health/*` to the backend.

## Production build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Import this GitHub repository in Vercel.
2. Use the repository root as the project root.
3. Vercel should detect Vite. The repo also pins these in `vercel.json`:
   - Install command: `npm ci`
   - Build command: `npm ci && npm run build && node scripts/vercel-build.mjs`
   - Output directory: `.vercel/output/static` (Vercel Build Output API)
4. No environment variables are required. `vercel.json` proxies `/api/*` and `/health/*` to the Azure backend, avoiding CORS issues.
5. Deploy. Vercel will provide a public URL such as `https://<project>.vercel.app`.

Gemini keys are stored in the browser and entered from inside the app; they are not build-time environment variables.

## Review and national scans

- The **National scan** card launches the Azure backend's unattended macro scan for a national or provincial boundary. Admin users can also resume failed/cancelled macro jobs and open a job's results in the review queue.
- Candidate markers and queue rows are colour-coded by review state: amber = waiting, blue = confirmed, red = rejected, purple = uncertain.
- Use the row buttons or keyboard shortcuts while a candidate is selected: **C** confirms, **R** opens the frozen rejection taxonomy and submits the verdict.
- Counters poll the backend every 8 seconds while the dashboard is visible. Macro job progress polls every 5 seconds while a job is active.
- While a macro job is active, detected candidates are polled every 4 seconds, so the map and approval queue fill up during the scan. Use **Watch waiting** on an active job to jump into its live **Waiting approval** results.
- **Stop watching** (or the **Live** badge in the Approval Queue) pauses dashboard polling only; it does **not** cancel the Azure scan. Click **Resume watching** / **Paused** to restore live updates.
- Azure splits one national launch into capped subsector/cell jobs. The **Macro jobs** list shows only jobs for the currently selected boundary, grouped into one row per province with combined tile progress. No boundary selected means no jobs shown. **Watch waiting** loads every cell job in that province together.
- **Delete waiting** removes waiting candidates from this browser's queue, and a province row's trash icon hides all of that province's cell jobs from the list. These are local hides only: no backend verdict is sent and no Azure job is cancelled.
- Non-admin users do not see admin macro controls, but the **Global Registry** tab refreshes every 8 seconds, so they can still inspect detections as they arrive.
- **Spatial prefilter · map view** sends the current Leaflet bounds as the backend candidates `bbox` filter, limiting registry results to the visible area.

The PostGIS schema, YOLOv8 batch worker, and FastAPI endpoints are provided by the deployed Azure backend; this repository is the frontend client only.
