/**
 * Builder : recette -> données d'acteur Nimble, et opérations Foundry
 * (création, application/régénération, scale).
 *
 * Séparation volontaire :
 *  - fonctions PURES (recipeToCreateData, buildGeneratedItems...) : testables en Node.
 *  - fonctions FOUNDRY (createMonster, applyRecipe, scaleMonster) : appellent l'API.
 */

import { MODULE_ID, FLAGS, DEFAULT_FEATURE_ICONS, ATTACK_ICONS, SAVE_STATS } from "../data/constants.mjs";
import { damageLabelFR, rangeSuffixFR, fmtAverage } from "../data/labels.mjs";
import { getTemplate, resolveAbilityOffsets } from "../data/effect-templates.mjs";
import { deriveStats } from "./derive.mjs";
import { damageNode, assembleEffects, savingThrowNode, conditionNode, textNode } from "./effect-tree.mjs";
import { buildStatblock } from "./statblock.mjs";
import { normalizeRecipe, recipeFlagData, scaledLevel } from "./recipe.mjs";
import { computeScaledHp } from "./scaling.mjs";
import { randomID } from "./ids.mjs";

const DEFAULT_IMG = "icons/svg/mystery-man.svg";

/* ============================ Parties PURES ============================= */

function defaultSavingThrows() {
  const out = {};
  for (const stat of SAVE_STATS) out[stat] = { bonus: 0, defaultRollMode: 0, mod: 0 };
  return out;
}

/**
 * Référence de dégâts correspondant à une attaque générée. Les clés du builder
 * (weak/strong, small/big, attack, attackN) sont traduites vers la nomenclature
 * commune des références, pour que le monstre suive son niveau tout seul.
 */
const ATTACK_KEY_TO_REF = {
  strong: "@strongDamage",
  big: "@strongDamage",
  weak: "@weakDamage",
  small: "@weakDamage"
};

function damageRefForAttack(recipe, attack) {
  if (recipe.monsterType === "minion") return "@attackDamage";
  if (ATTACK_KEY_TO_REF[attack.key]) return ATTACK_KEY_TO_REF[attack.key];
  // Mode "multi" : des attaques égales, toutes calées sur la colonne faible.
  if (/^attack\d+$/.test(attack.key)) return "@weakDamage";
  return "@strongDamage";
}

/** Formule à écrire dans un item : référence dynamique ou valeur figée. */
function damageValue(recipe, attack) {
  return recipe.useScalingRefs ? damageRefForAttack(recipe, attack) : attack.formula.formula;
}

/** Contexte partagé passé aux gabarits d'effets. */
function buildCtx(recipe, stats) {
  const find = (...keys) => stats.attacks.find((a) => keys.includes(a.key)) ?? stats.attacks[0];
  const strong = find("strong", "attack", "big");
  const weak = find("weak", "small");

  return {
    damageType: recipe.damageType,
    // Les gabarits lisent ces trois valeurs sans savoir si elles sont figées ou
    // dynamiques : la bascule se fait ici, une fois pour toutes.
    saveDC: recipe.useScalingRefs ? "@dc" : stats.saveDC,
    strongFormula: strong ? damageValue(recipe, strong) : undefined,
    weakFormula: weak ? damageValue(recipe, weak) : undefined,
    stats, recipe
  };
}

/** Attaque qui porte les effets "riders" (l'attaque utilitaire). */
function utilityAttackKey(stats) {
  for (const k of ["weak", "small", "attack", "attack1"]) {
    if (stats.attacks.some((a) => a.key === k)) return k;
  }
  return stats.attacks[0]?.key;
}

/**
 * Répartit les abilities de la recette en riders (par branche), items séparés
 * (actions/traits) et patch de ciblage.
 */
function collectAbilities(recipe, stats, ctx) {
  const riders = { automatic: [], hit: [], crit: [], miss: [], root: [] };
  const extra = [];
  let targeting = null;
  for (const ab of recipe.abilities ?? []) {
    const t = getTemplate(ab.templateId);
    if (!t) continue;
    const p = ab.params ?? {};
    if (t.kind === "rider") riders[t.branch].push(...(t.buildNodes(p, ctx) ?? []));
    else if (t.kind === "action") extra.push(t.buildItem(recipe, p, stats, ctx));
    else if (t.kind === "trait") extra.push(t.buildTrait(recipe, p, ctx));
    else if (t.kind === "targeting") targeting = { ...(targeting ?? {}), ...t.applyTargeting(p) };
    // "resistance" : traité dans computeResistances()
  }
  return { riders, extra, targeting };
}

