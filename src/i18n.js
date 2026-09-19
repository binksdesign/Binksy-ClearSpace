import { en } from "./locales/en.js";

// Textes FR (clé = texte français) et EN. Ne jamais traduire le contenu
// utilisateur (noms de variantes, SVG).
const fr = {
  "Sans titre": "Sans titre",
  Variante: "Variante",
  unités: "unités",
  "Zone de sécurité": "Zone de sécurité",
  Référence: "Référence",
  "Mesure visuelle": "Mesure visuelle",
  "Largeur du logo": "Largeur du logo",
  "Hauteur du logo": "Hauteur du logo",
  "Aucune variante. Importez vos SVG.": "Aucune variante. Importez vos SVG.",
  "Afficher la variante": "Afficher la variante",
  "Nom de la variante": "Nom de la variante",
  Remplacer: "Remplacer",
  Supprimer: "Supprimer",
  "Définir X": "Définir X",
  Hauteur: "Hauteur",
  Largeur: "Largeur",
  Visuel: "Visuel",
  "Tracer la mesure": "Tracer la mesure",
  "Retracer la mesure": "Retracer la mesure",
  "Nom de la mesure": "Nom de la mesure",
  facultatif: "facultatif",
  "Hauteur du A": "Hauteur du A",
  Espace: "Espace",
  Personnalisé: "Personnalisé",
  "Variantes du logo": "Variantes du logo",
  "Ajouter des SVG": "Ajouter des SVG",
  Clair: "Clair",
  Sombre: "Sombre",
  Exporter: "Exporter",
  variantes: "variantes",
  variante: "variante",
  "Enregistrement…": "Enregistrement…",
  "Enregistré sur cet appareil": "Enregistré sur cet appareil",
  "Sauvegarde impossible": "Sauvegarde impossible",
  "Stockage local plein ou indisponible.":
    "Stockage local plein ou indisponible.",
  "Déposez vos SVG": "Déposez vos SVG",
  "Horizontal, vertical, icône, logotype… chaque fichier devient une variante indépendante.":
    "Horizontal, vertical, icône, logotype… chaque fichier devient une variante indépendante.",
  "Choisir des fichiers SVG": "Choisir des fichiers SVG",
  "Fichier trop volumineux.": "Fichier trop volumineux.",
  "variantes importées": "variantes importées",
  "variante importée": "variante importée",
  "Multiplicateur entre 0,05 et 5.": "Multiplicateur entre 0,05 et 5.",
  "Export terminé. Votre ZIP est prêt.": "Export terminé. Votre ZIP est prêt.",
  "Le cache hors ligne est indisponible.":
    "Le cache hors ligne est indisponible.",
  "Projets LogoKit importés dans Binksy ClearSpace.":
    "Projets LogoKit importés dans Binksy ClearSpace.",
  "Sauvegarde locale illisible. Importez vos SVG à nouveau.":
    "Sauvegarde locale illisible. Importez vos SVG à nouveau.",
  Annuler: "Annuler",
  Rétablir: "Rétablir",
  "Thème sombre": "Thème sombre",
  "Thème clair": "Thème clair",
  "Importez un SVG pour définir sa zone de sécurité.":
    "Importez un SVG pour définir sa zone de sécurité.",
  "Tracez un carré sur le logo": "Tracez un carré sur le logo",
  "Planches de zone de sécurité. SVG et PDF vectoriels, PNG transparent, JPEG avec fond clair ou sombre. Couleurs d’origine du logo conservées.":
    "Planches de zone de sécurité. SVG et PDF vectoriels, PNG transparent, JPEG avec fond clair ou sombre. Couleurs d’origine du logo conservées.",
  "0,5X / 1X / 1,5X / 2X sont des méthodes de test, pas des règles universelles.":
    "0,5X / 1X / 1,5X / 2X sont des méthodes de test, pas des règles universelles.",
  "Définissez la mesure X de cette variante avant d’exporter.":
    "Définissez la mesure X de cette variante avant d’exporter.",
  "Format non pris en charge.": "Format non pris en charge.",
  "Planche illisible.": "Planche illisible.",
  "PDF : effets complexes non pris en charge ; utilisez le SVG.":
    "PDF : effets complexes non pris en charge ; utilisez le SVG.",
  "Mémoire insuffisante pour cet export.":
    "Mémoire insuffisante pour cet export.",
  "Lot supérieur à 256 Mo. Réduisez le nombre de variantes.":
    "Lot supérieur à 256 Mo. Réduisez le nombre de variantes.",
  "Importez au moins une variante.": "Importez au moins une variante.",
  Variantes: "Variantes",
};

let locale = "fr";
try {
  if (typeof window !== "undefined")
    locale =
      window.localStorage.getItem("binksy-clearspace-locale") === "en"
        ? "en"
        : "fr";
} catch {}

export const language = () => locale;

export function setLanguage(value) {
  locale = value === "en" ? "en" : "fr";
  try {
    window.localStorage.setItem("binksy-clearspace-locale", locale);
  } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export function t(message, values = {}) {
  let text = locale === "en" ? en[message] || message : fr[message] || message;
  for (const [key, value] of Object.entries(values))
    text = text.replaceAll("{" + key + "}", String(value));
  return text;
}

// Adapte les textes du DOM. Ne jamais traduire SVG, code ni [data-no-i18n].
export function translateDOM(root = document.querySelector("#app")) {
  document.documentElement.lang = locale;
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement.closest("svg,script,style,code,[data-no-i18n]"))
      continue;
    const value = node.textContent.trim();
    const translated = t(value);
    if (translated !== value)
      node.textContent = node.textContent.replace(value, translated);
  }
  for (const el of root.querySelectorAll("[aria-label],[title],[placeholder]"))
    for (const key of ["aria-label", "title", "placeholder"]) {
      if (el.closest("[data-no-i18n]")) continue;
      const value = el.getAttribute(key);
      if (value) el.setAttribute(key, t(value));
    }
}
