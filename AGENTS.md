# BINKSY CLEARSPACE

Outil indépendant : **une seule page** pour définir la zone de sécurité d’un logo. Parcours : Importer les SVG → choisir une variante → définir X → multiplicateur → Exporter. Sans lien Git avec LogoKit ; le moteur clearspace d’origine est conservé, tout le reste (guideline, IA, couleurs, catalogue, dégradés, galerie JPEG, modes Composition/Versions prêtes, navigation multi-étapes) est supprimé. Ne pas réintroduire ces sous-systèmes.

## Fichiers

- `main.js` orchestration (import, bindings, undo/redo, export) ; `workspace.js` rendu de la page unique (variantes / aperçu / réglages / export).
- `model.js` état (`project`, `compositions[id]` par variante, `clearMeasure`, `migrateComposition`, historique) ; `project.js` validation + migration ; `project-storage.js` persistance.
- `clearspace.js` guides + planches ; `visual-measure.js` mesure visuelle (aucun magnétisme) ; `svg.js` import vectoriel + aperçu ; `paints.js`, `gradient.js`, `raster.js`.
- `export.js` + `export-formats.js` (plan d’export pur, ZIP systématique, jamais de page rasterisée) ; `ui.js`, `style.css`, `binks-lab.css` (identité), `i18n.js` + `locales/en.js`.
- Assets : `/brand/logo.svg` (logo complet) et `/brand/favicon.svg` (favicon). Ne pas modifier ces fichiers fournis.

## Invariants

- X ∈ { hauteur du logo, largeur du logo, visuel }. Zone = X × multiplicateur (0,5/1/1,5/2, libre 0,05–5).
- État **indépendant par variante** dans `compositions[variantId]` ; changer de variante ne perd aucun réglage.
- Mesure visuelle **sans snap** : la position du pointeur est la vérité.
- SVG/PDF vectoriels, PNG transparent, JPEG avec fond clair/sombre. Couleurs d’origine intactes.
- L’export produit **toujours un ZIP** (même un seul fichier).
- Stockage `binksy-clearspace-v1` / IndexedDB `binksy-clearspace`, migration unique depuis `binksy-logo-system`.

## Vérification

`npm test`, `npm run build`, puis parcours navigateur : import 3 SVG, 3 variantes (hauteur ×1 / largeur ×0,5 / visuel ×1,25), états indépendants, mesure visuelle précise, persistance après rechargement, export ZIP (SVG/PNG/JPEG/PDF, clair/sombre), FR/EN, 1440/1024/390, console sans erreur.

Les commits/pushs et déploiements ne sont pas implicites.
