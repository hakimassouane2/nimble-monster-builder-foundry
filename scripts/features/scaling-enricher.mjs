/**
 * Résolution des références de scaling dans le TEXTE des descriptions.
 *
 * La phase 1 couvre les champs de formule, que Nimble évalue avec le rollData de
 * l'acteur. Le texte libre d'une description, lui, ne passe par aucun évaluateur :
 * Foundry n'interpole jamais les « @refs » dans du HTML enrichi, seulement dans
 * les jets inline. On passe donc par un enricher, ce qui laisse la SOURCE
 * intacte : « @dc » reste « @dc » dans la donnée, et n'est remplacé qu'à
 * l'affichage. Une capacité de compendium reste ainsi réutilisable, et l'éditeur
 * de description ne risque jamais de figer une valeur résolue.
 *
 * Contexte : l'enricher lit d'abord `options.rollData` (déjà enrichi par la
 * phase 1), et retombe sur `options.relativeTo` pour remonter à l'acteur. Sans
 * ni l'un ni l'autre, il renonce et laisse le texte brut, ce qui est le
 * comportement voulu dans un compendium où la capacité n'appartient à personne.
 */

import { MODULE_ID, MONSTER_TYPES } from "../data/constants.mjs";
import { scalingRefKeys, scalingRefsForActor } from "../core/scaling.mjs";
import {
  isRollableFormula, rollOutcomeRules, clickToRollEnabled, ROLL_REF_CLASS
} from "./scaling-roll.mjs";

/** Retrouve l'acteur porteur depuis le document passé à enrichHTML. */
function resolveActor(relativeTo) {
  if (!relativeTo) return null;
  if (relativeTo.documentName === "Actor") return relativeTo;
  return relativeTo.actor ?? relativeTo.parent ?? null;
}

/** La capacité dont on enrichit la description, si le contexte en désigne une. */
function resolveItem(relativeTo) {
  return relativeTo?.documentName === "Item" ? relativeTo : null;
}

/**
 * Valeur d'une référence dans le contexte d'enrichissement courant.
 * @returns {string|number|undefined} undefined si le contexte ne permet pas de trancher.
 */
export function resolveScalingRef(key, options) {
  const fromRollData = options?.rollData?.[key];
  if (fromRollData !== undefined) return fromRollData;

  const actor = resolveActor(options?.relativeTo);
  if (!actor || !MONSTER_TYPES.includes(actor.type)) return undefined;

  try {
    return scalingRefsForActor(actor)[key];
  } catch (error) {
    console.error(`${MODULE_ID} | référence « @${key} » non résolue`, error);
    return undefined;
  }
}

/** Construit le motif « @clé » à partir des clés réellement produites. */
export function buildScalingPattern() {
  return new RegExp(`@(${scalingRefKeys().join("|")})\\b`, "g");
}

/** Rendu par défaut : la valeur résolue, avec la référence d'origine en infobulle. */
function plainRef(key, text) {
  const element = document.createElement("span");
  element.className = "nimble-scaling-ref";
  element.dataset.scalingRef = key;
  element.dataset.tooltip = `@${key}`;
  element.textContent = text;
  return element;
}

/**
 * Rendu d'une référence de dégâts : une ancre qui lance la formule au clic.
 * Tout ce dont le jet a besoin est figé dans le dataset au moment de
 * l'enrichissement, seul instant où le contexte (acteur porteur, capacité) est
 * connu — au clic, l'élément n'est plus qu'un nœud du DOM.
 */
function rollableRef(key, text, options) {
  const actor = resolveActor(options?.relativeTo);
  const item = resolveItem(options?.relativeTo);
  const { canCrit, canMiss } = rollOutcomeRules(actor, item);

  const element = document.createElement("a");
  element.className = `nimble-scaling-ref ${ROLL_REF_CLASS}`;
  element.dataset.scalingRef = key;
  element.dataset.formula = text;
  element.dataset.canCrit = String(canCrit);
  element.dataset.canMiss = String(canMiss);
  if (actor?.uuid) element.dataset.actorUuid = actor.uuid;
  element.dataset.label = item?.name ? `${item.name} (@${key})` : `@${key}`;
  element.dataset.tooltip = game.i18n.format("NMB.ScalingRoll.tooltip", { formula: text, key });

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-dice-d20";
  icon.inert = true;
  element.append(icon, text);
  return element;
}

function enrichScalingRef(match, options) {
  const key = match[1];
  const value = resolveScalingRef(key, options);

  // Renoncer rend le texte d'origine : mieux vaut afficher « @dc » qu'un trou.
  if (value === undefined || value === null) return null;

  // Réglage décoché : la formule redevient du texte simple. Le listener relit
  // lui aussi le réglage, ce qui neutralise les fiches déjà rendues.
  const text = String(value);
  return isRollableFormula(text) && clickToRollEnabled()
    ? rollableRef(key, text, options)
    : plainRef(key, text);
}

export function registerScalingEnricher() {
  CONFIG.TextEditor.enrichers.push({
    pattern: buildScalingPattern(),
    enricher: enrichScalingRef
  });
}
