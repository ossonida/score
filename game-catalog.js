import {koreanAliases,wikidataGames} from './korean-game-names.js?v=127';
import {scoreGames,searchScoreGames,isScoreGame} from './score-games.js?v=119';
// Curated public game names and exact aliases, not the complete live BGG database.
const bundledGames = [
  {
    "id": "420087",
    "name": "Flip 7",
    "year": "2024",
    "aliases": [
      "플립 7",
      "플립7"
    ]
  },
  {
    "id": "463441",
    "name": "Flip 7: With A Vengeance",
    "year": "2026",
    "aliases": [
      "플립7 위드 어 벤전스"
    ]
  },
  {
    "id": "13",
    "name": "CATAN",
    "aliases": [
      "카탄"
    ]
  },
  {
    "id": "822",
    "name": "Carcassonne",
    "aliases": [
      "카르카손"
    ]
  },
  {
    "id": "9209",
    "name": "Ticket to Ride",
    "aliases": [
      "티켓 투 라이드",
      "티켓투라이드"
    ]
  },
  {
    "id": "230802",
    "name": "Azul",
    "aliases": [
      "아줄"
    ]
  },
  {
    "id": "266192",
    "name": "Wingspan",
    "aliases": [
      "윙스팬"
    ]
  },
  {
    "id": "167791",
    "name": "Terraforming Mars",
    "aliases": [
      "테라포밍 마스",
      "테라포밍마스"
    ]
  },
  {
    "id": "342942",
    "name": "Ark Nova",
    "aliases": [
      "아크 노바",
      "아크노바",
      "Arche Nova"
    ]
  },
  {
    "id": "316554",
    "name": "Dune: Imperium",
    "aliases": [
      "듄 임페리움"
    ]
  },
  {
    "id": "397598",
    "name": "Dune: Imperium – Uprising",
    "aliases": [
      "듄 업라이징",
      "듄 임페리움 업라이징"
    ]
  },
  {
    "id": "182874",
    "name": "Grand Austria Hotel",
    "aliases": [
      "그랜드 오스트리아 호텔"
    ]
  },
  {
    "id": "68448",
    "name": "7 Wonders",
    "aliases": [
      "세븐 원더스",
      "세븐원더스"
    ]
  },
  {
    "id": "173346",
    "name": "7 Wonders Duel",
    "aliases": [
      "세븐 원더스 듀얼"
    ]
  },
  {
    "id": "148228",
    "name": "Splendor",
    "aliases": [
      "스플렌더"
    ]
  },
  {
    "id": "36218",
    "name": "Dominion",
    "aliases": [
      "도미니언"
    ]
  },
  {
    "id": "30549",
    "name": "Pandemic",
    "aliases": [
      "팬데믹"
    ]
  },
  {
    "id": "295947",
    "name": "Cascadia",
    "aliases": [
      "캐스캐디아"
    ]
  },
  {
    "id": "291453",
    "name": "SCOUT",
    "aliases": [
      "스카우트"
    ]
  },
  {
    "id": "366013",
    "name": "Heat: Pedal to the Metal",
    "aliases": [
      "히트",
      "히트 페달 투 더 메탈"
    ]
  },
  {
    "id": "224517",
    "name": "Brass: Birmingham",
    "aliases": [
      "브라스 버밍엄"
    ]
  },
  {
    "id": "84876",
    "name": "The Castles of Burgundy",
    "aliases": [
      "버건디의 성",
      "버건디"
    ]
  },
  {
    "id": "338376",
    "name": "A Gest of Robin Hood",
    "aliases": []
  },
  {
    "id": "266507",
    "name": "Clank! Legacy: Acquisitions Incorporated",
    "aliases": []
  },
  {
    "id": "11",
    "name": "Bohnanza",
    "aliases": []
  },
  {
    "id": "425445",
    "name": "Sweet Lands",
    "aliases": []
  },
  {
    "id": "446493",
    "name": "Recall",
    "aliases": []
  },
  {
    "id": "312267",
    "name": "Star Wars: Unlock!",
    "aliases": []
  },
  {
    "id": "161936",
    "name": "Pandemic Legacy: Season 1",
    "aliases": []
  },
  {
    "id": "302520",
    "name": "Hues and Cues",
    "aliases": []
  },
  {
    "id": "451708",
    "name": "Faraway: Under Starry Skies",
    "aliases": [
      "Faraway: Sous un ciel d'étoiles"
    ]
  },
  {
    "id": "393114",
    "name": "Barbecubes",
    "aliases": []
  },
  {
    "id": "308493",
    "name": "Relics of Rajavihara",
    "aliases": []
  },
  {
    "id": "342810",
    "name": "Marrakesh",
    "aliases": []
  },
  {
    "id": "121921",
    "name": "Robinson Crusoe: Adventures on the Cursed Island",
    "aliases": []
  },
  {
    "id": "359438",
    "name": "Skymines",
    "aliases": []
  },
  {
    "id": "302571",
    "name": "Codex: L'Ultime secret de Léonard de Vinci",
    "aliases": []
  },
  {
    "id": "340216",
    "name": "Heredity: The Book of Swan",
    "aliases": []
  },
  {
    "id": "416851",
    "name": "Castle Combo",
    "aliases": []
  },
  {
    "id": "385610",
    "name": "Kutná Hora: The City of Silver",
    "aliases": []
  },
  {
    "id": "356080",
    "name": "The Elder Scrolls: Betrayal of the Second Era",
    "aliases": []
  },
  {
    "id": "349369",
    "name": "Tabriz",
    "aliases": []
  },
  {
    "id": "416028",
    "name": "Chicago '68",
    "aliases": []
  },
  {
    "id": "371942",
    "name": "The White Castle",
    "aliases": []
  },
  {
    "id": "287342",
    "name": "Red Doors and the Murderer's Key",
    "aliases": []
  },
  {
    "id": "176734",
    "name": "The Manhattan Project: Energy Empire",
    "aliases": []
  },
  {
    "id": "304420",
    "name": "Bonfire",
    "aliases": []
  },
  {
    "id": "400602",
    "name": "Civolution",
    "aliases": []
  },
  {
    "id": "406652",
    "name": "Compile: Main 1",
    "aliases": []
  },
  {
    "id": "315954",
    "name": "Hunt A Killer: Death at the Dive Bar",
    "aliases": []
  },
  {
    "id": "241724",
    "name": "Villagers",
    "aliases": []
  },
  {
    "id": "427388",
    "name": "Tend",
    "aliases": []
  },
  {
    "id": "295192",
    "name": "Tinderblox",
    "aliases": []
  },
  {
    "id": "428264",
    "name": "1899 DAIHAN",
    "aliases": []
  },
  {
    "id": "230933",
    "name": "Merlin",
    "aliases": []
  },
  {
    "id": "369548",
    "name": "After Us",
    "aliases": []
  },
  {
    "id": "159508",
    "name": "AquaSphere",
    "aliases": []
  },
  {
    "id": "425029",
    "name": "Faraway: People From Below",
    "aliases": []
  },
  {
    "id": "271645",
    "name": "Skora",
    "aliases": []
  },
  {
    "id": "156858",
    "name": "Black Orchestra",
    "aliases": []
  },
  {
    "id": "127060",
    "name": "Bora Bora",
    "aliases": []
  },
  {
    "id": "121408",
    "name": "Trains",
    "aliases": []
  },
  {
    "id": "442990",
    "name": "Codex: La malédiction de l'Abbaye de Thélème",
    "aliases": []
  },
  {
    "id": "267743",
    "name": "The Manhattan Project: Energy Empire – Cold War",
    "aliases": []
  },
  {
    "id": "282853",
    "name": "Catan: Starfarers",
    "aliases": [
      "CATAN: Starfarers"
    ]
  },
  {
    "id": "159675",
    "name": "Fields of Arle",
    "aliases": []
  },
  {
    "id": "284378",
    "name": "Kanban EV",
    "aliases": []
  },
  {
    "id": "223321",
    "name": "Detective: A Modern Crime Board Game",
    "aliases": []
  },
  {
    "id": "240980",
    "name": "Blood on the Clocktower",
    "aliases": []
  },
  {
    "id": "318977",
    "name": "MicroMacro: Crime City",
    "aliases": []
  },
  {
    "id": "124361",
    "name": "Concordia",
    "aliases": []
  },
  {
    "id": "245934",
    "name": "Carpe Diem",
    "aliases": []
  },
  {
    "id": "373106",
    "name": "Sky Team",
    "aliases": []
  },
  {
    "id": "136888",
    "name": "Bruges",
    "aliases": []
  },
  {
    "id": "200680",
    "name": "Agricola (Revised Edition)",
    "aliases": []
  },
  {
    "id": "402111",
    "name": "Kronologic: Paris 1920",
    "aliases": []
  },
  {
    "id": "175914",
    "name": "Food Chain Magnate",
    "aliases": []
  },
  {
    "id": "374595",
    "name": "Kelp: Shark vs Octopus",
    "aliases": []
  },
  {
    "id": "429401",
    "name": "Manhattan Project: Energy Empire",
    "aliases": []
  },
  {
    "id": "218074",
    "name": "Detective: City of Angels",
    "aliases": []
  },
  {
    "id": "284653",
    "name": "Mind MGMT: The Psychic Espionage “Game”",
    "aliases": [
      "Mind MGMT: The Psychic Espionage “Game.”"
    ]
  },
  {
    "id": "371183",
    "name": "Joyride: Survival of the Fastest",
    "aliases": [
      "JOYRIDE: Survival of the Fastest"
    ]
  },
  {
    "id": "387514",
    "name": "Stonespine Architects",
    "aliases": []
  },
  {
    "id": "266448",
    "name": "Imperium: The Contention",
    "aliases": []
  },
  {
    "id": "398898",
    "name": "High Season: Grand Hotel Roll & Write",
    "aliases": []
  },
  {
    "id": "428099",
    "name": "Revenant",
    "aliases": []
  },
  {
    "id": "120677",
    "name": "Terra Mystica",
    "aliases": []
  },
  {
    "id": "357873",
    "name": "The Old King's Crown",
    "aliases": []
  },
  {
    "id": "322289",
    "name": "Darwin's Journey",
    "aliases": []
  },
  {
    "id": "253214",
    "name": "Escape Tales: The Awakening",
    "aliases": []
  },
  {
    "id": "70512",
    "name": "Luna",
    "aliases": []
  },
  {
    "id": "402677",
    "name": "Daitoshi",
    "aliases": []
  },
  {
    "id": "409693",
    "name": "Flatiron",
    "aliases": []
  },
  {
    "id": "321608",
    "name": "Hegemony: Lead Your Class to Victory",
    "aliases": []
  },
  {
    "id": "438442",
    "name": "Feya's Swamp",
    "aliases": []
  },
  {
    "id": "424152",
    "name": "Orapa Mine",
    "aliases": []
  },
  {
    "id": "102680",
    "name": "Trajan",
    "aliases": []
  },
  {
    "id": "25554",
    "name": "Notre Dame",
    "aliases": []
  },
  {
    "id": "413246",
    "name": "Bomb Busters",
    "aliases": []
  },
  {
    "id": "31594",
    "name": "In the Year of the Dragon",
    "aliases": []
  },
  {
    "id": "521",
    "name": "Crokinole",
    "aliases": []
  },
  {
    "id": "413248",
    "name": "R.A.V.E.L.",
    "aliases": []
  },
  {
    "id": "278751",
    "name": "In Front of the Elevators",
    "aliases": []
  },
  {
    "id": "374201",
    "name": "Lata",
    "aliases": []
  },
  {
    "id": "39683",
    "name": "At the Gates of Loyang",
    "aliases": []
  },
  {
    "id": "320780",
    "name": "Grand Austria Hotel: Let's Waltz!",
    "aliases": []
  },
  {
    "id": "276182",
    "name": "Dead Reckoning",
    "aliases": []
  },
  {
    "id": "326054",
    "name": "冷たい彼女が目覚める前に (Embalming Girl)",
    "aliases": []
  },
  {
    "id": "118215",
    "name": "Sausage Sizzle!",
    "aliases": []
  },
  {
    "id": "422732",
    "name": "Agent Avenue",
    "aliases": []
  },
  {
    "id": "169786",
    "name": "Scythe",
    "aliases": []
  },
  {
    "id": "102794",
    "name": "Caverna: The Cave Farmers",
    "aliases": ["카베르나", "카베르나: 동굴 속 농부들", "카베르나 동굴 속 농부들"]
  },
  {
    "id": "306735",
    "name": "Under Falling Skies",
    "aliases": []
  },
  {
    "id": "251247",
    "name": "Barrage",
    "aliases": []
  },
  {
    "id": "184267",
    "name": "On Mars",
    "aliases": []
  },
  {
    "id": "385761",
    "name": "Faraway",
    "aliases": []
  },
  {
    "id": "341530",
    "name": "Super Mega Lucky Box",
    "aliases": []
  },
  {
    "id": "397931",
    "name": "Deep Regrets",
    "aliases": []
  },
  {
    "id": "31260",
    "name": "Agricola",
    "aliases": []
  },
  {
    "id": "355093",
    "name": "Woodcraft",
    "aliases": []
  },
  {
    "id": "340364",
    "name": "Machi Koro 2",
    "aliases": []
  },
  {
    "id": "363622",
    "name": "The Castles of Burgundy: Special Edition",
    "aliases": []
  },
  {
    "id": "406231",
    "name": "Kikai",
    "aliases": [
      "BRICOLAGE HEADS"
    ]
  },
  {
    "id": "388374",
    "name": "Detective: Saints & Sinners",
    "aliases": []
  },
  {
    "id": "196340",
    "name": "Yokohama",
    "aliases": []
  },
  {
    "id": "177736",
    "name": "A Feast for Odin",
    "aliases": []
  },
  {
    "id": "393429",
    "name": "Critter Kitchen",
    "aliases": []
  },
  {
    "id": "229853",
    "name": "Teotihuacan: City of Gods",
    "aliases": []
  },
  {
    "id": "329591",
    "name": "Ultimate Railroads",
    "aliases": []
  },
  {
    "id": "419293",
    "name": "Medical Mysteries: Miami Flatline",
    "aliases": []
  },
  {
    "id": "381715",
    "name": "Teotihuacan: City of Gods – Deluxe Master Set",
    "aliases": []
  },
  {
    "id": "423787",
    "name": "Behind",
    "aliases": []
  },
  {
    "id": "440540",
    "name": "Take Time",
    "aliases": []
  },
  {
    "id": "419639",
    "name": "Mind the Lines",
    "aliases": [
      "Krakel Orakel"
    ]
  },
  {
    "id": "354328",
    "name": "Overbooking",
    "aliases": []
  },
  {
    "id": "317985",
    "name": "Beyond the Sun",
    "aliases": []
  },
  {
    "id": "411875",
    "name": "Pixies",
    "aliases": []
  },
  {
    "id": "404431",
    "name": "Men-Nefer",
    "aliases": []
  },
  {
    "id": "367966",
    "name": "Endeavor: Deep Sea",
    "aliases": []
  },
  {
    "id": "214880",
    "name": "Chicago 1875: City of the Big Shoulders",
    "aliases": []
  },
  {
    "id": "419704",
    "name": "Phoenix New Horizon",
    "aliases": []
  },
  {
    "id": "420321",
    "name": "The White Castle: Matcha",
    "aliases": []
  },
  {
    "id": "444291",
    "name": "Corps of Discovery: Ultimate Edition",
    "aliases": []
  },
  {
    "id": "391137",
    "name": "Galactic Cruise",
    "aliases": []
  },
  {
    "id": "161882",
    "name": "Irish Gauge",
    "aliases": []
  },
  {
    "id": "237182",
    "name": "Root",
    "aliases": []
  },
  {
    "id": "247763",
    "name": "Underwater Cities",
    "aliases": []
  },
  {
    "id": "162886",
    "name": "Spirit Island",
    "aliases": []
  },
  {
    "id": "418059",
    "name": "SETI: Search for Extraterrestrial Intelligence",
    "aliases": []
  },
  {
    "id": "333255",
    "name": "Keep the Heroes Out!",
    "aliases": []
  },
  {
    "id": "161970",
    "name": "Alchemists",
    "aliases": []
  },
  {
    "id": "367220",
    "name": "Sea Salt & Paper",
    "aliases": []
  },
  {
    "id": "442250",
    "name": "Sea Salt & Paper: Extra Pepper",
    "aliases": []
  },
  {
    "id": "396545",
    "name": "Sea Salt & Paper: Extra Salt",
    "aliases": []
  },
  {
    "id": "417615",
    "name": "Corps of Discovery: Expansion 1 – Insecta",
    "aliases": []
  },
  {
    "id": "417619",
    "name": "Corps of Discovery: Expansion 4 – Fog",
    "aliases": []
  },
  {
    "id": "417616",
    "name": "Corps of Discovery: Expansion 2 – Vameter",
    "aliases": []
  },
  {
    "id": "417617",
    "name": "Corps of Discovery: Expansion 3 – Maldonado",
    "aliases": []
  },
  {
    "id": "421238",
    "name": "Corps of Discovery: Mega Foggy Map Pack",
    "aliases": []
  },
  {
    "id": "421239",
    "name": "Corps of Discovery: Mega Map Pack",
    "aliases": []
  },
  {
    "id": "433339",
    "name": "6 nimmt! Baron Oxx",
    "aliases": []
  },
  {
    "id": "40398",
    "name": "Monopoly Deal Card Game",
    "aliases": []
  },
  {
    "id": "384213",
    "name": "Fromage",
    "aliases": []
  },
  {
    "id": "448182",
    "name": "Castle Combo: Out of the Oubliette!",
    "aliases": []
  },
  {
    "id": "450196",
    "name": "Agent Avenue: Division M",
    "aliases": []
  },
  {
    "id": "352515",
    "name": "Trio",
    "aliases": [
      "나나",
      "트리오"
    ]
  },
  {
    "id": "175117",
    "name": "Celestia",
    "aliases": []
  },
  {
    "id": "365983",
    "name": "Mada",
    "aliases": []
  },
  {
    "id": "204734",
    "name": "Stick Stack",
    "aliases": []
  },
  {
    "id": "3085",
    "name": "Gang of Four",
    "aliases": []
  },
  {
    "id": "423432",
    "name": "Skull Queen",
    "aliases": []
  },
  {
    "id": "10672",
    "name": "Easy Come, Easy Go",
    "aliases": []
  },
  {
    "id": "172998",
    "name": "Mighty",
    "aliases": []
  },
  {
    "id": "417518",
    "name": "Floristry",
    "aliases": []
  },
  {
    "id": "51",
    "name": "Ricochet Robots",
    "aliases": []
  },
  {
    "id": "35677",
    "name": "Le Havre",
    "aliases": []
  },
  {
    "id": "395623",
    "name": "Harvest",
    "aliases": []
  },
  {
    "id": "400366",
    "name": "Wondrous Creatures",
    "aliases": []
  },
  {
    "id": "415843",
    "name": "Puerto Rico 1897: Special Edition",
    "aliases": []
  },
  {
    "id": "414317",
    "name": "Harmonies",
    "aliases": []
  },
  {
    "id": "388413",
    "name": "Whale to Look",
    "aliases": []
  },
  {
    "id": "452286",
    "name": "Behind: Purple",
    "aliases": []
  },
  {
    "id": "387780",
    "name": "Rats of Wistar",
    "aliases": []
  },
  {
    "id": "437306",
    "name": "Parks (Second Edition)",
    "aliases": []
  },
  {
    "id": "314503",
    "name": "Codex Naturalis",
    "aliases": []
  },
  {
    "id": "390092",
    "name": "Ticket to Ride Legacy: Legends of the West",
    "aliases": []
  },
  {
    "id": "403441",
    "name": "Windmill Valley",
    "aliases": []
  },
  {
    "id": "386368",
    "name": "Ezra and Nehemiah",
    "aliases": []
  },
  {
    "id": "428787",
    "name": "Omens",
    "aliases": [
      "Présages"
    ]
  },
  {
    "id": "401216",
    "name": "Cascadero",
    "aliases": []
  },
  {
    "id": "379629",
    "name": "Knarr",
    "aliases": []
  },
  {
    "id": "296100",
    "name": "Rococo: Deluxe Edition",
    "aliases": []
  },
  {
    "id": "93",
    "name": "El Grande",
    "aliases": []
  },
  {
    "id": "451594",
    "name": "A Carnivore Did It!",
    "aliases": []
  },
  {
    "id": "367041",
    "name": "Scholars of the South Tigris",
    "aliases": []
  },
  {
    "id": "429438",
    "name": "Ayar: Children of the Sun",
    "aliases": []
  },
  {
    "id": "338960",
    "name": "Slay the Spire: The Board Game",
    "aliases": []
  },
  {
    "id": "3570",
    "name": "Chicken Cha Cha Cha",
    "aliases": []
  },
  {
    "id": "14996",
    "name": "Ticket to Ride: Europe",
    "aliases": []
  },
  {
    "id": "443",
    "name": "Code 777",
    "aliases": []
  },
  {
    "id": "375651",
    "name": "That's Not a Hat",
    "aliases": []
  },
  {
    "id": "391163",
    "name": "Forest Shuffle",
    "aliases": []
  },
  {
    "id": "318243",
    "name": "Hitster",
    "aliases": []
  },
  {
    "id": "446497",
    "name": "Hot Streak",
    "aliases": []
  },
  {
    "id": "375459",
    "name": "Speakeasy",
    "aliases": []
  },
  {
    "id": "236457",
    "name": "Architects of the West Kingdom",
    "aliases": []
  },
  {
    "id": "396446",
    "name": "Marrakesh: Camels & Nomads",
    "aliases": []
  },
  {
    "id": "434367",
    "name": "Nippon: Zaibatsu",
    "aliases": []
  },
  {
    "id": "429405",
    "name": "Orloj: The Prague Astronomical Clock",
    "aliases": []
  },
  {
    "id": "294175",
    "name": "Cheese Thief",
    "aliases": []
  },
  {
    "id": "288098",
    "name": "Shadow Raiders",
    "aliases": []
  },
  {
    "id": "412576",
    "name": "Forest Shuffle: Alpine",
    "aliases": []
  },
  {
    "id": "279537",
    "name": "The Search for Planet X",
    "aliases": []
  },
  {
    "id": "15817",
    "name": "Manila",
    "aliases": []
  },
  {
    "id": "283155",
    "name": "Calico",
    "aliases": []
  },
  {
    "id": "461819",
    "name": "TRÖK",
    "aliases": []
  },
  {
    "id": "415036",
    "name": "Medical Mysteries: NYC Emergency Room",
    "aliases": []
  },
  {
    "id": "404883",
    "name": "Lairs",
    "aliases": []
  },
  {
    "id": "431929",
    "name": "Onward",
    "aliases": []
  },
  {
    "id": "402663",
    "name": "Salton Sea",
    "aliases": []
  },
  {
    "id": "164928",
    "name": "Orléans",
    "aliases": []
  },
  {
    "id": "447484",
    "name": "Beijing",
    "aliases": []
  },
  {
    "id": "172287",
    "name": "Champions of Midgard",
    "aliases": []
  },
  {
    "id": "440942",
    "name": "Trismegistus",
    "aliases": []
  },
  {
    "id": "124380",
    "name": "Ladies & Gentlemen",
    "aliases": []
  },
  {
    "id": "216132",
    "name": "Clans of Caledonia",
    "aliases": []
  },
  {
    "id": "306482",
    "name": "I C E",
    "aliases": []
  },
  {
    "id": "439816",
    "name": "Lost Ruins of Arnak: Twisted Paths",
    "aliases": []
  },
  {
    "id": "316412",
    "name": "The LOOP",
    "aliases": []
  },
  {
    "id": "226255",
    "name": "1920 Wall Street",
    "aliases": []
  },
  {
    "id": "286439",
    "name": "Import / Export: Definitive Edition",
    "aliases": []
  },
  {
    "id": "354132",
    "name": "East India Companies",
    "aliases": [
      "동인도회사"
    ]
  },
  {
    "id": "446699",
    "name": "Ants",
    "aliases": [
      "앤트"
    ]
  },
  {
    "id": "439215",
    "name": "Marrakesh: Gems & Experts",
    "aliases": []
  },
  {
    "id": "448159",
    "name": "Railway Boom",
    "aliases": []
  }
];
const wikiById=new Map(wikidataGames.map(g=>[g.id,g]));
export const starterGames=bundledGames.map(g=>({...g,aliases:[...new Set([...g.aliases,...(koreanAliases[g.id]||[]),...(wikiById.get(g.id)?.aliases||[])])]}));
// Additional public titles are searchable without silently reassigning existing saved records.
export const searchCatalog=[...starterGames,...wikidataGames.filter(g=>!starterGames.some(s=>s.id===g.id)).map(g=>({...g,source:'한글 게임 목록'}))];
export function normalizeGameQuery(value){return String(value).normalize('NFKC').toLocaleLowerCase().replace(/[\s:–—-]+/g,'');}
export function searchLocalGames(query,plays=[]){
 const q=normalizeGameQuery(query);if(!q)return [];
 const map=new Map();
 for(const play of plays){const game=play.game;if(!normalizeGameQuery(game.name).includes(q))continue;const key=game.bggId?`bgg:${game.bggId}`:`name:${normalizeGameQuery(game.name)}`;map.set(key,{id:game.bggId||'',name:game.name,source:'저장 게임'});}
 const ownGames=searchScoreGames(query);for(const game of ownGames){const key=`name:${normalizeGameQuery(game.name)}`;map.set(key,{...game,id:'',scoreGame:true,source:'Score 자체 게임'});}
 if(!ownGames.length)for(const game of searchCatalog){if(![game.name,...game.aliases].some(name=>normalizeGameQuery(name).includes(q)))continue;const key=`bgg:${game.id}`;if(!map.has(key))map.set(key,{...game,source:game.source||'기본 목록'});}
 return [...map.values()].slice(0,40);
}

