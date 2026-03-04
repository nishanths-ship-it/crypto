# Crypto Volatility and Risk Analysis

A full-stack web app with:

- **Frontend**: HTML, CSS, JavaScript + Chart.js.
- **Backend**: Supabase Auth, Postgres, and Edge Functions.
- **Data source**: CoinGecko public API.

## Features

- Email/password user authentication with Supabase Auth.
- Asset picker (BTC/ETH/SOL).
- 30-day rolling volatility line chart.
- Risk metrics:
  - Value at Risk (VaR 95%)
  - Sharpe Ratio
  - Maximum Drawdown
- Snapshot persistence in Supabase Postgres.

## Project structure

- `index.html`, `styles.css`, `app.js`: frontend (deploy on Netlify or any static host).
- `supabase/functions/crypto-metrics/index.ts`: function that fetches market data + computes metrics.
- `supabase/migrations/*.sql`: database schema and RLS policies.

## Local setup

1. Create a Supabase project.
2. Apply SQL migration:
   ```bash
   supabase db push
   ```
3. Set function secrets:
   ```bash
   supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
   ```
4. Deploy edge function:
   ```bash
   supabase functions deploy crypto-metrics
   ```
5. Serve frontend locally:
   ```bash
   python3 -m http.server 4173
   ```
6. Configure frontend credentials by defining globals before `app.js`:
   ```html
   <script>
     window.SUPABASE_URL = "https://<project-ref>.supabase.co";
     window.SUPABASE_ANON_KEY = "<anon-key>";
   </script>
   ```

## Deployment

### Frontend (Netlify)

- Publish the repository as a static site.
- Add a small config script in `index.html` or inject values at build time.

### Backend (Supabase)

- Deploy migration and function via Supabase CLI or GitHub Actions.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is configured for server-side inserts.

## Notes

- CoinGecko rate limits can apply; consider caching responses in a scheduled function.
- You can extend the function to support Yahoo Finance or other market data providers.