/** Icône d'une attaque : grise (faible) ou rouge sang (forte). */
function attackIcon(recipe, attack) {
  if (recipe.monsterType === "minion") return ATTACK_ICONS.weak;
  if (["weak", "small"].includes(attack.key)) return ATTACK_ICONS.weak;
  if (["strong", "big", "attack"].includes(attack.key)) return ATTACK_ICONS.strong;
  return DEFAULT_FEATURE_ICONS.action;
}

/**
 * Description auto d'une attaque, mentionnant ses dégâts.
 * En mode référence la moyenne est omise : elle changerait à chaque niveau, et
 * l'enricher n'affiche que la formule résolue.
 */
function buildAttackDescription(recipe, attack, targeting) {
  const dmg = damageLabelFR(recipe.damageType);
  const attackType = targeting?.attackType ?? recipe.attackType;
  const distance = targeting?.distance ?? recipe.distance;
  const range = rangeSuffixFR(attackType, distance);

  if (recipe.useScalingRefs) {
    return `<p>Inflige <strong>${damageRefForAttack(recipe, attack)}</strong> dégâts ${dmg}${range}.</p>`;
  }

  const avg = fmtAverage(attack.formula.average);
  return `<p>Inflige <strong>${attack.formula.formula}</strong> (${avg}) dégâts ${dmg}${range}.</p>`;
}

/** Item monsterFeature d'action (attaque) tagué "généré". */
function buildActionItem(recipe, attack, { riders = null, targeting = null } = {}) {
  const canCrit = attack.canCrit !== false && !(recipe.monsterType === "npc" && recipe.isFlunky);
  const node = damageNode({
    formula: damageValue(recipe, attack),
    damageType: recipe.damageType,
    canCrit,
    canMiss: true
  });
  const effects = riders ? assembleEffects(node, riders) : [node];

  return {
    _id: randomID(),
    name: `${attack.label}.`,
    type: "monsterFeature",
    img: attackIcon(recipe, attack),
    system: {
      macro: "", identifier: "", rules: [],
      description: buildAttackDescription(recipe, attack, targeting),
      subtype: "action",
      parentItemId: "",
      lastStandHp: 0,
      activation: {
        acquireTargetsFromTemplate: false,
        cost: { details: "", quantity: 1, type: "none", isReaction: false },
        duration: { details: "", quantity: 1, type: "action" },
        effects,
        showDescription: true,
        targets: {
          count: 1, restrictions: "",
          attackType: targeting?.attackType ?? recipe.attackType ?? "",
          distance: targeting?.distance ?? recipe.distance ?? 1
        },
        template: { shape: "", length: 1, width: 1, radius: 1 }
      }
    },
    effects: [], folder: null, sort: 0,
    flags: { [MODULE_ID]: { [FLAGS.GENERATED]: true, [FLAGS.SLOT]: `attack:${attack.key}` } }
  };
}

/** Emballe un item d'ability (action/trait) en item monsterFeature tagué. */
function wrapExtraItem(partial, index) {
  return {
    _id: randomID(),
    name: partial.name,
    type: "monsterFeature",
    img: partial.icon ?? DEFAULT_FEATURE_ICONS.feature,
    system: {
      macro: "", identifier: "", rules: [],
      description: partial.description ?? "",
      subtype: partial.subtype ?? "feature",
      parentItemId: "",
      lastStandHp: 0,
      activation: partial.activation ?? emptyActivation()
    },
    effects: [], folder: null, sort: 10 + index,
    flags: { [MODULE_ID]: { [FLAGS.GENERATED]: true, [FLAGS.SLOT]: `ability:${index}` } }
  };
}

/** Résistances/immunités/vulnérabilités issues des abilities. */
function computeResistances(recipe) {
  const sys = { attributes: { damageResistances: [], damageVulnerabilities: [], damageImmunities: [] } };
  for (const ab of recipe.abilities ?? []) {
    const t = getTemplate(ab.templateId);
    if (t?.kind === "resistance") t.applySystem(sys, ab.params ?? {});
  }
  return sys.attributes;
}

