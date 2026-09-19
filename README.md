# Binksy ClearSpace

Définissez, visualisez et exportez la **zone de sécurité (clear space)** de votre logo. Outil local et privé : vos SVG restent sur cet appareil.

Parcours : **Importer → Zone de sécurité → Exporter**.

## Le système (inchangé)

Reprend à l’identique le moteur clearspace : import de variantes SVG assemblées, mesure X `auto` (petit côté), `part` (référence chiffrée) ou `visual` (carré tracé sur le logo, magnétisme sur les bords), multiplicateurs **0,5X / 1X / 1,5X / 2X** + valeur libre, planches **claires/foncées** (SVG, PNG, PDF), export ZIP avec `RECOMMANDATIONS.txt`, projets `.binksy` V1–V5 toujours lisibles, FR/EN, annuler/rétablir, sauvegarde locale.

## Ce qui a été retiré (tout le reste)

Brand Guideline complet, assistant IA + recommandations, palettes et couleurs, catalogue multicolore et dégradés, galerie JPEG, modes Composition et Versions prêtes, page Règles agent IA, grille d’assemblage et poignées. Seul le mode « Juste la zone de sécurité » subsiste ; les anciens projets contenant des variantes prêtes s’ouvrent tels quels.

## Démarrer

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
```

## Vérification

`npm test`, `npm run build`, puis parcours complet : import SVG, X auto/partie/visuelle, ratios 0,5/1/1,5/2, fonds clair/sombre, planches claire/foncée, ZIP réellement téléchargé (SVG/PNG/PDF), roundtrip `.binksy`, FR/EN, largeurs 1440/1024/390. Référence : le dossier `BINKSY LOGOKIT V2` (intouché) — les planches SVG/PNG exportées y sont identiques à l’octet.
