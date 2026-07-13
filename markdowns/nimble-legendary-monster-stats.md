# Table de construction des monstres Nimble — légendaires (soloMonster)

> **Source unique de vérité chiffrée** pour les `soloMonster`. Toute stat (HP, dégâts, DC, lastStandHp) DOIT provenir de la ligne correspondant au niveau choisi.
> ⚠️ Contrairement aux monstres standards, ces stats sont indexées sur le **NIVEAU DU GROUPE de héros** (Party Level), et restent identiques quel que soit le nombre de héros.

## Table des stats par niveau de groupe

| Niveau groupe | HP armure M | HP armure H | HP Last Stand | Save DC | Dégâts attaque Petite | Dégâts attaque Grosse |
|:-------------:|:-----------:|:-----------:|:-------------:|:-------:|:---------------------:|:---------------------:|
| 1 | 50 | 35 | 10 | 10 | 8 | 16 |
| 2 | 75 | 55 | 20 | 11 | 9 | 18 |
| 3 | 100 | 75 | 30 | 11 | 10 | 20 |
| 4 | 125 | 95 | 40 | 12 | 11 | 22 |
| 5 | 150 | 115 | 50 | 12 | 12 | 24 |
| 6 | 175 | 135 | 60 | 13 | 13 | 26 |
| 7 | 200 | 155 | 70 | 13 | 14 | 28 |
| 8 | 225 | 175 | 80 | 14 | 15 | 30 |
| 9 | 250 | 195 | 90 | 14 | 16 | 32 |
| 10 | 275 | 215 | 100 | 15 | 17 | 34 |
| 11 | 300 | 235 | 110 | 15 | 18 | 36 |
| 12 | 325 | 255 | 120 | 16 | 19 | 38 |
| 13 | 350 | 275 | 130 | 16 | 20 | 40 |
| 14 | 375 | 295 | 140 | 17 | 21 | 42 |
| 15 | 400 | 315 | 150 | 17 | 22 | 44 |
| 16 | 425 | 335 | 160 | 18 | 23 | 46 |
| 17 | 450 | 355 | 170 | 18 | 24 | 48 |
| 18 | 475 | 375 | 180 | 19 | 25 | 50 |
| 19 | 500 | 395 | 190 | 19 | 26 | 52 |
| 20 | 525 | 415 | 200 | 20 | 27 | 54 |

## Lecture de la table

- **Niveau** : choisir la ligne du niveau du groupe visé. Pour un boss plus facile : ligne 1-2 niveaux plus bas ; plus dur : 1-2 plus haut. `details.level` de l'acteur = ce niveau.
- **HP** : valeur EXACTE de la colonne d'armure. Un légendaire a **typiquement au moins l'armure Medium** ; s'il est sans armure, lui donner une autre capacité défensive ET des HP majorés (multiplicateurs de `legendary-monsters.md` : sans armure = HP armure M × 1,25, arrondi).
- **HP Last Stand** : à reporter dans le champ `lastStandHp` de l'item `monsterFeature` subtype `lastStand` (quand le monstre tomberait à 0 HP, il est soigné à cette valeur et entre en Last Stand).
- **Save DC** : pour tout `saveDC` de SavingThrowNode.
- **Dégâts** : deux attaques exactement, structure imposée du légendaire :
  - **Petite attaque** : dégâts moyens ≈ colonne « Petite » ; elle inclut du mouvement ou de l'utilité (repositionnement, poussée, condition...).
  - **Grosse attaque** : dégâts moyens ≈ colonne « Grosse » ; forte mais sans utilité, à utiliser quand le monstre est déjà en position.
  - Convertir ces valeurs plates en formule de dés de moyenne équivalente (ex. niveau 5 : Petite 12 → 2d8+3 ; Grosse 24 → 4d8+6). d8 par défaut ; d12/d20 pour les créatures colossales, tant que la moyenne colle.

## Structure obligatoire d'un légendaire

- **Agit après CHAQUE tour de héros** (pas après les minions/suivants).
- **Saves** : avantage/désavantage comme les héros (STR++ = avantage 2 → `defaultRollMode: 2`).
- **Bloodied** (item subtype `bloodied`) : à 50% HP, gagne une capacité dangereuse supplémentaire — décrite dans cet item.
- **Last Stand** (item subtype `lastStand`) : à 0 HP, le monstre est mourant et gagne de nouvelles capacités dangereuses ; il meurt après un petit montant de dégâts additionnels (= colonne HP Last Stand). Situation TRÈS dangereuse pour les héros, pensée pour durer 2-4 tours.
- Calibrage global : ~15 tours de héros pour atteindre le Last Stand.
- Un bon légendaire est un **puzzle** : des mécaniques que les héros doivent percer (via Assess ou préparation), pas juste un sac de HP.

## Actions optionnelles par défaut (utilisables en description/attackSequence)

Chaque légendaire peut remplacer ses attaques par : **Wind Up/Inspiration** (récupère une capacité à usage unique) · **Rugissement terrible/Monologue** (save WIL ou Frightened 1 tour) · **Projection/Poussée télékinétique** (save STR ou déplacé/Prone) · **Jauger/Repérer la faille** (save DEX ou la prochaine attaque du monstre a l'avantage et ne peut pas être Interposée).
