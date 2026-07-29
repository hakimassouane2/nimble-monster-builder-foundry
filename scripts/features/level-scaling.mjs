/**
 * Recalcul des PV quand le niveau d'un monstre change.
 *
 * Les formules et le DD se résolvent au moment du jet, donc ils suivent le
 * niveau sans rien stocker. Les PV, eux, sont une valeur écrite dans l'acteur :
 * il faut les recalculer explicitement. C'est ce qui permet de rééquilibrer un
 * combat en cours d'un seul changement de niveau.
 *
 * Le ratio de PV courants est conservé : un monstre à 60 % de ses PV reste à
 * 60 % après le changement. Sans cela, monter le niveau d'un monstre entamé le
 * soignerait, et le descendre pourrait le tuer sur le coup.
 *
 * L'ajustement se fait dans `preUpdateActor`, en complétant le changeset plutôt
 * qu'en déclenchant une seconde mise à jour : un seul écrit, pas de clignotement
 * dans les barres de PV.
 */

import { MODULE_ID, MONSTER_TYPES } from "../data/constants.mjs";
import { computeScaledHp, scalingInputFromActor, scalingRefs } from "../core/scaling.mjs";

export { computeScaledHp };

export const RESCALE_HP_SETTING = "rescaleHpOnLevelChange";
export const SCALING_REFS_SETTING = "buildScalingMonsters";

/**
 * Le builder doit-il écrire des références plutôt que des valeurs figées ?
 * Lu à la création d'une recette ; l'utilisateur peut toujours forcer l'un ou
 * l'autre sur une recette précise via `useScalingRefs`.
 */
export function scalingRefsEnabled() {
  try {
    return game.settings.get(MODULE_ID, SCALING_REFS_SETTING) !== false;
  } catch {
    return true;
  }
}

/**
 * PV théoriques d'un acteur au niveau demandé, selon sa table, son armure et
 * les décalages de sa recette. `null` si le type ne se recalcule pas.
 */
export function scaledHpForLevel(actor, level) {
  // Un minion a toujours 1 PV : rien à recalculer.
  if (actor?.type === "minion") return null;

  const refs = scalingRefs({ ...scalingInputFromActor(actor), level });
  const hp = Number(refs?.hpByTable);

  return Number.isFinite(hp) && hp > 0 ? hp : null;
}

export function registerLevelScaling() {
  game.settings.register(MODULE_ID, SCALING_REFS_SETTING, {
    name: game.i18n.localize("NMB.Settings.scalingRefs.name"),
    hint: game.i18n.localize("NMB.Settings.scalingRefs.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, RESCALE_HP_SETTING, {
    name: game.i18n.localize("NMB.Settings.rescaleHp.name"),
    hint: game.i18n.localize("NMB.Settings.rescaleHp.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  Hooks.on("preUpdateActor", (actor, changes) => {
    if (!game.settings.get(MODULE_ID, RESCALE_HP_SETTING)) return;
    if (!MONSTER_TYPES.includes(actor?.type)) return;

    const newLevel = foundry.utils.getProperty(changes, "system.details.level");
    if (newLevel === undefined || newLevel === null) return;
    if (String(newLevel) === String(actor.system?.details?.level)) return;

    // Une modification manuelle des PV dans le même changeset l'emporte :
    // l'intention explicite prime sur le recalcul automatique.
    if (foundry.utils.getProperty(changes, "system.attributes.hp.max") !== undefined) return;

    let newMax;
    try {
      newMax = scaledHpForLevel(actor, newLevel);
    } catch (error) {
      console.error(`${MODULE_ID} | recalcul des PV impossible`, error);
      return;
    }
    if (newMax === null) return;

    const hp = actor.system?.attributes?.hp ?? {};
    const { max, value } = computeScaledHp({
      currentValue: hp.value,
      currentMax: hp.max,
      newMax
    });

    foundry.utils.setProperty(changes, "system.attributes.hp.max", max);
    foundry.utils.setProperty(changes, "system.attributes.hp.value", value);
  });
}
