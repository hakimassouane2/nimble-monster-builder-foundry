/**
 * Catalogue des gabarits d'effets cochables (P3).
 * Chaque gabarit sait se matérialiser selon son `kind` :
 *  - "rider"      : injecte des nœuds dans l'arbre d'effets d'une attaque (branch).
 *  - "action"     : produit un item monsterFeature d'action séparé.
 *  - "trait"      : produit un item monsterFeature passif (feature).
 *  - "resistance" : modifie system.attributes (résistances/immunités/vulnérabilités).
 *  - "targeting"  : modifie le ciblage des attaques (allonge/portée).
 *
 * `cost` = nombre de LIGNES que l'ability coûte (règle Nimble : chaque capacité
 * spéciale → -1 ligne de HP ou de dégâts, ou +1 niveau).
 */

import {
  conditionNode, textNode, damageNode, savingThrowNode, damageOutcomeNode
} from "../core/effect-tree.mjs";
import { CONDITIONS, SAVE_STATS, DAMAGE_TYPES, DIE_SIZES, DEFAULT_FEATURE_ICONS } from "./constants.mjs";
import { damageLabelFR } from "./labels.mjs";

const P = (params, key, def) => (params?.[key] ?? def);

/** Activation "action" standard (pour les items d'action séparés). */
function actionActivation(extra = {}) {
  return {
    acquireTargetsFromTemplate: false,
    cost: { details: "", quantity: 1, type: "none", isReaction: false },
    duration: { details: "", quantity: 1, type: "action" },
    effects: [],
    showDescription: true,
    targets: { count: 1, restrictions: "", attackType: "", distance: 1 },
    template: { shape: "", length: 1, width: 1, radius: 1 },
    ...extra
  };
}

