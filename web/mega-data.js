/**
 * All released Mega Evolutions and Primal Reversions in Pokemon GO.
 *
 * GENERATED — do not hand-edit. Regenerate with: python3 scripts/update_megas.py
 * Source: https://bulbapedia.bulbagarden.net/wiki/Mega_Evolution_(GO)
 * Unreleased (HTML-commented) rows are excluded.
 *
 * energy  first-time activation cost; later activations cost far less
 * boosts  party-wide type bonus; weather-based (not own typing) when weatherBoost is set
 * attack  extra Charged Attack unlocked at Super Max Mega Level
 * isNew   GO-original Mega with no mainline artwork; artFallback is base-species art
 */

const MEGAS = [
  {"name": "Mega Venusaur", "art": "venusaur-mega", "types": ["Grass", "Poison"], "boosts": ["Grass", "Poison"], "energy": 200, "released": "August 27, 2020"},
  {"name": "Mega Charizard X", "art": "charizard-mega-x", "types": ["Fire", "Dragon"], "boosts": ["Fire", "Dragon"], "energy": 200, "released": "August 27, 2020"},
  {"name": "Mega Charizard Y", "art": "charizard-mega-y", "types": ["Fire", "Flying"], "boosts": ["Fire", "Flying"], "energy": 200, "released": "August 27, 2020"},
  {"name": "Mega Blastoise", "art": "blastoise-mega", "types": ["Water"], "boosts": ["Water"], "energy": 200, "released": "August 27, 2020"},
  {"name": "Mega Beedrill", "art": "beedrill-mega", "types": ["Bug", "Poison"], "boosts": ["Bug", "Poison"], "energy": 100, "released": "August 27, 2020", "attack": "Fell Stinger+"},
  {"name": "Mega Pidgeot", "art": "pidgeot-mega", "types": ["Normal", "Flying"], "boosts": ["Normal", "Flying"], "energy": 100, "released": "September 18, 2020"},
  {"name": "Mega Raichu X", "art": "raichu-mega-x", "types": ["Electric"], "boosts": ["Electric"], "energy": 300, "released": "July 18, 2026", "artFallback": "raichu", "isNew": true, "attack": "Volt Tackle+"},
  {"name": "Mega Raichu Y", "art": "raichu-mega-y", "types": ["Electric"], "boosts": ["Electric"], "energy": 300, "released": "July 18, 2026", "artFallback": "raichu", "isNew": true, "attack": "Zap Cannon+"},
  {"name": "Mega Alakazam", "art": "alakazam-mega", "types": ["Psychic"], "boosts": ["Psychic"], "energy": 200, "released": "September 12, 2022"},
  {"name": "Mega Victreebel", "art": "victreebel-mega", "types": ["Grass", "Poison"], "boosts": ["Grass", "Poison"], "energy": 300, "released": "February 20, 2026", "artFallback": "victreebel", "isNew": true, "attack": "Acid Spray+"},
  {"name": "Mega Slowbro", "art": "slowbro-mega", "types": ["Water", "Psychic"], "boosts": ["Water", "Psychic"], "energy": 100, "released": "June 8, 2021"},
  {"name": "Mega Gengar", "art": "gengar-mega", "types": ["Ghost", "Poison"], "boosts": ["Ghost", "Poison"], "energy": 200, "released": "October 23, 2020"},
  {"name": "Mega Kangaskhan", "art": "kangaskhan-mega", "types": ["Normal"], "boosts": ["Normal"], "energy": 200, "released": "April 29, 2022"},
  {"name": "Mega Starmie", "art": "starmie-mega", "types": ["Water", "Psychic"], "boosts": ["Water", "Psychic"], "energy": 300, "released": "August 22, 2026", "artFallback": "starmie", "isNew": true, "attack": "Liquidation+"},
  {"name": "Mega Pinsir", "art": "pinsir-mega", "types": ["Bug", "Flying"], "boosts": ["Bug", "Flying"], "energy": 200, "released": "May 11, 2023"},
  {"name": "Mega Gyarados", "art": "gyarados-mega", "types": ["Water", "Dark"], "boosts": ["Water", "Dark"], "energy": 300, "released": "February 9, 2021"},
  {"name": "Mega Aerodactyl", "art": "aerodactyl-mega", "types": ["Rock", "Flying"], "boosts": ["Rock", "Flying"], "energy": 200, "released": "January 7, 2022"},
  {"name": "Mega Dragonite", "art": "dragonite-mega", "types": ["Dragon", "Flying"], "boosts": ["Dragon", "Flying"], "energy": 300, "released": "February 20, 2026", "artFallback": "dragonite", "isNew": true, "attack": "Outrage+"},
  {"name": "Mega Mewtwo X", "art": "mewtwo-mega-x", "types": ["Psychic", "Fighting"], "boosts": ["Psychic", "Fighting"], "energy": 7500, "released": "May 24, 2026", "attack": "Dynamic Punch+"},
  {"name": "Mega Mewtwo Y", "art": "mewtwo-mega-y", "types": ["Psychic"], "boosts": ["Psychic"], "energy": 7500, "released": "May 24, 2026", "attack": "Future Sight+"},
  {"name": "Mega Ampharos", "art": "ampharos-mega", "types": ["Electric", "Dragon"], "boosts": ["Electric", "Dragon"], "energy": 200, "released": "January 19, 2021"},
  {"name": "Mega Steelix", "art": "steelix-mega", "types": ["Steel", "Ground"], "boosts": ["Steel", "Ground"], "energy": 200, "released": "December 1, 2021"},
  {"name": "Mega Scizor", "art": "scizor-mega", "types": ["Bug", "Steel"], "boosts": ["Bug", "Steel"], "energy": 200, "released": "August 10, 2022"},
  {"name": "Mega Heracross", "art": "heracross-mega", "types": ["Bug", "Fighting"], "boosts": ["Bug", "Fighting"], "energy": 200, "released": "April 13, 2024"},
  {"name": "Mega Skarmory", "art": "skarmory-mega", "types": ["Steel", "Flying"], "boosts": ["Steel", "Flying"], "energy": 300, "released": "June 27, 2026", "artFallback": "skarmory", "isNew": true, "attack": "Drill Peck+"},
  {"name": "Mega Houndoom", "art": "houndoom-mega", "types": ["Dark", "Fire"], "boosts": ["Dark", "Fire"], "energy": 100, "released": "October 1, 2020", "attack": "Dark Pulse+"},
  {"name": "Mega Tyranitar", "art": "tyranitar-mega", "types": ["Rock", "Dark"], "boosts": ["Rock", "Dark"], "energy": 300, "released": "July 25, 2023"},
  {"name": "Mega Sceptile", "art": "sceptile-mega", "types": ["Grass", "Dragon"], "boosts": ["Grass", "Dragon"], "energy": 200, "released": "December 3, 2022"},
  {"name": "Mega Blaziken", "art": "blaziken-mega", "types": ["Fire", "Fighting"], "boosts": ["Fire", "Fighting"], "energy": 200, "released": "December 3, 2022"},
  {"name": "Mega Swampert", "art": "swampert-mega", "types": ["Water", "Ground"], "boosts": ["Water", "Ground"], "energy": 200, "released": "December 3, 2022"},
  {"name": "Mega Gardevoir", "art": "gardevoir-mega", "types": ["Psychic", "Fairy"], "boosts": ["Psychic", "Fairy"], "energy": 200, "released": "February 8, 2023"},
  {"name": "Mega Sableye", "art": "sableye-mega", "types": ["Dark", "Ghost"], "boosts": ["Dark", "Ghost"], "energy": 100, "released": "June 29, 2023"},
  {"name": "Mega Mawile", "art": "mawile-mega", "types": ["Steel", "Fairy"], "boosts": ["Steel", "Fairy"], "energy": 200, "released": "October 12, 2024"},
  {"name": "Mega Aggron", "art": "aggron-mega", "types": ["Steel"], "boosts": ["Steel"], "energy": 200, "released": "September 16, 2022"},
  {"name": "Mega Medicham", "art": "medicham-mega", "types": ["Fighting", "Psychic"], "boosts": ["Fighting", "Psychic"], "energy": 100, "released": "March 8, 2023"},
  {"name": "Mega Manectric", "art": "manectric-mega", "types": ["Electric"], "boosts": ["Electric"], "energy": 100, "released": "March 16, 2021"},
  {"name": "Mega Sharpedo", "art": "sharpedo-mega", "types": ["Water", "Dark"], "boosts": ["Water", "Dark"], "energy": 200, "released": "September 7, 2025"},
  {"name": "Mega Camerupt", "art": "camerupt-mega", "types": ["Fire", "Ground"], "boosts": ["Fire", "Ground"], "energy": 200, "released": "September 28, 2025"},
  {"name": "Mega Altaria", "art": "altaria-mega", "types": ["Dragon", "Fairy"], "boosts": ["Dragon", "Fairy"], "energy": 300, "released": "May 15, 2021"},
  {"name": "Mega Banette", "art": "banette-mega", "types": ["Ghost"], "boosts": ["Ghost"], "energy": 100, "released": "October 20, 2022"},
  {"name": "Mega Absol", "art": "absol-mega", "types": ["Dark"], "boosts": ["Dark"], "energy": 200, "released": "October 22, 2021"},
  {"name": "Mega Glalie", "art": "glalie-mega", "types": ["Ice"], "boosts": ["Ice"], "energy": 200, "released": "December 15, 2022"},
  {"name": "Mega Salamence", "art": "salamence-mega", "types": ["Dragon", "Flying"], "boosts": ["Dragon", "Flying"], "energy": 300, "released": "January 10, 2023"},
  {"name": "Mega Metagross", "art": "metagross-mega", "types": ["Steel", "Psychic"], "boosts": ["Steel", "Psychic"], "energy": 300, "released": "October 4, 2025"},
  {"name": "Mega Latias", "art": "latias-mega", "types": ["Dragon", "Psychic"], "boosts": ["Dragon", "Psychic"], "energy": 300, "released": "May 3, 2022"},
  {"name": "Mega Latios", "art": "latios-mega", "types": ["Dragon", "Psychic"], "boosts": ["Dragon", "Psychic"], "energy": 300, "released": "May 3, 2022"},
  {"name": "Primal Kyogre", "art": "kyogre-primal", "types": ["Water"], "boosts": ["Electric", "Water", "Bug"], "energy": 400, "released": "February 18, 2023", "weatherBoost": true},
  {"name": "Primal Groudon", "art": "groudon-primal", "types": ["Ground"], "boosts": ["Grass", "Fire", "Ground"], "energy": 400, "released": "February 18, 2023", "weatherBoost": true},
  {"name": "Mega Rayquaza", "art": "rayquaza-mega", "types": ["Flying", "Dragon"], "boosts": ["Flying", "Dragon", "Psychic"], "energy": 400, "released": "August 4, 2023", "weatherBoost": true},
  {"name": "Mega Staraptor", "art": "staraptor-mega", "types": ["Fighting", "Flying"], "boosts": ["Fighting", "Flying"], "energy": 300, "released": "September 19, 2026", "artFallback": "staraptor", "isNew": true, "attack": "Brave Bird+"},
  {"name": "Mega Lopunny", "art": "lopunny-mega", "types": ["Normal", "Fighting"], "boosts": ["Normal", "Fighting"], "energy": 200, "released": "April 4, 2021"},
  {"name": "Mega Garchomp", "art": "garchomp-mega", "types": ["Dragon", "Ground"], "boosts": ["Dragon", "Ground"], "energy": 300, "released": "November 11, 2023"},
  {"name": "Mega Lucario", "art": "lucario-mega", "types": ["Fighting", "Steel"], "boosts": ["Fighting", "Steel"], "energy": 200, "released": "July 27, 2024"},
  {"name": "Mega Abomasnow", "art": "abomasnow-mega", "types": ["Grass", "Ice"], "boosts": ["Grass", "Ice"], "energy": 200, "released": "December 1, 2020"},
  {"name": "Mega Gallade", "art": "gallade-mega", "types": ["Psychic", "Fighting"], "boosts": ["Psychic", "Fighting"], "energy": 200, "released": "January 11, 2025"},
  {"name": "Mega Audino", "art": "audino-mega", "types": ["Normal", "Fairy"], "boosts": ["Normal", "Fairy"], "energy": 200, "released": "April 5, 2025"},
  {"name": "Mega Chandelure", "art": "chandelure-mega", "types": ["Ghost", "Fire"], "boosts": ["Ghost", "Fire"], "energy": 300, "released": "April 5, 2025", "artFallback": "chandelure", "isNew": true, "attack": "Ominous Wind+"},
  {"name": "Mega Chesnaught", "art": "chesnaught-mega", "types": ["Grass", "Fighting"], "boosts": ["Grass", "Fighting"], "energy": 300, "released": "August 28, 2026", "artFallback": "chesnaught", "isNew": true, "attack": "Seed Bomb+"},
  {"name": "Mega Delphox", "art": "delphox-mega", "types": ["Fire", "Psychic"], "boosts": ["Fire", "Psychic"], "energy": 300, "released": "August 28, 2026", "artFallback": "delphox", "isNew": true, "attack": "Mystical Fire+"},
  {"name": "Mega Greninja", "art": "greninja-mega", "types": ["Water", "Dark"], "boosts": ["Water", "Dark"], "energy": 300, "released": "August 28, 2026", "artFallback": "greninja", "isNew": true, "attack": "Surf+"},
  {"name": "Mega Malamar", "art": "malamar-mega", "types": ["Dark", "Psychic"], "boosts": ["Dark", "Psychic"], "energy": 300, "released": "February 20, 2026", "artFallback": "malamar", "isNew": true, "attack": "Psybeam+"},
  {"name": "Mega Diancie", "art": "diancie-mega", "types": ["Rock", "Fairy"], "boosts": ["Rock", "Fairy"], "energy": 300, "released": "August 4, 2023"},
  {"name": "Mega Falinks", "art": "falinks-mega", "types": ["Fighting"], "boosts": ["Fighting"], "energy": 300, "released": "May 23, 2026", "artFallback": "falinks", "isNew": true, "attack": "Brick Break+"}
];
