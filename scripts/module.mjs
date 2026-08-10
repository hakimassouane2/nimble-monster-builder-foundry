/**
 * Point d'entrée du module Nimble Monster Builder.
 * P0/P1 : bootstrap + API console. L'UI (ApplicationV2) arrive en P4.
 */

import { MODULE_ID } from "./data/constants.mjs";
import { deriveStats } from "./core/derive.mjs";
import { buildFormula, splitDamage, averageOfFormula } from "./core/formula.mjs";
import { STANDARD_TABLE } from "./data/standard-table.mjs";
import { LEGENDARY_TABLE } from "./data/legendary-table.mjs";
import { ROLE_PRESETS } from "./data/role-presets.mjs";
import {
  recipeToCreateData, createMonster, applyRecipe, scaleMonster, deriveResolved
} from "./core/builder.mjs";
import {
  defaultRecipe, recipeFromRole, normalizeRecipe, readRecipe, resolveLineOffsets
} from "./core/recipe.mjs";
import { EFFECT_TEMPLATES, TEMPLATE_ORDER, getTemplate, resolveAbilityOffsets } from "./data/effect-templates.mjs";
import { MonsterBuilderApp } from "./apps/monster-builder-app.mjs";
import { MONSTER_TYPES } from "./data/constants.mjs";
import { scalingRefs, scalingRefsForActor, scalingInputFromActor, scalingRefKeys } from "./core/scaling.mjs";
import { registerScalingRefs } from "./features/scaling-refs.mjs";
import { registerScalingEnricher, resolveScalingRef } from "./features/scaling-enricher.mjs";
import { registerScalingRollClicks, rollFromAnchor, clickToRollEnabled } from "./features/scaling-roll.mjs";
import {
  registerLevelScaling, computeScaledHp, scaledHpForLevel, scalingRefsEnabled
} from "./features/level-scaling.mjs";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);
  registerScalingEnricher();
  // Réglages et hook de document : aucune dépendance au système, et Foundry
  // attend que les settings soient déclarés dès l'init.
  registerLevelScaling();
  // Délégation sur document.body, à la manière des jets inline de Foundry :
  // posée une fois, elle couvre tout HTML enrichi présent ou à venir.
  registerScalingRollClicks();
});

// L'enveloppe doit être posée APRÈS que le système ait installé sa classe
// d'acteur (hook init du système), d'où setup plutôt que init.
Hooks.once("setup", () => {
  registerScalingRefs();
});

Hooks.once("ready", () => {
  // API exposée pour tests console et intégrations futures.
  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api = {
      // maths & données
      deriveStats,
      buildFormula,
      splitDamage,
      averageOfFormula,
      tables: { STANDARD_TABLE, LEGENDARY_TABLE, ROLE_PRESETS },
      // recette
      defaultRecipe,
      recipeFromRole,
      normalizeRecipe,
      readRecipe,
      resolveLineOffsets,
      // builder
      recipeToCreateData,
      createMonster,
      applyRecipe,
      scaleMonster,
      deriveResolved,
      // catalogue d'effets
      effects: { EFFECT_TEMPLATES, TEMPLATE_ORDER, getTemplate, resolveAbilityOffsets },
      // références de scaling (@strongDamage, @dc, @level...)
      scaling: {
        scalingRefs, scalingRefsForActor, scalingInputFromActor, scalingRefKeys,
        resolveScalingRef, computeScaledHp, scaledHpForLevel, scalingRefsEnabled,
        rollFromAnchor, clickToRollEnabled
      },
      // UI
      MonsterBuilderApp,
      open: (actor = null) => new MonsterBuilderApp({ actor }).render(true)
    };
  }
  console.log(`${MODULE_ID} | ready — API disponible via game.modules.get("${MODULE_ID}").api`);
});

/**
 * Bouton "Constructeur de monstre" dans la barre latérale des Acteurs → crée un
 * nouveau monstre.
 */
Hooks.on("renderActorDirectory", (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(`.${MODULE_ID}-create`)) return;

  const header = root.querySelector(".directory-header .header-actions")
    ?? root.querySelector(".directory-header .action-buttons")
    ?? root.querySelector(".directory-header")
    ?? root;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `${MODULE_ID}-create`;
  btn.innerHTML = `<i class="fa-solid fa-dragon"></i> ${game.i18n.localize("NMB.CreateMonster")}`;
  btn.addEventListener("click", () => new MonsterBuilderApp().render(true));
  header.appendChild(btn);
});

/**
 * Option de menu contextuel (clic droit sur un acteur) → ouvre le constructeur
 * pour CET acteur (édition / scale). Enregistré sous les deux noms de hook selon
 * la version de Foundry.
 */
function actorFromContextLi(li) {
  const el = li instanceof HTMLElement ? li : li?.[0];
  const id = el?.dataset?.entryId ?? el?.dataset?.documentId ?? el?.closest?.("[data-entry-id]")?.dataset?.entryId;
  return id ? game.actors.get(id) : null;
}

function addBuilderContextOption(options) {
  options.push({
    name: game.i18n.localize("NMB.OpenBuilder"),
    icon: '<i class="fa-solid fa-dragon"></i>',
    condition: (li) => {
      const actor = actorFromContextLi(li);
      return Boolean(actor && MONSTER_TYPES.includes(actor.type));
    },
    callback: (li) => {
      const actor = actorFromContextLi(li);
      if (actor) new MonsterBuilderApp({ actor }).render(true);
    }
  });
}

Hooks.on("getActorContextOptions", (dir, options) => addBuilderContextOption(options));
Hooks.on("getActorDirectoryEntryContext", (html, options) => addBuilderContextOption(options));
