/**
 * Constructeurs de nœuds pour l'arbre d'effets (activation.effects).
 * Réf. : markdowns/nimble-actor-reference.md §6.
 */

import { randomID } from "./ids.mjs";

/* ------------------------------- Feuilles ------------------------------- */

/** Feuille "les dégâts s'appliquent". */
export function damageOutcomeNode(parentNodeId, outcome = "fullDamage", parentContext = "hit") {
  return { id: randomID(), type: "damageOutcome", outcome, parentContext, parentNode: parentNodeId };
}

/** Nœud de condition (grappled, prone, poisoned...). */
export function conditionNode(condition, parentContext = null, parentNode = null) {
  return { id: randomID(), type: "condition", condition, parentContext, parentNode };
}

/** Nœud de note textuelle (flavor/reminder...). */
export function textNode(text, noteType = "reminder", parentContext = null, parentNode = null) {
  return { id: randomID(), type: "note", noteType, text, parentContext, parentNode };
}

/** Nœud de soin (rare pour les monstres). */
export function healingNode(formula, healingType = "healing", parentContext = null, parentNode = null) {
  return { id: randomID(), type: "healing", healingType, formula, parentContext, parentNode };
}

/* --------------------------- Nœuds de dégâts ---------------------------- */

/**
 * DamageNode complet avec sa feuille fullDamage sous on.hit (pattern obligatoire).
 * @param {object} opts
 * @param {string} opts.formula
 * @param {string} opts.damageType
 * @param {boolean} [opts.canCrit=true]
 * @param {boolean} [opts.canMiss=true]
 * @param {boolean} [opts.ignoreArmor]
 * @returns {object} DamageNode
 */
export function damageNode({ formula, damageType, canCrit = true, canMiss = true, ignoreArmor }) {
  const id = randomID();
  const node = {
    id, type: "damage", damageType, formula, canCrit, canMiss,
    parentContext: null, parentNode: null,
    on: { hit: [damageOutcomeNode(id, "fullDamage", "hit")] }
  };
  if (ignoreArmor) node.ignoreArmor = true;
  return node;
}

/**
 * SavingThrowNode. `on` reçoit failedSave/passedSave (nœuds déjà construits ; on
 * réaffecte leur parenté).
 */
export function savingThrowNode({ savingThrowType, saveDC, failedSave = [], passedSave = [], sharedRolls = [] }) {
  const id = randomID();
  const node = {
    id, type: "savingThrow", savingThrowType,
    parentContext: null, parentNode: null,
    sharedRolls,
    on: {
      failedSave: reparent(failedSave, id, "failedSave"),
      passedSave: reparent(passedSave, id, "passedSave")
    }
  };
  if (saveDC != null) node.saveDC = saveDC;
  return node;
}

/* ------------------------------- Assemblage ----------------------------- */

/** Réaffecte parentNode/parentContext d'un lot de nœuds (racine d'un sous-arbre). */
export function reparent(nodes, parentNodeId, parentContext) {
  return (nodes ?? []).map((n) => ({ ...n, parentNode: parentNodeId, parentContext }));
}

/**
 * Assemble le tableau activation.effects d'une attaque :
 *  - le DamageNode principal, enrichi des riders "hit"/"crit"/"miss" ;
 *  - les riders "automatic" (racine, à côté du damage) ;
 *  - les riders "root" (SavingThrowNode indépendants).
 * @param {object} dmg  DamageNode principal (issu de damageNode)
 * @param {{automatic?:object[], hit?:object[], crit?:object[], miss?:object[], root?:object[]}} riders
 * @returns {object[]}
 */
export function assembleEffects(dmg, riders = {}) {
  const { automatic = [], hit = [], crit = [], miss = [], root = [] } = riders;

  if (hit.length) dmg.on.hit.push(...reparent(hit, dmg.id, "hit"));
  if (crit.length) dmg.on.criticalHit = reparent(crit, dmg.id, "criticalHit");
  if (miss.length) dmg.on.miss = reparent(miss, dmg.id, "miss");

  return [
    dmg,
    ...automatic.map((n) => ({ ...n, parentContext: null, parentNode: null })),
    ...root
  ];
}
