// Binksy ClearSpace — API pour agents IA (convention Binksy Agent API v1).
// window.BinksyAPI + outils WebMCP, décrits par UNE seule table TOOLS.
// Chaque méthode passe par les fonctions de main.js (edit → historique,
// auto-save, rendu) : aucune logique dupliquée, aucun appel réseau.
import { exportPlan } from "./export-formats.js";
import { buildFiles, zipFiles, renderFile, download } from "./export.js";
import { clearspaceSVG } from "./clearspace.js";
import { clearMeasure, composition, slug, variantName, MULTIPLIERS, clone } from "./model.js";

const APP = "Binksy ClearSpace";
const API_VERSION = "1";

function fail(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}
const plain = (e) => ({ code: e?.code || "ERREUR", message: String(e?.message || e) });

function b64ToBytes(s) {
  const bin = atob(String(s).replace(/^data:[^,]*,/, "").replace(/\s+/g, ""));
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
async function blobToB64(blob) {
  const u = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
function toFile(f) {
  if (!f || typeof f.name !== "string") throw fail("ARGUMENT_INVALIDE", "importer : chaque fichier a besoin d'un name.");
  let bytes;
  if (f.dataBase64 != null) bytes = b64ToBytes(f.dataBase64);
  else if (f.text != null) bytes = new TextEncoder().encode(String(f.text));
  else if (f.url != null) {
    if (!/^data:/i.test(f.url)) throw fail("URL_NON_SUPPORTEE", "importer : seules les URL data: sont acceptées (aucun téléchargement réseau).");
    bytes = /^data:[^,]*;base64,/i.test(f.url) ? b64ToBytes(f.url) : new TextEncoder().encode(decodeURIComponent(f.url.replace(/^data:[^,]*,/, "")));
  } else throw fail("FICHIER_VIDE", `importer : « ${f.name} » n'a ni dataBase64, ni text, ni url.`);
  const isSvg = /\.svg$/i.test(f.name) || /svg/i.test(f.type || "") || /^data:image\/svg/i.test(f.url || "");
  if (!isSvg) throw fail("FORMAT_NON_SUPPORTE", `importer : « ${f.name} » n'est pas un SVG (ClearSpace importe des SVG assemblés).`);
  return new File([bytes], f.name, { type: "image/svg+xml" });
}

const obj = (properties, required) => ({ type: "object", properties, ...(required ? { required } : {}), additionalProperties: false });
const VARIANT = { type: "string", description: "id de variante (voir clearspace_etat → variants[].id) ; par défaut la variante active" };

export function installAgentAPI(app) {
  // app : { project(), edit(fn), render(), importFiles(files, {strict}), setActive(id), ready }
  const p = () => app.project();
  const variantOf = (id) => {
    const v = id ? p().ready.find((x) => x.id === id) : p().ready.find((x) => x.id === p().active);
    if (!v) throw fail("VARIANTE_INCONNUE", id ? `variante « ${id} » inconnue` : "aucune variante : importe d'abord un SVG.");
    return v;
  };

  function getState() {
    const q = p();
    return {
      app: APP,
      brand: q.brand,
      active: q.active,
      canvas: q.canvas === "#000000" ? "sombre" : "clair",
      theme: q.theme,
      exports: { ...q.exports, formats: ["svg", "png", "jpeg", "pdf"], tones: ["clair", "fonce"], files: exportPlan(q).length + (q.ready.length ? 1 : 0) },
      variants: q.ready.map((v) => {
        const c = composition(q, v.id), m = clearMeasure(q, v.id);
        return {
          id: v.id,
          name: v.name,
          width: v.asset?.box?.width,
          height: v.asset?.box?.height,
          active: q.active === v.id,
          clearSpace: { method: c.method, multiplier: c.multiplier, measure: c.measure, label: c.label, reference: m.label, x: m.value, space: m.space },
        };
      }),
    };
  }

  async function importer(a) {
    const files = Array.isArray(a.files) ? a.files : null;
    if (!files?.length) throw fail("ARGUMENT_MANQUANT", "importer : files[] est requis.");
    const imported = await app.importFiles(files.map(toFile), { strict: true });
    return { imported: imported.map((v) => ({ id: v.id, name: v.name })), state: getState() };
  }

  async function exporter(a) {
    const format = a.format || "zip";
    const q = clone(p());
    if (!q.ready.length) throw fail("PROJET_VIDE", "exporter : aucune variante, importe d'abord un SVG.");
    if (format === "zip") {
      const files = await buildFiles(q);
      const paths = Object.keys(files);
      const blob = await zipFiles(files);
      const name = `${slug(q.brand)}-clearspace.zip`;
      if (a.download) download(blob, name);
      return { files: [{ name, type: "application/zip", dataBase64: await blobToB64(blob) }], size: blob.size, contents: paths };
    }
    if (["svg", "png", "jpeg", "pdf"].includes(format)) {
      const v = variantOf(a.variantId);
      const tone = a.tone === "fonce" || a.tone === "dark" ? "dark" : "light";
      const svg = clearspaceSVG(q, v.id, tone);
      const blob = await renderFile(svg, format, { width: q.exports.width, dpi: q.exports.dpi, background: tone === "dark" ? "#000000" : "#ffffff" });
      const job = exportPlan(q).find((j) => j.variant === v.id && j.tone === tone && j.format === format);
      const name = job.path.split("/").pop();
      if (a.download) download(blob, name);
      return { files: [{ name, type: blob.type || (format === "svg" ? "image/svg+xml" : "application/octet-stream"), dataBase64: await blobToB64(blob) }], size: blob.size, variant: v.name, tone: tone === "dark" ? "fonce" : "clair" };
    }
    throw fail("FORMAT_INCONNU", `exporter : format « ${format} » inconnu (zip, svg, png, jpeg, pdf).`);
  }

  function setClearSpace(a) {
    const v = variantOf(a.variantId);
    const method = a.method;
    if (method != null && !["height", "width", "visual"].includes(method)) throw fail("ARGUMENT_INVALIDE", "method : height, width ou visual.");
    const mult = a.multiplier == null ? null : Number(a.multiplier);
    if (mult != null && !(mult >= 0.05 && mult <= 5)) throw fail("ARGUMENT_INVALIDE", "multiplier entre 0,05 et 5 (préréglages 0,5 / 1 / 1,5 / 2).");
    const measure = a.measure == null ? null : Number(a.measure);
    if (measure != null && !(measure > 0 && measure <= 1e6)) throw fail("ARGUMENT_INVALIDE", "measure : longueur X > 0 en unités du SVG.");
    const goesVisual = method === "visual" || (method == null && measure != null);
    if (goesVisual && measure == null && !(Number(composition(p(), v.id).measure) > 0)) throw fail("ARGUMENT_MANQUANT", "method visual : donne measure (longueur de X en unités du SVG, celle que le graphiste a choisie).");
    app.edit(() => {
      const q = p();
      const c = (q.compositions[v.id] ||= { method: "height", multiplier: 1, measure: null, label: "" });
      if (goesVisual) { c.method = "visual"; if (measure != null) c.measure = measure; }
      else if (method) { c.method = method; c.measure = null; }
      if (mult != null) c.multiplier = mult;
      if (typeof a.label === "string") c.label = a.label.trim().slice(0, 160);
    });
    return getState().variants.find((x) => x.id === v.id);
  }

  const TOOLS = [
    { name: "clearspace_describe", method: "describe", description: "Décrit Binksy ClearSpace (zone de sécurité de logo) et liste ses outils avec leurs schémas JSON.", inputSchema: obj({}), run: async () => describe() },
    { name: "clearspace_etat", method: "getState", description: "État courant : variantes (id, nom, dimensions, réglage de zone de sécurité : méthode, multiplicateur, X, zone), variante active, fond d'aperçu, thème, nombre de fichiers à l'export.", inputSchema: obj({}), run: async () => getState() },
    { name: "clearspace_importer", method: "importer", description: "Importe des SVG assemblés fournis par le graphiste, comme un dépôt de fichiers : chaque fichier devient une variante indépendante (horizontal, vertical, icône…). S'ajoute aux variantes existantes.", inputSchema: obj({ files: { type: "array", minItems: 1, items: { type: "object", properties: { name: { type: "string", description: "nom du fichier .svg (devient le nom de la variante)" }, type: { type: "string" }, dataBase64: { type: "string" }, text: { type: "string", description: "contenu SVG en texte" }, url: { type: "string", description: "URL data: uniquement" } }, required: ["name"] } } }, ["files"]), run: importer },
    { name: "clearspace_exporter", method: "exporter", description: "Exporte et renvoie les fichiers en base64 sans téléchargement (sauf download:true). format zip = le ZIP complet comme le bouton Exporter (chaque variante en SVG, PNG, JPEG, PDF, clair et foncé + RECOMMANDATIONS.txt) ; svg|png|jpeg|pdf = une seule planche (variantId, tone clair|fonce).", inputSchema: obj({ format: { type: "string", enum: ["zip", "svg", "png", "jpeg", "pdf"], default: "zip" }, variantId: VARIANT, tone: { type: "string", enum: ["clair", "fonce"], default: "clair" }, download: { type: "boolean", default: false } }), run: exporter },
    { name: "clearspace_definir_zone", method: "setClearSpace", description: "Règle la zone de sécurité d'une variante : X = hauteur du logo (height), largeur (width) ou mesure visuelle (visual, longueur measure en unités du SVG, donnée par le graphiste), zone = X × multiplicateur (0,5 / 1 / 1,5 / 2 ou libre 0,05–5). Les autres variantes ne changent pas.", inputSchema: obj({ variantId: VARIANT, method: { type: "string", enum: ["height", "width", "visual"] }, multiplier: { type: "number", minimum: 0.05, maximum: 5 }, measure: { type: "number", description: "pour visual : longueur de X en unités du viewBox du SVG" }, label: { type: "string", description: "nom de la mesure visuelle, ex. « Hauteur du A »" } }), run: async (a) => setClearSpace(a) },
    { name: "clearspace_choisir_variante", method: "setActive", description: "Affiche une variante dans l'aperçu (variante active).", inputSchema: obj({ variantId: { type: "string" } }, ["variantId"]), run: async (a) => { const v = variantOf(a.variantId); app.setActive(v.id); return { active: v.id, name: v.name }; } },
    { name: "clearspace_renommer_variante", method: "renameVariant", description: "Renomme une variante (le nom sert aussi de dossier et de nom de fichier à l'export).", inputSchema: obj({ variantId: VARIANT, name: { type: "string" } }, ["name"]), run: async (a) => { const v = variantOf(a.variantId); app.rename(v.id, String(a.name)); return { id: v.id, name: variantName(p(), v.id) }; } },
    { name: "clearspace_supprimer_variante", method: "removeVariant", description: "Supprime une variante et son réglage (annulable dans l'interface). Demande confirmation à l'utilisateur avant.", inputSchema: obj({ variantId: { type: "string" } }, ["variantId"]), run: async (a) => { const v = variantOf(a.variantId); app.remove(v.id); return { removed: v.id, remaining: p().ready.length }; } },
    { name: "clearspace_affichage", method: "setDisplay", description: "Fond de l'aperçu (clair|sombre) et thème de l'interface (light|dark).", inputSchema: obj({ canvas: { type: "string", enum: ["clair", "sombre"] }, theme: { type: "string", enum: ["light", "dark"] } }), run: async (a) => { app.edit(() => { const q = p(); if (a.canvas) q.canvas = a.canvas === "sombre" ? "#000000" : "#ffffff"; if (a.theme) q.theme = a.theme === "dark" ? "dark" : "light"; }); const s = getState(); return { canvas: s.canvas, theme: s.theme }; } },
    { name: "clearspace_reset", method: "reset", description: "Vide le projet (supprime toutes les variantes et leurs réglages ; annulable dans l'interface). Demande confirmation à l'utilisateur avant, puis passe confirm:true.", inputSchema: obj({ confirm: { type: "boolean", description: "true pour confirmer" } }, ["confirm"]), run: async (a) => { if (a.confirm !== true) throw fail("CONFIRMATION_REQUISE", "reset : passe confirm:true après accord de l'utilisateur."); app.edit(() => { const q = p(); q.ready = []; q.compositions = {}; q.active = null; }); return getState(); } },
  ];

  function describe() {
    return {
      app: APP,
      version: "1.0.0",
      apiVersion: API_VERSION,
      description: "Définit, prévisualise et exporte la zone de sécurité d'un logo : SVG importés (une variante par fichier), X = hauteur, largeur ou mesure visuelle, zone = X × multiplicateur, export ZIP SVG/PNG/JPEG/PDF clair et foncé. 100 % navigateur.",
      multipliers: MULTIPLIERS,
      mcpPage: new URL("/mcp/", location.href).href,
      tools: TOOLS.map(({ name, method, description, inputSchema }) => ({ name, method, description, inputSchema })),
    };
  }

  const api = {
    app: APP,
    apiVersion: API_VERSION,
    ready: async () => { await app.ready; return { app: APP, apiVersion: API_VERSION, variants: p().ready.length }; },
  };
  for (const t of TOOLS)
    api[t.method] = async (args) => {
      try { await app.ready; return await t.run(args || {}); } catch (e) { throw plain(e); }
    };
  api.callTool = async (name, args) => {
    const t = TOOLS.find((x) => x.name === name);
    if (!t) throw plain(fail("OUTIL_INCONNU", `outil « ${name} » inconnu`));
    return api[t.method](args);
  };
  Object.defineProperty(window, "BinksyAPI", { value: Object.freeze(api), enumerable: true, configurable: true });

  // WebMCP : document.modelContext (spec actuelle) ou navigator.modelContext (premières versions).
  const mc = document.modelContext || navigator.modelContext;
  if (mc) {
    const defs = TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: { readOnlyHint: /describe|etat/.test(t.name) },
      execute: async (args) => {
        try { return { content: [{ type: "text", text: JSON.stringify(await api[t.method](args)) }] }; }
        catch (e) { return { isError: true, content: [{ type: "text", text: JSON.stringify(plain(e)) }] }; }
      },
    }));
    (async () => {
      try {
        if (typeof mc.registerTool === "function") for (const d of defs) { try { await mc.registerTool(d); } catch { /* refusé : on continue */ } }
        else if (typeof mc.provideContext === "function") mc.provideContext({ tools: defs });
      } catch { /* WebMCP indisponible : window.BinksyAPI reste utilisable */ }
    })();
  }
  return api;
}
