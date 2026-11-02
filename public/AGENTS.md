# Binksy ClearSpace — mode d’emploi pour agents IA / AI agents guide

Français d’abord, English below.

## À propos de ce document

Ce document s’adresse aux agents IA (Claude Code, Codex, ou tout agent qui pilote un navigateur via Playwright / CDP). Il explique comment utiliser **Binksy ClearSpace** (`app.html`), l’outil de Binks Design qui définit, visualise et exporte la **zone de sécurité (clear space)** d’un logo à partir de fichiers SVG.

Il existe en deux endroits, toujours identiques : `AGENTS.md` (Markdown, français puis anglais) et la page `agent/index.html`. Résumé court : `llms.txt`. Documentation pour les humains : `docs.html`.

Points d’entrée découvrables sans JavaScript : `index.html` et `docs.html` déclarent `<link rel="alternate" type="text/markdown" href="AGENTS.md">`, `<link rel="help" href="agent/">`, `<link rel="help" href="mcp/">` et `<link rel="alternate" type="text/plain" href="llms.txt">`, plus un commentaire HTML et un bloc `<noscript>` qui renvoient ici.

> Dans le dépôt GitHub, le fichier `AGENTS.md` à la racine s’adresse aux développeurs qui modifient le code. Celui-ci (`public/AGENTS.md`, servi à la racine du site) s’adresse aux agents qui **utilisent** l’outil.

## 01. Règle fondamentale

ClearSpace mesure et met en page ce que le graphiste fournit. Ce n’est **pas** un générateur de logos.

- **N’invente jamais** un logo, un symbole, une couleur, une police ou un texte de marque. Les SVG fournis par l’utilisateur **font foi**.
- **Ne redessine pas** un SVG fourni, ne modifie pas sa géométrie ni ses couleurs, ne le remplace pas par un fichier « approchant ». Si un SVG est refusé (texte non vectorisé, image intégrée…), dis-le à l’utilisateur et demande-lui un fichier corrigé.
- **La règle de zone de sécurité appartient au graphiste.** Ne choisis pas seul la méthode X ni le multiplicateur : applique ce qu’on t’a demandé, ou propose et fais valider. Les multiplicateurs 0,5 / 1 / 1,5 / 2 sont des méthodes de test, pas des règles universelles.
- **Aucune clé API, aucun service en ligne.** L’outil n’embarque aucune IA et n’appelle aucun serveur. Ne demande jamais de clé ni de compte à l’utilisateur.
- **Tout est local** : lecture des SVG, mesures, rendus et ZIP sont faits dans le navigateur. Le projet est enregistré dans le stockage du navigateur.
- **API JavaScript publique : `window.BinksyAPI`** (convention commune Binksy, API v1) et les mêmes outils en **WebMCP** quand le navigateur le permet — voir la section « API agents » ci-dessous et la page `mcp/`. Sinon, on pilote l’outil par son interface, avec les sélecteurs listés plus bas. N’injecte pas d’autre code qui modifie l’état interne.

Après chaque action, relis l’interface (état `aria-pressed`, textes affichés, message `#notice`). **Un clic n’est pas une preuve de réussite.**

## API agents : `window.BinksyAPI` + WebMCP

Dans `app.html`, `window.BinksyAPI` appelle les mêmes fonctions que l’interface (historique annuler/rétablir, enregistrement automatique, rendu). Méthodes communes : `describe()`, `ready()`, `getState()`, `importer({ files: [{ name, type, dataBase64 | text | url(data:) }] })`, `exporter({ format: "zip" | "svg" | "png" | "jpeg" | "pdf", variantId?, tone?: "clair" | "fonce", download? })` → `{ files: [{ name, type, dataBase64 }] }` (aucun téléchargement sauf `download: true`), `reset({ confirm: true })`, plus `callTool(nom, args)`. Erreurs rejetées en `{ code, message }`. Les mêmes outils sont déclarés en WebMCP (`document.modelContext.registerTool`, ou `navigator.modelContext` selon la version) si le navigateur le permet. Connexion pas à pas (Playwright MCP pour Claude Code, Codex, Hermes, OpenCode) et prompt prêt à copier : [`mcp/`](mcp/).

