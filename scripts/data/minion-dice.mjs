/**
 * Taille de dé suggérée d'un minion selon le niveau du groupe de héros.
 * Source : markdowns/nimble-monster-stats.md § Minions et flunkies.
 * Un minion attaque avec UN SEUL dé (sans bonus), ne crit jamais, rate sur un 1.
 */

/** @type {{minLevel:number, maxLevel:number, die:number}[]} */
export const MINION_DIE_BANDS = [
  { minLevel: 1,  maxLevel: 3,  die: 4 },
  { minLevel: 3,  maxLevel: 5,  die: 6 },
  { minLevel: 5,  maxLevel: 10, die: 8 },
  { minLevel: 10, maxLevel: 13, die: 10 },
  { minLevel: 13, maxLevel: 17, die: 12 },
  { minLevel: 17, maxLevel: 20, die: 20 }
];

/**
 * Retourne la taille de dé suggérée pour un minion.
 * Les paliers se chevauchent aux bornes (ex. niveau 3 = d4 ou d6) : on prend
 * le premier palier qui contient le niveau, borné à [1, 20].
 * @param {number} partyLevel
 * @returns {number}
 */
export function suggestedMinionDie(partyLevel) {
  const lvl = Math.max(1, Math.min(20, Number(partyLevel) || 1));
  const band = MINION_DIE_BANDS.find((b) => lvl >= b.minLevel && lvl <= b.maxLevel);
  return band ? band.die : 6;
}
