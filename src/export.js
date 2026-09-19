import { exportPlan, enabledVariants } from "./export-formats.js";
import { t } from "./i18n.js";
import { jsPDF } from "jspdf";
import "svg2pdf.js";
import { Zip, ZipPassThrough, strToU8 } from "fflate";
import { svgImage, mount } from "./svg.js";
import { slug, variantName, clearMeasure } from "./model.js";
import { clearspaceSVG } from "./clearspace.js";
import { withResolution } from "./raster.js";

export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const parse = (svg) =>
  new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;

// SVG et PDF restent vectoriels ; PNG/JPEG sont rasterisés à la largeur choisie.
export async function renderFile(svg, format, options = {}) {
  if (!["svg", "png", "jpeg", "pdf"].includes(format))
    throw Error("Format non pris en charge.");
  if (format === "svg") return new Blob([svg], { type: "image/svg+xml" });
  const root = parse(svg);
  const vb = root.viewBox.baseVal;
  if (!vb.width || !vb.height) throw Error("Planche illisible.");
  if (format === "pdf") {
    if (root.querySelector("filter,mask,pattern"))
      throw Error("PDF : effets complexes non pris en charge ; utilisez le SVG.");
    const dispose = mount(root);
    try {
      const doc = new jsPDF({
        unit: "pt",
        format: [vb.width, vb.height],
        orientation: vb.width > vb.height ? "landscape" : "portrait",
        compress: true,
      });
      await doc.svg(root, { x: 0, y: 0, width: vb.width, height: vb.height });
      return doc.output("blob");
    } finally {
      dispose();
    }
  }
  const width = Math.max(16, Math.round(options.width || 3000));
  const height = Math.max(1, Math.round((width * vb.height) / vb.width));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (format === "jpeg" && options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(await svgImage(svg), 0, 0, width, height);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(
      resolve,
      format === "jpeg" ? "image/jpeg" : "image/png",
      0.96,
    ),
  );
  canvas.width = canvas.height = 1;
  if (!blob) throw Error("Mémoire insuffisante pour cet export.");
  return withResolution(blob, options.dpi || 300);
}

export async function buildFiles(p, progress = () => {}) {
  const variants = enabledVariants(p);
  if (!variants.length) throw Error("Importez et activez au moins une variante.");
  const jobs = exportPlan(p);
  const files = {};
  let bytes = 0,
    index = 0;
  for (const job of jobs) {
    progress(`Export ${++index} / ${jobs.length}`);
    const svg = clearspaceSVG(p, job.variant, job.tone);
    const blob = await renderFile(svg, job.format, {
      width: p.exports.width,
      dpi: p.exports.dpi,
      background: job.tone === "dark" ? "#000000" : "#ffffff",
    });
    bytes += blob.size;
    if (bytes > 256e6)
      throw Error("Lot supérieur à 256 Mo. Réduisez le nombre de variantes.");
    files[job.path] = new Uint8Array(await blob.arrayBuffer());
    await new Promise((r) => setTimeout(r, 0));
  }
  files[`${slug(p.brand).toUpperCase()} CLEARSPACE/RECOMMANDATIONS.txt`] = strToU8(
    recommendations(p),
  );
  return files;
}

function recommendations(p) {
  const lines = enabledVariants(p).map((v) => {
    const m = clearMeasure(p, v.id);
    return `${variantName(p, v.id)} · X = ${m.label} · X = ${m.value.toFixed(2)} ${t("unités")} · ${t("Zone de sécurité")} = ${m.value.toFixed(2)} × ${m.multiplier} = ${m.space.toFixed(2)} ${t("unités")}.`;
  });
  return (
    `BINKSY CLEARSPACE — ${p.brand}\n` +
    `${t("Planches de zone de sécurité. SVG et PDF vectoriels, PNG transparent, JPEG avec fond clair ou sombre. Couleurs d’origine du logo conservées.")}\n\n` +
    lines.join("\n") +
    `\n\n${t("0,5X / 1X / 1,5X / 2X sont des méthodes de test, pas des règles universelles.")}\n`
  );
}

// L'export produit toujours un ZIP, même pour un seul fichier.
export async function exportFiles(p, progress) {
  const files = await buildFiles(p, progress);
  download(await zipFiles(files), `${slug(p.brand)}-clearspace.zip`);
}

export async function zipFiles(files) {
  const chunks = [];
  let error;
  const zip = new Zip((err, data) => {
    if (err) error = err;
    else chunks.push(data);
  });
  for (const name of Object.keys(files)) {
    const entry = new ZipPassThrough(name);
    zip.add(entry);
    const data = files[name];
    for (let offset = 0; offset < data.length; offset += 1048576) {
      entry.push(data.subarray(offset, offset + 1048576), offset + 1048576 >= data.length);
      if (error) throw error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (!data.length) entry.push(data, true);
    delete files[name];
  }
  zip.end();
  if (error) throw error;
  return new Blob(chunks, { type: "application/zip" });
}