/** @type {Record<string, object>} */
export const EFFECT_TEMPLATES = {
  /* ------------------------------ Riders ------------------------------- */

  push: {
    id: "push", labelKey: "NMB.Ability.push", category: "automatic",
    kind: "rider", branch: "automatic", cost: 1, defaultPayWith: "dmg",
    params: [{ key: "distance", type: "number", default: 2 }],
    buildNodes: (p) => [textNode(`La cible est repoussée de ${P(p, "distance", 2)} cases.`, "reminder")]
  },

  knockProne: {
    id: "knockProne", labelKey: "NMB.Ability.knockProne", category: "automatic",
    kind: "rider", branch: "automatic", cost: 1, defaultPayWith: "dmg",
    params: [],
    buildNodes: () => [conditionNode("prone")]
  },

  grapple: {
    id: "grapple", labelKey: "NMB.Ability.grapple", category: "hit",
    kind: "rider", branch: "hit", cost: 1, defaultPayWith: "dmg",
    params: [],
    buildNodes: () => [conditionNode("grappled")]
  },

  conditionOnHit: {
    id: "conditionOnHit", labelKey: "NMB.Ability.conditionOnHit", category: "hit",
    kind: "rider", branch: "hit", cost: 1, defaultPayWith: "dmg",
    params: [{ key: "condition", type: "select", default: "dazed", options: CONDITIONS }],
    buildNodes: (p) => [conditionNode(P(p, "condition", "dazed"))]
  },

  extraDamage: {
    id: "extraDamage", labelKey: "NMB.Ability.extraDamage", category: "onDamage",
    kind: "rider", branch: "hit", cost: 1, defaultPayWith: "dmg",
    params: [
      { key: "count", type: "number", default: 1 },
      { key: "die", type: "select", default: 6, options: DIE_SIZES },
      { key: "damageType", type: "select", default: "poison", options: DAMAGE_TYPES }
    ],
    buildNodes: (p) => [damageNode({
      formula: `${P(p, "count", 1)}d${P(p, "die", 6)}`,
      damageType: P(p, "damageType", "poison"),
      canCrit: false, canMiss: false
    })]
  },

  conditionOnCrit: {
    id: "conditionOnCrit", labelKey: "NMB.Ability.conditionOnCrit", category: "crit",
    kind: "rider", branch: "crit", cost: 1, defaultPayWith: "dmg",
    params: [{ key: "condition", type: "select", default: "stunned", options: CONDITIONS }],
    buildNodes: (p) => [conditionNode(P(p, "condition", "stunned"))]
  },

  missTaunt: {
    id: "missTaunt", labelKey: "NMB.Ability.missTaunt", category: "miss",
    kind: "rider", branch: "miss", cost: 0, defaultPayWith: "dmg",
    params: [{ key: "text", type: "text", default: "Le monstre ricane de votre échec." }],
    buildNodes: (p) => [textNode(P(p, "text", "Le monstre ricane de votre échec."), "flavor")]
  },

  saveOrCondition: {
    id: "saveOrCondition", labelKey: "NMB.Ability.saveOrCondition", category: "save",
    kind: "rider", branch: "root", cost: 1, defaultPayWith: "dmg",
    params: [
      { key: "save", type: "select", default: "strength", options: SAVE_STATS },
      { key: "condition", type: "select", default: "prone", options: CONDITIONS }
    ],
    buildNodes: (p, ctx) => [savingThrowNode({
      savingThrowType: P(p, "save", "strength"),
      saveDC: ctx.saveDC,
      failedSave: [conditionNode(P(p, "condition", "prone"))]
    })]
  },

  /* ------------------------------ Actions ------------------------------ */

  aoeCone: {
    id: "aoeCone", labelKey: "NMB.Ability.aoeCone", category: "action",
    kind: "action", cost: 1, defaultPayWith: "dmg",
    params: [
      { key: "length", type: "number", default: 3 },
      { key: "damageType", type: "select", default: "fire", options: DAMAGE_TYPES },
      { key: "save", type: "select", default: "dexterity", options: SAVE_STATS }
    ],
    buildItem: (recipe, p, stats, ctx) => {
      const dtype = P(p, "damageType", "fire");
      const save = P(p, "save", "dexterity");
      const length = P(p, "length", 3);
      const dmg = damageNode({ formula: ctx.strongFormula, damageType: dtype, canCrit: false, canMiss: false });
      const st = savingThrowNode({
        savingThrowType: save,
        // Via le contexte, comme les autres gabarits : `stats.saveDC` court-circuitait
        // la bascule référence/valeur figée.
        saveDC: ctx.saveDC,
        sharedRolls: [dmg],
        failedSave: [damageOutcomeNode(dmg.id, "fullDamage", "failedSave")],
        passedSave: [damageOutcomeNode(dmg.id, "halfDamage", "passedSave")]
      });
      return {
        name: "Souffle (cône).",
        icon: DEFAULT_FEATURE_ICONS.action,
        subtype: "action",
        description: `<p>Cône de ${length} cases. Save ${save} : échec = ${ctx.strongFormula} dégâts de ${damageLabelFR(dtype)}, réussite = moitié.</p>`,
        activation: actionActivation({
          acquireTargetsFromTemplate: true,
          effects: [st],
          template: { shape: "cone", length, width: 1, radius: 1 }
        })
      };
    }
  },

  summonMinion: {
    id: "summonMinion", labelKey: "NMB.Ability.summonMinion", category: "action",
    kind: "action", cost: 1, defaultPayWith: "dmg",
    params: [{ key: "count", type: "number", default: 1 }],
    buildItem: (recipe, p) => ({
      name: "Renforts.",
      icon: DEFAULT_FEATURE_ICONS.action,
      subtype: "action",
      description: `<p>Invoque ${P(p, "count", 1)} minion(s) sur le champ de bataille.</p>`,
      activation: actionActivation()
    })
  },

  rangedVariant: {
    id: "rangedVariant", labelKey: "NMB.Ability.rangedVariant", category: "action",
    kind: "action", cost: 0, defaultPayWith: "dmg",
    params: [{ key: "distance", type: "number", default: 8 }],
    buildItem: (recipe, p, stats, ctx) => {
      const dist = P(p, "distance", 8);
      const dmg = damageNode({ formula: ctx.strongFormula, damageType: recipe.damageType, canCrit: !(recipe.monsterType === "npc" && recipe.isFlunky) });
      return {
        name: "Attaque à distance.",
        icon: DEFAULT_FEATURE_ICONS.action,
        subtype: "action",
        description: `<p>Inflige <strong>${ctx.strongFormula}</strong> dégâts de ${damageLabelFR(recipe.damageType)} (Portée ${dist}).</p>`,
        activation: actionActivation({
          effects: [dmg],
          targets: { count: 1, restrictions: "", attackType: "range", distance: dist }
        })
      };
    }
  },

  /* ------------------------------- Traits ------------------------------ */

  meatShield: {
    id: "meatShield", labelKey: "NMB.Ability.meatShield", category: "trait",
    kind: "trait", cost: 1, defaultPayWith: "dmg",
    params: [],
    buildTrait: () => ({
      name: "Bouclier de chair.",
      icon: DEFAULT_FEATURE_ICONS.feature, subtype: "feature",
      description: "<p>Peut forcer un allié adjacent à s'Interposer à sa place.</p>"
    })
  },

  keenSenses: {
    id: "keenSenses", labelKey: "NMB.Ability.keenSenses", category: "trait",
    kind: "trait", cost: 0, defaultPayWith: "dmg",
    params: [],
    buildTrait: () => ({
      name: "Sens aiguisés.",
      icon: DEFAULT_FEATURE_ICONS.feature, subtype: "feature",
      description: "<p>Ne peut pas être surpris.</p>"
    })
  },

  onDeathBurst: {
    id: "onDeathBurst", labelKey: "NMB.Ability.onDeathBurst", category: "trait",
    kind: "trait", cost: 1, defaultPayWith: "dmg",
    params: [
      { key: "damageType", type: "select", default: "fire", options: DAMAGE_TYPES },
      { key: "distance", type: "number", default: 1 }
    ],
    buildTrait: (recipe, p) => ({
      name: "Explosion mortelle.",
      icon: DEFAULT_FEATURE_ICONS.feature, subtype: "feature",
      description: `<p>À sa mort, inflige des dégâts de ${damageLabelFR(P(p, "damageType", "fire"))} aux créatures à ${P(p, "distance", 1)} case(s).</p>`
    })
  },

  ambushNote: {
    id: "ambushNote", labelKey: "NMB.Ability.ambushNote", category: "trait",
    kind: "trait", cost: 0, defaultPayWith: "dmg",
    params: [],
    buildTrait: () => ({
      name: "Embuscade.",
      icon: DEFAULT_FEATURE_ICONS.feature, subtype: "feature",
      description: "<p>N'est pas visible au début du combat.</p>"
    })
  },

  /* ----------------------------- Défenses ------------------------------ */

  resistance: {
    id: "resistance", labelKey: "NMB.Ability.resistance", category: "defense",
    kind: "resistance", cost: 1, defaultPayWith: "dmg",
    params: [{ key: "damageType", type: "select", default: "fire", options: DAMAGE_TYPES }],
    applySystem: (system, p) => system.attributes.damageResistances.push(P(p, "damageType", "fire"))
  },

  immunity: {
    id: "immunity", labelKey: "NMB.Ability.immunity", category: "defense",
    kind: "resistance", cost: 1, defaultPayWith: "dmg",
    params: [{ key: "damageType", type: "select", default: "fire", options: DAMAGE_TYPES }],
    applySystem: (system, p) => system.attributes.damageImmunities.push(P(p, "damageType", "fire"))
  },

  vulnerability: {
    id: "vulnerability", labelKey: "NMB.Ability.vulnerability", category: "defense",
    kind: "resistance", cost: 0, defaultPayWith: "dmg",
    params: [{ key: "damageType", type: "select", default: "fire", options: DAMAGE_TYPES }],
    applySystem: (system, p) => system.attributes.damageVulnerabilities.push(P(p, "damageType", "fire"))
  },

  /* ------------------------------ Ciblage ------------------------------ */

  reach: {
    id: "reach", labelKey: "NMB.Ability.reach", category: "targeting",
    kind: "targeting", cost: 0, defaultPayWith: "dmg",
    params: [{ key: "distance", type: "number", default: 2 }],
    applyTargeting: (p) => ({ attackType: "reach", distance: P(p, "distance", 2) })
  }
};

