PROTO — QUICK INTEGRATION INTO THE EXISTING PROTOVERES EXPLORER
==============================================================

Files:
- proto-profile.html — the full standalone Proto dossier.
- protoveres-explorer-patch.txt — three tiny code additions to connect it to the existing tree.

IMPORTANT
The GitHub connection refused direct writes (HTTP 403), so these files are prepared locally but have NOT been committed to your repo yet.

1) Upload proto-profile.html to the ROOT of:
   https://github.com/Protoveres1secon/protover-wiki

2) In protoveres-explorer.html, do the three additions in protoveres-explorer-patch.txt:
   A. Add the CSS block before :root{
   B. Add protoProfileMarkup() before function azathProfileMarkup(){
   C. Add the Proto dispatch line in detailMarkup(node), before the Azath line.

3) Commit both files, then open the Main Web and click Explorer → Characters → Proto.

The Proto page includes:
- Animated blue/aqua source-core hero (CSS only; no extra image needed)
- Three profile states: Child / Source / Void-Ego
- Origin & Cosmos section
- Genesis Tragedy poetry cards
- A 10-Form overview grid (without inventing each Form's individual lore)
- Four responsive tabs and mobile layout

The content is based on the Fandom excerpt supplied in chat. Existing Protoveres lore is not changed.
