/**
 * P4 — Interface du constructeur (ApplicationV2 + Handlebars, Foundry v13).
 * Ouvert depuis la sidebar Acteurs (création) ou depuis la fiche (édition/scale).
 */

import { MODULE_ID } from "../data/constants.mjs";
import {
  MONSTER_TYPES, ARMOR_TYPES, SIZE_CATEGORIES, DIE_SIZES, DAMAGE_TYPES as DMG_KEYS
} from "../data/constants.mjs";
import { ROLE_ORDER, ROLE_PRESETS } from "../data/role-presets.mjs";
import { TEMPLATE_ORDER, getTemplate } from "../data/effect-templates.mjs";
import {
  defaultRecipe, recipeFromRole, normalizeRecipe, readRecipe, scaledLevel,
  resolveLineOffsets, MAX_MANUAL_ADJUST
} from "../core/recipe.mjs";
import { scalingRefsEnabled } from "../features/level-scaling.mjs";
import { deriveResolved, createMonster, applyRecipe } from "../core/builder.mjs";
import { STANDARD_TABLE } from "../data/standard-table.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const L = (k) => game.i18n.localize(k);
/** Libellé i18n depuis un préfixe + valeur (ex. LB("NMB.Armor","none")). */
const LB = (prefix, v) => L(`${prefix}.${v}`);

/** Construit une liste d'options {value,label,selected}. */
function opts(values, current, labelFn) {
  return values.map((v) => ({ value: v, label: labelFn ? labelFn(v) : String(v), selected: String(v) === String(current) }));
}

/** Libellé d'une option de paramètre (dé, type de dégâts, condition, save...). */
function paramOptionLabel(v) {
  if (DMG_KEYS.includes(v)) return LB("NMB.Dmg", v);
  if (DIE_SIZES.includes(v)) return `d${v}`;
  return String(v);
}

