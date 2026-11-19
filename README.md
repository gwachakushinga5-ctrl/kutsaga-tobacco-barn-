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
3. Vercel should detect Vite. If not, use:
   - Build command: `npm run build`
   - Output directory: `dist`
4. No environment variables are required. `vercel.json` proxies `/api/*` and `/health/*` to the Azure backend, avoiding CORS issues.
5. Deploy. Vercel will provide a public URL such as `https://<project>.vercel.app`.

Gemini keys are stored in the browser and entered from inside the app; they are not build-time environment variables.
