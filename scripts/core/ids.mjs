/**
 * Génération d'identifiants au format Foundry randomID(16).
 * Utilise foundry.utils.randomID quand disponible (dans Foundry), sinon un
 * repli local (pour les tests Node).
 */

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function randomID(length = 16) {
  const f = globalThis.foundry?.utils?.randomID;
  if (typeof f === "function") return f(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}
