import {
  paletteText,
  bitmapRect,
  exportPlan,
} from "./export-formats.js";
export { exportPlan };
import { t } from "./i18n.js";
import { jsPDF } from "jspdf";
import "svg2pdf.js";
import { Zip, ZipPassThrough, strToU8 } from "fflate";
import { svgImage, mount } from "./svg.js";
import {
  slug,
  variantName,
  clearMeasure,
} from "./model.js";
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
export async function renderFile(svg, format, options) {
  if (!["svg", "png", "jpeg", "pdf"].includes(format))
    throw Error("Format non pris en charge.");
  const root = new DOMParser().parseFromString(
    svg,
    "image/svg+xml",
  ).documentElement;
  const l = root.viewBox.baseVal;
  if (format === "svg") return new Blob([svg], { type: "image/svg+xml" });
  if (format === "pdf") {
    if (root.querySelector("filter,mask,pattern"))
      throw Error("PDF : effets complexes non pris en charge ; utilisez SVG.");
    const dispose = mount(root);
    try {
      const doc = new jsPDF({
        unit: "pt",
        format: [l.width, l.height],
        orientation: l.width > l.height ? "landscape" : "portrait",
        compress: true,
      });
      await doc.svg(root, { x: 0, y: 0, width: l.width, height: l.height });
      return doc.output("blob");
    } finally {
      dispose();
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext("2d");
  if (format === "jpeg") {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const margin = format === "jpeg" ? options.margin || 0 : 0;
  const occupancy =
    options.scale ??
    Math.min(
      l.width / (l.width + 2 * margin),
      l.height / (l.height + 2 * margin),
    );
  const rect = bitmapRect(
    canvas.width,
    canvas.height,
    l.width,
    l.height,
    occupancy,
  );
  ctx.drawImage(await svgImage(svg), rect.x, rect.y, rect.width, rect.height);
  const blob = await new Promise((resolve) =>
    canvas.toBlob(
      resolve,
      format === "jpeg" ? "image/jpeg" : "image/png",
      0.96,
    ),
  );
  canvas.width = canvas.height = 1;
  if (!blob) throw Error("Mémoire insuffisante pour cet export.");
  return withResolution(blob, options.dpi);
}
export async function buildFiles(p, items, progress = () => {}) {
  if (!items.length || !p.exports.formats.length)
    throw Error("Sélectionnez une déclinaison et un format.");
  const jobs = exportPlan(p, items);
  if (!jobs.length)
    throw Error(
      "Aucun fichier à exporter. Activez des associations JPEG ou un format transparent.",
    );
  const files = {};
  let bytes = 0,
    index = 0;
  for (const job of jobs) {
    progress(`Export ${++index} / ${jobs.length}`);
    const blob = await renderFile(clearspaceSVG(p, job.variant, job.tone), job.format, {
      ...p.exports,
    });
    bytes += blob.size;
    if (bytes > 256e6)
      throw Error("Lot supérieur à 256 Mo. Réduisez la sélection.");
    files[job.path] = new Uint8Array(await blob.arrayBuffer());
    await new Promise((r) => setTimeout(r, 0));
  }
  return files;
}
export async function exportFiles(p, items, progress) {
  const files = await buildFiles(p, items, progress);
  if (Object.keys(files).length === 1) {
    const [name, data] = Object.entries(files)[0];
    download(new Blob([data]), name.split("/").pop());
    return;
  }
  files[slug(p.brand).toUpperCase() + " CLEARSPACE/RECOMMANDATIONS.txt"] = strToU8(
    `BINKSY CLEARSPACE — ${p.brand}\n${t("Planches de zone de sécurité transparentes. Couleurs d’origine du logo conservées.")}\n\n` +
      [...new Set(items.map((i) => i.variant))]
        .map((v) => {
          const m = clearMeasure(p, v);
          return `${variantName(p, v)} · ${t("Zone de sécurité")} : X = ${m.label} · ${m.multiplier}X = ${m.space.toFixed(2)} ${t("unités")}.`;
        })
        .join("\n") +
      "\n\nPALETTE\n\n" +
      paletteText(p.colors) +
      "\n\nCMJN : approximation sans profil ICC. / CMYK: approximation without ICC profile.\nWEB : 72 DPI · PRINT : 300 DPI\n",
  );
  download(
    await zipFiles(files),
    slug(p.brand) + "-clearspace.zip",
  );
}

export async function zipFiles(files) {
  const chunks=[];
  let error;
  const zip=new Zip((err,data)=>{if(err)error=err;else chunks.push(data);});
  for(const name of Object.keys(files)) {
    const entry=new ZipPassThrough(name);zip.add(entry);
    const data=files[name];
    for(let offset=0;offset<data.length;offset+=1048576) {
      entry.push(data.subarray(offset,offset+1048576),offset+1048576>=data.length);
      if(error)throw error;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(!data.length)entry.push(data,true);
    delete files[name];
  }
  zip.end();if(error)throw error;
  return new Blob(chunks,{type:'application/zip'});
}
