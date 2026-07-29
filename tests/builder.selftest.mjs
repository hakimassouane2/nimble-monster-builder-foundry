// Test structurel P2 (données pures, sans Foundry). node tests/builder.selftest.mjs
import { recipeToCreateData } from "../scripts/core/builder.mjs";
import { defaultRecipe, scaledLevel } from "../scripts/core/recipe.mjs";

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${label} => ${JSON.stringify(actual)}${ok ? "" : ` (attendu ${JSON.stringify(expected)})`}`);
  ok ? pass++ : fail++;
}
function truthy(label, v) { const ok = !!v; console.log(`${ok ? "✓" : "✗"} ${label}`); ok ? pass++ : fail++; }
const bySlot = (items, slot) => items.find((i) => i.flags["nimble-monster-builder"]?.slot === slot);

// --- NPC niv 3 armure M (défaut weakStrong) ---
const npc = recipeToCreateData(defaultRecipe({
  monsterType: "npc", name: "Gobelin", level: "3", armor: "medium", size: "small",
  dieSize: 8, damageType: "slashing"
}));
check("npc type", npc.data.type, "npc");
check("npc hp.max", npc.data.system.attributes.hp.max, 33);
check("npc armor", npc.data.system.attributes.armor, "medium");
truthy("npc details.isFlunky présent", npc.data.system.details.isFlunky === false);
truthy("npc savingThrows.strength présent", npc.data.system.savingThrows.strength);
truthy("npc description non vide", npc.data.system.description.length > 0);
check("npc token width (small)", npc.data.prototypeToken.width, 0.5);

// faible + forte
check("npc — 2 items (faible/forte)", npc.data.items.length, 2);
const weak = bySlot(npc.data.items, "attack:weak");
const strong = bySlot(npc.data.items, "attack:strong");
truthy("item faible présent", weak);
truthy("item fort présent", strong);
check("forte formule (référence)", strong.system.activation.effects[0].formula, "@strongDamage");
check("faible formule (référence)", weak.system.activation.effects[0].formula, "@weakDamage");
truthy("icône faible = grise", weak.img.includes("strike-sword-gray"));
truthy("icône forte = rouge sang", strong.img.includes("strike-sword-blood-red"));
check("forte damageType", strong.system.activation.effects[0].damageType, "slashing");
truthy("forte a une description mentionnant les dégâts", strong.system.description.includes("@strongDamage"));
truthy("faible a une description mentionnant les dégâts", weak.system.description.includes("@weakDamage"));
truthy("item flag generated", strong.flags["nimble-monster-builder"].generated === true);
// arbre d'effets
const dmg = strong.system.activation.effects[0];
check("dmg node type", dmg.type, "damage");
check("dmg canCrit", dmg.canCrit, true);
const leaf = dmg.on.hit[0];
check("feuille fullDamage", leaf.outcome, "fullDamage");
check("feuille parentNode = dmg.id", leaf.parentNode, dmg.id);

// --- Flunky : pas de crit ---
const flunky = recipeToCreateData(defaultRecipe({ monsterType: "npc", level: "3", armor: "none", isFlunky: true }));
check("flunky canCrit", bySlot(flunky.data.items, "attack:strong").system.activation.effects[0].canCrit, false);

// --- Fraction : une seule attaque ---
const frac = recipeToCreateData(defaultRecipe({ monsterType: "npc", level: "1/2", armor: "none" }));
check("npc niv1/2 — 1 item", frac.data.items.length, 1);
truthy("npc niv1/2 — slot attack", frac.data.items[0].flags["nimble-monster-builder"].slot === "attack:attack");

// --- Minion ---
const min = recipeToCreateData(defaultRecipe({ monsterType: "minion", level: "2", armor: "none", dieSize: 0 }));
check("minion hp.max", min.data.system.attributes.hp.max, 1);
truthy("minion sans isFlunky", min.data.system.details.isFlunky === undefined);
check("minion canCrit", min.data.items[0].system.activation.effects[0].canCrit, false);
check("minion formule (référence)", min.data.items[0].system.activation.effects[0].formula, "@attackDamage");

// --- Solo ---
const solo = recipeToCreateData(defaultRecipe({ monsterType: "soloMonster", level: "5", armor: "medium", size: "large", dieSize: 8 }));
check("solo type", solo.data.type, "soloMonster");
check("solo hp.max", solo.data.system.attributes.hp.max, 150);
check("solo displayBars", solo.data.prototypeToken.displayBars, 40);
// small + big + bloodied + lastStand + 4 actions légendaires
check("solo nb items", solo.data.items.length, 8);
const ls = bySlot(solo.data.items, "lastStand");
truthy("solo item lastStand présent", ls);
check("solo lastStandHp", ls.system.lastStandHp, 50);
truthy("solo item bloodied présent", bySlot(solo.data.items, "bloodied"));
const roar = bySlot(solo.data.items, "legendary:roar");
truthy("solo action Rugissement présente", roar);
check("Rugissement save = will", roar.system.activation.effects[0].savingThrowType, "will");
check("Rugissement -> frightened", roar.system.activation.effects[0].on.failedSave[0].condition, "frightened");
// sans actions légendaires
const soloNoLeg = recipeToCreateData(defaultRecipe({ monsterType: "soloMonster", level: "5", armor: "medium", legendaryActions: false }));
// small + big + bloodied + lastStand
check("solo sans actions légendaires — 4 items", soloNoLeg.data.items.length, 4);

// --- Scale ---
check("scale npc niv3 -1", scaledLevel(defaultRecipe({ level: "3" }), -1), "2");
check("scale npc niv3 +1", scaledLevel(defaultRecipe({ level: "3" }), 1), "4");
check("scale npc borne basse", scaledLevel(defaultRecipe({ level: "1/4" }), -1), "1/4");
check("scale solo niv5 +1", scaledLevel(defaultRecipe({ monsterType: "soloMonster", level: "5" }), 1), "6");
check("scale solo borne haute", scaledLevel(defaultRecipe({ monsterType: "soloMonster", level: "20" }), 1), "20");

// --- Mode valeurs figées (useScalingRefs: false) ---
// Un monstre construit ainsi reste exact sans le module : c'est le repli si on
// exporte le monstre ou si on désactive le scaling.
const frozen = recipeToCreateData(defaultRecipe({
  monsterType: "npc", name: "Gobelin figé", level: "3", armor: "medium", size: "small",
  dieSize: 8, damageType: "slashing", useScalingRefs: false
}));
const frozenStrong = bySlot(frozen.data.items, "attack:strong");
const frozenWeak = bySlot(frozen.data.items, "attack:weak");
check("figé — forte formule", frozenStrong.system.activation.effects[0].formula, "2d8+6");
check("figé — faible formule", frozenWeak.system.activation.effects[0].formula, "1d8+4");
truthy("figé — description avec la moyenne", frozenStrong.system.description.includes("(15)"));
truthy("figé — aucune référence résiduelle", !JSON.stringify(frozen.data).includes("@strongDamage"));

// --- Références et DD sur un légendaire (réutilise `solo`, déjà en mode référence) ---
truthy("légendaire — DD en référence dans le texte", roar.system.description.includes("DC @dc"));
check("légendaire — DD en référence dans le nœud", roar.system.activation.effects[0].saveDC, "@dc");
check(
  "légendaire — grosse attaque en référence",
  bySlot(solo.data.items, "attack:big").system.activation.effects[0].formula,
  "@strongDamage",
);

const soloFrozen = recipeToCreateData(defaultRecipe({
  monsterType: "soloMonster", level: "5", armor: "medium", legendaryActions: true, useScalingRefs: false
}));
check("légendaire figé — DD numérique", bySlot(soloFrozen.data.items, "legendary:roar").system.activation.effects[0].saveDC, 12);

console.log(`\n${pass} OK, ${fail} KO`);
process.exit(fail ? 1 : 0);
