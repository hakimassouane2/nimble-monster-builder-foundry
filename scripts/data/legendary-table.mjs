/**
 * Table de construction des monstres légendaires (soloMonster).
 * Source : markdowns/nimble-legendary-monster-stats.md — indexée sur le NIVEAU DU GROUPE.
 *
 * Chaque ligne :
 *  - level        : niveau du groupe (1..20)
 *  - hpMedium/hpHeavy : HP selon l'armure
 *  - hpUnarmored  : dérivé (hpMedium × 1,25 arrondi) — sans armure impose une capacité défensive
 *  - lastStandHp  : HP soigné à l'entrée en Last Stand (champ lastStandHp)
 *  - saveDC       : DC des SavingThrowNode
 *  - smallDamage  : budget moyen de la "Petite attaque" (avec utilité)
 *  - bigDamage    : budget moyen de la "Grosse attaque" (pure)
 */

/** @typedef {{level:number, hpMedium:number, hpHeavy:number, hpUnarmored:number, lastStandHp:number, saveDC:number, smallDamage:number, bigDamage:number}} LegendaryRow */

/** @type {LegendaryRow[]} */
export const LEGENDARY_TABLE = [
  { level: 1,  hpMedium: 50,  hpHeavy: 35,  hpUnarmored: 63,  lastStandHp: 10,  saveDC: 10, smallDamage: 8,  bigDamage: 16 },
  { level: 2,  hpMedium: 75,  hpHeavy: 55,  hpUnarmored: 94,  lastStandHp: 20,  saveDC: 11, smallDamage: 9,  bigDamage: 18 },
  { level: 3,  hpMedium: 100, hpHeavy: 75,  hpUnarmored: 125, lastStandHp: 30,  saveDC: 11, smallDamage: 10, bigDamage: 20 },
  { level: 4,  hpMedium: 125, hpHeavy: 95,  hpUnarmored: 156, lastStandHp: 40,  saveDC: 12, smallDamage: 11, bigDamage: 22 },
  { level: 5,  hpMedium: 150, hpHeavy: 115, hpUnarmored: 188, lastStandHp: 50,  saveDC: 12, smallDamage: 12, bigDamage: 24 },
  { level: 6,  hpMedium: 175, hpHeavy: 135, hpUnarmored: 219, lastStandHp: 60,  saveDC: 13, smallDamage: 13, bigDamage: 26 },
  { level: 7,  hpMedium: 200, hpHeavy: 155, hpUnarmored: 250, lastStandHp: 70,  saveDC: 13, smallDamage: 14, bigDamage: 28 },
  { level: 8,  hpMedium: 225, hpHeavy: 175, hpUnarmored: 281, lastStandHp: 80,  saveDC: 14, smallDamage: 15, bigDamage: 30 },
  { level: 9,  hpMedium: 250, hpHeavy: 195, hpUnarmored: 313, lastStandHp: 90,  saveDC: 14, smallDamage: 16, bigDamage: 32 },
  { level: 10, hpMedium: 275, hpHeavy: 215, hpUnarmored: 344, lastStandHp: 100, saveDC: 15, smallDamage: 17, bigDamage: 34 },
  { level: 11, hpMedium: 300, hpHeavy: 235, hpUnarmored: 375, lastStandHp: 110, saveDC: 15, smallDamage: 18, bigDamage: 36 },
  { level: 12, hpMedium: 325, hpHeavy: 255, hpUnarmored: 406, lastStandHp: 120, saveDC: 16, smallDamage: 19, bigDamage: 38 },
  { level: 13, hpMedium: 350, hpHeavy: 275, hpUnarmored: 438, lastStandHp: 130, saveDC: 16, smallDamage: 20, bigDamage: 40 },
  { level: 14, hpMedium: 375, hpHeavy: 295, hpUnarmored: 469, lastStandHp: 140, saveDC: 17, smallDamage: 21, bigDamage: 42 },
  { level: 15, hpMedium: 400, hpHeavy: 315, hpUnarmored: 500, lastStandHp: 150, saveDC: 17, smallDamage: 22, bigDamage: 44 },
  { level: 16, hpMedium: 425, hpHeavy: 335, hpUnarmored: 531, lastStandHp: 160, saveDC: 18, smallDamage: 23, bigDamage: 46 },
  { level: 17, hpMedium: 450, hpHeavy: 355, hpUnarmored: 563, lastStandHp: 170, saveDC: 18, smallDamage: 24, bigDamage: 48 },
  { level: 18, hpMedium: 475, hpHeavy: 375, hpUnarmored: 594, lastStandHp: 180, saveDC: 19, smallDamage: 25, bigDamage: 50 },
  { level: 19, hpMedium: 500, hpHeavy: 395, hpUnarmored: 625, lastStandHp: 190, saveDC: 19, smallDamage: 26, bigDamage: 52 },
  { level: 20, hpMedium: 525, hpHeavy: 415, hpUnarmored: 656, lastStandHp: 200, saveDC: 20, smallDamage: 27, bigDamage: 54 }
];

/** Recherche par niveau de groupe. */
export function legendaryRowByLevel(level) {
  const n = Number(level);
  return LEGENDARY_TABLE.find((r) => r.level === n) ?? null;
}