export class MonsterBuilderApp extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
    this.recipe = options.recipe
      ?? (this.actor && readRecipe(this.actor))
      // Une recette neuve suit le réglage du monde ; une recette déjà existante
      // garde son propre choix, pour ne pas transformer un monstre figé.
      ?? defaultRecipe({ useScalingRefs: scalingRefsEnabled() });
    this.recipe = normalizeRecipe(this.recipe);
  }

  static DEFAULT_OPTIONS = {
    id: "nimble-monster-builder-app",
    tag: "form",
    classes: ["nmb-app"],
    window: { title: "NMB.BuilderTitle", icon: "fa-solid fa-dragon", resizable: true },
    position: { width: 760, height: "auto" },
    form: { handler: MonsterBuilderApp.#onChange, submitOnChange: true, closeOnSubmit: false },
    actions: {
      scaleUp: MonsterBuilderApp.#onScaleUp,
      scaleDown: MonsterBuilderApp.#onScaleDown,
      build: MonsterBuilderApp.#onBuild,
      removeAbility: MonsterBuilderApp.#onRemoveAbility
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/monster-builder.hbs` }
  };

  get title() {
    return this.actor
      ? `${L("NMB.BuilderTitle")} — ${this.actor.name}`
      : L("NMB.BuilderTitle");
  }

  /* ------------------------------ Contexte ------------------------------ */

  async _prepareContext() {
    const recipe = this.recipe;
    const stats = deriveResolved(recipe);
    const isNpc = recipe.monsterType === "npc";

    // Capacités ACTIVES uniquement (dans l'ordre de la recette), + liste des
    // capacités disponibles pour le menu déroulant d'ajout.
    const activeIds = new Set(recipe.abilities.map((a) => a.templateId));
    const activeAbilities = recipe.abilities.map((active) => {
      const id = active.templateId;
      const t = getTemplate(id);
      if (!t) return null;
      const params = (t.params ?? []).map((pd) => {
        const value = active.params?.[pd.key] ?? pd.default;
        const isSelect = pd.type === "select";
        return {
          key: pd.key,
          name: `ability.${id}.${pd.key}`,
          value,
          isSelect,
          isNumber: pd.type === "number",
          isText: pd.type === "text",
          options: isSelect ? opts(pd.options, value, paramOptionLabel) : []
        };
      });
      return {
        id,
        label: L(t.labelKey),
        costLabel: t.cost === 0 ? L("NMB.Free") : game.i18n.format("NMB.CostLine", { n: t.cost }),
        payName: `abilityPay.${id}`,
        payOptions: opts(["dmg", "hp", "level"], active.payWith ?? t.defaultPayWith ?? "dmg", (v) => LB("NMB.Pay", v)),
        params
      };
    }).filter(Boolean);

    const availableAbilities = TEMPLATE_ORDER
      .filter((id) => !activeIds.has(id))
      .map((id) => ({ value: id, label: L(getTemplate(id).labelKey) }))
      .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

    // Budget de lignes : d'où vient chaque décalage (rôle / manuel / capacités).
    const off = resolveLineOffsets(recipe);
    const budgetLines = [
      budgetLine(LB("NMB.Pay", "hp"), off.parts.role.hp, off.parts.manual.hp, off.parts.abilities.hp),
      budgetLine(LB("NMB.Pay", "dmg"), off.parts.role.dmg, off.parts.manual.dmg, off.parts.abilities.dmg)
    ].filter(Boolean);
    if (off.levelBump) {
      budgetLines.push({ label: LB("NMB.Pay", "level"), detail: "", total: game.i18n.format("NMB.CostLevel", { n: off.levelBump }) });
    }

    return {
      recipe,
      stats,
      attacksView: (stats.attacks ?? []).map((a) => ({
        label: a.label, formula: a.formula.formula, avg: Math.floor(a.formula.average)
      })),
      isNpc,
      isSolo: recipe.monsterType === "soloMonster",
      isEditing: Boolean(this.actor),
      buildLabel: this.actor ? L("NMB.Apply") : L("NMB.Create"),
      activeAbilities,
      availableAbilities,
      budgetLines,
      adjustMax: MAX_MANUAL_ADJUST,
      warnings: stats.warnings ?? [],
      armorLabel: LB("NMB.Armor", stats.armor),
      sizeLabel: LB("NMB.Size", stats.sizeCategory),
      // options de sélection
      monsterTypes: opts(MONSTER_TYPES, recipe.monsterType, (v) => LB("NMB.Type", v)),
      roles: opts(ROLE_ORDER, recipe.role, (v) => L(ROLE_PRESETS[v].labelKey)),
      levels: opts(STANDARD_TABLE.map((r) => r.level), recipe.level),
      soloLevels: opts(Array.from({ length: 20 }, (_, i) => String(i + 1)), recipe.level),
      armors: opts(ARMOR_TYPES, recipe.armor, (v) => LB("NMB.Armor", v)),
      sizes: opts(SIZE_CATEGORIES, recipe.size, (v) => LB("NMB.Size", v)),
      dice: opts(DIE_SIZES, recipe.dieSize, (v) => `d${v}`),
      attackModes: opts(["weakStrong", "single", "multi"], recipe.attackMode, (v) => LB("NMB.Mode", v)),
      attackTypes: opts(["", "reach", "range"], recipe.attackType, (v) => LB("NMB.AtkType", v)),
      damageTypes: opts(DMG_KEYS, recipe.damageType, (v) => LB("NMB.Dmg", v))
    };
  }

  /* ---------------------------- Lecture form ---------------------------- */

  #readForm(formData) {
    const e = foundry.utils.expandObject(formData.object);
    const prev = this.recipe;

    // Changement de rôle : (ré)applique le preset, puis on garde l'identité.
    if (e.role && e.role !== prev.role) {
      return normalizeRecipe(recipeFromRole(e.role, {
        name: e.name ?? prev.name,
        monsterType: e.monsterType ?? prev.monsterType,
        level: e.level ?? prev.level,
        size: e.size ?? prev.size,
        damageType: e.damageType ?? prev.damageType,
        creatureType: e.creatureType ?? prev.creatureType,
        // Le preset de rôle ne doit pas décider à la place de l'utilisateur :
        // ni du mode de scaling, ni des ajustements manuels qu'il a posés.
        useScalingRefs: prev.useScalingRefs,
        hpAdjust: e.hpAdjust ?? prev.hpAdjust,
        dmgAdjust: e.dmgAdjust ?? prev.dmgAdjust
      }));
    }

    const r = { ...prev };
    r.name = e.name ?? r.name;
    r.monsterType = e.monsterType ?? r.monsterType;
    r.role = e.role ?? r.role;
    r.level = e.level ?? r.level;
    r.armor = e.armor ?? r.armor;
    r.size = e.size ?? r.size;
    r.dieSize = Number(e.dieSize) || r.dieSize;
    r.attackMode = e.attackMode ?? r.attackMode;
    r.attackType = e.attackType ?? "";
    r.distance = Number(e.distance) || 1;
    r.damageType = e.damageType ?? r.damageType;
    // Champ vide = 0 : `Number("")` vaut 0, mais `undefined` doit garder l'ancien.
    r.hpAdjust = e.hpAdjust === undefined ? r.hpAdjust : Number(e.hpAdjust) || 0;
    r.dmgAdjust = e.dmgAdjust === undefined ? r.dmgAdjust : Number(e.dmgAdjust) || 0;
    r.creatureType = e.creatureType ?? "";
    r.isFlunky = Boolean(e.isFlunky);
    if (r.monsterType === "soloMonster") r.legendaryActions = Boolean(e.legendaryActions);

    // Capacités : on met à jour les params/payWith des capacités actives, et on
    // ajoute celle éventuellement choisie dans le menu déroulant.
    const params = e.ability ?? {};
    const pays = e.abilityPay ?? {};
    const abilities = prev.abilities.map((a) => ({
      templateId: a.templateId,
      params: coerceParams(a.templateId, params[a.templateId] ?? a.params ?? {}),
      payWith: pays[a.templateId] ?? a.payWith
    }));
    if (e.addAbility && !abilities.some((a) => a.templateId === e.addAbility)) {
      const t = getTemplate(e.addAbility);
      if (t) abilities.push({ templateId: e.addAbility, params: {}, payWith: t.defaultPayWith });
    }
    r.abilities = abilities;

    return normalizeRecipe(r);
  }

  /* ------------------------------ Handlers ------------------------------ */

  static async #onChange(event, form, formData) {
    this.recipe = this.#readForm(formData);
    this.render();
  }

  static #onScaleDown() {
    this.recipe.level = scaledLevel(this.recipe, -1);
    this.render();
  }

  static #onScaleUp() {
    this.recipe.level = scaledLevel(this.recipe, 1);
    this.render();
  }

  static #onRemoveAbility(event, target) {
    const id = target?.dataset?.id;
    this.recipe.abilities = this.recipe.abilities.filter((a) => a.templateId !== id);
    this.render();
  }

  static async #onBuild() {
    if (this.actor) {
      await applyRecipe(this.actor, this.recipe);
      ui.notifications.info(L("NMB.Applied"));
    } else {
      const actor = await createMonster(this.recipe, { renderSheet: false });
      if (actor) {
        this.actor = actor;
        this.recipe = readRecipe(actor) ?? this.recipe;
        ui.notifications.info(L("NMB.Created"));
      }
    }
    this.render();
  }
}

/** Nombre signé, avec le vrai signe moins typographique. */
function signed(n) {
  return `${n > 0 ? "+" : "−"}${Math.abs(n)}`;
}

/**
 * Une ligne du budget : « PV −1 rôle · −1 manuel · −1 capacités = −3 ».
 * Retourne null si aucune source ne décale cette stat.
 */
function budgetLine(label, role, manual, abilities) {
  const total = role + manual + abilities;
  if (!role && !manual && !abilities) return null;
  const bits = [];
  if (role) bits.push(`${signed(role)} ${L("NMB.Budget.role")}`);
  if (manual) bits.push(`${signed(manual)} ${L("NMB.Budget.manual")}`);
  if (abilities) bits.push(`${signed(abilities)} ${L("NMB.Budget.abilities")}`);
  return {
    label,
    detail: bits.join(" · "),
    total: game.i18n.format("NMB.Budget.total", { n: signed(total) })
  };
}

/** Convertit les params du formulaire selon le type déclaré du gabarit. */
function coerceParams(templateId, raw) {
  const t = getTemplate(templateId);
  const out = {};
  for (const pd of t.params ?? []) {
    let v = raw[pd.key];
    if (v === undefined) v = pd.default;
    if (pd.type === "number") v = Number(v) || 0;
    else if (pd.type === "select" && DIE_SIZES.includes(Number(v))) v = Number(v);
    out[pd.key] = v;
  }
  return out;
}
