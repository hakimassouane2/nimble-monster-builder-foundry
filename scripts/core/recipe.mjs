/**
 * La "recette" de construction stockée sur l'acteur (flags[MODULE_ID].recipe).
 * Une recette décrit TOUT ce qu'il faut pour (re)générer un monstre à n'importe
 * quel niveau. C'est la source de vérité du scaling re-dérivé.
 */

import { MODULE_ID, FLAGS } from "../data/constants.mjs";
import { STANDARD_TABLE, standardRowByLevel } from "../data/standard-table.mjs";
import { LEGENDARY_TABLE } from "../data/legendary-table.mjs";
import { rolePreset } from "../data/role-presets.mjs";
import { suggestedMinionDie } from "../data/minion-dice.mjs";
import { resolveAbilityOffsets } from "../data/effect-templates.mjs";

export const RECIPE_SCHEMA_VERSION = 1;

/** Amplitude maximale d'un ajustement manuel, en lignes de table. */
export const MAX_MANUAL_ADJUST = 5;

/** Recette par défaut (npc niveau 1, normal). */
export function defaultRecipe(overrides = {}) {
  return {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    monsterType: "npc",         // npc | minion | soloMonster
    name: "Nouveau monstre",
    img: null,
    level: "1",                 // clé table standard (npc/minion) ou niveau de groupe (solo)
    armor: "none",              // none | medium | heavy
    size: "medium",
    dieSize: 8,
    attackMode: "weakStrong",   // weakStrong | single | multi
    attackCount: 2,             // utilisé si attackMode === "multi"
    role: "normal",
    creatureType: "",
    isFlunky: false,            // npc uniquement
    legendaryActions: true,     // soloMonster : inclure les 4 actions légendaires optionnelles
    damageType: "bludgeoning",  // type de dégâts des attaques générées
    attackType: "",             // "" (mêlée reach1) | "reach" | "range"
    distance: 1,                // en cases
    abilities: [],              // [{ templateId, params, payWith }] — rempli en P3
    hpLineOffset: 0,            // décalage de lignes HP imposé par le rôle (mix & match)
    dmgLineOffset: 0,           // décalage de lignes dégâts imposé par le rôle
    // Ajustement MANUEL du MJ, indépendant du rôle et des capacités : il permet
    // de pré-payer du budget pour des capacités écrites à la main, sans changer
    // le niveau affiché du monstre. Survit au changement de rôle.
    hpAdjust: 0,
    dmgAdjust: 0,
    // true  : les items générés portent des références (@strongDamage, @dc) et
    //         suivent donc le niveau du monstre sans être régénérés ;
    // false : valeurs figées, le monstre reste lisible sans le module.
    useScalingRefs: true,
    ...overrides
  };
}

/**
 * Construit une recette à partir d'un rôle et d'un niveau, en appliquant les
 * défauts du preset (surchargeables ensuite par l'utilisateur).
 */
export function recipeFromRole(roleId, overrides = {}) {
  const preset = rolePreset(roleId);
  const base = defaultRecipe({
    role: preset.id,
    dieSize: preset.dieSize,
    attackCount: preset.attackCount,
    hpLineOffset: preset.hpLineOffset,
    dmgLineOffset: preset.dmgLineOffset,
    ...(preset.armor ? { armor: preset.armor } : {})
  });
  // Les abilities du preset seront matérialisées en P3 ; on garde la trace des ids.
  base.abilities = preset.abilities.map((templateId) => ({ templateId, params: {}, payWith: "dmg" }));
  return { ...base, ...overrides };
}

