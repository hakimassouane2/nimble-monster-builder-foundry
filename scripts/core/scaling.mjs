/**
 * Références de scaling résolues À LA VOLÉE.
 *
 * Le builder (recipe + applyRecipe) fige des valeurs dans les items au moment de
 * la génération. Ce module fait l'inverse : il expose les valeurs de table dans
 * le rollData de l'acteur, pour qu'une capacité écrite « @strongDamage » ou
 * « @dc » se résolve AU MOMENT DU JET, selon le niveau courant du monstre.
 *
 * Conséquence recherchée : une capacité de compendium n'est plus liée à un
 * niveau. On la colle sur n'importe quel monstre, on change le niveau en plein
 * combat, et tous les jets suivent sans qu'aucun item soit retouché.
 *
 * Source des données : l'ACTEUR (system.details.level, system.attributes.armor),
 * jamais la recette. Un monstre importé ou construit à la main, sans recette,
 * bénéficie donc des mêmes références. La recette n'est consultée que pour le
 * choix du dé thématique.
 */

import { MODULE_ID, FLAGS, ARMOR_HP_COLUMN } from "../data/constants.mjs";
import { STANDARD_TABLE, standardRowByLevel, standardRowByOrder } from "../data/standard-table.mjs";
import { LEGENDARY_TABLE, legendaryRowByLevel } from "../data/legendary-table.mjs";
import { suggestedMinionDie } from "../data/minion-dice.mjs";
import { resolveLineOffsets } from "./recipe.mjs";
import { realizeFormula, buildFormula, averageOfFormula } from "./formula.mjs";

/** Décalages de ligne exposés de part et d'autre de la ligne courante. */
const OFFSETS = [1, 2, 3];

/** Échelle des dés de minion, pour les décalages de palier. */
const MINION_DIE_LADDER = [4, 6, 8, 10, 12, 20];

/** Valeur numérique d'une clé de niveau ("1/4" -> 0.25). */
export function levelToNumber(level) {
  const raw = String(level ?? "1").trim();
  const fraction = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator ? Number(fraction[1]) / denominator : 1;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 1;
}

/* ------------------------------------------------------------------ */
/*                        Partie PURE (testable)                       */
/* ------------------------------------------------------------------ */

/**
 * Calcule le jeu de références pour un monstre décrit par ses seules
 * caractéristiques. Aucune dépendance à Foundry : testable hors VTT.
 *
 * @param {object} input
 * @param {"npc"|"minion"|"soloMonster"} input.monsterType
 * @param {string} input.level      Clé de niveau (fractions incluses pour npc/minion).
 * @param {"none"|"medium"|"heavy"} [input.armor="none"]
 * @param {number} [input.dieSize]  Dé thématique. Absent = dé natif de la table.
 * @param {number} [input.hpMax]    PV max réels de l'acteur, s'ils sont connus.
 * @returns {Record<string, string|number>} clés destinées au rollData.
 */
export function scalingRefs(input) {
  const monsterType = input?.monsterType ?? "npc";
  switch (monsterType) {
    case "minion": return minionRefs(input);
    case "soloMonster": return legendaryRefs(input);
    default: return standardRefs(input);
  }
}

/* ------------------------------- NPC -------------------------------- */

function standardRefs(input) {
  const row = standardRowByLevel(input.level) ?? standardRowByLevel("1");
  const armor = ARMOR_HP_COLUMN[input.armor] ? input.armor : "none";
  const dieSize = Number(input.dieSize) || row.strong.die;

  // Les décalages de ligne du builder (rôle, coût des capacités) font partie de
  // l'identité du monstre : une brute à +2 lignes de dégâts DOIT voir
  // @strongDamage donner sa vraie ligne, pas celle de son niveau nominal.
  const dmgRow = standardRowByOrder(row.order + (Number(input.dmgLineOffset) || 0));
  const hpRow = standardRowByOrder(row.order + (Number(input.hpLineOffset) || 0));

  // Le dé natif de la table est le d8 : à dieSize === 8 les formules sortent
  // EXACTEMENT comme imprimées dans le Guide du Maître, bonus compris.
  const strong = realizeFormula(dmgRow.strong, dieSize);
  const weak = dmgRow.weak ? realizeFormula(dmgRow.weak, dieSize) : strong;

  const refs = {
    ...commonRefs(row.saveDC, input),
    level: levelToNumber(row.level),
    levelLabel: row.level,
    levelOrder: row.order,
    armor,
    dieSize,
    hpByTable: hpRow[ARMOR_HP_COLUMN[armor]],
    damageBudget: dmgRow.damage,

    strongDamage: strong.formula,
    strongDamageAvg: strong.average,
    weakDamage: weak.formula,
    weakDamageAvg: weak.average
  };

  // Décalages supplémentaires, relatifs à la ligne de dégâts déjà retenue :
  // une capacité « gros coup » tape à @strongDamagePlus2.
  for (const offset of OFFSETS) {
    for (const direction of [1, -1]) {
      const shifted = standardRowByOrder(dmgRow.order + offset * direction);
      const suffix = `${direction > 0 ? "Plus" : "Minus"}${offset}`;
      const s = realizeFormula(shifted.strong, dieSize);
      const w = shifted.weak ? realizeFormula(shifted.weak, dieSize) : s;
      refs[`strongDamage${suffix}`] = s.formula;
      refs[`strongDamage${suffix}Avg`] = s.average;
      refs[`weakDamage${suffix}`] = w.formula;
      refs[`weakDamage${suffix}Avg`] = w.average;
    }
  }

  return refs;
}

