# Portland Thanksgiving 2026 — Group Stay Planner

A static site comparing pet-friendly group rentals (sleeps 6–10) around Portland, Oregon
for Thanksgiving week 2026 — Oregon Coast, Downtown Portland, Columbia River Gorge,
Mt. Hood, and wine country. Includes interactive filters, an overview map, and driving
distances between areas.

Open `index.html` locally or visit the GitHub Pages site.

## Validation

Install Node.js 24 and run:

```sh
npm ci
npm run verify
```

The verification pipeline runs on every push and pull request. It validates the HTML,
checks inline JavaScript syntax, and verifies local assets and fragment links.

## Deployment and releases

After validation succeeds on `main`, GitHub Actions deploys the static files to GitHub
Pages. A successful deployment then creates the next patch GitHub release from the
latest exact `vMAJOR.MINOR.PATCH` tag, starting at `v0.1.0` when no version tag exists.

The repository previously used the legacy Pages source (`main` at `/`). After this
workflow is merged, set **Settings > Pages > Build and deployment > Source** to
**GitHub Actions** so the validated artifact replaces legacy branch deployment.