/** Normalise/complète une recette partielle (migration douce). */
export function normalizeRecipe(partial) {
  const r = defaultRecipe(partial ?? {});
  // dieSize : 0/absent = "auto". Pour un minion, on résout selon le niveau ;
  // sinon on retombe sur d8.
  r.dieSize = Number(r.dieSize) || (r.monsterType === "minion" ? suggestedMinionDie(r.level) : 8);
  if (!["weakStrong", "single", "multi"].includes(r.attackMode)) r.attackMode = "weakStrong";
  r.attackCount = Math.max(1, Math.round(Number(r.attackCount) || 1));
  r.hpLineOffset = Math.round(Number(r.hpLineOffset) || 0);
  r.dmgLineOffset = Math.round(Number(r.dmgLineOffset) || 0);
  r.hpAdjust = clampAdjust(r.hpAdjust);
  r.dmgAdjust = clampAdjust(r.dmgAdjust);
  r.distance = Math.max(1, Math.round(Number(r.distance) || 1));
  if (r.monsterType === "minion") r.isFlunky = false; // pas de flunky sur minion
  if (r.monsterType === "soloMonster") r.isFlunky = false;
  r.legendaryActions = r.legendaryActions !== false;
  r.useScalingRefs = r.useScalingRefs !== false;
  if (!Array.isArray(r.abilities)) r.abilities = [];
  return r;
}

/** Ajustement manuel : entier borné à ±MAX_MANUAL_ADJUST lignes. */
function clampAdjust(value) {
  const n = Math.round(Number(value) || 0);
  return Math.max(-MAX_MANUAL_ADJUST, Math.min(MAX_MANUAL_ADJUST, n));
}

/* --------------------------- Offsets de lignes -------------------------- */

/**
 * Somme des trois sources de décalage de lignes : le rôle (preset), l'ajustement
 * manuel du MJ, et le coût des capacités. Point d'entrée unique — tout ce qui
 * dérive des stats doit passer par là, sinon une source serait oubliée.
 *
 * Tolérant aux recettes brutes (non normalisées) lues depuis les flags.
 *
 * @param {object|null} recipe
 * @returns {{hpLineOffset:number, dmgLineOffset:number, levelBump:number,
 *            parts:{role:{hp:number,dmg:number}, manual:{hp:number,dmg:number},
 *                   abilities:{hp:number,dmg:number}}}}
 */
export function resolveLineOffsets(recipe) {
  const ability = recipe
    ? resolveAbilityOffsets(recipe)
    : { hpDelta: 0, dmgDelta: 0, levelBump: 0 };
  const role = {
    hp: Math.round(Number(recipe?.hpLineOffset) || 0),
    dmg: Math.round(Number(recipe?.dmgLineOffset) || 0)
  };
  const manual = {
    hp: clampAdjust(recipe?.hpAdjust),
    dmg: clampAdjust(recipe?.dmgAdjust)
  };
  return {
    hpLineOffset: role.hp + manual.hp + ability.hpDelta,
    dmgLineOffset: role.dmg + manual.dmg + ability.dmgDelta,
    levelBump: ability.levelBump,
    parts: { role, manual, abilities: { hp: ability.hpDelta, dmg: ability.dmgDelta } }
  };
}

/* ------------------------ Lecture / écriture flags ---------------------- */

export function readRecipe(actor) {
  const raw = actor?.getFlag?.(MODULE_ID, FLAGS.RECIPE);
  return raw ? normalizeRecipe(raw) : null;
}

/** Objet flags à insérer dans un update/create d'acteur. */
export function recipeFlagData(recipe) {
  return { [MODULE_ID]: { [FLAGS.RECIPE]: normalizeRecipe(recipe) } };
}

/* ---------------------------- Scale de niveau --------------------------- */

/**
 * Calcule le nouveau niveau après un décalage `delta`.
 * - npc / minion : on se déplace dans l'ORDRE de la table standard (fractions incluses).
 * - soloMonster  : niveau entier 1..20.
 * @returns {string} nouveau niveau, ou l'actuel si aux bornes.
 */
export function scaledLevel(recipe, delta) {
  const d = Math.round(delta);
  if (recipe.monsterType === "soloMonster") {
    const cur = Math.max(1, Math.min(20, Number(recipe.level) || 1));
    return String(Math.max(1, Math.min(20, cur + d)));
  }
  const row = standardRowByLevel(recipe.level);
  const curOrder = row ? row.order : 3;
  const next = Math.max(0, Math.min(STANDARD_TABLE.length - 1, curOrder + d));
  return STANDARD_TABLE[next].level;
}

/** Le scale est-il possible dans cette direction (pas déjà à une borne) ? */
export function canScale(recipe, delta) {
  return scaledLevel(recipe, delta) !== String(recipe.level);
}
