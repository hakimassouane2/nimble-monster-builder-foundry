// Test P3 : catalogue d'effets + coût. node tests/abilities.selftest.mjs
import { scalingRefsForActor } from "../scripts/core/scaling.mjs";
import { recipeToCreateData } from "../scripts/core/builder.mjs";
import { defaultRecipe } from "../scripts/core/recipe.mjs";
import { resolveAbilityOffsets } from "../scripts/data/effect-templates.mjs";

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${label} => ${JSON.stringify(actual)}${ok ? "" : ` (attendu ${JSON.stringify(expected)})`}`);
  ok ? pass++ : fail++;
}
function truthy(label, v) { const ok = !!v; console.log(`${ok ? "✓" : "✗"} ${label}`); ok ? pass++ : fail++; }
const bySlot = (items, slot) => items.find((i) => i.flags["nimble-monster-builder"]?.slot === slot);
const eff = (item) => item.system.activation.effects;

// --- Coût : push (dmg) + grapple (hp) sur un niv 3 ---
const r1 = defaultRecipe({
  monsterType: "npc", level: "3", armor: "medium", dieSize: 8, damageType: "slashing",
  abilities: [
    { templateId: "push", params: { distance: 2 }, payWith: "dmg" },
    { templateId: "grapple", params: {}, payWith: "hp" }
  ]
});
check("offsets push(dmg)+grapple(hp)", resolveAbilityOffsets(r1), { hpDelta: -1, dmgDelta: -1, levelBump: 0 });
const d1 = recipeToCreateData(r1).data;
check("HP niv3 M -1 ligne = 27", d1.system.attributes.hp.max, 27);
// attaque utilitaire = faible ; dégâts -1 ligne => niv2 => faible 1d8+3, forte 2d8+4
const weak = bySlot(d1.items, "attack:weak");
const strong = bySlot(d1.items, "attack:strong");
// En mode référence, le décalage n'est plus figé dans la formule : il est porté
// par la recette (dmgLineOffset) et appliqué à la résolution du jet.
check("faible formule (référence)", eff(weak)[0].formula, "@weakDamage");
check("forte formule (référence)", eff(strong)[0].formula, "@strongDamage");
// Bout en bout : la référence, résolue depuis la recette telle qu'elle est
// stockée sur l'acteur, doit retomber sur la formule du mode figé. Le coût des
// capacités n'étant pas persisté, il doit être recalculé à la résolution.
const fakeActor = {
  type: r1.monsterType,
  system: { details: { level: r1.level }, attributes: { armor: r1.armor, hp: { max: 27 } } },
  getFlag: (scope, key) => (scope === "nimble-monster-builder" && key === "recipe" ? r1 : undefined),
};
check("référence résolue = valeur figée (faible)", scalingRefsForActor(fakeActor).weakDamage, "1d8+3");
check("référence résolue = valeur figée (forte)", scalingRefsForActor(fakeActor).strongDamage, "2d8+4");

// Mêmes offsets, mais figés dans les items : c'est là qu'on vérifie les valeurs.
const d1Frozen = recipeToCreateData({ ...r1, useScalingRefs: false }).data;
check("faible formule figée (dmg -1)", eff(bySlot(d1Frozen.items, "attack:weak"))[0].formula, "1d8+3");
check("forte formule figée (dmg -1)", eff(bySlot(d1Frozen.items, "attack:strong"))[0].formula, "2d8+4");
// riders sur la faible : push (automatic note) + grapple (on.hit condition)
check("faible : 2 nœuds racine (dmg + push)", eff(weak).length, 2);
check("push = note automatique", eff(weak)[1].type, "note");
truthy("push mentionne 2 cases", eff(weak)[1].text.includes("2 cases"));
const hitBranch = eff(weak)[0].on.hit;
truthy("grapple dans on.hit", hitBranch.some((n) => n.type === "condition" && n.condition === "grappled"));
truthy("fullDamage présent dans on.hit", hitBranch.some((n) => n.type === "damageOutcome" && n.outcome === "fullDamage"));
// la forte ne porte AUCUN rider
check("forte : 1 seul nœud", eff(strong).length, 1);

// --- extraDamage on hit (dégâts imbriqués) ---
const r2 = defaultRecipe({ monsterType: "npc", level: "3", armor: "none", dieSize: 8,
  abilities: [{ templateId: "extraDamage", params: { count: 1, die: 6, damageType: "poison" }, payWith: "dmg" }] });
const d2 = recipeToCreateData(r2).data;
const w2 = bySlot(d2.items, "attack:weak");
const extra = w2.system.activation.effects[0].on.hit.find((n) => n.type === "damage");
truthy("extraDamage imbriqué dans on.hit", extra);
check("extraDamage formule", extra?.formula, "1d6");
check("extraDamage type", extra?.damageType, "poison");
check("extraDamage no crit", extra?.canCrit, false);

// --- aoeCone : item d'action séparé ---
const r3 = defaultRecipe({ monsterType: "npc", level: "5", armor: "none", dieSize: 8,
  abilities: [{ templateId: "aoeCone", params: { length: 3, damageType: "fire", save: "dexterity" }, payWith: "dmg" }] });
const d3 = recipeToCreateData(r3).data;
const cone = bySlot(d3.items, "ability:0");
truthy("aoeCone item présent", cone);
check("aoeCone subtype", cone.system.subtype, "action");
check("aoeCone template cone", cone.system.activation.template.shape, "cone");
const st = cone.system.activation.effects[0];
check("aoeCone nœud save", st.type, "savingThrow");
truthy("aoeCone save a failedSave", st.on.failedSave.length > 0);
truthy("aoeCone save a passedSave (moitié)", st.on.passedSave.some((n) => n.outcome === "halfDamage"));

// --- meatShield trait + resistance + reach ---
const r4 = defaultRecipe({ monsterType: "npc", level: "3", armor: "medium", dieSize: 8,
  abilities: [
    { templateId: "meatShield", params: {}, payWith: "dmg" },
    { templateId: "resistance", params: { damageType: "fire" }, payWith: "dmg" },
    { templateId: "reach", params: { distance: 2 }, payWith: "dmg" }
  ] });
const d4 = recipeToCreateData(r4).data;
truthy("meatShield item présent", bySlot(d4.items, "ability:0"));
check("meatShield subtype feature", bySlot(d4.items, "ability:0").system.subtype, "feature");
check("résistance fire dans system", d4.system.attributes.damageResistances, ["fire"]);
// reach applique attackType sur les attaques
check("reach attackType sur faible", bySlot(d4.items, "attack:weak").system.activation.targets.attackType, "reach");
check("reach distance", bySlot(d4.items, "attack:weak").system.activation.targets.distance, 2);

// --- payWith level : ne change pas les stats ---
const r5 = defaultRecipe({ monsterType: "npc", level: "3", armor: "medium", dieSize: 8,
  abilities: [{ templateId: "push", params: {}, payWith: "level" }] });
check("payWith level — offsets nuls", resolveAbilityOffsets(r5), { hpDelta: 0, dmgDelta: 0, levelBump: 1 });
check("payWith level — HP inchangé (33)", recipeToCreateData(r5).data.system.attributes.hp.max, 33);

console.log(`\n${pass} OK, ${fail} KO`);
process.exit(fail ? 1 : 0);