/* ------------------------------ Minion ------------------------------ */

function minionRefs(input) {
  const row = standardRowByLevel(input.level) ?? standardRowByLevel("1");
  const level = levelToNumber(row.level);
  const dieSize = Number(input.dieSize) || suggestedMinionDie(level);
  const attack = buildFormula({ target: 0, dieSize, preferredDice: 1, noBonus: true });

  const refs = {
    ...commonRefs(row.saveDC, input),
    level,
    levelLabel: row.level,
    levelOrder: row.order,
    armor: ARMOR_HP_COLUMN[input.armor] ? input.armor : "none",
    dieSize,
    hpByTable: 1,
    damageBudget: attack.average,

    attackDamage: attack.formula,
    attackDamageAvg: attack.average,
    // Alias : une capacité générique écrite pour un npc reste utilisable telle
    // quelle sur un minion, elle tape simplement avec le dé de minion.
    strongDamage: attack.formula,
    strongDamageAvg: attack.average,
    weakDamage: attack.formula,
    weakDamageAvg: attack.average
  };

  // Décalages : on monte ou descend d'un palier dans l'échelle des dés.
  const index = MINION_DIE_LADDER.indexOf(dieSize);
  for (const offset of OFFSETS) {
    for (const direction of [1, -1]) {
      const suffix = `${direction > 0 ? "Plus" : "Minus"}${offset}`;
      const target = index < 0 ? dieSize : MINION_DIE_LADDER[
        Math.max(0, Math.min(MINION_DIE_LADDER.length - 1, index + offset * direction))
      ];
      const f = buildFormula({ target: 0, dieSize: target, preferredDice: 1, noBonus: true });
      for (const key of ["attackDamage", "strongDamage", "weakDamage"]) {
        refs[`${key}${suffix}`] = f.formula;
        refs[`${key}${suffix}Avg`] = f.average;
      }
    }
  }

  return refs;
}

/* ---------------------------- Légendaire ---------------------------- */

function legendaryRefs(input) {
  const level = Math.max(1, Math.min(20, Math.round(levelToNumber(input.level))));
  const row = legendaryRowByLevel(level) ?? LEGENDARY_TABLE[0];
  const dieSize = Number(input.dieSize) || 8;

  // Même principe que la table standard : les décalages du builder décident de
  // la ligne réellement utilisée pour les PV et pour les dégâts.
  const hpRow = legendaryRowAt(row.level - 1 + (Number(input.hpLineOffset) || 0));
  const dmgRow = legendaryRowAt(row.level - 1 + (Number(input.dmgLineOffset) || 0));

  const small = legendaryFormula(dmgRow.smallDamage, dieSize);
  const big = legendaryFormula(dmgRow.bigDamage, dieSize);

  const refs = {
    ...commonRefs(row.saveDC, input),
    level: row.level,
    levelLabel: String(row.level),
    levelOrder: row.level - 1,
    armor: ARMOR_HP_COLUMN[input.armor] ? input.armor : "medium",
    dieSize,
    hpByTable: legendaryHp(hpRow, input.armor),
    lastStandHp: row.lastStandHp,
    damageBudget: dmgRow.smallDamage + dmgRow.bigDamage,

    smallDamage: small.formula,
    smallDamageAvg: small.average,
    bigDamage: big.formula,
    bigDamageAvg: big.average,
    // Alias vers la nomenclature commune : petite = faible, grosse = forte.
    weakDamage: small.formula,
    weakDamageAvg: small.average,
    strongDamage: big.formula,
    strongDamageAvg: big.average
  };

  for (const offset of OFFSETS) {
    for (const direction of [1, -1]) {
      const suffix = `${direction > 0 ? "Plus" : "Minus"}${offset}`;
      const shifted = legendaryRowAt(dmgRow.level - 1 + offset * direction);
      const s = legendaryFormula(shifted.smallDamage, dieSize);
      const b = legendaryFormula(shifted.bigDamage, dieSize);
      refs[`smallDamage${suffix}`] = s.formula;
      refs[`smallDamage${suffix}Avg`] = s.average;
      refs[`weakDamage${suffix}`] = s.formula;
      refs[`weakDamage${suffix}Avg`] = s.average;
      refs[`bigDamage${suffix}`] = b.formula;
      refs[`bigDamage${suffix}Avg`] = b.average;
      refs[`strongDamage${suffix}`] = b.formula;
      refs[`strongDamage${suffix}Avg`] = b.average;
    }
  }

  return refs;
}

