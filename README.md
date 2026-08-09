# Nimble Monster Builder

Module Foundry VTT (v13) pour le système **Nimble** : construis et **scale** des monstres en un clic à partir des tables du *Guide du Maître*. Choisis un niveau, une armure, un rôle et un thème de dé, coche des capacités — le module génère un acteur Nimble complet (PV, Save DC, attaques faible/forte, effets, description) et sait le **re-dériver à n'importe quel niveau**.

## Fonctionnalités

- **Construction guidée par les tables** : toutes les valeurs (PV, budget de dégâts, Save DC, HP Last Stand) proviennent *exactement* des tables du GMG — jamais interpolées.
- **Scaling re-dérivé** : un monstre créé au niveau 3 se scale au niveau 2 (ou 12) instantanément ; PV, formules et description se régénèrent, **tes items ajoutés à la main sont préservés**.
- **Attaques faible / forte** : dès le niveau 1, deux attaques alternatives (colonnes « simple » et « (2×) » de la table). Modes *Simple* et *Multi-attaque* également disponibles.
- **3 types de monstres** : PNJ standard, Minion (PV 1, jamais de crit), Légendaire/Solo (phases **Ensanglanté** + **Dernier sursaut**, 2 attaques Petite/Grosse, 4 actions légendaires optionnelles).
- **Catalogue de capacités cochables** : Pousse, Renverse, Agrippe, condition au toucher/critique, dégâts bonus sur dégâts, souffle en cône (save), invocation de minions, variante à distance, Bouclier de chair, résistances/immunités/vulnérabilités, allonge…
- **Comptabilité de coût automatique** : chaque capacité coûte une ligne de PV, de dégâts, ou +1 niveau (règle Nimble), appliquée en direct.
- **Ajustement manuel des leviers** : champs *Ajuster PV* / *Ajuster dégâts* pour descendre (ou monter) de N lignes **sans changer le niveau du monstre** — de quoi pré-payer les capacités que tu écris toi-même. L'aperçu détaille le budget : ce qui vient du rôle, du manuel et des capacités.
- **Presets de rôle** : Frappeur, Défenseur, Contrôleur, etc. appliquent des défauts surchargeables (+ un mode « Monstre normal » neutre).
- **Descriptions façon 5e** : Save DC et moyenne de dégâts `(N)` (arrondie à l'inférieur) dans le statblock et chaque attaque.
- **Interface complète** (ApplicationV2) avec aperçu live, et **i18n FR / EN**.

## Installation

Le dossier `nimble-monster-builder` se place dans `Data/modules/` de Foundry. Active ensuite le module dans **Configuration › Gérer les modules**. Nécessite le système **Nimble** (≥ 0.8.7) et **Foundry v13**.

## Utilisation

- **Créer un monstre** : onglet *Acteurs* → bouton **« 🐉 Constructeur de monstre »** en haut. Règle les champs, coche des capacités, clique **Créer**.
- **Éditer / scaler un monstre existant** : **clic droit** sur l'acteur dans la liste → **« Nimble Monster Builder »**. Utilise les boutons **Niveau −/+** pour scaler, puis **Appliquer**.
- Les items générés par le module sont marqués `flags.nimble-monster-builder.generated = true`. Un re-build les supprime et les régénère ; **tout item que tu ajoutes toi-même reste intact**.

## API console

Exposée via `game.modules.get("nimble-monster-builder").api` :

```js
const api = game.modules.get("nimble-monster-builder").api;
api.open();                 // ouvre le builder (création)
api.open(actor);            // ouvre le builder sur un acteur
await api.createMonster(api.defaultRecipe({ monsterType:"npc", level:"3", armor:"medium" }));
await api.scaleMonster(actor, -1);           // scale de -1 niveau
api.deriveStats({ ... });   // stats brutes depuis une recette
```

## Architecture

Module ESM **sans étape de build** (drop-in). La couche données/calcul est du JavaScript pur, testable hors Foundry.

```
scripts/
  data/    tables (standard/légendaire/minion), enums, presets de rôle, catalogue d'effets, libellés
  core/    formula (budget↔dés), derive (stats), recipe (recette + flags), effect-tree, builder, statblock
  apps/    monster-builder-app (ApplicationV2)
  module.mjs  bootstrap, API, boutons UI
templates/  monster-builder.hbs
lang/       fr.json, en.json
tests/      *.selftest.mjs (lançables avec `node tests/<x>.selftest.mjs`)
```

Le **scaling re-dérivé** repose sur une *recette* stockée dans `actor.flags.nimble-monster-builder.recipe` : elle décrit tout (type, niveau, armure, dé, capacités…) pour régénérer le monstre à n'importe quel niveau.

## Tests

```bash
node tests/math.selftest.mjs       # maths budget↔formule, tables
node tests/builder.selftest.mjs    # assemblage acteur, items, scale
node tests/abilities.selftest.mjs  # catalogue d'effets + coût
```

## Crédits

Basé sur le système [FoundryVTT-Nimble](https://github.com/Nimble-Co/FoundryVTT-Nimble). Les valeurs de construction proviennent du *Nimble Game Master's Guide*.
