/**
 * Injection des références de scaling dans le rollData des monstres.
 *
 * Nimble évalue toutes les formules de dégâts et de soins via
 * `new DamageRoll(formula, actor.getRollData())` (ItemActivationManager). Il
 * suffit donc d'enrichir `getRollData` pour que « @strongDamage » écrit dans le
 * champ formule d'une capacité se résolve seul, au moment du jet.
 *
 * On enveloppe `NimbleBaseActor.prototype.getRollData` : les classes npc,
 * minion et soloMonster n'overrident pas cette méthode, elles héritent donc de
 * l'enveloppe. Le personnage joueur, lui, l'override et appelle `super`, mais le
 * garde sur `this.type` l'exclut de toute façon.
 */

import { MODULE_ID, MONSTER_TYPES } from "../data/constants.mjs";
import { scalingRefsForActor } from "../core/scaling.mjs";

const TARGET = "CONFIG.Actor.documentClass.prototype.getRollData";

/** Enveloppe partagée par les deux modes d'enregistrement. */
function withScalingRefs(wrapped, ...args) {
  const data = wrapped(...args) ?? {};
  if (!MONSTER_TYPES.includes(this.type)) return data;

  let refs;
  try {
    refs = scalingRefsForActor(this);
  } catch (error) {
    console.error(`${MODULE_ID} | échec du calcul des références de scaling`, error);
    return data;
  }

  // On ne remplace jamais une clé déjà fournie par le système : si Nimble
  // finit par exposer son propre « level », c'est le sien qui prime.
  for (const [key, value] of Object.entries(refs)) {
    if (data[key] === undefined) data[key] = value;
  }
  return data;
}

export function registerScalingRefs() {
  if (game.modules.get("lib-wrapper")?.active) {
    libWrapper.register(MODULE_ID, TARGET, withScalingRefs, "WRAPPER");
    return;
  }

  // Repli sans libWrapper : enveloppe manuelle, une seule fois.
  const proto = CONFIG.Actor?.documentClass?.prototype;
  if (!proto?.getRollData || proto.getRollData[`${MODULE_ID}-wrapped`]) return;

  const original = proto.getRollData;
  const wrapper = function (...args) {
    return withScalingRefs.call(this, original.bind(this), ...args);
  };
  wrapper[`${MODULE_ID}-wrapped`] = true;
  proto.getRollData = wrapper;
}
