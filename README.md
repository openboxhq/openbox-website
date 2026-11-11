# Openbox website

Marketing site for Openbox, a Dragonfruit company. Built with [Astro](https://astro.build) as a static site.

## Run locally

```bash
nvm use            # Node 22.23.4, from .nvmrc
npm install
npm run dev        # http://localhost:4321
```

`npm run build` writes the static site to `dist/`.

## Structure

| Path | Contents |
|---|---|
| `src/styles/global.css` | Design tokens: greyscale ground, one signal accent, type stack |
| `src/components/Hero.astro` | Hero and the interactive floor-plan progress sheet |
| `src/components/Compare.astro` | Progress 1.0 versus 2.0 panel |
| `src/components/Features.astro` | Capture, verify, schedule and search rows |
| `src/components/Sections.astro` | Security, Built on Dragonfruit, pricing, contact, footer |

Fonts come from npm packages (`@fontsource/*`) and are bundled into the build. The site makes no external requests.

## Workflow

`main` is protected: changes land only through a pull request with a passing **CI / Check and build** run. Nobody pushes to `main` directly, admins included.

1. Branch from `main` (`<name>/feat/<short-desc>`), commit, push, open a PR.
2. CI runs `npm run check` (types), `npm run audit` (high and critical advisories), `npm run build`, and guards that fail on an exposed email address or an inline script.
3. Merge when green. Dependabot opens weekly grouped PRs for npm and GitHub Actions updates.

Run the same checks locally with `npm run ci`.

## Deploy

`.github/workflows/deploy.yml` publishes `main` to GitHub Pages. Publishing makes the site public, so it only runs when the repository variable `PAGES_ENABLED` is `true` and Pages is enabled with **GitHub Actions** as the source. `SITE_URL` and `SITE_BASE` variables override the default `https://<owner>.github.io/<repo>`; set `SITE_BASE` to `/` with a custom domain.

## Security

- Every page ships a Content-Security-Policy (production builds only): scripts from the site itself, no inline scripts, network calls only to the form endpoint.
- The demo form posts to the Apps Script in `tools/inbound-form/`. That script validates and length-limits every field, rejects submissions filled in under 3 seconds, ignores the hidden spam field, neutralises spreadsheet formulas, sends at most one email per address every 6 hours, and caps leads (200) and confirmations (50) per day. The confirmation email has fixed text, so the form cannot be used to send arbitrary content to other people.
- No personal email address appears in the built site.

## License

Copyright © 2026 Dragonfruit AI. All rights reserved. This repository is public so the site can be served from GitHub Pages; it is not open source.
