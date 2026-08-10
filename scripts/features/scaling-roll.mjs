/**
 * Jet de dés au clic sur une référence de dégâts résolue.
 *
 * L'enricher remplace « @strongDamage » par la formule du monstre courant, mais
 * le résultat n'était qu'un texte : pour jouer l'attaque décrite dans une
 * description, le MJ devait retaper « /r 2d10+3 » à la main. On rend donc la
 * formule cliquable, et on la joue avec les MÊMES règles que l'activation de la
 * capacité (classe `DamageRoll` du système, critique et échec du dé principal),
 * pour qu'un clic et un lancement depuis la fiche ne puissent pas diverger.
 *
 * Le clic est capté par délégation sur `document.body`, comme le fait Foundry
 * pour ses propres jets inline : le HTML enrichi est reconstruit à chaque rendu
 * de fiche ou de carte de chat, un listener posé sur l'élément ne survivrait
 * pas au re-rendu.
 */

import { MODULE_ID } from "../data/constants.mjs";

export const CLICK_TO_ROLL_SETTING = "clickToRollScalingRefs";

/** Classe CSS portée par une référence jouable. */
export const ROLL_REF_CLASS = "nimble-scaling-ref--roll";

/** Le clic-pour-lancer est-il actif ? */
export function clickToRollEnabled() {
  try {
    return game.settings.get(MODULE_ID, CLICK_TO_ROLL_SETTING) !== false;
  } catch {
    return true;
  }
}

/**
 * Une référence résolue est jouable si elle contient au moins un terme de dés.
 * Les moyennes (`@strongDamageAvg`), le DD ou le niveau sont des nombres : ils
 * restent du texte, cliquer dessus n'aurait aucun sens.
 */
export function isRollableFormula(value) {
  return typeof value === "string" && /\d*d\d+/i.test(value);
}

/**
 * Classe de jet de dégâts du système. Le bundle du système est minifié mais
 * restaure les noms de classes à l'exécution ; on garde tout de même un repli
 * par signature de prototype, puis sur `Roll`, pour qu'une version future qui
 * renommerait la classe dégrade le clic au lieu de le casser.
 */
export function damageRollClass() {
  const rolls = CONFIG.Dice?.rolls ?? [];
  return rolls.find((cls) => cls?.name === "DamageRoll")
    ?? rolls.find((cls) => typeof cls?.prototype?.updatePrimaryTerm === "function")
    ?? Roll;
}

/**
 * Règles de critique et d'échec, alignées sur `ItemActivationManager` :
 * un minion ne peut pas critiquer mais peut rater, une capacité de zone ne fait
 * ni l'un ni l'autre (le jet est partagé entre toutes les cibles).
 *
 * @param {Actor|null} actor
 * @param {Item|null} item Capacité porteuse, si la référence est enrichie dans sa description.
 */
export function rollOutcomeRules(actor, item) {
  const isAoE = Boolean(item?.system?.activation?.template?.shape);
  if (isAoE) return { canCrit: false, canMiss: false };

  const isMinion = actor?.type === "minion" || Boolean(actor?.tags?.has?.("minion"));
  const isFlunky = Boolean(actor?.system?.details?.isFlunky);

  return { canCrit: !(isMinion || isFlunky), canMiss: true };
}

/** Interlocuteur du message : le token posé sur la scène si le monstre en a un. */
function speakerFor(actor) {
  const ChatMessageCls = foundry.utils.getDocumentClass("ChatMessage");
  if (!actor) return ChatMessageCls.getSpeaker();

  const token = actor.getActiveTokens?.(false, true)?.[0] ?? actor.token ?? null;
  return ChatMessageCls.getSpeaker({ actor, token, scene: token?.parent ?? null });
}

/**
 * Complète le flavor du message par l'issue du dé principal. La carte de dés
 * standard de Foundry n'affiche ni critique ni échec : sans cette mention, un
 * total gonflé par une explosion serait illisible.
 */
function outcomeSuffix(roll) {
  if (roll?.isCritical) return ` — ${game.i18n.localize("NMB.ScalingRoll.critical")}`;
  if (roll?.isMiss) return ` — ${game.i18n.localize("NMB.ScalingRoll.miss")}`;
  return "";
}

/**
 * Joue la formule portée par une ancre enrichie et poste le résultat au chat.
 *
 * @param {HTMLElement} anchor Élément `.nimble-scaling-ref--roll`.
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollFromAnchor(anchor) {
  const formula = anchor?.dataset?.formula;
  if (!formula) return null;

  const actor = anchor.dataset.actorUuid
    ? await fromUuid(anchor.dataset.actorUuid).catch(() => null)
    : null;

  const RollCls = damageRollClass();
  const canCrit = anchor.dataset.canCrit !== "false";
  const canMiss = anchor.dataset.canMiss !== "false";

  let roll;
  try {
    // `Roll` ignore simplement le troisième argument : le repli reste valide.
    roll = new RollCls(formula, actor?.getRollData?.() ?? {}, { canCrit, canMiss, rollMode: 0 });
    await roll.evaluate();
  } catch (error) {
    console.error(`${MODULE_ID} | jet « ${formula} » impossible`, error);
    ui.notifications?.error(game.i18n.format("NMB.ScalingRoll.failed", { formula }));
    return null;
  }

  const label = anchor.dataset.label || `@${anchor.dataset.scalingRef ?? ""}`;

  return roll.toMessage({
    flavor: `${label}${outcomeSuffix(roll)}`,
    speaker: speakerFor(actor)
  });
}

export function registerScalingRollClicks() {
  game.settings.register(MODULE_ID, CLICK_TO_ROLL_SETTING, {
    name: game.i18n.localize("NMB.Settings.clickToRoll.name"),
    hint: game.i18n.localize("NMB.Settings.clickToRoll.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  document.body.addEventListener("click", (event) => {
    const anchor = event.target?.closest?.(`.${ROLL_REF_CLASS}`);
    if (!anchor) return;

    // Le réglage est relu à chaque clic : le désactiver ne doit pas obliger à
    // recharger les fiches déjà rendues.
    if (!clickToRollEnabled()) return;

    event.preventDefault();
    event.stopPropagation();
    rollFromAnchor(anchor);
  });
}