/** Fabrique un item monsterFeature tagué "généré". */
function buildTaggedItem({ name, subtype, icon, description = "", activation, lastStandHp = 0, slot }) {
  return {
    _id: randomID(),
    name,
    type: "monsterFeature",
    img: icon ?? DEFAULT_FEATURE_ICONS[subtype] ?? DEFAULT_FEATURE_ICONS.feature,
    system: {
      macro: "", identifier: "", rules: [],
      description,
      subtype,
      parentItemId: "",
      lastStandHp,
      activation: activation ?? emptyActivation()
    },
    effects: [], folder: null, sort: 0,
    flags: { [MODULE_ID]: { [FLAGS.GENERATED]: true, [FLAGS.SLOT]: slot } }
  };
}

function emptyActivation() {
  return {
    acquireTargetsFromTemplate: false,
    cost: { details: "", quantity: 1, type: "none", isReaction: false },
    duration: { details: "", quantity: 1, type: "none" },
    effects: [],
    showDescription: true,
    targets: { count: 1, restrictions: "", attackType: "", distance: 1 },
    template: { shape: "", length: 1, width: 1, radius: 1 }
  };
}

/** Activation de type "action" (durée = action) avec ses effets. */
function actionActivation(effects = []) {
  const a = emptyActivation();
  a.duration = { details: "", quantity: 1, type: "action" };
  a.effects = effects;
  return a;
}

/** Item Last Stand (soloMonster). */
function buildLastStandItem(recipe, stats) {
  return buildTaggedItem({
    name: "Dernier sursaut.",
    subtype: "lastStand",
    icon: DEFAULT_FEATURE_ICONS.lastStand,
    description: `<p>En tombant à 0 PV, le monstre est soigné à ${stats.lastStandHp} PV et entre dans un dernier sursaut très dangereux (dure 2 à 4 tours).</p>`,
    lastStandHp: stats.lastStandHp ?? 0,
    slot: "lastStand"
  });
}

/** Item Ensanglanté (soloMonster) : capacité gagnée à 50% PV. */
function buildBloodiedItem(recipe, stats) {
  return buildTaggedItem({
    name: "Ensanglanté.",
    subtype: "bloodied",
    icon: DEFAULT_FEATURE_ICONS.bloodied,
    description: "<p>À 50% de ses PV, le monstre entre en rage : il peut utiliser sa <strong>Grosse attaque</strong> une fois de plus par round. (À adapter selon le thème du boss.)</p>",
    slot: "bloodied"
  });
}

/**
 * Actions légendaires optionnelles du GMG : le légendaire peut remplacer ses
 * attaques par l'une d'elles. Save DC pris dans la table.
 */
function buildLegendaryActions(recipe, stats) {
  // « DC @dc » dans le texte est résolu par l'enricher, et le même jeton dans le
  // nœud est résolu à l'activation : les deux restent d'accord à tout niveau.
  const dc = recipe.useScalingRefs ? "@dc" : stats.saveDC;
  return [
    buildTaggedItem({
      name: "Rugissement terrible.", subtype: "action", icon: DEFAULT_FEATURE_ICONS.action,
      description: `<p>Save Volonté (DC ${dc}) ou <strong>Effrayé</strong> pendant 1 tour.</p>`,
      activation: actionActivation([savingThrowNode({ savingThrowType: "will", saveDC: dc, failedSave: [conditionNode("frightened")] })]),
      slot: "legendary:roar"
    }),
    buildTaggedItem({
      name: "Poussée télékinétique.", subtype: "action", icon: DEFAULT_FEATURE_ICONS.action,
      description: `<p>Save Force (DC ${dc}) ou <strong>À terre</strong> et déplacé de 2 cases.</p>`,
      activation: actionActivation([savingThrowNode({
        savingThrowType: "strength", saveDC: dc,
        failedSave: [conditionNode("prone"), textNode("La cible est déplacée de 2 cases.")]
      })]),
      slot: "legendary:push"
    }),
    buildTaggedItem({
      name: "Jauger.", subtype: "action", icon: DEFAULT_FEATURE_ICONS.action,
      description: `<p>Save Dextérité (DC ${dc}) ou la prochaine attaque du monstre a l'avantage et ne peut pas être Interposée.</p>`,
      activation: actionActivation([savingThrowNode({
        savingThrowType: "dexterity", saveDC: dc,
        failedSave: [textNode("La prochaine attaque du monstre a l'avantage et ne peut pas être Interposée.")]
      })]),
      slot: "legendary:assess"
    }),
    buildTaggedItem({
      name: "Prise d'élan.", subtype: "action", icon: DEFAULT_FEATURE_ICONS.action,
      description: "<p>Le monstre récupère une capacité à usage unique, ou prépare une attaque dévastatrice pour le tour suivant.</p>",
      activation: actionActivation([textNode("Récupère une capacité à usage unique, ou prépare une attaque dévastatrice.", "general")]),
      slot: "legendary:windup"
    })
  ];
}

