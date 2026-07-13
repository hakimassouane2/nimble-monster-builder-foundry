/**
 * Presets de rôle : appliquent des DÉFAUTS surchargeables à la recette.
 * "normal" = neutre (aucun preset). Source : markdowns/designing-monsters.md.
 *
 * Chaque preset :
 *  - dieSize        : taille de dé thématique par défaut
 *  - attackCount    : nombre d'attaques par défaut
 *  - hpLineOffset   : décalage de lignes appliqué aux HP (mix & match)
 *  - dmgLineOffset  : décalage de lignes appliqué au budget de dégâts
 *  - armor          : armure par défaut (ou null = laisser le choix courant)
 *  - abilities      : ids de gabarits d'effets pré-cochés (cf. effect-templates.mjs)
 */

/** @typedef {{id:string, labelKey:string, dieSize:number, attackCount:number, hpLineOffset:number, dmgLineOffset:number, armor:(string|null), abilities:string[]}} RolePreset */

/** @type {Record<string, RolePreset>} */
export const ROLE_PRESETS = {
  normal:     { id: "normal",     labelKey: "NMB.Role.normal",     dieSize: 8,  attackCount: 1, hpLineOffset: 0,  dmgLineOffset: 0,  armor: null,     abilities: [] },
  melee:      { id: "melee",      labelKey: "NMB.Role.melee",      dieSize: 8,  attackCount: 1, hpLineOffset: 0,  dmgLineOffset: 0,  armor: "medium", abilities: ["reach"] },
  ranged:     { id: "ranged",     labelKey: "NMB.Role.ranged",     dieSize: 8,  attackCount: 1, hpLineOffset: 0,  dmgLineOffset: 0,  armor: "none",   abilities: ["rangedVariant"] },
  striker:    { id: "striker",    labelKey: "NMB.Role.striker",    dieSize: 10, attackCount: 1, hpLineOffset: -1, dmgLineOffset: 1,  armor: "none",   abilities: [] },
  defender:   { id: "defender",   labelKey: "NMB.Role.defender",   dieSize: 6,  attackCount: 1, hpLineOffset: 0,  dmgLineOffset: -1, armor: "heavy",  abilities: ["meatShield"] },
  controller: { id: "controller", labelKey: "NMB.Role.controller", dieSize: 6,  attackCount: 1, hpLineOffset: 0,  dmgLineOffset: -1, armor: "medium", abilities: ["saveOrCondition"] },
  support:    { id: "support",    labelKey: "NMB.Role.support",    dieSize: 6,  attackCount: 1, hpLineOffset: 0,  dmgLineOffset: -1, armor: "medium", abilities: ["summonMinion"] },
  aoe:        { id: "aoe",        labelKey: "NMB.Role.aoe",        dieSize: 6,  attackCount: 1, hpLineOffset: 0,  dmgLineOffset: 0,  armor: "none",   abilities: ["aoeCone"] },
  summoner:   { id: "summoner",   labelKey: "NMB.Role.summoner",   dieSize: 6,  attackCount: 1, hpLineOffset: 0,  dmgLineOffset: -1, armor: "medium", abilities: ["summonMinion"] },
  ambusher:   { id: "ambusher",   labelKey: "NMB.Role.ambusher",   dieSize: 8,  attackCount: 1, hpLineOffset: 0,  dmgLineOffset: 0,  armor: "none",   abilities: ["ambushNote"] }
};

/** Liste ordonnée des ids de rôles pour l'UI. */
export const ROLE_ORDER = [
  "normal", "melee", "ranged", "striker", "defender",
  "controller", "support", "aoe", "summoner", "ambusher"
];

export function rolePreset(id) {
  return ROLE_PRESETS[id] ?? ROLE_PRESETS.normal;
}
