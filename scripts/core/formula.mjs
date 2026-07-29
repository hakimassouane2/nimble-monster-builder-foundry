/**
 * Maths de conversion budget de dégâts <-> formule de dés.
 * Règle Nimble : le BUDGET (moyenne) prime. On choisit la taille de dé, puis on
 * ajuste le bonus fixe pour retomber sur la moyenne cible (±0,5).
 * Source : markdowns/nimble-monster-stats.md § "Taille des dés".
 */

/** Moyenne de N dés à X faces. */
export function averageOfDice(diceCount, dieSize) {
  return (diceCount * (dieSize + 1)) / 2;
}

/** Moyenne d'une formule NdX+B. */
export function averageOfFormula(diceCount, dieSize, bonus) {
  return averageOfDice(diceCount, dieSize) + bonus;
}

/** Formate une formule NdX(+/-B) — omet le bonus s'il est nul. */
export function formatFormula(diceCount, dieSize, bonus) {
  let out = `${diceCount}d${dieSize}`;
  if (bonus > 0) out += `+${bonus}`;
  else if (bonus < 0) out += `${bonus}`;
  return out;
}

/**
 * Construit une formule dont la moyenne approche `target`, pour une taille de dé
 * donnée. Le nombre de dés préféré est `preferredDice` ; on le réduit si le bonus
 * deviendrait négatif (les dés seuls dépassent déjà la cible), jamais sous 1.
 *
 * @param {object} opts
 * @param {number} opts.target         Moyenne visée.
 * @param {number} opts.dieSize        Taille de dé.
 * @param {number} [opts.preferredDice=1] Nombre de dés souhaité.
 * @param {boolean} [opts.noBonus=false]  Force bonus=0 (minions).
 * @returns {{diceCount:number, dieSize:number, bonus:number, formula:string, average:number, target:number, warning:(string|null)}}
 */
export function buildFormula({ target, dieSize, preferredDice = 1, noBonus = false }) {
  const safeTarget = Math.max(1, Number(target) || 1);

  if (noBonus) {
    // Minion : un seul dé, aucun bonus. On choisit la taille de dé la plus proche
    // en amont (l'appelant passe déjà la bonne), on ne fait qu'emballer.
    const average = averageOfDice(1, dieSize);
    return {
      diceCount: 1, dieSize, bonus: 0,
      formula: formatFormula(1, dieSize, 0),
      average, target: safeTarget,
      warning: null
    };
  }

  let diceCount = Math.max(1, Math.round(preferredDice));
  let bonus = Math.round(safeTarget - averageOfDice(diceCount, dieSize));

  // Si le bonus est négatif, on retire des dés tant que possible pour le ramener ≥ 0.
  while (bonus < 0 && diceCount > 1) {
    diceCount -= 1;
    bonus = Math.round(safeTarget - averageOfDice(diceCount, dieSize));
  }
  if (bonus < 0) bonus = 0; // 1 dé qui dépasse déjà : on clampe et on signale.

  const average = averageOfFormula(diceCount, dieSize, bonus);
  const warning = Math.abs(average - safeTarget) > 0.5
    ? `Moyenne ${average} pour une cible de ${safeTarget} (dé trop gros pour ce budget).`
    : null;

  return {
    diceCount, dieSize, bonus,
    formula: formatFormula(diceCount, dieSize, bonus),
    average, target: safeTarget, warning
  };
}

/**
 * Réalise une formule canonique {dice, die, bonus} pour la taille de dé voulue.
 * - dé identique au dé natif de la table  -> formule EXACTE (bonus imprimé conservé).
 * - dé différent -> on préserve la moyenne via buildFormula.
 *
 * @param {{dice:number, die:number, bonus:number}} canonical
 * @param {number} dieSize
 * @param {string[]} [warnings] Collecteur optionnel d'avertissements.
 * @param {string} [label]      Préfixe des avertissements collectés.
 * @returns {{diceCount:number, dieSize:number, bonus:number, formula:string, average:number, target:number, warning:(string|null)}}
 */
export function realizeFormula(canonical, dieSize, warnings, label) {
  const target = averageOfFormula(canonical.dice, canonical.die, canonical.bonus);
  if (dieSize === canonical.die) {
    return {
      diceCount: canonical.dice, dieSize, bonus: canonical.bonus,
      formula: formatFormula(canonical.dice, dieSize, canonical.bonus),
      average: target, target, warning: null
    };
  }
  const f = buildFormula({ target, dieSize, preferredDice: canonical.dice });
  if (f.warning && warnings) warnings.push(`${label} : ${f.warning}`);
  return f;
}

/**
 * Répartit un budget total de dégâts entre plusieurs attaques, aussi équitablement
 * que possible. Retourne un tableau de cibles (moyennes) par attaque.
 * @param {number} total
 * @param {number} attackCount
 * @returns {number[]}
 */
export function splitDamage(total, attackCount) {
  const n = Math.max(1, Math.round(attackCount));
  const per = total / n;
  return Array.from({ length: n }, () => per);
}