/** Tous les items générés par le builder pour cette recette. */
export function buildGeneratedItems(recipe, stats) {
  const ctx = buildCtx(recipe, stats);
  const { riders, extra, targeting } = collectAbilities(recipe, stats, ctx);
  const utilKey = utilityAttackKey(stats);

  const items = [];
  for (const a of stats.attacks ?? []) {
    const isUtil = a.key === utilKey;
    items.push(buildActionItem(recipe, a, { riders: isUtil ? riders : null, targeting }));
  }
  extra.forEach((partial, i) => items.push(wrapExtraItem(partial, i)));

  if (recipe.monsterType === "soloMonster") {
    items.push(buildBloodiedItem(recipe, stats));
    if (stats.lastStandHp) items.push(buildLastStandItem(recipe, stats));
    if (recipe.legendaryActions !== false) {
      items.push(...buildLegendaryActions(recipe, stats));
    }
  }
  return items;
}

/**
 * Dérive les stats en tenant compte du COÛT des abilities (offsets de lignes).
 * C'est le point d'entrée à utiliser pour construire un acteur.
 */
export function deriveResolved(recipe) {
  const off = resolveAbilityOffsets(recipe);
  return deriveStats({
    ...recipe,
    hpLineOffset: (recipe.hpLineOffset || 0) + off.hpDelta,
    dmgLineOffset: (recipe.dmgLineOffset || 0) + off.dmgDelta
  });
}

/** Détails (creatureType, level, isFlunky npc). */
function buildDetails(recipe, stats) {
  const details = { creatureType: recipe.creatureType ?? "", level: stats.level };
  if (recipe.monsterType === "npc") details.isFlunky = Boolean(recipe.isFlunky);
  return details;
}

/**
 * Bloc system.* COMPLET — création d'un acteur neuf uniquement.
 * Inclut les champs "utilisateur" (movement, savingThrows, résistances) à leurs
 * valeurs par défaut.
 */
export function buildSystemCreate(recipe, stats) {
  const res = computeResistances(recipe);
  return {
    attributes: {
      armor: recipe.armor,
      damageResistances: res.damageResistances,
      damageVulnerabilities: res.damageVulnerabilities,
      damageImmunities: res.damageImmunities,
      hp: { max: stats.hp.max, value: stats.hp.value, temp: 0 },
      movement: { walk: 6, fly: 0, swim: 0, climb: 0, burrow: 0 },
      sizeCategory: stats.sizeCategory
    },
    description: buildStatblock(recipe, stats),
    details: buildDetails(recipe, stats),
    attackSequence: "",
    savingThrows: defaultSavingThrows()
  };
}

/**
 * Bloc system.* PARTIEL — mise à jour d'un acteur existant (scale/re-build).
 * Ne contient QUE les champs dérivés ; le merge profond de Foundry préserve
 * ainsi le mouvement, les sauvegardes et le mvt réglés à la main.
 * Les résistances ne sont réécrites QUE si des abilities en définissent (sinon
 * on préserve celles ajoutées à la main).
 */
export function buildSystemUpdate(recipe, stats) {
  const attributes = {
    armor: recipe.armor,
    hp: { max: stats.hp.max, value: stats.hp.value },
    sizeCategory: stats.sizeCategory
  };
  const res = computeResistances(recipe);
  if (res.damageResistances.length || res.damageVulnerabilities.length || res.damageImmunities.length) {
    attributes.damageResistances = res.damageResistances;
    attributes.damageVulnerabilities = res.damageVulnerabilities;
    attributes.damageImmunities = res.damageImmunities;
  }
  return {
    attributes,
    description: buildStatblock(recipe, stats),
    details: buildDetails(recipe, stats)
  };
}

