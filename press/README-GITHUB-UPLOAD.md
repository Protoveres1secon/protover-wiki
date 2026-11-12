# Protoveres Press — official GitHub Pages launch bundle

## Destination

Repository: `Protoveres1secon/protover-wiki`  
Folder: `press/`  
Public URL after deployment: https://protoveres1secon.github.io/protover-wiki/press/

The Main Web repository already contains the GitHub Pages site. This package adds the Press website as a separate subfolder and does not replace the Main Web homepage.

## What is included

- `press/`: English-only public newspaper website, no language selector.
- `press/articles.json`: intentionally empty; no sample or invented articles are published.
- `press/sitemap.xml`: Press sitemap.
- `ROOT-UPDATES/robots.txt`: adds the Press sitemap to the existing crawler instructions.
- `ROOT-UPDATES/sitemap.xml`: adds the Press homepage to the Main Web sitemap.
- `ROOT-UPDATES/MAIN-WEB-NAV-SNIPPET.html`: optional link to place in the Main Web navigation.

## Upload to GitHub

1. Extract this ZIP on your computer.
2. Open `https://github.com/Protoveres1secon/protover-wiki`.
3. Open the `main` branch and use **Add file → Upload files**.
4. Upload the contents of this package's `press/` folder while preserving the `assets/` subfolder. The resulting repository paths must start with `press/`, for example `press/index.html` and `press/assets/social-card.svg`.
5. Replace the repository-root `robots.txt` and `sitemap.xml` with the matching files from `ROOT-UPDATES/`.
6. Optionally add the link from `MAIN-WEB-NAV-SNIPPET.html` to the Main Web navigation near the existing Wiki/Explore links.
7. Commit the changes to `main`.

The expected address is `https://protoveres1secon.github.io/protover-wiki/press/`. GitHub Pages serves static files from the configured publishing source; deployment may take several minutes.

## Search visibility

The public page includes an English title and description, canonical URL, Open Graph/Twitter metadata, `NewsMediaOrganization` structured data and a sitemap. After upload, submit `https://protoveres1secon.github.io/protover-wiki/press/sitemap.xml` in Google Search Console. This helps discovery but does not guarantee indexing or ranking.

## Publishing articles later

GitHub Pages is static hosting; it has no database or server-side newsroom login. When the editor creates an article, export it as a static HTML page, upload the page and its media under `press/`, add the article metadata to `press/articles.json` with `"status": "published"`, and add its absolute URL to `press/sitemap.xml`. Do not upload drafts, private details, API keys or passwords.