- `clearspace_describe` → `BinksyAPI.describe()` : Décrit l'app et liste les outils (schémas JSON).
- `clearspace_etat` → `BinksyAPI.getState()` : État : variantes, réglage de zone de chacune (méthode, ×, X, zone), aperçu, thème.
- `clearspace_importer` → `BinksyAPI.importer()` : Importe des SVG (une variante par fichier).
- `clearspace_exporter` → `BinksyAPI.exporter()` : Exporte le ZIP complet ou une planche SVG/PNG/JPEG/PDF claire ou foncée (base64).
- `clearspace_definir_zone` → `BinksyAPI.setClearSpace()` : X = hauteur, largeur ou mesure visuelle ; zone = X × multiplicateur.
- `clearspace_choisir_variante` → `BinksyAPI.setActive()` : Affiche une variante dans l'aperçu.
- `clearspace_renommer_variante` → `BinksyAPI.renameVariant()` : Renomme une variante (nom des dossiers et fichiers).
- `clearspace_supprimer_variante` → `BinksyAPI.removeVariant()` : Supprime une variante (après accord de l'utilisateur).
- `clearspace_affichage` → `BinksyAPI.setDisplay()` : Fond d'aperçu clair/sombre et thème de l'interface.
- `clearspace_reset` → `BinksyAPI.reset()` : Vide le projet (confirm:true, après accord de l'utilisateur).

```js
await BinksyAPI.ready();
const r = await BinksyAPI.importer({ files: [{ name: "marque-horizontal.svg", type: "image/svg+xml", dataBase64: SVG_BASE64 }] });
await BinksyAPI.setClearSpace({ variantId: r.imported[0].id, method: "height", multiplier: 0.5 });
const zip = await BinksyAPI.exporter({ format: "zip" }); // zip.files[0].dataBase64
```

## 02. Démarrer

### Ouvrir l’outil

- En ligne : `https://clearspace.binksdesign.com/app.html` (l’hébergeur peut rediriger vers `/app`, c’est la même page).
- En local, depuis le dépôt (projet Vite) :

```bash
npm ci
npm run build
npx vite preview --host 127.0.0.1   # puis ouvrir http://127.0.0.1:4173/app.html
# ou, en développement : npm run dev  → http://127.0.0.1:5173/app.html
```

`index.html` est la page d’accueil, `app.html` l’outil, `docs.html` la documentation, `agent/index.html` cette page.

### L’écran

Une seule page, sans étapes :

- **En-tête** : logo, Annuler / Rétablir, bascule de thème clair/sombre, langue FR / EN.
- **Gauche** : « Variantes du logo », bouton « + Ajouter des SVG », une carte par variante (aperçu cliquable, nom modifiable, Remplacer, Supprimer).
- **Centre** : nom de la variante active, boutons de fond « Clair / Sombre », grand aperçu avec les guides de zone de sécurité, puis la barre d’export (« N variantes · ZIP » et le bouton **Exporter**).
- **Droite** : « Définir X » (Hauteur / Largeur / Visuel), mesure visuelle, « Espace » (multiplicateurs) et « Personnalisé ».

Sans variante, l’aperçu affiche « Déposez vos SVG » avec un bouton « Choisir des fichiers SVG », et Exporter est désactivé.

## 03. Sélecteurs stables

| Action | Sélecteur | Remarque |
|---|---|---|
| Importer des SVG (toujours présent) | `#ready-files` | `input[type=file]` caché, `multiple`, `accept=".svg,image/svg+xml"` : utilise `set_input_files` |
| Importer depuis l’aperçu vide | `#stage-files` | n’existe que sans variante |
| Zone de dépôt | `#stage` | accepte aussi le glisser-déposer de fichiers |
| Aperçu SVG | `#canvas` | `<svg>` dans `#stage` ; guides dans `#clear-guides` |
| Carte de variante | `.ready-card` (active : `.ready-card.active`) | une par fichier importé |
| Activer une variante | `[data-active="<id>"]` | bouton d’aperçu, `aria-pressed="true"` si active |
| Renommer | `[data-ready-name="<id>"]` | `input`, valider par `change` (Tab / Entrée), 100 caractères max |
| Remplacer le SVG | `[data-replace-variant="<id>"]` | `input[type=file]` caché, garde les réglages de la variante |
| Supprimer | `[data-remove-variant="<id>"]` | sans confirmation (Annuler pour revenir) |
| Méthode X | `[data-method="height"]`, `[data-method="width"]`, `[data-method="visual"]` | `aria-pressed="true"` sur la méthode active |
| Tracer la mesure | `[data-action="measure"]` | visible seulement en méthode Visuel |
| Nom de la mesure | `#measure-name` | facultatif, 160 caractères max, visible en Visuel |
| Multiplicateur | `[data-multiplier="0.5"]`, `"1"`, `"1.5"`, `"2"` | `aria-pressed="true"` sur l’actif |
| Multiplicateur libre | `#clear-multiplier` | `input[type=number]`, de 0.05 à 5, validé à `change` |
| Fond de l’aperçu | `[data-canvas="#ffffff"]`, `[data-canvas="#000000"]` | n’affecte que l’aperçu |
| Thème de l’interface | `[data-theme-toggle]` | `aria-pressed="true"` en sombre ; `html[data-theme]` |
| Langue | `[data-language="fr"]`, `[data-language="en"]` | dans l’en-tête |
| Annuler / Rétablir | `[data-action="undo"]`, `[data-action="redo"]` | aussi Ctrl/⌘ + Z et Ctrl/⌘ + Maj + Z (hors champs de saisie) |
| Exporter | `[data-action="export"]` | désactivé sans variante ou pendant un export |
| Messages | `#notice` | `role="status"`, se masque après 8 s |
| Récapitulatif | `.clear-facts` | « Référence : … » et « Zone de sécurité : 1,5× X » |

Les identifiants de variante ont la forme `v-<uuid>` ; lis-les dans le DOM (`[data-active]`), ne les invente pas.

## 04. Parcours pas à pas

1. **Ouvre** `app.html` et attends `#ready-files` (attaché au DOM).
2. **Importe** les SVG fournis : `set_input_files("#ready-files", [...])`. Chaque fichier devient une variante nommée d’après le fichier (sans `.svg`, nom rendu unique si besoin). Vérifie le nombre de `.ready-card` et le message `#notice` (« 2 variantes importées. ») ; un SVG refusé affiche son erreur dans `#notice` et **aucun** fichier du lot n’est importé.
3. **Pour chaque variante** à régler : clique `[data-active="<id>"]`, puis la méthode demandée :
   - `height` : X = hauteur du dessin (boîte englobante des formes visibles, épaisseur de contour comprise) ;
   - `width` : X = largeur du dessin ;
   - `visual` : clique `[data-action="measure"]`, puis fais un glisser (bouton gauche) sur `#canvas`. La mesure = le plus grand des deux écarts horizontal/vertical, en unités SVG, arrondie au centième. Aucun magnétisme. Échap ou le bouton « Annuler » de l’indication abandonne. Renseigne ensuite `#measure-name` si on t’a donné un nom (ex. « Hauteur du A »).
4. **Multiplicateur** : clique `[data-multiplier="…"]`, ou remplis `#clear-multiplier` puis Tab. Hors de 0,05–5, l’outil refuse (« Multiplicateur entre 0,05 et 5. »).
5. **Vérifie** `.clear-facts` et `aria-pressed` pour chaque variante (les réglages sont indépendants par variante).
6. **Exporte** : clique `[data-action="export"]` en attendant un téléchargement (`expect_download`). Pendant le travail, `#notice` affiche « Export i / n » ; à la fin « Export terminé. Votre ZIP est prêt. ».

### Convertir des unités SVG en position écran (mesure visuelle)

```js
// Dans la page : coin haut gauche (x, y) et côté s, en unités SVG → points écran
const svg = document.querySelector('#canvas');
const m = svg.getScreenCTM();
const toScreen = (x, y) => new DOMPoint(x, y).matrixTransform(m);
const a = toScreen(x, y), b = toScreen(x + s, y + s);
// glisser de (a.x, a.y) à (b.x, b.y) avec la souris
```

La géométrie du logo est lisible dans le SVG d’aperçu (`#canvas`). Ne prends une mesure visuelle que sur l’élément demandé par l’utilisateur.

## 05. Exemple Playwright (Python)

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    page = p.chromium.launch().new_page(accept_downloads=True)
    page.goto("http://127.0.0.1:4173/app.html")
    page.wait_for_selector("#ready-files", state="attached")
    page.set_input_files("#ready-files", ["logo-horizontal.svg", "icone.svg"])
    page.wait_for_selector(".ready-card >> nth=1")

    # Variante 1 : hauteur × 1 (réglage demandé par l’utilisateur)
    page.click(".ready-card >> nth=0 >> [data-active]")
    page.click('[data-method="height"]')
    page.click('[data-multiplier="1"]')

    # Variante 2 : largeur × 0,5
    page.click(".ready-card >> nth=1 >> [data-active]")
    page.click('[data-method="width"]')
    page.click('[data-multiplier="0.5"]')
    print(page.inner_text(".clear-facts"))

    with page.expect_download(timeout=120_000) as dl:
        page.click('[data-action="export"]')
    dl.value.save_as(dl.value.suggested_filename)
```

## 06. Ce que contient l’export

Un seul ZIP, toujours, même pour une seule variante : `<projet>-clearspace.zip`.

```
<PROJET> CLEARSPACE/
  <Variante>/SVG/<projet>-<variante>-clearspace-clair.svg   …-fonce.svg
  <Variante>/PNG/…-clair.png   …-fonce.png
  <Variante>/JPEG/…-clair.jpeg …-fonce.jpeg
  <Variante>/PDF/…-clair.pdf   …-fonce.pdf
  RECOMMANDATIONS.txt
```

- Toutes les variantes, les 4 formats, les 2 tons : 8 fichiers par variante + `RECOMMANDATIONS.txt`. Aucun choix possible.
- SVG et PDF vectoriels ; PNG à fond transparent ; JPEG à fond blanc (clair) ou noir (foncé). PNG et JPEG font 3000 px de large, à 300 dpi.
- Chaque planche contient le logo (couleurs d’origine), les guides de la zone et une légende : « X = <méthode> · X = <valeur> unités · Zone de sécurité = <valeur> × <multiplicateur> = <zone> unités ».
- `RECOMMANDATIONS.txt` reprend ce calcul pour chaque variante.
- Le nom du projet n’est pas modifiable dans l’interface : c’est « Sans titre » (« Untitled » si le projet a été créé en anglais), ou le nom repris d’un ancien projet Binksy LogoKit. D’où par exemple `Sans-titre-clearspace.zip` et le dossier `SANS-TITRE CLEARSPACE/`. Le nom de chaque variante, lui, se change dans la colonne de gauche et sert de nom de dossier.
- Le fichier arrive dans les **téléchargements** du navigateur ; avec Playwright, récupère-le via `expect_download`.

## 07. État persistant

- Projet : `localStorage["binksy-clearspace-v1"]` (JSON : `ready` = variantes avec leur SVG, `compositions[<id>]` = `{ method, multiplier, measure, label }`, `active`, `canvas`, `theme`…). Si le quota est dépassé, l’instantané passe dans IndexedDB `binksy-clearspace` (magasin `snapshots`, clé `project`) et `localStorage` ne garde qu’un marqueur `{"storage":"indexeddb"}`.
- Langue : `localStorage["binksy-clearspace-locale"]` (`fr` ou `en`).
- Migration unique : au premier lancement, les anciens projets Binksy LogoKit (`binksy-logo-system`) sont repris ; le drapeau `binksy-clearspace-migrated` évite de recommencer.
- Enregistrement automatique environ 300 ms après chaque changement, et à la fermeture de la page. L’historique Annuler / Rétablir (60 pas) n’est pas conservé après rechargement.
- Pour repartir de zéro, supprime les variantes une à une avec `[data-remove-variant]`. N’efface pas le stockage de l’utilisateur sans son accord : c’est son travail.

## 08. Vérifications avant de rendre le travail

- Le nombre de `.ready-card` correspond au nombre de SVG fournis, et chaque nom de variante est celui attendu.
- Pour chaque variante : la bonne méthode et le bon multiplicateur sont `aria-pressed="true"` ; `.clear-facts` affiche la bonne référence.
- Le ZIP téléchargé contient 8 fichiers par variante plus `RECOMMANDATIONS.txt`, et les valeurs de `RECOMMANDATIONS.txt` correspondent à ce qui était demandé.
- Ouvre au moins une planche (SVG ou PNG) pour contrôler visuellement la zone.
- Aucun SVG fourni n’a été modifié, aucune couleur, aucun logo ni texte n’a été inventé.
- Dis à l’utilisateur où se trouve le ZIP et ce que tu as réglé (méthode, mesure, multiplicateur par variante).

## 09. Limites et erreurs

| Message (dans `#notice`) | Cause | Que faire |
|---|---|---|
| « Fichier trop volumineux. » / « SVG trop volumineux (3 Mo maximum). » | fichier de plus de 3 Mo | demander un SVG allégé |
| « Ce fichier n’est pas un SVG valide. » | fichier illisible ou pas du SVG | demander le bon fichier |
| « Le fichier contient une image ou du contenu non vectoriel. Importez des tracés SVG. » | `<image>` ou `<foreignObject>` | demander une version vectorielle |
| « Texte non vectorisé : chargez la police OTF/TTF correspondante, puis réimportez le SVG. » | balise `<text>` dans le SVG | l’interface ne permet pas de charger de police : demander un SVG au texte vectorisé |
| « Les ressources externes ne sont pas acceptées. » / « Le SVG utilise des ressources CSS externes. » | liens externes, `@import` | demander un SVG autonome |
| « Le SVG ne contient aucune forme visible. » | fichier vide ou invisible | vérifier le fichier |
| « Multiplicateur entre 0,05 et 5. » | valeur libre hors limites | corriger la valeur |
| « PDF : effets complexes non pris en charge ; utilisez le SVG. » | le SVG contient `filter`, `mask` ou `pattern` | l’export entier s’arrête : prévenir l’utilisateur |
| « Lot supérieur à 256 Mo. Réduisez le nombre de variantes. » | trop de variantes lourdes | exporter en plusieurs fois |
| « Sauvegarde impossible » / « Stockage local plein ou indisponible. » | stockage du navigateur indisponible | prévenir l’utilisateur |

- Les scripts, animations et liens contenus dans un SVG sont retirés à l’import (assainissement), sans message.
- La plupart des messages d’erreur d’import et d’export restent en français, même avec l’interface en anglais.
- Il n’existe pas de réglage de taille d’export, de couleur des guides ni de nom de projet dans l’interface.
- L’interface est pensée pour un écran d’ordinateur.

## 10. Logique à suivre pour chaque tâche

1. Récupère les SVG auprès de l’utilisateur ; n’en fabrique aucun.
2. Fais-toi confirmer, pour chaque variante, la méthode X (hauteur, largeur ou mesure visuelle sur quel élément) et le multiplicateur. Sans consigne, propose (par exemple hauteur × 1) et attends l’accord.
3. Importe, règle, vérifie l’interface après chaque clic.
4. Exporte, ouvre le ZIP, contrôle `RECOMMANDATIONS.txt` et une planche.
5. Rends le ZIP avec un résumé honnête : ce qui a été fait, ce qui a échoué et pourquoi.

---

# English

## About this document

This document is for AI agents (Claude Code, Codex, or any agent driving a browser through Playwright / CDP). It explains how to use **Binksy ClearSpace** (`app.html`), the Binks Design tool that defines, previews and exports the **clear space** (safety zone) of a logo from SVG files.

It lives in two places, always identical: `AGENTS.md` (Markdown, French then English) and the `agent/index.html` page. Short summary: `llms.txt`. Human documentation (French): `docs.html`.

Entry points discoverable without JavaScript: `index.html` and `docs.html` declare `<link rel="alternate" type="text/markdown" href="AGENTS.md">`, `<link rel="help" href="agent/">`, `<link rel="help" href="mcp/">` and `<link rel="alternate" type="text/plain" href="llms.txt">`, plus an HTML comment and a `<noscript>` block pointing here.

> In the GitHub repository, the root `AGENTS.md` is for developers changing the code. This one (`public/AGENTS.md`, served at the site root) is for agents **using** the tool.

## 01. Golden rule

ClearSpace measures and lays out what the designer provides. It is **not** a logo generator.

- **Never invent** a logo, symbol, colour, font or brand copy. The SVGs provided by the user are **the source of truth**.
- **Do not redraw** a provided SVG, do not change its geometry or colours, do not swap it for a “similar” file. If an SVG is rejected (text not outlined, embedded image…), tell the user and ask for a fixed file.
- **The clear-space rule belongs to the designer.** Do not pick the X method or the multiplier on your own: apply what you were asked, or suggest and get approval. The 0.5 / 1 / 1.5 / 2 multipliers are test methods, not universal rules.
- **No API key, no online service.** The tool ships no AI and calls no server. Never ask the user for a key or an account.
- **Everything is local**: SVG parsing, measurements, rendering and the ZIP happen in the browser. The project is saved in browser storage.
- **Public JavaScript API: `window.BinksyAPI`** (shared Binksy convention, API v1), also registered as **WebMCP** tools when the browser supports it — see “Agent API” below and the `mcp/` page. Otherwise drive the tool through its interface, with the selectors below. Do not inject other code that changes internal state.

After every action, re-read the interface (`aria-pressed` state, displayed text, the `#notice` message). **A click is not proof of success.**

## Agent API: `window.BinksyAPI` + WebMCP

In `app.html`, `window.BinksyAPI` calls the same functions as the UI (undo/redo history, auto-save, rendering). Common methods: `describe()`, `ready()`, `getState()`, `importer({ files: [{ name, type, dataBase64 | text | url(data:) }] })`, `exporter({ format: "zip" | "svg" | "png" | "jpeg" | "pdf", variantId?, tone?: "clair" | "fonce", download? })` → `{ files: [{ name, type, dataBase64 }] }` (no download unless `download: true`), `reset({ confirm: true })`, plus `callTool(name, args)`. Errors reject as `{ code, message }`. The same tools are registered as WebMCP tools when the browser supports it. Setup (Playwright MCP for Claude Code, Codex, Hermes, OpenCode) and a ready-to-paste prompt: [`mcp/`](mcp/).

- `clearspace_describe` → `BinksyAPI.describe()`: Describes the app and lists tools (JSON schemas).
- `clearspace_etat` → `BinksyAPI.getState()`: State: variants, each clear-space setting (method, ×, X, space), preview, theme.
- `clearspace_importer` → `BinksyAPI.importer()`: Imports SVGs (one variant per file).
- `clearspace_exporter` → `BinksyAPI.exporter()`: Exports the full ZIP or one SVG/PNG/JPEG/PDF board, light or dark (base64).
- `clearspace_definir_zone` → `BinksyAPI.setClearSpace()`: X = height, width or visual measure; space = X × multiplier.
- `clearspace_choisir_variante` → `BinksyAPI.setActive()`: Shows a variant in the preview.
- `clearspace_renommer_variante` → `BinksyAPI.renameVariant()`: Renames a variant (folder and file names).
- `clearspace_supprimer_variante` → `BinksyAPI.removeVariant()`: Removes a variant (after user consent).
- `clearspace_affichage` → `BinksyAPI.setDisplay()`: Light/dark preview background and UI theme.
- `clearspace_reset` → `BinksyAPI.reset()`: Clears the project (confirm:true, after user consent).

## 02. Getting started

### Open the tool

- Online: `https://clearspace.binksdesign.com/app.html` (the host may redirect to `/app`; same page).
- Locally, from the repository (Vite project):

```bash
npm ci
npm run build
npx vite preview --host 127.0.0.1   # then open http://127.0.0.1:4173/app.html
# or, for development: npm run dev  → http://127.0.0.1:5173/app.html
```

`index.html` is the home page, `app.html` the tool, `docs.html` the documentation, `agent/index.html` this page.

### The screen

One page, no steps:

- **Header**: logo, Undo / Redo, light/dark theme toggle, FR / EN language.
- **Left**: “Variantes du logo” (logo variants), “+ Ajouter des SVG” (add SVGs) button, one card per variant (clickable preview, editable name, Replace, Delete).
- **Centre**: active variant name, “Clair / Sombre” (light / dark) background buttons, large preview with clear-space guides, then the export bar (“N variantes · ZIP” and the **Exporter** / Export button).
- **Right**: “Définir X” (Height / Width / Visual), visual measurement, “Espace” (multipliers) and “Personnalisé” (custom).

With no variant, the preview shows “Déposez vos SVG” with a “Choisir des fichiers SVG” button, and Export is disabled.

## 03. Stable selectors

| Action | Selector | Note |
|---|---|---|
| Import SVGs (always present) | `#ready-files` | hidden `input[type=file]`, `multiple`, `accept=".svg,image/svg+xml"`: use `set_input_files` |
| Import from the empty preview | `#stage-files` | only exists when there is no variant |
| Drop zone | `#stage` | also accepts file drag-and-drop |
| SVG preview | `#canvas` | `<svg>` inside `#stage`; guides in `#clear-guides` |
| Variant card | `.ready-card` (active: `.ready-card.active`) | one per imported file |
| Activate a variant | `[data-active="<id>"]` | preview button, `aria-pressed="true"` when active |
| Rename | `[data-ready-name="<id>"]` | `input`, committed on `change` (Tab / Enter), 100 characters max |
| Replace the SVG | `[data-replace-variant="<id>"]` | hidden `input[type=file]`, keeps the variant’s settings |
| Delete | `[data-remove-variant="<id>"]` | no confirmation (use Undo to go back) |
| X method | `[data-method="height"]`, `[data-method="width"]`, `[data-method="visual"]` | `aria-pressed="true"` on the active method |
| Draw the measurement | `[data-action="measure"]` | only shown in Visual mode |
| Measurement name | `#measure-name` | optional, 160 characters max, shown in Visual mode |
| Multiplier | `[data-multiplier="0.5"]`, `"1"`, `"1.5"`, `"2"` | `aria-pressed="true"` on the active one |
| Custom multiplier | `#clear-multiplier` | `input[type=number]`, 0.05 to 5, committed on `change` |
| Preview background | `[data-canvas="#ffffff"]`, `[data-canvas="#000000"]` | affects the preview only |
| Interface theme | `[data-theme-toggle]` | `aria-pressed="true"` when dark; `html[data-theme]` |
| Language | `[data-language="fr"]`, `[data-language="en"]` | in the header |
| Undo / Redo | `[data-action="undo"]`, `[data-action="redo"]` | also Ctrl/⌘ + Z and Ctrl/⌘ + Shift + Z (outside text fields) |
| Export | `[data-action="export"]` | disabled with no variant or while exporting |
| Messages | `#notice` | `role="status"`, hides after 8 s |
| Summary | `.clear-facts` | “Référence : …” and “Zone de sécurité : 1,5× X” |

Variant ids look like `v-<uuid>`; read them from the DOM (`[data-active]`), never invent them.

## 04. Step-by-step flow

1. **Open** `app.html` and wait for `#ready-files` (attached to the DOM).
2. **Import** the provided SVGs: `set_input_files("#ready-files", [...])`. Each file becomes a variant named after the file (without `.svg`, made unique if needed). Check the number of `.ready-card` elements and the `#notice` message (“2 variantes importées.”); a rejected SVG shows its error in `#notice` and **none** of the batch is imported.
3. **For each variant** to set: click `[data-active="<id>"]`, then the requested method:
   - `height`: X = drawing height (bounding box of the visible shapes, stroke width included);
   - `width`: X = drawing width;
   - `visual`: click `[data-action="measure"]`, then drag (left button) on `#canvas`. The measurement = the larger of the horizontal/vertical distances, in SVG units, rounded to 0.01. No snapping. Escape or the hint’s “Annuler” button cancels. Then fill `#measure-name` if you were given a name (e.g. “Height of the A”).
4. **Multiplier**: click `[data-multiplier="…"]`, or fill `#clear-multiplier` then Tab. Outside 0.05–5 the tool refuses (“Multiplicateur entre 0,05 et 5.”).
5. **Check** `.clear-facts` and `aria-pressed` for every variant (settings are independent per variant).
6. **Export**: click `[data-action="export"]` while waiting for a download (`expect_download`). While working, `#notice` shows “Export i / n”; at the end “Export terminé. Votre ZIP est prêt.” (EN: “Export finished. Your ZIP is ready.”).

### Converting SVG units to screen positions (visual measurement)

```js
// In the page: top-left corner (x, y) and side s, in SVG units → screen points
const svg = document.querySelector('#canvas');
const m = svg.getScreenCTM();
const toScreen = (x, y) => new DOMPoint(x, y).matrixTransform(m);
const a = toScreen(x, y), b = toScreen(x + s, y + s);
// drag the mouse from (a.x, a.y) to (b.x, b.y)
```

The logo geometry can be read from the preview SVG (`#canvas`). Only take a visual measurement on the element the user asked for.

## 05. Playwright example (Python)

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    page = p.chromium.launch().new_page(accept_downloads=True)
    page.goto("http://127.0.0.1:4173/app.html")
    page.wait_for_selector("#ready-files", state="attached")
    page.set_input_files("#ready-files", ["logo-horizontal.svg", "icon.svg"])
    page.wait_for_selector(".ready-card >> nth=1")

    # Variant 1: height × 1 (as requested by the user)
    page.click(".ready-card >> nth=0 >> [data-active]")
    page.click('[data-method="height"]')
    page.click('[data-multiplier="1"]')

    # Variant 2: width × 0.5
    page.click(".ready-card >> nth=1 >> [data-active]")
    page.click('[data-method="width"]')
    page.click('[data-multiplier="0.5"]')
    print(page.inner_text(".clear-facts"))

    with page.expect_download(timeout=120_000) as dl:
        page.click('[data-action="export"]')
    dl.value.save_as(dl.value.suggested_filename)
```

## 06. What the export contains

Always one ZIP, even for a single variant: `<project>-clearspace.zip`.

```
<PROJECT> CLEARSPACE/
  <Variant>/SVG/<project>-<variant>-clearspace-clair.svg   …-fonce.svg
  <Variant>/PNG/…-clair.png   …-fonce.png
  <Variant>/JPEG/…-clair.jpeg …-fonce.jpeg
  <Variant>/PDF/…-clair.pdf   …-fonce.pdf
  RECOMMANDATIONS.txt
```

- Every variant, all 4 formats, both tones (`clair` = light, `fonce` = dark): 8 files per variant + `RECOMMANDATIONS.txt`. Nothing to choose.
- SVG and PDF are vector; PNG has a transparent background; JPEG has a white (light) or black (dark) background. PNG and JPEG are 3000 px wide, at 300 dpi.
- Each sheet holds the logo (original colours), the clear-space guides and a caption: “X = <method> · X = <value> units · Clear space = <value> × <multiplier> = <space> units” (in the interface language).
- `RECOMMANDATIONS.txt` repeats this calculation for each variant.
- The project name cannot be edited in the interface: it is “Sans titre” (“Untitled” if the project was created in English), or the name carried over from an old Binksy LogoKit project. Hence e.g. `Sans-titre-clearspace.zip` and the `SANS-TITRE CLEARSPACE/` folder. Each variant’s name can be changed in the left column and is used as its folder name.
- The file lands in the browser’s **downloads**; with Playwright, get it through `expect_download`.

## 07. Persistent state

- Project: `localStorage["binksy-clearspace-v1"]` (JSON: `ready` = variants with their SVG, `compositions[<id>]` = `{ method, multiplier, measure, label }`, `active`, `canvas`, `theme`…). If the quota is exceeded, the snapshot moves to IndexedDB `binksy-clearspace` (store `snapshots`, key `project`) and `localStorage` only keeps a `{"storage":"indexeddb"}` marker.
- Language: `localStorage["binksy-clearspace-locale"]` (`fr` or `en`).
- One-time migration: on first launch, old Binksy LogoKit projects (`binksy-logo-system`) are carried over; the `binksy-clearspace-migrated` flag prevents doing it again.
- Autosave about 300 ms after each change, and when the page closes. The Undo / Redo history (60 steps) is not kept after a reload.
- To start over, delete the variants one by one with `[data-remove-variant]`. Do not wipe the user’s storage without their consent: it is their work.

## 08. Checks before handing back

- The number of `.ready-card` elements matches the number of SVGs provided, and each variant name is the expected one.
- For each variant: the right method and multiplier are `aria-pressed="true"`; `.clear-facts` shows the right reference.
- The downloaded ZIP holds 8 files per variant plus `RECOMMANDATIONS.txt`, and the values in `RECOMMANDATIONS.txt` match what was requested.
- Open at least one sheet (SVG or PNG) to check the zone visually.
- No provided SVG was modified; no colour, logo or copy was invented.
- Tell the user where the ZIP is and what you set (method, measurement, multiplier per variant).

## 09. Limits and errors

| Message (in `#notice`) | Cause | What to do |
|---|---|---|
| “Fichier trop volumineux.” / “SVG trop volumineux (3 Mo maximum).” | file over 3 MB | ask for a lighter SVG |
| “Ce fichier n’est pas un SVG valide.” | unreadable file or not SVG | ask for the right file |
| “Le fichier contient une image ou du contenu non vectoriel. Importez des tracés SVG.” | `<image>` or `<foreignObject>` | ask for a vector version |
| “Texte non vectorisé : chargez la police OTF/TTF correspondante, puis réimportez le SVG.” | `<text>` element in the SVG | the interface cannot load fonts: ask for an SVG with outlined text |
| “Les ressources externes ne sont pas acceptées.” / “Le SVG utilise des ressources CSS externes.” | external links, `@import` | ask for a self-contained SVG |
| “Le SVG ne contient aucune forme visible.” | empty or invisible file | check the file |
| “Multiplicateur entre 0,05 et 5.” | custom value out of range | fix the value |
| “PDF : effets complexes non pris en charge ; utilisez le SVG.” | the SVG contains `filter`, `mask` or `pattern` | the whole export stops: tell the user |
| “Lot supérieur à 256 Mo. Réduisez le nombre de variantes.” | too many heavy variants | export in several batches |
| “Sauvegarde impossible” / “Stockage local plein ou indisponible.” | browser storage unavailable | tell the user |

- Scripts, animations and links inside an SVG are stripped on import (sanitising), silently.
- Most import and export error messages stay in French, even with the English interface.
- The interface has no setting for export size, guide colour or project name.
- The interface is designed for a desktop screen.

## 10. Logic for every task

1. Get the SVGs from the user; never make any.
2. Confirm, for each variant, the X method (height, width, or visual measurement on which element) and the multiplier. Without instructions, suggest one (e.g. height × 1) and wait for approval.
3. Import, set, check the interface after each click.
4. Export, open the ZIP, check `RECOMMANDATIONS.txt` and one sheet.
5. Hand back the ZIP with an honest summary: what was done, what failed and why.