/** prototypeToken. */
export function buildPrototypeToken(recipe, stats, img) {
  return {
    name: recipe.name,
    displayName: 50,
    actorLink: false,
    width: stats.tokenSize,
    height: stats.tokenSize,
    texture: { src: img, scaleX: 1, scaleY: 1 },
    lockRotation: true,
    disposition: -1,
    displayBars: recipe.monsterType === "soloMonster" ? 40 : 0,
    bar1: { attribute: "attributes.hp" }
  };
}

/** Données complètes pour Actor.create (recette NEUVE). */
export function recipeToCreateData(recipeInput) {
  const recipe = normalizeRecipe(recipeInput);
  const stats = deriveResolved(recipe);
  const img = recipe.img || DEFAULT_IMG;

  return {
    data: {
      name: recipe.name,
      type: recipe.monsterType,
      img,
      system: buildSystemCreate(recipe, stats),
      prototypeToken: buildPrototypeToken(recipe, stats, img),
      items: buildGeneratedItems(recipe, stats),
      effects: [],
      flags: recipeFlagData(recipe)
    },
    stats,
    recipe
  };
}

/* =========================== Parties FOUNDRY =========================== */

/** Crée un nouvel acteur monstre depuis une recette. */
export async function createMonster(recipeInput, { renderSheet = true } = {}) {
  const { data } = recipeToCreateData(recipeInput);
  const actor = await Actor.create(data);
  if (actor && renderSheet) actor.sheet?.render(true);
  return actor;
}

/**
 * Applique une recette à un acteur EXISTANT :
 *  - régénère les items tagués (supprime + recrée), préserve les items manuels ;
 *  - met à jour system, name, img, prototypeToken et le flag recette.
 */
export async function applyRecipe(actor, recipeInput) {
  const recipe = normalizeRecipe(recipeInput);
  const stats = deriveResolved(recipe);
  const img = recipe.img || actor.img || DEFAULT_IMG;

  // 1) Supprimer les anciens items générés.
  const oldGenerated = actor.items
    .filter((i) => i.getFlag(MODULE_ID, FLAGS.GENERATED) === true)
    .map((i) => i.id);
  if (oldGenerated.length) {
    await actor.deleteEmbeddedDocuments("Item", oldGenerated);
  }

  // 2) Mettre à jour l'acteur (champs dérivés uniquement + flag recette).
  //    Le merge profond de Foundry préserve tout le reste (token, saves, mvt...).
  //    Les PV suivent le même principe qu'un changement de niveau depuis la
  //    fiche : le ratio est conservé, pour qu'un rééquilibrage en plein combat
  //    ne rende pas au monstre les PV qu'on vient de lui prendre.
  const system = buildSystemUpdate(recipe, stats);
  const currentHp = actor.system?.attributes?.hp;
  if (currentHp && system.attributes?.hp) {
    system.attributes.hp = computeScaledHp({
      currentValue: currentHp.value,
      currentMax: currentHp.max,
      newMax: system.attributes.hp.max
    });
  }

  await actor.update({
    name: recipe.name,
    img,
    system,
    prototypeToken: { width: stats.tokenSize, height: stats.tokenSize },
    flags: recipeFlagData(recipe)
  });

  // 3) Recréer les items générés.
  const newItems = buildGeneratedItems(recipe, stats);
  if (newItems.length) {
    await actor.createEmbeddedDocuments("Item", newItems, { keepId: true });
  }

  return { actor, stats, recipe };
}

/** Scale un acteur déjà construit de `delta` niveaux (±1). */
export async function scaleMonster(actor, delta) {
  const recipe = actor.getFlag(MODULE_ID, FLAGS.RECIPE);
  if (!recipe) {
    ui.notifications?.warn(game.i18n.localize("NMB.NoRecipe"));
    return null;
  }
  const newLevel = scaledLevel(normalizeRecipe(recipe), delta);
  return applyRecipe(actor, { ...recipe, level: newLevel });
}
