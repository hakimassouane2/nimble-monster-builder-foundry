/**
 * Table de construction des monstres standards (npc / minion).
 * Source : markdowns/nimble-monster-stats.md — VALEURS EXACTES, jamais interpolées.
 *
 * Chaque ligne :
 *  - level      : clé de niveau (string, fractions incluses)
 *  - order      : index ordinal pour "déplacer des lignes" (mix & match / offsets)
 *  - hpNone/hpMedium/hpHeavy : HP selon l'armure
 *  - damage     : budget total de dégâts moyens par tour (colonne "Dégâts par tour")
 *  - saveDC     : DC des SavingThrowNode
 *  - strong     : formule "Attaque forte" = colonne simple de la table (canonique)
 *  - weak       : formule "Attaque faible" = variante "(2×)" de la table, ou null
 *                 (fractions < niveau 1 : pas de variante double)
 *
 * Les formules sont stockées sous forme canonique {dice, die, bonus} pour être
 * reproduites À L'IDENTIQUE quand le dé choisi = le dé natif, et converties en
 * conservant la moyenne sinon.
 */

const F = (dice, die, bonus) => ({ dice, die, bonus });

/** @typedef {{dice:number, die:number, bonus:number}} Canonical */
/** @typedef {{level:string, order:number, hpNone:number, hpMedium:number, hpHeavy:number, damage:number, saveDC:number, strong:Canonical, weak:(Canonical|null)}} StandardRow */

/** @type {StandardRow[]} */
export const STANDARD_TABLE = [
  { level: "1/4", order: 0,  hpNone: 12,  hpMedium: 9,   hpHeavy: 7,   damage: 3,  saveDC: 9,  strong: F(1, 4, 1),  weak: null },
  { level: "1/3", order: 1,  hpNone: 15,  hpMedium: 11,  hpHeavy: 8,   damage: 5,  saveDC: 9,  strong: F(1, 6, 2),  weak: null },
  { level: "1/2", order: 2,  hpNone: 18,  hpMedium: 15,  hpHeavy: 11,  damage: 7,  saveDC: 10, strong: F(1, 6, 3),  weak: null },
  { level: "1",   order: 3,  hpNone: 26,  hpMedium: 20,  hpHeavy: 16,  damage: 11, saveDC: 10, strong: F(2, 8, 2),  weak: F(1, 8, 1) },
  { level: "2",   order: 4,  hpNone: 34,  hpMedium: 27,  hpHeavy: 20,  damage: 13, saveDC: 11, strong: F(2, 8, 4),  weak: F(1, 8, 3) },
  { level: "3",   order: 5,  hpNone: 41,  hpMedium: 33,  hpHeavy: 25,  damage: 15, saveDC: 11, strong: F(2, 8, 6),  weak: F(1, 8, 4) },
  { level: "4",   order: 6,  hpNone: 49,  hpMedium: 39,  hpHeavy: 29,  damage: 18, saveDC: 12, strong: F(2, 8, 9),  weak: F(1, 8, 5) },
  { level: "5",   order: 7,  hpNone: 58,  hpMedium: 46,  hpHeavy: 35,  damage: 19, saveDC: 12, strong: F(2, 8, 10), weak: F(1, 8, 6) },
  { level: "6",   order: 8,  hpNone: 68,  hpMedium: 54,  hpHeavy: 41,  damage: 21, saveDC: 13, strong: F(2, 8, 12), weak: F(1, 8, 7) },
  { level: "7",   order: 9,  hpNone: 79,  hpMedium: 63,  hpHeavy: 47,  damage: 24, saveDC: 13, strong: F(3, 8, 10), weak: F(2, 8, 4) },
  { level: "8",   order: 10, hpNone: 91,  hpMedium: 73,  hpHeavy: 55,  damage: 26, saveDC: 14, strong: F(3, 8, 12), weak: F(2, 8, 5) },
  { level: "9",   order: 11, hpNone: 104, hpMedium: 83,  hpHeavy: 62,  damage: 28, saveDC: 14, strong: F(4, 8, 10), weak: F(2, 8, 6) },
  { level: "10",  order: 12, hpNone: 118, hpMedium: 94,  hpHeavy: 71,  damage: 30, saveDC: 15, strong: F(4, 8, 12), weak: F(2, 8, 7) },
  { level: "11",  order: 13, hpNone: 133, hpMedium: 106, hpHeavy: 80,  damage: 33, saveDC: 15, strong: F(5, 8, 11), weak: F(3, 8, 3) },
  { level: "12",  order: 14, hpNone: 149, hpMedium: 119, hpHeavy: 89,  damage: 35, saveDC: 16, strong: F(5, 8, 13), weak: F(3, 8, 4) },
  { level: "13",  order: 15, hpNone: 166, hpMedium: 132, hpHeavy: 100, damage: 38, saveDC: 16, strong: F(6, 8, 11), weak: F(3, 8, 6) },
  { level: "14",  order: 16, hpNone: 184, hpMedium: 147, hpHeavy: 110, damage: 40, saveDC: 17, strong: F(6, 8, 13), weak: F(3, 8, 7) },
  { level: "15",  order: 17, hpNone: 203, hpMedium: 162, hpHeavy: 122, damage: 43, saveDC: 17, strong: F(7, 8, 11), weak: F(3, 8, 8) },
  { level: "16",  order: 18, hpNone: 223, hpMedium: 178, hpHeavy: 134, damage: 45, saveDC: 18, strong: F(7, 8, 13), weak: F(4, 8, 5) },
  { level: "17",  order: 19, hpNone: 244, hpMedium: 195, hpHeavy: 146, damage: 48, saveDC: 18, strong: F(8, 8, 12), weak: F(4, 8, 6) },
  { level: "18",  order: 20, hpNone: 266, hpMedium: 213, hpHeavy: 160, damage: 50, saveDC: 19, strong: F(8, 8, 14), weak: F(4, 8, 7) },
  { level: "19",  order: 21, hpNone: 289, hpMedium: 231, hpHeavy: 173, damage: 52, saveDC: 19, strong: F(9, 8, 12), weak: F(4, 8, 8) },
  { level: "20",  order: 22, hpNone: 313, hpMedium: 250, hpHeavy: 189, damage: 54, saveDC: 20, strong: F(9, 8, 13), weak: F(4, 8, 9) }
];

/** Recherche par clé de niveau. */
export function standardRowByLevel(level) {
  return STANDARD_TABLE.find((r) => r.level === String(level)) ?? null;
}

/** Recherche par ordinal (utilisé pour appliquer un offset de lignes). */
export function standardRowByOrder(order) {
  const clamped = Math.max(0, Math.min(STANDARD_TABLE.length - 1, order));
  return STANDARD_TABLE[clamped];
}
