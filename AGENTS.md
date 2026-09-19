# BINKSY CLEARSPACE

Outil indépendant : le **système clearspace d’origine, conservé à l’identique**, sans lien Git avec le dépôt original. Tout le reste (guideline, IA, couleurs, catalogue, dégradés, galerie JPEG, modes Composition/Versions prêtes, page agent) est supprimé. Ne jamais réintroduire ces sous-systèmes ni modifier le rendu des planches.

## Fichiers

- `main.js` état/navigation/événements ; `workspace.js` étapes Importer → Zone de sécurité → Exporter ; `workshop.js` vue Exporter uniquement.
- `model.js` (X, `clearMeasure`, historique), `clearspace.js` (guides + planches, namespaces `url(#id)` uniques), `visual-measure.js` (carré X1, magnétisme), `svg.js` + `paints.js` + `gradient.js` (import vectoriel, couleurs d’origine conservées).
- `catalog.js` originaux seuls (jamais de produit cartésien) ; `export.js` + `export-formats.js` (planches SVG/PNG/PDF, ZIP ≤ 256 Mo, jamais de page entière rasterisée) ; `project.js` + `project-storage.js` (projets `.binksy` V1–V5 lisibles, guide toujours désactivé).
- `ui.js`, `style.css`, `binks-lab.js`, `tooltips.js` (identité visuelle), `i18n.js` + `locales/en.js` (FR/EN, ne pas traduire le contenu utilisateur).

## Invariants

- X = mesure (auto = petit côté, partie, visuelle) ; zone = X × multiplicateur (0,5/1/1,5/2, libre 0,05–5).
- Planches SVG/PNG/PDF transparentes. Couleurs d’origine intactes.
- Toute suppression de projet exige une confirmation explicite.
- Stockage local inchangé (`binksy-logo-system`) pour retrouver les projets existants.

## Vérification

`npm test`, `npm run build`, puis parcours complet + comparaison différentielle avec `BINKSY LOGOKIT V2` (ne jamais le modifier ; `git status` doit rester propre) : mêmes écrans, planches SVG/PNG identiques à l’octet, PDF identiques hors IDs aléatoires, ZIP, roundtrip `.binksy`, FR/EN, 1440/1024/390.

Les commits/pushs et déploiements ne sont pas implicites.