/** Ordre d'affichage pour l'UI (P4). */
export const TEMPLATE_ORDER = [
  "push", "knockProne", "grapple", "conditionOnHit", "extraDamage",
  "conditionOnCrit", "missTaunt", "saveOrCondition",
  "aoeCone", "summonMinion", "rangedVariant",
  "meatShield", "keenSenses", "onDeathBurst", "ambushNote",
  "resistance", "immunity", "vulnerability", "reach"
];

export function getTemplate(id) {
  return EFFECT_TEMPLATES[id] ?? null;
}

/**
 * Coût cumulé des abilities, réparti selon payWith.
 * @returns {{hpDelta:number, dmgDelta:number, levelBump:number}} deltas de lignes.
 */
export function resolveAbilityOffsets(recipe) {
  let hpDelta = 0, dmgDelta = 0, levelBump = 0;
  for (const ab of recipe.abilities ?? []) {
    const t = getTemplate(ab.templateId);
    if (!t) continue;
    const cost = t.cost ?? 1;
    if (cost === 0) continue;
    const payWith = ab.payWith ?? t.defaultPayWith ?? "dmg";
    if (payWith === "hp") hpDelta -= cost;
    else if (payWith === "level") levelBump += cost;
    else dmgDelta -= cost;
  }
  return { hpDelta, dmgDelta, levelBump };
}
