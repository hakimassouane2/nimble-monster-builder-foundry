// Test du clic-pour-lancer (parties pures, sans Foundry). node tests/roll.selftest.mjs
import { isRollableFormula, rollOutcomeRules } from "../scripts/features/scaling-roll.mjs";
import { scalingRefs } from "../scripts/core/scaling.mjs";

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${label} => ${JSON.stringify(actual)}${ok ? "" : ` (attendu ${JSON.stringify(expected)})`}`);
  ok ? pass++ : fail++;
}

// --- Ce qui est jouable ---
check("formule simple", isRollableFormula("2d10+3"), true);
check("formule sans bonus", isRollableFormula("1d8"), true);
check("formule à modificateur Nimble", isRollableFormula("2d8c+3"), true);
check("moyenne numérique", isRollableFormula(14), false);
check("moyenne en texte", isRollableFormula("14"), false);
check("nom d'armure", isRollableFormula("heavy"), false);
check("chaîne vide", isRollableFormula(""), false);
check("valeur absente", isRollableFormula(undefined), false);

// --- Toutes les vraies références de dégâts sont reconnues, les autres non ---
// Le test lit les VRAIES sorties du calcul de scaling : ajouter une référence
// suffit à la couvrir, aucune liste à tenir à jour ici.
for (const monsterType of ["npc", "minion", "soloMonster"]) {
  const refs = scalingRefs({ monsterType, level: "5", name: "Sonde", hpMax: 30 });
  const rollable = Object.entries(refs).filter(([, v]) => isRollableFormula(v)).map(([k]) => k);
  const damageKeys = Object.keys(refs).filter((k) => /Damage$/.test(k));

  check(`${monsterType} — toutes les clés Damage sont jouables`,
    damageKeys.every((k) => rollable.includes(k)), true);
  check(`${monsterType} — aucune moyenne n'est jouable`,
    rollable.some((k) => k.endsWith("Avg")), false);
  check(`${monsterType} — ni le DD ni le niveau ne sont jouables`,
    rollable.some((k) => ["dc", "saveDC", "level", "levelLabel", "hpByTable", "armor"].includes(k)), false);
}

// --- Critique et échec, alignés sur ItemActivationManager ---
check("npc — critique et échec",
  rollOutcomeRules({ type: "npc" }, null), { canCrit: true, canMiss: true });
check("minion — pas de critique, échec possible",
  rollOutcomeRules({ type: "minion" }, null), { canCrit: false, canMiss: true });
check("sbire (flunky) — comme un minion",
  rollOutcomeRules({ type: "npc", system: { details: { isFlunky: true } } }, null),
  { canCrit: false, canMiss: true });
check("zone — ni critique ni échec",
  rollOutcomeRules({ type: "npc" }, { system: { activation: { template: { shape: "cone" } } } }),
  { canCrit: false, canMiss: false });
check("gabarit vide — capacité normale",
  rollOutcomeRules({ type: "npc" }, { system: { activation: { template: { shape: "" } } } }),
  { canCrit: true, canMiss: true });
check("sans acteur — valeurs par défaut",
  rollOutcomeRules(null, null), { canCrit: true, canMiss: true });

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exitCode = fail ? 1 : 0;
