# Table de construction des monstres Nimble — standards (npc / minion)

> **Source unique de vérité chiffrée** pour la conversion des monstres standards. Toute stat (HP, dégâts, DC) DOIT provenir de la ligne correspondant au niveau choisi. Aucune valeur hors table.
> Pour les monstres légendaires (`soloMonster`), utiliser `nimble-legendary-monster-stats.md`.

## Table des stats par niveau

| Niveau | HP sans armure | HP armure M | HP armure H | Dégâts par tour | Dés d'attaque type | Save DC | CR équiv. (5e) |
|:------:|:--------------:|:-----------:|:-----------:|:---------------:|:------------------:|:-------:|:--------------:|
| 1/4 | 12 | 9 | 7 | 3 | 1d4+1 | 9 | 1/8 |
| 1/3 | 15 | 11 | 8 | 5 | 1d6+2 | 9 | 1/4 |
| 1/2 | 18 | 15 | 11 | 7 | 1d6+3 | 10 | 1/4 |
| 1 | 26 | 20 | 16 | 11 | 2d8+2 *ou* (2×) 1d8+1 | 10 | 1/2 |
| 2 | 34 | 27 | 20 | 13 | 2d8+4 *ou* (2×) 1d8+3 | 11 | 1 |
| 3 | 41 | 33 | 25 | 15 | 2d8+6 *ou* (2×) 1d8+4 | 11 | 1 |
| 4 | 49 | 39 | 29 | 18 | 2d8+9 *ou* (2×) 1d8+5 | 12 | 2 |
| 5 | 58 | 46 | 35 | 19 | 2d8+10 *ou* (2×) 1d8+6 | 12 | 2 |
| 6 | 68 | 54 | 41 | 21 | 2d8+12 *ou* (2×) 1d8+7 | 13 | 3 |
| 7 | 79 | 63 | 47 | 24 | 3d8+10 *ou* (2×) 2d8+4 | 13 | 3 |
| 8 | 91 | 73 | 55 | 26 | 3d8+12 *ou* (2×) 2d8+5 | 14 | 4 |
| 9 | 104 | 83 | 62 | 28 | 4d8+10 *ou* (2×) 2d8+6 | 14 | 4 |
| 10 | 118 | 94 | 71 | 30 | 4d8+12 *ou* (2×) 2d8+7 | 15 | 5 |
| 11 | 133 | 106 | 80 | 33 | 5d8+11 *ou* (2×) 3d8+3 | 15 | 6 |
| 12 | 149 | 119 | 89 | 35 | 5d8+13 *ou* (2×) 3d8+4 | 16 | 7 |
| 13 | 166 | 132 | 100 | 38 | 6d8+11 *ou* (2×) 3d8+6 | 16 | 8 |
| 14 | 184 | 147 | 110 | 40 | 6d8+13 *ou* (2×) 3d8+7 | 17 | 9 |
| 15 | 203 | 162 | 122 | 43 | 7d8+11 *ou* (2×) 3d8+8 | 17 | 9 |
| 16 | 223 | 178 | 134 | 45 | 7d8+13 *ou* (2×) 4d8+5 | 18 | 10 |
| 17 | 244 | 195 | 146 | 48 | 8d8+12 *ou* (2×) 4d8+6 | 18 | 11 |
| 18 | 266 | 213 | 160 | 50 | 8d8+14 *ou* (2×) 4d8+7 | 19 | 12 |
| 19 | 289 | 231 | 173 | 52 | 9d8+12 *ou* (2×) 4d8+8 | 19 | 13 |
| 20 | 313 | 250 | 189 | 54 | 9d8+13 *ou* (2×) 4d8+9 | 20 | 14 |

## Lecture de la table

- **HP** : prendre la valeur EXACTE de la colonne correspondant à l'armure choisie (sans / M / H).
- **Dégâts par tour** : budget TOTAL de dégâts moyens que le monstre inflige sur un tour complet. Si le monstre a 2 attaques ou une attaque + effet, la somme des moyennes reste ≈ cette valeur.
- **Dés d'attaque type** : formule par défaut. La variante « (2×) » correspond à deux attaques par tour.
- **Save DC** : à utiliser pour tout `saveDC` de SavingThrowNode.
- **CR équiv.** : point d'ancrage pour convertir depuis un CR D&D 5e.

## Règles d'ajustement du Monster Builder (les SEULES autorisées)

- **Mix & match par lignes entières** : on peut prendre les dégâts d'une ligne 1 à 5 niveaux au-dessus et les HP d'autant de niveaux en dessous (glass cannon type mage/assassin), ou l'inverse (créature défensive/tanky). On déplace des LIGNES, on n'invente jamais de valeurs intermédiaires.
- **Coût des capacités spéciales** : chaque capacité spéciale ajoutée (au-delà de l'attaque de base) → baisser les HP OU les dégâts d'1 ligne, ou considérer le monstre comme 1 niveau plus fort.

## Taille des dés (le budget de dégâts prime)

d8 par défaut. N'importe quelle taille est acceptable **à condition de recalculer le bonus fixe** pour que la moyenne reste identique à la formule de la table. Guide thématique :
- **d4** : morts-vivants (lents, GROS bonus fixe) · **d6** : gobelins (chaotiques, miss/crit fréquents) · **d8** : humains (fiables) · **d10** : bêtes · **d12** : géants · **d20** : les créatures les plus puissantes.

### Procédure de changement de dé (OBLIGATOIRE)
1. Calcule la moyenne de la formule de la table : moyenne de NdX = N×(X+1)/2, plus le bonus. Ex. niveau 1/2 : 1d6+3 → 3,5+3 = **6,5**.
2. Remplace le dé par la taille thématique voulue, puis **ajuste le bonus** pour retrouver la même moyenne (±0,5 max). Ex. passage au d4 : 1d4 = 2,5 → bonus 4 → **1d4+4 = 6,5** ✓ (1d4+3 = 5,5 ✗ trop faible).
3. Autres exemples au niveau 1/2 (cible 6,5) : d8 → 1d8+2 (6,5) · d10 → 1d10+1 (6,5) · d12 → 1d12 (6,5).
4. Vérifie que la somme des moyennes de TOUTES les attaques/effets du tour reste ≈ la colonne « Dégâts par tour ».

## Stats par défaut d'un monstre

Sauf indication contraire : taille medium, sans armure, vitesse 6, Reach 1, saves à 1d20 sans modificateur (avantage/désavantage seulement si approprié).

## Rappel armures

- **Medium (M)** : ignore les modificateurs de dégâts, ne subit que la somme des dés.
- **Heavy (H)** : ignore les modificateurs et subit la moitié de la somme des dés (arrondi sup.).
- Crits des héros, sorts à save et vulnérabilités ignorent l'armure.
- Répartition conseillée d'une session : ~60% sans armure, 30% M, 10% H → en cas de doute, choisir l'armure la plus basse.

## Minions et flunkies

- **Minion** : HP = 1 (tout dégât le tue). Attaque avec UN SEUL dé de dégâts (sans bonus), ne crit jamais, rate sur un 1. Taille de dé suggérée selon le niveau du groupe : 1-3 → d4 · 3-5 → d6 · 5-10 → d8 · 10-13 → d10 · 13-17 → d12 · 17-20 → d20.
- **Flunky** (`isFlunky: true` sur un npc) : monstre normal qui ne peut pas faire de coups critiques.