// Only exact names/aliases identify a game. Similar titles and editions stay separate.
const exactGameIds=new Map();
function addExactGame(index,name,id){const key=normalizeGameQuery(name);if(!key||!id)return;if(!index.has(key))index.set(key,new Set());index.get(key).add(String(id));}
for(const game of starterGames)for(const name of [game.name,...game.aliases])addExactGame(exactGameIds,name,game.id);
export function gameResolver(plays=[]){
 const index=new Map([...exactGameIds].map(([name,ids])=>[name,new Set(ids)]));
 for(const play of plays)if(play.game?.bggId)addExactGame(index,play.game.name,play.game.bggId);
 return game=>{if(isScoreGame(game))return game.bggId?{...game,bggId:''}:game;if(game.bggId)return game;const ids=index.get(normalizeGameQuery(game.name));return ids?.size===1?{...game,bggId:[...ids][0]}:game;};
}
const resolveCatalogGame=gameResolver();
export function resolveGame(game,plays=[]){return plays.length?gameResolver(plays)(game):resolveCatalogGame(game);}
function koreanGameName(game){if(!game?.bggId||/[가-힣]/.test(game.name))return game.name;return (koreanAliases[String(game.bggId)]||[]).find(name=>/[가-힣]/.test(name))||(wikiById.get(String(game.bggId))?.aliases||[]).find(name=>/[가-힣]/.test(name))||game.name;}
export function matchGameRecords(plays){const resolve=gameResolver(plays);return plays.map(play=>{const resolved=resolve(play.game),name=koreanGameName(resolved),game=name===resolved.name?resolved:{...resolved,name};return game===play.game?play:{...play,game};});}

const alphabeticalNames=new Intl.Collator('ko',{numeric:true,sensitivity:'base'});
const titleBucket=name=>/^[a-z]/i.test(name.trim())?0:/^[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(name.trim())?1:2;
export function searchableGameGroups(groups,query=''){
 const q=normalizeGameQuery(query);
 return groups.filter(group=>{if(!q)return true;const known=searchCatalog.find(game=>game.id===group.game.bggId),own=!group.game.bggId&&scoreGames.find(game=>normalizeGameQuery(game.name)===normalizeGameQuery(group.game.name));return [group.game.name,...(known?[known.name,...known.aliases]:[]),...(own?own.aliases:[])].some(name=>normalizeGameQuery(name).includes(q));}).sort((a,b)=>titleBucket(a.game.name)-titleBucket(b.game.name)||alphabeticalNames.compare(a.game.name,b.game.name));
}

// Translate only unambiguous exact catalog aliases; never guess unknown titles.
export function bggSearchQuery(query){
 const q=normalizeGameQuery(query),matches=searchCatalog.filter(g=>[g.name,...g.aliases].some(name=>normalizeGameQuery(name)===q));
 return matches.length===1?matches[0].name:String(query).trim();
}
