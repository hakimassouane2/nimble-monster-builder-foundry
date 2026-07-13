// Test de non-régression des maths P1/P2. Lancer : node tests/math.selftest.mjs
import { deriveStats } from "../scripts/core/derive.mjs";
import { buildFormula, averageOfFormula } from "../scripts/core/formula.mjs";
import { rolePreset } from "../scripts/data/role-presets.mjs";

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${label} => ${JSON.stringify(actual)}${ok ? "" : ` (attendu ${JSON.stringify(expected)})`}`);
  ok ? pass++ : fail++;
}
const atk = (stats, key) => stats.attacks.find((a) => a.key === key);

// --- weakStrong (défaut) : niv 3 armure M, d8 ---
const g = deriveStats({ monsterType: "npc", level: "3", armor: "medium", size: "medium", dieSize: 8, attackMode: "weakStrong", hpLineOffset: 0, dmgLineOffset: 0 });
check("npc niv3 M — HP", g.hp.max, 33);
check("npc niv3 — Save DC", g.saveDC, 11);
check("npc niv3 — budget", g.damageBudget, 15);
check("npc niv3 — attaque forte", atk(g, "strong").formula.formula, "2d8+6");
check("npc niv3 — attaque faible", atk(g, "weak").formula.formula, "1d8+4");

// --- weakStrong niveau 1 (exemple utilisateur) ---
const l1 = deriveStats({ monsterType: "npc", level: "1", armor: "none", size: "medium", dieSize: 8, attackMode: "weakStrong", hpLineOffset: 0, dmgLineOffset: 0 });
check("npc niv1 — forte", atk(l1, "strong").formula.formula, "2d8+2");
check("npc niv1 — faible", atk(l1, "weak").formula.formula, "1d8+1");

// --- fractions : une seule attaque même en weakStrong ---
const frac = deriveStats({ monsterType: "npc", level: "1/2", armor: "none", size: "medium", dieSize: 8, attackMode: "weakStrong", hpLineOffset: 0, dmgLineOffset: 0 });
check("npc niv1/2 — 1 seule attaque", frac.attacks.length, 1);

// --- mode single ---
const single = deriveStats({ monsterType: "npc", level: "3", armor: "medium", size: "medium", dieSize: 8, attackMode: "single", hpLineOffset: 0, dmgLineOffset: 0 });
check("npc niv3 single — 1 attaque", single.attacks.length, 1);
check("npc niv3 single — formule", single.attacks[0].formula.formula, "2d8+6");

// --- mode multi : 2 attaques égales ---
const multi = deriveStats({ monsterType: "npc", level: "5", armor: "none", size: "medium", dieSize: 8, attackMode: "multi", attackCount: 2, hpLineOffset: 0, dmgLineOffset: 0 });
check("npc niv5 multi — 2 attaques", multi.attacks.length, 2);
console.log("   niv5 multi formules:", multi.attacks.map(a => a.formula.formula).join(" / "));

// --- Changement de dé conserve la moyenne (cible 6.5) ---
check("d4 cible6.5", buildFormula({ target: 6.5, dieSize: 4 }).formula, "1d4+4");
check("d10 cible6.5", buildFormula({ target: 6.5, dieSize: 10 }).formula, "1d10+1");
check("d12 cible6.5", buildFormula({ target: 6.5, dieSize: 12 }).formula, "1d12");
check("d4 cible6.5 moy", averageOfFormula(1, 4, 4), 6.5);

// --- Preset striker niv 3 (offsets appliqués), attaque forte ---
const rp = rolePreset("striker");
const s = deriveStats({ monsterType: "npc", level: "3", armor: rp.armor, size: "medium", dieSize: rp.dieSize, attackMode: "weakStrong", hpLineOffset: rp.hpLineOffset, dmgLineOffset: rp.dmgLineOffset });
check("striker niv3 — HP (none, -1 ligne = niv2=34)", s.hp.max, 34);
check("striker niv3 — budget (+1 ligne = niv4=18)", s.damageBudget, 18);
check("striker niv3 d10 — forte", atk(s, "strong").formula.formula, "2d10+7");

// --- Minion ---
const m = deriveStats({ monsterType: "minion", level: "2", armor: "none", size: "small", dieSize: 4, attackMode: "single", hpLineOffset: 0, dmgLineOffset: 0 });
check("minion — HP", m.hp.max, 1);
check("minion niv2 — dé", m.attacks[0].formula.formula, "1d4");
check("minion — canCrit", m.attacks[0].canCrit, false);

// --- Légendaire niveau de groupe 5 ---
const leg = deriveStats({ monsterType: "soloMonster", level: "5", armor: "medium", size: "large", dieSize: 8, hpLineOffset: 0, dmgLineOffset: 0 });
check("solo niv5 M — HP", leg.hp.max, 150);
check("solo niv5 — Last Stand HP", leg.lastStandHp, 50);
check("solo niv5 — Save DC", leg.saveDC, 12);
check("solo niv5 — 2 attaques", leg.attacks.map(a => a.key), ["small", "big"]);
console.log("   solo niv5 formules:", leg.attacks.map(a => `${a.label} ${a.formula.formula} (moy ${a.formula.average})`).join(" / "));

console.log(`\n${pass} OK, ${fail} KO`);
process.exit(fail ? 1 : 0);
