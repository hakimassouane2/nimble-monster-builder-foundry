/**
 * Constantes partagées du module.
 */

export const MODULE_ID = "nimble-monster-builder";

/** Clés de flags. */
export const FLAGS = {
  /** flags[MODULE_ID].recipe sur l'acteur : la recette de construction. */
  RECIPE: "recipe",
  /** flags[MODULE_ID].generated sur un item : true si créé par le builder. */
  GENERATED: "generated",
  /** flags[MODULE_ID].slot sur un item : identifiant logique du slot généré. */
  SLOT: "slot"
};

/** Types d'acteurs Nimble ciblés par le builder. */
export const MONSTER_TYPES = /** @type {const} */ (["npc", "minion", "soloMonster"]);

/** Types d'armure des monstres (chaîne qualitative Nimble). */
export const ARMOR_TYPES = /** @type {const} */ (["none", "medium", "heavy"]);

/** Colonne HP de la table standard correspondant à chaque armure. */
export const ARMOR_HP_COLUMN = {
  none: "hpNone",
  medium: "hpMedium",
  heavy: "hpHeavy"
};

/** Tailles de créature (sizeCategory). */
export const SIZE_CATEGORIES = /** @type {const} */ ([
  "tiny", "small", "medium", "large", "huge", "gargantuan"
]);

/** width/height du prototypeToken selon la taille (cf. §8 de la référence). */
export const SIZE_TO_TOKEN_DIMENSIONS = {
  tiny: 0.5,
  small: 0.5,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4
};

/** Types de dégâts valides (config.ts du système). */
export const DAMAGE_TYPES = /** @type {const} */ ([
  "acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
  "piercing", "poison", "psychic", "radiant", "slashing", "thunder"
]);

/** Conditions / status effects valides. */
export const CONDITIONS = /** @type {const} */ ([
  "blinded", "bloodied", "charged", "charmed", "concentration", "confused",
  "dazed", "dead", "despair", "distracted", "dying", "frightened", "grappled",
  "hampered", "incapacitated", "invisible", "lastStand", "paralyzed", "petrified",
  "poisoned", "prone", "restrained", "riding", "silenced", "slowed", "stunned",
  "smoldering", "taunted", "unconscious", "wounded"
]);

/** Caractéristiques / clés de sauvegarde. */
export const SAVE_STATS = /** @type {const} */ (["strength", "dexterity", "intelligence", "will"]);

/** Formes de gabarit (template.shape) valides. */
export const TEMPLATE_SHAPES = /** @type {const} */ ([
  "circle", "cone", "emanation", "line", "square"
]);

/** Tailles de dé sélectionnables pour le thème de dégâts. */
export const DIE_SIZES = /** @type {const} */ ([4, 6, 8, 10, 12, 20]);

/** Icônes par défaut par subtype de monsterFeature. */
export const DEFAULT_FEATURE_ICONS = {
  feature: "icons/svg/item-bag.svg",
  action: "icons/svg/sword.svg",
  attackSequence: "icons/svg/sword.svg",
  bloodied: "icons/skills/wounds/blood-drip-droplet-red.webp",
  lastStand: "icons/skills/wounds/injury-face-impact-orange.webp"
};

/** Icônes des attaques faible / forte. */
export const ATTACK_ICONS = {
  weak: "icons/skills/melee/strike-sword-gray.webp",
  strong: "icons/skills/melee/strike-sword-blood-red.webp"
};
