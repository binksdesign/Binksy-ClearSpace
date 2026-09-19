export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export const arrow =
  '<img class="arrow" src="/brand/arrow.svg" alt="" aria-hidden="true">';

export function identity() {
  return `<span class="brand-home"><img src="/brand/logo.svg" alt="Binksy ClearSpace"></span>`;
}