/** Ligne légendaire par index, bornée aux extrémités de la table. */
function legendaryRowAt(index) {
  return LEGENDARY_TABLE[Math.max(0, Math.min(LEGENDARY_TABLE.length - 1, index))];
}

function legendaryHp(row, armor) {
  if (armor === "heavy") return row.hpHeavy;
  if (armor === "none") return row.hpUnarmored;
  return row.hpMedium;
}

/** Les tables légendaires donnent un budget moyen, pas une formule imprimée. */
function legendaryFormula(target, dieSize) {
  return buildFormula({
    target,
    dieSize,
    preferredDice: Math.max(1, Math.round(target / dieSize))
  });
}

/* ------------------------------ Communs ----------------------------- */

function commonRefs(saveDC, input) {
  const hpMax = Number(input?.hpMax);
  return {
    dc: saveDC,
    saveDC,
    dcEasy: saveDC - 2,
    dcHard: saveDC + 2,
    ...(Number.isFinite(hpMax) ? { hpMax } : {})
  };
}

/* ------------------------------------------------------------------ */
/*                        Lecture depuis l'acteur                      */
/* ------------------------------------------------------------------ */

/**
 * Extrait de l'acteur les entrées nécessaires au calcul. Tolérant : un monstre
 * sans recette et sans armure renseignée retombe sur les défauts de la table.
 */
export function scalingInputFromActor(actor) {
  const system = actor?.system ?? {};
  const recipe = actor?.getFlag?.(MODULE_ID, FLAGS.RECIPE) ?? null;
  const flagDie = Number(actor?.getFlag?.(MODULE_ID, "dieSize")) || 0;
  const offsets = resolveLineOffsets(recipe);

  return {
    monsterType: actor?.type ?? "npc",
    level: system.details?.level ?? "1",
    armor: system.attributes?.armor ?? "none",
    // Priorité au dé posé à la main sur l'acteur, puis à celui de la recette.
    dieSize: flagDie || Number(recipe?.dieSize) || 0,
    // Décalages issus du rôle, de l'ajustement manuel ET du coût des capacités,
    // combinés exactement comme le fait `deriveResolved` du builder : le coût
    // des capacités n'est pas stocké dans la recette, il se recalcule depuis la
    // liste d'abilities. Sans cette addition, une capacité payée en dégâts
    // serait gratuite au jet. Nuls pour un monstre sans recette, qui suit alors
    // sa ligne de niveau.
    hpLineOffset: offsets.hpLineOffset,
    dmgLineOffset: offsets.dmgLineOffset,
    hpMax: system.attributes?.hp?.max
  };
}

/** Références de scaling d'un acteur Foundry. */
export function scalingRefsForActor(actor) {
  return scalingRefs(scalingInputFromActor(actor));
}

/**
 * PV cibles après un changement de niveau, à ratio constant : un monstre à 60 %
 * de ses PV le reste. Sans cela, monter le niveau d'un monstre entamé le
 * soignerait, et le descendre pourrait le tuer sur le coup.
 *
 * @param {object} args
 * @param {number} args.currentValue PV actuels.
 * @param {number} args.currentMax   PV max avant changement.
 * @param {number} args.newMax       PV max après changement.
 * @returns {{max:number, value:number}}
 */
export function computeScaledHp({ currentValue, currentMax, newMax }) {
  const max = Math.max(1, Math.round(Number(newMax) || 1));
  const oldMax = Number(currentMax) || 0;
  const oldValue = Number(currentValue) || 0;

  // Sans ancien maximum exploitable, il n'y a pas de ratio à conserver : on
  // remplit, ce qui est le comportement attendu d'un monstre neuf.
  if (oldMax <= 0) return { max, value: max };

  // Un monstre déjà à zéro le reste : il est mort, le remonter serait pire
  // qu'un arrondi malheureux.
  if (oldValue <= 0) return { max, value: 0 };

  const ratio = oldValue / oldMax;
  // Au moins 1 PV : un survivant ne doit pas mourir d'un simple ajustement.
  const value = Math.min(max, Math.max(1, Math.round(ratio * max)));

  return { max, value };
}

/**
 * Toutes les clés susceptibles d'apparaître, tous types de monstres confondus.
 * Calculée depuis les vraies sorties pour rester synchronisée automatiquement :
 * ajouter une référence suffit à la rendre reconnaissable dans les descriptions.
 *
 * Triée par longueur décroissante, pour qu'une alternance de regex teste
 * « @strongDamagePlus1Avg » avant « @strongDamage ».
 *
 * @returns {string[]}
 */
export function scalingRefKeys() {
  const keys = new Set();
  for (const monsterType of ["npc", "minion", "soloMonster"]) {
    for (const key of Object.keys(scalingRefs({ monsterType, level: "1" }))) keys.add(key);
  }
  return [...keys].sort((a, b) => b.length - a.length || a.localeCompare(b));
}
