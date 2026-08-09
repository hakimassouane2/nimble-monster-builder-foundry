// Test des références de scaling (données pures, sans Foundry). node tests/scaling.selftest.mjs
import { scalingRefs, levelToNumber, scalingRefKeys, computeScaledHp } from "../scripts/core/scaling.mjs";

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${label} => ${JSON.stringify(actual)}${ok ? "" : ` (attendu ${JSON.stringify(expected)})`}`);
  ok ? pass++ : fail++;
}
// Le contrat de buildFormula est une moyenne préservée à ±0,5 près, pas une
// égalité exacte : convertir vers un autre dé ne retombe pas toujours juste.
function near(label, actual, expected, tolerance = 0.5) {
  const ok = Math.abs(actual - expected) <= tolerance;
  console.log(`${ok ? "✓" : "✗"} ${label} => ${actual}${ok ? "" : ` (attendu ${expected} ±${tolerance})`}`);
  ok ? pass++ : fail++;
}

// --- Conversion de niveau ---
check("niveau 1/4", levelToNumber("1/4"), 0.25);
check("niveau 1/2", levelToNumber("1/2"), 0.5);
check("niveau 7", levelToNumber("7"), 7);

// --- NPC : formules EXACTES de la table au dé natif ---
const n1 = scalingRefs({ monsterType: "npc", level: "1", armor: "none" });
check("npc n1 strongDamage", n1.strongDamage, "2d8+2");
check("npc n1 weakDamage", n1.weakDamage, "1d8+1");
check("npc n1 dc", n1.dc, 10);
check("npc n1 hpByTable (none)", n1.hpByTable, 26);
check("npc n1 level", n1.level, 1);

const n2 = scalingRefs({ monsterType: "npc", level: "2", armor: "medium" });
check("npc n2 strongDamage", n2.strongDamage, "2d8+4");
check("npc n2 weakDamage", n2.weakDamage, "1d8+3");
check("npc n2 hpByTable (medium)", n2.hpByTable, 27);

const n17 = scalingRefs({ monsterType: "npc", level: "17", armor: "heavy" });
check("npc n17 dc", n17.dc, 18);
check("npc n17 strongDamage", n17.strongDamage, "8d8+12");
check("npc n17 hpByTable (heavy)", n17.hpByTable, 146);
check("npc n17 dcHard", n17.dcHard, 20);

// --- Fractions : pas de variante faible, elle retombe sur la forte ---
const nQuarter = scalingRefs({ monsterType: "npc", level: "1/4", armor: "none" });
check("npc 1/4 strongDamage", nQuarter.strongDamage, "1d4+1");
check("npc 1/4 weakDamage = strong", nQuarter.weakDamage, "1d4+1");
check("npc 1/4 level numérique", nQuarter.level, 0.25);

// --- Décalages de ligne ---
const shift = scalingRefs({ monsterType: "npc", level: "5", armor: "none" });
check("npc n5 strongDamage", shift.strongDamage, "2d8+10");
check("npc n5 +2 lignes = ligne n7", shift.strongDamagePlus2, "3d8+10");
check("npc n5 -2 lignes = ligne n3", shift.strongDamageMinus2, "2d8+6");

// Bornes : au niveau 20 on ne dépasse pas la dernière ligne.
const top = scalingRefs({ monsterType: "npc", level: "20", armor: "none" });
check("npc n20 +3 lignes reste borné", top.strongDamagePlus3, top.strongDamage);

// --- Dé thématique : la moyenne est préservée ---
const d12 = scalingRefs({ monsterType: "npc", level: "1", armor: "none", dieSize: 12 });
near("npc n1 en d12 garde la moyenne", d12.strongDamageAvg, n1.strongDamageAvg);
check("npc n1 en d12 formule", d12.strongDamage, "1d12+5");

// --- Minion : un dé, aucun bonus, alias vers la nomenclature commune ---
const minion = scalingRefs({ monsterType: "minion", level: "6" });
check("minion n6 dé suggéré", minion.dieSize, 8);
check("minion n6 attackDamage", minion.attackDamage, "1d8");
check("minion n6 alias strongDamage", minion.strongDamage, "1d8");
check("minion n6 dc", minion.dc, 13);
check("minion +1 palier de dé", minion.attackDamagePlus1, "1d10");

// --- Légendaire : indexé sur le niveau du groupe ---
const solo = scalingRefs({ monsterType: "soloMonster", level: "5", armor: "medium" });
check("solo n5 dc", solo.dc, 12);
check("solo n5 hpByTable (medium)", solo.hpByTable, 150);
check("solo n5 lastStandHp", solo.lastStandHp, 50);
near("solo n5 bigDamageAvg", solo.bigDamageAvg, 24);
check("solo n5 alias strongDamage = big", solo.strongDamage, solo.bigDamage);
check("solo n5 alias weakDamage = small", solo.weakDamage, solo.smallDamage);

// --- Robustesse : niveau inconnu retombe sur le niveau 1 ---
const bogus = scalingRefs({ monsterType: "npc", level: "totalement invalide" });
check("niveau invalide retombe sur n1", bogus.strongDamage, "2d8+2");

// --- Décalages de ligne issus de la recette (rôle, coût des capacités) ---
const brute = scalingRefs({ monsterType: "npc", level: "5", armor: "none", dmgLineOffset: 2 });
check("brute : @strongDamage suit la ligne décalée", brute.strongDamage, shift.strongDamagePlus2);
check("brute : les décalages sont relatifs à sa propre ligne", brute.strongDamagePlus1, scalingRefs({ monsterType: "npc", level: "8" }).strongDamage);
check("brute : le DD reste celui du niveau nominal", brute.dc, shift.dc);

const tank = scalingRefs({ monsterType: "npc", level: "5", armor: "none", hpLineOffset: 2 });
check("tank : hpByTable suit la ligne décalée", tank.hpByTable, scalingRefs({ monsterType: "npc", level: "7", armor: "none" }).hpByTable);
check("tank : les dégâts ne bougent pas", tank.strongDamage, shift.strongDamage);

const soloShift = scalingRefs({ monsterType: "soloMonster", level: "5", armor: "medium", dmgLineOffset: 1 });
check("solo décalé : bigDamage suit", soloShift.bigDamage, scalingRefs({ monsterType: "soloMonster", level: "6", armor: "medium" }).bigDamage);

// --- Motif de l'enricher de description ---
// Reproduit buildScalingPattern() sans importer le module (qui dépend de Foundry).
const keys = scalingRefKeys();
const pattern = new RegExp(`@(${keys.join("|")})\\b`, "g");
const found = (texte) => [...texte.matchAll(pattern)].map((m) => m[0]);

check("clés triées : la plus longue d'abord", keys[0].length >= keys[keys.length - 1].length, true);
check("motif — références simples", found("DD @dc, subit @strongDamage dégâts"), ["@dc", "@strongDamage"]);
check("motif — la plus longue gagne", found("@strongDamagePlus2"), ["@strongDamagePlus2"]);
check("motif — moyenne", found("@weakDamageAvg"), ["@weakDamageAvg"]);
check("motif — @dcEasy n'est pas coupé en @dc", found("@dcEasy"), ["@dcEasy"]);
check("motif — clé inconnue ignorée", found("@inconnu"), []);
check("motif — adresse mail épargnée", found("contact@exemple.fr"), []);
check("motif — @dc collé à du texte non capturé", found("@dcXYZ"), []);

// --- Nom de l'acteur ---
// La clé est conditionnelle : elle doit tout de même figurer dans le motif,
// sans quoi « @name » resterait littéral dans les descriptions.
check("motif — @name reconnu", found("@name se rue sur sa proie"), ["@name"]);
check("@name absent quand l'acteur n'a pas de nom", scalingRefs({ monsterType: "npc", level: "1" }).name, undefined);
check("@name repris de la sonde", scalingRefs({ monsterType: "npc", level: "1", name: "Gobelin" }).name, "Gobelin");
check("@name sur un minion", scalingRefs({ monsterType: "minion", level: "1", name: "Rat" }).name, "Rat");
check("@name sur un légendaire", scalingRefs({ monsterType: "soloMonster", level: "1", name: "Dragon" }).name, "Dragon");

// --- Recalcul des PV au changement de niveau (ratio conservé) ---
check("PV : monstre intact reste au maximum", computeScaledHp({ currentValue: 26, currentMax: 26, newMax: 58 }), { max: 58, value: 58 });
check("PV : ratio conservé à la montée", computeScaledHp({ currentValue: 13, currentMax: 26, newMax: 58 }), { max: 58, value: 29 });
check("PV : ratio conservé à la descente", computeScaledHp({ currentValue: 29, currentMax: 58, newMax: 26 }), { max: 26, value: 13 });
check("PV : un survivant ne meurt pas d'un arrondi", computeScaledHp({ currentValue: 1, currentMax: 313, newMax: 12 }), { max: 12, value: 1 });
check("PV : un mort reste mort", computeScaledHp({ currentValue: 0, currentMax: 26, newMax: 58 }), { max: 58, value: 0 });
check("PV : sans maximum exploitable, on remplit", computeScaledHp({ currentValue: 0, currentMax: 0, newMax: 34 }), { max: 34, value: 34 });
check("PV : jamais au-dessus du maximum", computeScaledHp({ currentValue: 99, currentMax: 26, newMax: 34 }).value, 34);
check("PV : maximum plancher à 1", computeScaledHp({ currentValue: 5, currentMax: 10, newMax: 0 }), { max: 1, value: 1 });

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
