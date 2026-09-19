# Binksy ClearSpace

Définissez, visualisez et exportez la **zone de sécurité (clear space)** de votre logo — depuis **une seule page**. Outil local et privé : vos SVG restent sur cet appareil.

Parcours : **Importer les SVG → choisir une variante → définir X → choisir le multiplicateur → exporter**.

## Interface

- **Gauche** : variantes SVG (aperçu, nom, remplacer, supprimer) + « Ajouter des SVG ».
- **Centre** : grand aperçu interactif (fond clair/sombre) avec les guides de zone de sécurité, toujours visibles.
- **Droite** : réglages de la variante — méthode X, mesure visuelle, multiplicateur.
- **Bas** : un seul bouton **Exporter** (ZIP).

Chaque variante conserve **son propre état** (méthode, mesure, nom, multiplicateur) : passer d’une variante à l’autre ne perd rien.

**Thème clair / sombre** : bascule dans l’en-tête (mémorisée avec le projet). Le fond de l’aperçu reste indépendant (bouton Clair/Sombre de la barre d’outils), puisqu’il définit le fond des planches exportées.

## Définir X

Trois méthodes seulement :

- **Hauteur du logo** — X = hauteur réelle du SVG importé.
- **Largeur du logo** — X = largeur réelle du SVG importé.
- **Visuel** — l’utilisateur trace un carré sur le logo. **Aucun magnétisme** : la position du pointeur est la vérité, à l’unité SVG près. Nom facultatif (« Hauteur du A », …).

Multiplicateurs : **×0,5 · ×1 · ×1,5 · ×2** + **personnalisé** (0,05 – 5). Ce sont des méthodes de test, pas des règles universelles.

## Export

Un seul bouton **Exporter** produit **toujours un ZIP** contenant **toutes les variantes** dans les **quatre formats** (SVG, PNG, JPEG, PDF), en clair et en sombre. Aucun choix demandé.

```
NOM-MARQUE CLEARSPACE/
  Variante/SVG/…-clair.svg  …-fonce.svg
  Variante/PNG/…  Variante/JPEG/…  Variante/PDF/…
  RECOMMANDATIONS.txt
```

SVG et PDF vectoriels, PNG transparent, JPEG avec fond clair ou sombre. Couleurs d’origine du logo conservées.

## Démarrer

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
```

## Stockage

Sauvegarde automatique locale (localStorage `binksy-clearspace-v1`, repli IndexedDB `binksy-clearspace`). Une migration unique reprend les projets LogoKit existants (`binksy-logo-system`) sans perte.

## Vérification

`npm test`, `npm run build`, puis parcours complet : import multi-SVG, 3 variantes avec états indépendants, mesure visuelle précise sans snap, persistance après rechargement, export ZIP (SVG/PNG/JPEG/PDF, clair/sombre), FR/EN, 1440/1024/390.
