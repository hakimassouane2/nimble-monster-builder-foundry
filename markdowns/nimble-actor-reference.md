# Référence : Acteurs FoundryVTT — Système Nimble

> Documentation établie à partir du code source de [FoundryVTT-Nimble](https://github.com/Nimble-Co/FoundryVTT-Nimble) (v0.8.7, Foundry v13, branche `main`, juillet 2026).
> Objectif : servir de spécification cible pour un convertisseur *statblock PF2e/PF1e/D&D 5e → acteur Nimble*.

---

## 1. Vue d'ensemble

Le système déclare **4 types d'acteurs** (`system.json → documentTypes.Actor`) :

| Type | Usage | Modèle de données |
|---|---|---|
| `character` | Personnage joueur | `CharacterDataModel.ts` |
| `npc` | Monstre/PNJ standard | `NPCDataModel.ts` |
| `minion` | Sbire (HP par défaut = 1, attaques de groupe) | `MinionDataModel.ts` |
| `soloMonster` | Monstre légendaire/solo (phases Bloodied & Last Stand) | `SoloMonsterDataModel.ts` |

**Pour un convertisseur de statblocks, les cibles sont `npc`, `minion` et `soloMonster`.** La logique officielle de sélection (importeur Nimble Nexus, `determineActorType`) :

```
legendary → soloMonster
minion    → minion
sinon     → npc
```

Les capacités du monstre (traits, actions, phases) ne sont **pas** dans `system` : ce sont des **items embarqués** de type `monsterFeature` (voir §5).

### Concepts Nimble essentiels à la conversion

- **Pas de jets d'attaque pour les monstres** : les actions infligent directement des dégâts (le d20 est remplacé par la mécanique du "primary die" sur la formule de dégâts : miss/crit sur le dé principal).
- **Sauvegardes par avantage/désavantage**, pas par bonus numérique : le champ clé est `defaultRollMode` (entier, voir §4).
- **4 caractéristiques seulement** : `strength`, `dexterity`, `intelligence`, `will`. Les monstres (`npc`/`minion`/`soloMonster`) **n'ont pas de champ `abilities`** — uniquement `savingThrows`.
- **Armure de monstre qualitative** : `none` / `medium` / `heavy` (chaîne), pas une CA numérique.
  - `medium` : ignore les modificateurs de dégâts, ne subit que la somme des dés.
  - `heavy` : ignore les modificateurs et subit la **moitié** de la somme des dés (arrondi sup.).
- **`level` est une chaîne** (`"1"`, `"14"`, mais aussi `"1/4"`, `"1/2"` possibles).
- Distances en **cases** (1 case = 6 ft), champ `movement.walk` initial = 6.

---

## 2. Structure générale d'un document Actor

```jsonc
{
  "name": "Glabrezu",
  "type": "npc",                    // character | minion | npc | soloMonster
  "img": "icons/....webp",          // portrait
  "system": { ... },                // données du type (voir §3)
  "prototypeToken": { ... },        // voir §8
  "items": [ ... ],                 // monsterFeature embarqués (voir §5)
  "effects": [],                    // ActiveEffects (type "condition")
  "folder": null,
  "flags": {}
}
```

---

## 3. Schéma `system` des monstres

### 3.1 `npc` (= `minion` et `soloMonster` à deux différences près)

```jsonc
{
  "attributes": {
    "armor": "none",                    // "none" | "medium" | "heavy"
    "damageResistances": [],            // string[] — clés de damageTypes (§7)
    "damageVulnerabilities": [],        // string[]
    "damageImmunities": [],             // string[]
    "hp": {
      "max": 10,                        // number (défaut 10 ; minion: 1)
      "temp": 0,
      "value": 10
    },
    "movement": {                       // entiers ≥ 0, en cases
      "walk": 6, "fly": 0, "swim": 0, "climb": 0, "burrow": 0
    },
    "sizeCategory": "medium"            // tiny|small|medium|large|huge|gargantuan
  },
  "description": "",                    // HTMLField
  "details": {
    "creatureType": "",                 // texte libre ("Horrors", "Goblinoid"...)
    "isFlunky": false,                  // ⚠️ NPC UNIQUEMENT
    "level": "1"                        // string !
  },
  "attackSequence": "",                 // HTMLField (legacy — préférer l'item subtype attackSequence)
  "savingThrows": { ... }               // voir §4
}
```

**Différences entre les trois types monstres :**

| Champ | `npc` | `minion` | `soloMonster` |
|---|---|---|---|
| `details.isFlunky` | ✅ | ❌ | ❌ |
| `hp.max/value` initial | 10 | **1** | 10 |
| Phases Bloodied/LastStand (items) | non utilisées | non utilisées | ✅ attendues |

- `isFlunky: true` → l'acteur ne peut pas infliger de coups critiques (`ItemActivationManager` désactive `canCrit`). Les minions non plus, par nature du type.
- `hp.max` est une valeur **stockée** (pas dérivée) pour les monstres.

### 3.2 `character` (résumé — hors périmètre conversion monstre)

Champs additionnels notables : `abilities` (4 caracs avec `baseValue` ≤ 12, `bonus`, `mod`, `defaultRollMode`), `skills` (10 compétences : arcana, examination, finesse, influence, insight, lore, might, naturecraft, perception, stealth — chacune `{bonus, defaultRollMode, mod, points}`), `attributes.armor` (formule `baseValue: "@dexterity"` + `components[]` add/multiply/override), `attributes.hitDice` (Record taille→{current, origin[]}), `attributes.wounds`, `attributes.initiative`, `classData`, `currency` (cp/sp/gp), `proficiencies` (armor/languages/weapons), `resources` (inspiration, mana, highestUnlockedSpellTier), `levelUpHistory`, `inventory.bonusSlots`, `details` (age/gender/height/weight/notes).

---

## 4. Sauvegardes (`savingThrows`)

Présent sur **tous** les types d'acteurs. Quatre clés : `strength`, `dexterity`, `intelligence`, `will`.

```jsonc
"savingThrows": {
  "strength":     { "bonus": 0, "defaultRollMode": 0, "mod": 0 },
  "dexterity":    { "bonus": 0, "defaultRollMode": 0, "mod": 0 },
  "intelligence": { "bonus": 0, "defaultRollMode": 0, "mod": 0 },
  "will":         { "bonus": 0, "defaultRollMode": 0, "mod": 0 }
}
```

- `defaultRollMode` : entier borné **[-3, +3]**.
  - `-1` = désavantage, `0` = normal, `+1` = avantage, `±2` = double, etc.
- `mod` est **dérivé** (`mod = bonus` recalculé dans `prepareDerivedData`) — inutile de le renseigner soigneusement à l'import ; les packs officiels le laissent à 0.
- Conversion depuis une sauvegarde chiffrée (5e/PF) : c'est un choix de design du convertisseur. La référence Nimble Nexus mappe simplement `valeur < 0 → -1`, `> 0 → +1`, `= 0 → 0` (fonction `saveValueToRollMode`).

---

## 5. Items embarqués : `monsterFeature`

Tout le contenu jouable d'un statblock devient un item de type `monsterFeature`, différencié par `system.subtype` :

| `subtype` | Rôle | Icône par défaut |
|---|---|---|
| `feature` | Trait passif | `icons/svg/item-bag.svg` |
| `action` | Action/attaque | `icons/svg/sword.svg` |
| `attackSequence` | Conteneur "séquence d'attaque" (parent des actions) | `icons/svg/sword.svg` |
| `bloodied` | Phase Bloodied (soloMonster) | `icons/svg/blood.svg` |
| `lastStand` | Phase Last Stand (soloMonster) | `icons/svg/combat.svg` |

### 5.1 Schéma complet d'un `monsterFeature`

```jsonc
{
  "_id": "<16 chars randomID>",
  "name": "Doomclaw (2×).",
  "type": "monsterFeature",
  "img": "icons/svg/sword.svg",
  "system": {
    // — hérité de BaseItem —
    "macro": "",
    "identifier": "",                 // slug ("attack-sequence" pour le conteneur)
    "grantedById": undefined,         // optionnel
    "rules": [],                      // système de règles (ObjectField[], hors périmètre monstre)

    // — propre à monsterFeature —
    "description": "<p>...</p>",      // HTML
    "subtype": "action",
    "parentItemId": "",               // _id de l'item attackSequence parent (pour grouper les actions)
    "lastStandHp": 0,                 // utilisé seulement si subtype === "lastStand" :
                                      // HP auquel l'acteur est soigné quand il tomberait à 0
                                      // (applique conditions lastStand+dying). 0 = désactivé.

    // — bloc activation (commun aux items activables) —
    "activation": { ... }             // voir §5.2
  },
  "effects": [], "folder": null, "sort": 0, "flags": {}
}
```

### 5.2 Bloc `activation`

```jsonc
"activation": {
  "acquireTargetsFromTemplate": false,   // true si gabarit AoE cible automatiquement
  "cost": {
    "details": "",
    "quantity": 1,                       // ≥ 1
    "type": "none",                      // action|minute|hour|none|special|turn
    "isReaction": false
  },
  "duration": {
    "details": "",
    "quantity": 1,
    "type": "none"                       // action|minute|hour|none|round|turn|special
  },
  "effects": [ ... ],                    // ARBRE D'EFFETS — voir §6
  "showDescription": true,
  "targets": {
    "count": 1,
    "restrictions": "",
    "attackType": "",                    // "" | "reach" | "range"
    "distance": 1                        // en cases (reach 2 = allonge, range N = portée)
  },
  "template": {
    "shape": "",                         // "" | circle | cone | emanation | line | square
    "length": 1, "width": 1, "radius": 1
  }
}
```

Convention de l'importeur officiel : les **actions** de monstre ont `duration.type: "action"` et `cost.type: "none"` ; les traits passifs ont tout à `"none"`.

---

## 6. Arbre d'effets (`activation.effects`) — `types/effectTree.d.ts`

C'est le cœur mécanique d'une action. Tableau de nœuds `EffectNode` ; les conséquences conditionnelles sont imbriquées via `on: ActionConsequence`.

```ts
type ActionConsequence = {
  criticalHit?: EffectNode[];
  hit?: EffectNode[];
  miss?: EffectNode[];
  failedSave?: EffectNode[];
  failedSaveBy?: Record<number, EffectNode[]>;  // marge d'échec
  passedSave?: EffectNode[];
};
```

Tous les nœuds portent : `id` (randomID 16), `parentContext` (nom de la branche : `"hit"`, `"failedSave"`… ou `null` à la racine), `parentNode` (id du nœud parent ou `null`).

### DamageNode
```jsonc
{
  "id": "...", "type": "damage",
  "damageType": "slashing",         // clé de damageTypes (§7)
  "formula": "3d6+10",
  "canCrit": true,                  // false pour AoE, minions et flunkies
  "canMiss": true,
  "ignoreArmor": false,             // optionnel
  "targetDisposition": "hostile",   // optionnel: any|friendly|neutral|hostile|secret
  "on": { "hit": [ ...nœuds enfants... ] },
  "parentContext": null, "parentNode": null
}
```

### DamageOutcomeNode (feuille dans une branche `on`)
```jsonc
{ "type": "damageOutcome", "outcome": "fullDamage",   // fullDamage | halfDamage
  "parentContext": "hit", "parentNode": "<id du damage>" }
```
⚠️ **Pattern obligatoire** : un `DamageNode` avec `canMiss/canCrit` doit contenir dans `on.hit` un `damageOutcome: fullDamage` pour que les dégâts s'appliquent au toucher. Pour "moitié des dégâts en cas de save réussi" : `on.passedSave → damageOutcome: halfDamage`.

### SavingThrowNode
```jsonc
{ "type": "savingThrow",
  "savingThrowType": "dexterity",   // strength|dexterity|intelligence|will
  "saveDC": 12,                     // optionnel
  "sharedRolls": [ ...DamageNode ],// dés partagés entre cibles
  "on": { "failedSave": [...], "passedSave": [...] } }
```
(`saveType` existe mais est **déprécié** — utiliser `savingThrowType`.)

### ConditionNode
```jsonc
{ "type": "condition", "condition": "grappled" }   // clé de conditions (§7)
```

### HealingNode
```jsonc
{ "type": "healing", "healingType": "healing",     // healing | tempHealing
  "formula": "2d6" }
```

### TextNode
```jsonc
{ "type": "note", "noteType": "reminder",          // flavor|general|reminder|warning
  "text": "La cible est repoussée de 2 cases." }
```

### PoolNode (pools de dés/charges — rare pour les monstres)
`{ type: "pool", poolType: "dice"|"charge", action: "rollDie"|"rollPool"|"fillCount"|"clear", poolIdentifier, value }`

---

## 7. Énumérations de référence (`src/config.ts`)

**damageTypes** : `acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder`
(≃ 5e sans `slashing/piercing/bludgeoning` magiques ; mapper *magical X* → X.)

**conditions** (status effects) : `blinded, bloodied, charged, charmed, concentration, confused, dazed, dead, despair, distracted, dying, frightened, grappled, hampered, incapacitated, invisible, lastStand, paralyzed, petrified, poisoned, prone, restrained, riding, silenced, slowed, stunned, smoldering, taunted, unconscious, wounded`

**sizeCategory** : `tiny, small, medium, large, huge, gargantuan`

**activation cost types** : `action, minute, hour, none, special, turn` · **duration types** : idem + `round`

**armure monstre** : `none, medium, heavy` (abréviations affichées : `-`, `M`, `H`)

**armure PJ (proficiencies)** : `cloth, leather, mail, plate, shield`

**languages** : `common, dwarvish, elvish, goblin, infernal, thievesCant, celestial, ...`

Mapping conversion suggéré pour l'armure : CA "faible" (déshabillé/naturelle légère) → `none` ; CA moyenne / armure intermédiaire → `medium` ; forte CA, plates, carapaces épaisses → `heavy`.

---

## 8. `prototypeToken` — conventions de l'importeur officiel

```jsonc
"prototypeToken": {
  "name": "<nom>",
  "displayName": 50,                    // OWNER_HOVER
  "actorLink": false,
  "width": 2, "height": 2,              // selon la taille, voir tableau
  "texture": { "src": "<img>", "scaleX": 1, "scaleY": 1 },
  "lockRotation": true,
  "disposition": -1,                    // HOSTILE
  "displayBars": 0,                     // 40 (OWNER) pour soloMonster, 0 sinon
  "bar1": { "attribute": "attributes.hp" }
}
```

| sizeCategory | width × height |
|---|---|
| tiny / small | 0.5 |
| medium | 1 |
| large | 2 |
| huge | 3 |
| gargantuan | 4 |

---

## 9. Exemple complet minimal (NPC avec une attaque)

```json
{
  "name": "Gobelin lame-vive",
  "type": "npc",
  "img": "icons/svg/mystery-man.svg",
  "system": {
    "attributes": {
      "armor": "medium",
      "damageResistances": [], "damageVulnerabilities": [], "damageImmunities": [],
      "hp": { "max": 22, "temp": 0, "value": 22 },
      "movement": { "walk": 6, "fly": 0, "swim": 0, "climb": 0, "burrow": 0 },
      "sizeCategory": "small"
    },
    "description": "",
    "details": { "creatureType": "Goblinoid", "isFlunky": false, "level": "2" },
    "attackSequence": "",
    "savingThrows": {
      "strength":     { "bonus": 0, "defaultRollMode": -1, "mod": 0 },
      "dexterity":    { "bonus": 0, "defaultRollMode": 1,  "mod": 0 },
      "intelligence": { "bonus": 0, "defaultRollMode": 0,  "mod": 0 },
      "will":         { "bonus": 0, "defaultRollMode": -1, "mod": 0 }
    }
  },
  "prototypeToken": {
    "name": "Gobelin lame-vive", "displayName": 50, "actorLink": false,
    "width": 0.5, "height": 0.5,
    "texture": { "src": "icons/svg/mystery-man.svg", "scaleX": 1, "scaleY": 1 },
    "lockRotation": true, "disposition": -1, "displayBars": 0,
    "bar1": { "attribute": "attributes.hp" }
  },
  "items": [
    {
      "_id": "a1b2c3d4e5f6g7h8",
      "name": "Coup de dague.",
      "type": "monsterFeature",
      "img": "icons/svg/sword.svg",
      "system": {
        "macro": "", "identifier": "", "rules": [],
        "activation": {
          "acquireTargetsFromTemplate": false,
          "cost": { "details": "", "quantity": 1, "type": "none", "isReaction": false },
          "duration": { "details": "", "quantity": 1, "type": "action" },
          "effects": [
            {
              "id": "e1e2e3e4e5e6e7e8", "type": "damage",
              "damageType": "piercing", "formula": "1d6+2",
              "canCrit": true, "canMiss": true,
              "parentContext": null, "parentNode": null,
              "on": {
                "hit": [
                  { "id": "f1f2f3f4f5f6f7f8", "type": "damageOutcome",
                    "outcome": "fullDamage",
                    "parentContext": "hit", "parentNode": "e1e2e3e4e5e6e7e8" }
                ]
              }
            }
          ],
          "showDescription": true,
          "targets": { "count": 1, "restrictions": "", "attackType": "", "distance": 1 },
          "template": { "length": 1, "radius": 1, "shape": "", "width": 1 }
        },
        "description": "",
        "subtype": "action",
        "parentItemId": "",
        "lastStandHp": 0
      },
      "effects": [], "folder": null, "sort": 0, "flags": {}
    }
  ],
  "effects": [], "folder": null, "flags": {}
}
```

Pour un `soloMonster`, ajouter dans `items` : un item `attackSequence` (les actions pointent vers lui via `parentItemId`), un item `bloodied` et un item `lastStand` (avec `lastStandHp` > 0 si le mécanisme auto est voulu), et retirer `isFlunky` de `details`.

---

## 10. Ressource clé : l'importeur Nimble Nexus (référence de pipeline)

Le repo contient déjà un importeur complet (`src/import/nimbleNexus/`) qui fait exactement notre travail cible, mais depuis l'API nimble.nexus. À réutiliser comme modèle :

- `NimbleNexusParser.ts` — assemblage complet de l'`Actor.CreateData` (fonctions `toActorData`, `createActionItem`, `createAbilityItem`, `createAttackSequenceItem`, `createBloodiedItem`, `createLastStandItem`).
- `descriptionParser.ts` — parsing de texte libre → arbre d'effets : `extractDiceFormula`, `parseDamageType`, `parseSavingThrow`, `parseConditions`, `parseRangeReach` (détecte reach/range/cone/line/burst), `buildEffectTree`. Couvert par 1500+ lignes de tests (`descriptionParser.test.ts`) — précieux corpus de patterns textuels.
- `constants.ts` — `SAVE_STAT_MAP`, `saveValueToRollMode`, `SIZE_TO_TOKEN_DIMENSIONS`, `DAMAGE_TYPE_MAP`, `FEATURE_SUBTYPES`, `DEFAULT_FEATURE_ICONS`.

Autre corpus de vérité : les packs `packs/monsters/core/**.json` et `packs/legendaryMonsters/core/**.json` — des centaines d'acteurs officiels sérialisés, parfaits comme jeux de tests de non-régression pour le convertisseur.

---

## 11. Pièges & notes pour le convertisseur

1. **`details.level` est une chaîne**, pas un nombre. Les fractions (`"1/3"`, `"1/2"`) sont valides.
2. **`isFlunky` n'existe que sur `npc`** — l'inclure sur `minion`/`soloMonster` polluerait les données.
3. **Pas d'`abilities` ni de `skills` sur les monstres.** Les mods de caracs 5e/PF se traduisent en `savingThrows.defaultRollMode` (avantage/désavantage) et dans les formules de dégâts.
4. Un `DamageNode` sans `damageOutcome` dans `on.hit` n'appliquera rien au toucher — toujours générer la feuille `fullDamage`.
5. `canCrit: false` pour les AoE (`acquireTargetsFromTemplate: true`), les minions et les flunkies.
6. Les distances 5e en pieds → cases : diviser par 6 (Nimble : 1 case = 6 ft) et arrondir raisonnablement (reach 10 ft → `distance: 2`).
7. `hp.max` des monstres est stocké tel quel ; convertir les HP 5e/PF nécessite un **rééquilibrage** (les HP Nimble sont calibrés différemment) — c'est une décision de design du convertisseur, pas un simple mapping.
8. Le champ acteur `system.attackSequence` (HTML) existe encore mais l'approche moderne est l'item `subtype: "attackSequence"` + `parentItemId`.
9. Générer les `_id` d'items embarqués et les `id` de nœuds d'effets au format Foundry `randomID(16)` (16 caractères alphanumériques).
10. Le schéma valide/complète les champs manquants à la création (`Actor.create`) — un JSON partiel mais bien typé passe ; les packs officiels omettent d'ailleurs `movement` parfois.
11. **`template.shape`** : s'en tenir aux options du schéma (`circle`, `cone`, `emanation`, `line`, `square`). L'importeur Nimble Nexus écrit parfois `"burst"`, valeur hors schéma — pour une explosion/rayonnement, préférer `emanation` (centrée sur soi) ou `circle` (point distant).
