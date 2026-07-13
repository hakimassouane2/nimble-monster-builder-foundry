/**
 * Libellés français pour l'affichage (descriptions, statblock).
 * P6 déplacera idéalement ceci vers l'i18n ; centralisé ici en attendant.
 */

export const SIZE_FR = {
  tiny: "Très petit", small: "Petit", medium: "Moyen",
  large: "Grand", huge: "Énorme", gargantuan: "Gigantesque"
};

export const ARMOR_FR = { none: "sans armure", medium: "armure M", heavy: "armure H" };

export const DAMAGE_FR = {
  acid: "acide", bludgeoning: "contondant", cold: "froid", fire: "feu",
  force: "force", lightning: "foudre", necrotic: "nécrotique", piercing: "perforant",
  poison: "poison", psychic: "psychique", radiant: "radiant", slashing: "tranchant",
  thunder: "tonnerre"
};

export function sizeLabelFR(key) { return SIZE_FR[key] ?? key; }
export function armorLabelFR(key) { return ARMOR_FR[key] ?? ""; }
export function damageLabelFR(key) { return DAMAGE_FR[key] ?? key; }

/** Moyenne de dégâts, toujours arrondie à l'inférieur (comme D&D 5e). */
export function fmtAverage(n) {
  return String(Math.floor(Number(n)));
}

/** Suffixe de portée/allonge pour un texte d'attaque. */
export function rangeSuffixFR(attackType, distance) {
  if (attackType === "range") return ` (Portée ${distance})`;
  if (attackType === "reach") return ` (Allonge ${distance})`;
  return "";
}
