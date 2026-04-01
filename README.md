# FitoPro

FitoPro is a static fitness tracker app built with plain HTML, CSS, and browser-side JavaScript. It supports local-first usage, Supabase authentication, cloud sync for user data, workout logging, stats, and profile management.

## Project structure

- `index.html`: main app shell
- `Styles.css`: UI styling
- `App.js`: primary feature wiring and app flow
- `appUi.js`: shared modal, toast, loading, and navigation helpers
- `appData.js`: default workouts and static exercise data
- `config.js`: client-safe public app configuration
- `state.js`: local app state and persistence helpers
- `supabaseClient.js`: Supabase client bootstrap
- `sync.js`: offline queue syncing
- `dataLoader.js`: cloud-to-local loading helpers
- `dataService.js`: local/cloud mutation helpers
- `vendor/supabase.js`: local copy of Supabase browser client
- `supabase/schema.sql`: clean install schema for Supabase

## Local usage

This app is designed to run as a static site.

Options:

1. Open `index.html` directly from disk.
2. Serve the folder with any static server.
3. Deploy to Vercel or GitHub Pages.

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Update `config.js` with your project URL and public anon key.

Important:

- Only public anon keys belong in `config.js`.
- Never commit a service role key to the repo.

## Deployment

### Vercel

1. Import the GitHub repo into Vercel.
2. Set the framework preset to `Other`.
3. Deploy as a static site.

The included `vercel.json` keeps deployment minimal and static-host friendly.

### GitHub Pages

1. Push the repo to GitHub.
2. Enable Pages for the branch you want to publish.
3. Use the repository root as the published folder.

The included `.nojekyll` file helps GitHub Pages treat the repo as a plain static site.

## Notes

- The app currently uses browser-global scripts for compatibility with `file://`.
- `App.js` has been cleaned up, and common data, UI, and stats concerns have been extracted.
- Further refactoring can continue by splitting timer, workout-flow, and profile logic into dedicated files.
