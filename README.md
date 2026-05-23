# TripGlass

TripGlass is a production-ready MVP for AI travel planning. Users enter a destination, dates, budget, interests, pace, and constraints, then receive a day-by-day itinerary with map pins, cost estimates, weather notes, source labels, AI revisions, saved trips, and public read-only sharing.

## Tech Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- Supabase Auth, Postgres, and Row Level Security
- Gemini API or OpenAI Responses API with structured JSON output
- Google Places API (New) and Maps JavaScript API
- Open-Meteo weather forecasts
- Zod, React Hook Form, Lucide React, date-fns
- Vitest validation tests

## Features

- Landing page, auth, dashboard, settings, trip wizard, trip detail, public share page
- Server-side API routes for Gemini/OpenAI, private Google Places, weather, sharing, and revisions
- Manual destination entry when Google Places is missing
- Interactive browser map when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured
- Supabase migrations with RLS policies for profiles, trips, itinerary rows, revisions, places, and chat messages

## Local Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Codex cannot create API keys automatically. Create provider accounts, paste keys into `.env.local`, and never commit private keys.

## Environment Variables

Required for full live mode:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` if `AI_PROVIDER=gemini`, or `OPENAI_API_KEY` if `AI_PROVIDER=openai`
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Useful defaults:

- `AI_PROVIDER=gemini`
- `GEMINI_MODEL=gemini-2.5-flash`
- `OPENAI_MODEL=gpt-5.4-mini`
- `ENABLE_PUBLIC_SHARING=true`
- `ENABLE_ROUTES_API=false`

`GEMINI_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` must stay server-side. The browser Google Maps key should be restricted by domain in Google Cloud.

## Gemini Setup

1. Create a Gemini API key in Google AI Studio.
2. Add it to `.env.local` or Vercel as `GEMINI_API_KEY`.
3. Set `AI_PROVIDER=gemini`.
4. Set `GEMINI_MODEL=gemini-2.5-flash`.

Gemini is the recommended free-tier provider for launching TripGlass without buying OpenAI credits.

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL and anon key into `.env.local`.
3. In Supabase SQL editor, run:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
4. Enable email/password auth. Magic links work if email auth is configured.
5. Optional: configure Google OAuth in Supabase Auth providers.

## Google Cloud Setup

1. Create a Google Cloud project.
2. Enable Maps JavaScript API and Places API (New).
3. Create a server key for `GOOGLE_MAPS_API_KEY`.
4. Create a browser key for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and restrict it by domain, for example `localhost:3000` and your Vercel domain.
5. Enable Routes API only if you later implement `ENABLE_ROUTES_API=true`.

If Google keys are missing, live autocomplete and maps are disabled with visible warnings. Manual destination entry still works.

## OpenAI Setup

1. Create an OpenAI API key.
2. Add it to `.env.local` as `OPENAI_API_KEY`.
3. Set `AI_PROVIDER=openai`.
4. Optionally set `OPENAI_MODEL`. The default is `gpt-5.4-mini`.

The app validates generated itineraries with Zod before rendering or saving them.

## Running Checks

```bash
npm run lint
npm test
npm run build
```

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Add all environment variables in Vercel Project Settings.
4. Deploy.
5. Add the Vercel domain to your Google browser key restrictions and Supabase auth redirect URLs.

## Common Errors

- `MISSING_API_KEY`: add the missing provider key in Vercel.
- `VALIDATION_ERROR`: check destination, duration, travelers, dates, and budget.
- `UNAUTHORIZED`: sign in or configure Supabase.
- `GOOGLE_PLACES_ERROR`: verify Places API (New), billing, quotas, and server key restrictions.
- `OPENAI_ERROR`: verify the selected AI provider key, model name, quota, and logs.

## Future Improvements

- Routes API travel-time enrichment and caching
- Flight and hotel search through optional Amadeus integration
- Full input-level trip editing
- Calendar export and PDF itinerary export
- Place replacement workflow with richer Google details
