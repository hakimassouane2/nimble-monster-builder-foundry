/**
 * Dérivation des stats d'un monstre depuis les tables + la recette.
 * Point d'entrée unique : deriveStats(recipe-like input) -> stats normalisées.
 * Les OFFSETS (hpLineOffset / dmgLineOffset) sont déjà finalisés par l'appelant
 * (ils incluront plus tard le coût des abilities — P3).
 */

import { ARMOR_HP_COLUMN, SIZE_TO_TOKEN_DIMENSIONS } from "../data/constants.mjs";
import { standardRowByLevel, standardRowByOrder } from "../data/standard-table.mjs";
import { legendaryRowByLevel, LEGENDARY_TABLE } from "../data/legendary-table.mjs";
import { suggestedMinionDie } from "../data/minion-dice.mjs";
import { buildFormula, formatFormula, averageOfFormula } from "./formula.mjs";

/**
 * @typedef {object} DeriveInput
 * @property {"npc"|"minion"|"soloMonster"} monsterType
 * @property {string} level          Niveau (clé table standard) ou niveau de groupe (solo/minion).
 * @property {"none"|"medium"|"heavy"} armor
 * @property {string} size           sizeCategory
 * @property {number} dieSize
 * @property {number} attackCount
 * @property {number} hpLineOffset
 * @property {number} dmgLineOffset
 */

/**
 * @param {DeriveInput} input
 * @returns {object} stats normalisées
 */
export function deriveStats(input) {
  switch (input.monsterType) {
    case "minion": return deriveMinion(input);
    case "soloMonster": return deriveLegendary(input);
    case "npc":
    default: return deriveStandard(input);
  }
}

/* ----------------------------- NPC standard ----------------------------- */

function deriveStandard(input) {
  const warnings = [];
  const baseRow = standardRowByLevel(input.level);
  if (!baseRow) {
    warnings.push(`Niveau "${input.level}" absent de la table standard.`);
    return emptyStats(input, warnings);
  }

  // HP : ligne décalée par l'offset HP, colonne selon l'armure.
  const hpRow = standardRowByOrder(baseRow.order + (input.hpLineOffset || 0));
  const hpColumn = ARMOR_HP_COLUMN[input.armor] ?? "hpNone";
  const hpMax = hpRow[hpColumn];

  // Dégâts : ligne décalée par l'offset dégâts. On utilise les formules EXACTES
  // de la table (forte = colonne simple, faible = variante "(2×)").
  const dmgRow = standardRowByOrder(baseRow.order + (input.dmgLineOffset || 0));
  const strongF = realizeFormula(dmgRow.strong, input.dieSize, warnings, "Attaque forte");
  const weakF = dmgRow.weak ? realizeFormula(dmgRow.weak, input.dieSize, warnings, "Attaque faible") : null;

  // Mode d'attaque :
  //  - "weakStrong" (défaut) : dès le niveau 1, deux attaques ALTERNATIVES
  //     (faible = colonne "2×", forte = colonne simple). Le MJ choisit la meilleure.
  //  - "multi" : attackCount attaques ÉGALES = la colonne "2×" répétée.
  //  - "single" ou fractions (< niveau 1) : une seule attaque = colonne simple.
  const mode = input.attackMode ?? "weakStrong";
  let attacks;
  if (mode === "weakStrong" && weakF) {
    attacks = [
      { key: "weak", label: "Attaque faible", target: weakF.average, canCrit: true, formula: weakF },
      { key: "strong", label: "Attaque forte", target: strongF.average, canCrit: true, formula: strongF }
    ];
  } else if (mode === "multi" && weakF && input.attackCount > 1) {
    const n = Math.round(input.attackCount);
    attacks = Array.from({ length: n }, (_, i) => ({
      key: `attack${i + 1}`, label: `Attaque ${i + 1}`,
      target: weakF.average, canCrit: true, formula: weakF
    }));
  } else {
    attacks = [{ key: "attack", label: "Attaque", target: strongF.average, canCrit: true, formula: strongF }];
  }

  return {
    monsterType: "npc",
    level: baseRow.level,
    hp: { max: hpMax, value: hpMax },
    saveDC: baseRow.saveDC,
    sizeCategory: input.size,
    tokenSize: SIZE_TO_TOKEN_DIMENSIONS[input.size] ?? 1,
    armor: input.armor,
    damageBudget: dmgRow.damage,
    attacks,
    warnings
  };
}

/* ------------------------------- Minion --------------------------------- */

