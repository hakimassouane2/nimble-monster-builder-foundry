/**
 * Génération de la description HTML "sweet spot" Nimble (system.description).
 * Régénérée à chaque build/scale. Volontairement concise.
 */

import { sizeLabelFR, armorLabelFR, damageLabelFR, rangeSuffixFR, fmtAverage } from "../data/labels.mjs";

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
  ));
}

/**
 * @param {object} recipe
 * @param {object} stats  résultat de deriveStats
 * @returns {string} HTML
 */
export function buildStatblock(recipe, stats) {
  const size = sizeLabelFR(stats.sizeCategory);
  const armor = armorLabelFR(stats.armor);
  const dmgType = damageLabelFR(recipe.damageType);

  const headerBits = [`Niveau ${esc(stats.level)}`, esc(size)];
  if (armor) headerBits.push(esc(armor));
  if (recipe.creatureType) headerBits.push(esc(recipe.creatureType));

  const lines = [];
  lines.push(`<p><strong>${esc(recipe.name)}</strong> — ${headerBits.join(", ")}</p>`);
  lines.push(`<p><em>Save DC ${stats.saveDC}</em></p>`);

  const rangeTxt = rangeSuffixFR(recipe.attackType, recipe.distance);

  const atkItems = (stats.attacks ?? []).map((a) => {
    const label = a.label ?? "Attaque";
    const avg = fmtAverage(a.formula.average);
    return `<li><strong>${esc(label)}.</strong> ${esc(a.formula.formula)} (${avg}) ${esc(dmgType)}${rangeTxt}.</li>`;
  });
  if (atkItems.length) lines.push(`<ul>${atkItems.join("")}</ul>`);

  if (stats.monsterType === "soloMonster" && stats.lastStandHp) {
    lines.push(`<p><em>Dernier sursaut :</em> soigné à ${stats.lastStandHp} PV en tombant à 0.</p>`);
  }

  return lines.join("\n");
}