function deriveMinion(input) {
  const warnings = [];
  const baseRow = standardRowByLevel(input.level);
  const saveDC = baseRow ? baseRow.saveDC : 10;

  // Un minion : 1 dé, aucun bonus, ne crit pas. Taille de dé = recette ou suggestion.
  const die = input.dieSize || suggestedMinionDie(input.level);
  const f = buildFormula({ target: 0, dieSize: die, preferredDice: 1, noBonus: true });

  return {
    monsterType: "minion",
    level: baseRow ? baseRow.level : String(input.level),
    hp: { max: 1, value: 1 },
    saveDC,
    sizeCategory: input.size,
    tokenSize: SIZE_TO_TOKEN_DIMENSIONS[input.size] ?? 1,
    armor: input.armor,
    damageBudget: f.average,
    attacks: [{ key: "attack", label: "Attaque", target: f.average, canCrit: false, formula: f }],
    warnings
  };
}

/* ----------------------------- Légendaire ------------------------------- */

function deriveLegendary(input) {
  const warnings = [];
  const baseRow = legendaryRowByLevel(input.level);
  if (!baseRow) {
    warnings.push(`Niveau de groupe "${input.level}" absent de la table légendaire.`);
    return emptyStats(input, warnings);
  }

  // HP : colonne selon l'armure (unarmored dérivé × 1,25). Offset = décalage de niveau.
  const idx = Math.max(0, Math.min(LEGENDARY_TABLE.length - 1, (baseRow.level - 1) + (input.hpLineOffset || 0)));
  const hpRow = LEGENDARY_TABLE[idx];
  const hpMax = input.armor === "heavy" ? hpRow.hpHeavy
    : input.armor === "none" ? hpRow.hpUnarmored
      : hpRow.hpMedium;
  if (input.armor === "none") {
    warnings.push("Légendaire sans armure : prévoir une capacité défensive compensatoire.");
  }

  // Deux attaques imposées : Petite (avec utilité) + Grosse (pure).
  const small = buildFormula({
    target: baseRow.smallDamage, dieSize: input.dieSize,
    preferredDice: Math.max(1, Math.round(baseRow.smallDamage / input.dieSize))
  });
  const big = buildFormula({
    target: baseRow.bigDamage, dieSize: input.dieSize,
    preferredDice: Math.max(1, Math.round(baseRow.bigDamage / input.dieSize))
  });
  if (small.warning) warnings.push(`Petite attaque : ${small.warning}`);
  if (big.warning) warnings.push(`Grosse attaque : ${big.warning}`);

  return {
    monsterType: "soloMonster",
    level: String(baseRow.level),
    hp: { max: hpMax, value: hpMax },
    saveDC: baseRow.saveDC,
    lastStandHp: baseRow.lastStandHp,
    sizeCategory: input.size,
    tokenSize: SIZE_TO_TOKEN_DIMENSIONS[input.size] ?? 1,
    armor: input.armor,
    damageBudget: baseRow.smallDamage + baseRow.bigDamage,
    attacks: [
      { key: "small", label: "Petite attaque", target: baseRow.smallDamage, canCrit: true, formula: small },
      { key: "big", label: "Grosse attaque", target: baseRow.bigDamage, canCrit: true, formula: big }
    ],
    warnings
  };
}

/* ------------------------------- Helpers -------------------------------- */

/**
 * Réalise une formule canonique {dice, die, bonus} pour la taille de dé voulue.
 * - dé identique au dé natif de la table  -> formule EXACTE (bonus imprimé conservé).
 * - dé différent -> on préserve la moyenne via buildFormula.
 * @returns {{diceCount:number, dieSize:number, bonus:number, formula:string, average:number, target:number, warning:(string|null)}}
 */
function realizeFormula(canonical, dieSize, warnings, label) {
  const target = averageOfFormula(canonical.dice, canonical.die, canonical.bonus);
  if (dieSize === canonical.die) {
    return {
      diceCount: canonical.dice, dieSize, bonus: canonical.bonus,
      formula: formatFormula(canonical.dice, dieSize, canonical.bonus),
      average: target, target, warning: null
    };
  }
  const f = buildFormula({ target, dieSize, preferredDice: canonical.dice });
  if (f.warning && warnings) warnings.push(`${label} : ${f.warning}`);
  return f;
}

function emptyStats(input, warnings) {
  return {
    monsterType: input.monsterType,
    level: String(input.level),
    hp: { max: 10, value: 10 },
    saveDC: 10,
    sizeCategory: input.size,
    tokenSize: SIZE_TO_TOKEN_DIMENSIONS[input.size] ?? 1,
    armor: input.armor,
    damageBudget: 0,
    attacks: [],
    warnings
  };
}
