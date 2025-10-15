import { CRTier, GemValue, ArtValue, MagicItemTable, BiomeType } from '../types';

/**
 * Treasure Tables based on D&D 5e Dungeon Master's Guide Chapter 7
 * Provides coin, gem, art object, and magic item generation
 */

/**
 * Individual treasure by CR tier (coins only)
 */
export const INDIVIDUAL_TREASURE: Record<CRTier, {
	cp: { dice: string; multiplier: number };
	sp: { dice: string; multiplier: number };
	ep: { dice: string; multiplier: number };
	gp: { dice: string; multiplier: number };
	pp: { dice: string; multiplier: number };
}> = {
	'0-4': {
		cp: { dice: '5d6', multiplier: 1 },
		sp: { dice: '4d6', multiplier: 1 },
		ep: { dice: '3d6', multiplier: 1 },
		gp: { dice: '3d6', multiplier: 1 },
		pp: { dice: '1d6', multiplier: 1 }
	},
	'5-10': {
		cp: { dice: '4d6', multiplier: 100 },
		sp: { dice: '6d6', multiplier: 10 },
		ep: { dice: '3d6', multiplier: 10 },
		gp: { dice: '5d6', multiplier: 10 },
		pp: { dice: '2d6', multiplier: 10 }
	},
	'11-16': {
		cp: { dice: '0d6', multiplier: 1 },
		sp: { dice: '0d6', multiplier: 1 },
		ep: { dice: '0d6', multiplier: 1 },
		gp: { dice: '4d6', multiplier: 100 },
		pp: { dice: '5d6', multiplier: 10 }
	},
	'17+': {
		cp: { dice: '0d6', multiplier: 1 },
		sp: { dice: '0d6', multiplier: 1 },
		ep: { dice: '0d6', multiplier: 1 },
		gp: { dice: '12d6', multiplier: 100 },
		pp: { dice: '8d6', multiplier: 100 }
	}
};

/**
 * Hoard treasure by CR tier
 */
export const HOARD_TREASURE: Record<CRTier, {
	coins: {
		cp: { dice: string; multiplier: number };
		sp: { dice: string; multiplier: number };
		ep: { dice: string; multiplier: number };
		gp: { dice: string; multiplier: number };
		pp: { dice: string; multiplier: number };
	};
	gems: { chance: number; dice: string; value: GemValue }[];
	art: { chance: number; dice: string; value: ArtValue }[];
	magicItems: { chance: number; rolls: string; table: MagicItemTable }[];
}> = {
	'0-4': {
		coins: {
			cp: { dice: '6d6', multiplier: 100 },
			sp: { dice: '3d6', multiplier: 100 },
			ep: { dice: '2d6', multiplier: 10 },
			gp: { dice: '6d6', multiplier: 10 },
			pp: { dice: '0d6', multiplier: 1 }
		},
		gems: [
			{ chance: 6, dice: '2d6', value: 10 },
			{ chance: 16, dice: '2d4', value: 50 }
		],
		art: [
			{ chance: 26, dice: '2d4', value: 25 }
		],
		magicItems: [
			{ chance: 36, rolls: '1d6', table: 'A' },
			{ chance: 100, rolls: '1d4', table: 'B' }
		]
	},
	'5-10': {
		coins: {
			cp: { dice: '2d6', multiplier: 100 },
			sp: { dice: '2d6', multiplier: 1000 },
			ep: { dice: '6d6', multiplier: 100 },
			gp: { dice: '6d6', multiplier: 100 },
			pp: { dice: '3d6', multiplier: 10 }
		},
		gems: [
			{ chance: 4, dice: '2d4', value: 50 },
			{ chance: 10, dice: '3d6', value: 100 }
		],
		art: [
			{ chance: 16, dice: '2d4', value: 250 }
		],
		magicItems: [
			{ chance: 22, rolls: '1d4', table: 'A' },
			{ chance: 44, rolls: '1d6', table: 'B' },
			{ chance: 64, rolls: '1d6', table: 'C' },
			{ chance: 100, rolls: '1d4', table: 'D' }
		]
	},
	'11-16': {
		coins: {
			cp: { dice: '0d6', multiplier: 1 },
			sp: { dice: '0d6', multiplier: 1 },
			ep: { dice: '0d6', multiplier: 1 },
			gp: { dice: '4d6', multiplier: 1000 },
			pp: { dice: '5d6', multiplier: 100 }
		},
		gems: [
			{ chance: 3, dice: '3d6', value: 500 },
			{ chance: 6, dice: '3d6', value: 1000 }
		],
		art: [
			{ chance: 9, dice: '2d4', value: 750 },
			{ chance: 12, dice: '2d4', value: 2500 }
		],
		magicItems: [
			{ chance: 15, rolls: '1d4', table: 'A' },
			{ chance: 23, rolls: '1d6', table: 'B' },
			{ chance: 45, rolls: '1d6', table: 'C' },
			{ chance: 75, rolls: '1d4', table: 'D' },
			{ chance: 100, rolls: '1d4', table: 'E' }
		]
	},
	'17+': {
		coins: {
			cp: { dice: '0d6', multiplier: 1 },
			sp: { dice: '0d6', multiplier: 1 },
			ep: { dice: '0d6', multiplier: 1 },
			gp: { dice: '12d6', multiplier: 1000 },
			pp: { dice: '8d6', multiplier: 1000 }
		},
		gems: [
			{ chance: 2, dice: '3d6', value: 1000 },
			{ chance: 5, dice: '3d6', value: 5000 }
		],
		art: [
			{ chance: 7, dice: '2d4', value: 2500 },
			{ chance: 10, dice: '2d4', value: 7500 }
		],
		magicItems: [
			{ chance: 15, rolls: '1d8', table: 'C' },
			{ chance: 40, rolls: '1d6', table: 'D' },
			{ chance: 60, rolls: '1d6', table: 'E' },
			{ chance: 75, rolls: '1d4', table: 'F' },
			{ chance: 85, rolls: '1d4', table: 'G' },
			{ chance: 95, rolls: '1d4', table: 'H' },
			{ chance: 100, rolls: '1d4', table: 'I' }
		]
	}
};

/**
 * Gem descriptions by value
 */
export const GEM_DESCRIPTIONS: Record<GemValue, string[]> = {
	10: [
		'Azurite (opaque mottled deep blue)',
		'Banded agate (translucent striped brown/blue/white/red)',
		'Blue quartz (transparent pale blue)',
		'Eye agate (translucent circles of gray/white/brown/blue/green)',
		'Hematite (opaque gray-black)',
		'Lapis lazuli (opaque light/dark blue with yellow flecks)',
		'Malachite (opaque striated light/dark green)',
		'Moss agate (translucent pink/yellow-white with gray/green markings)',
		'Obsidian (opaque black)',
		'Rhodochrosite (opaque light pink)',
		'Tiger eye (translucent brown with golden center)',
		'Turquoise (opaque light blue-green)'
	],
	50: [
		'Bloodstone (opaque dark gray with red flecks)',
		'Carnelian (opaque orange to red-brown)',
		'Chalcedony (opaque white)',
		'Chrysoprase (translucent green)',
		'Citrine (transparent pale yellow-brown)',
		'Jasper (opaque blue/black/brown)',
		'Moonstone (translucent white with pale blue glow)',
		'Onyx (opaque bands of black/white or pure black/white)',
		'Quartz (transparent white/smoky gray/yellow)',
		'Sardonyx (opaque bands of red and white)',
		'Star rose quartz (translucent rosy stone with white star center)',
		'Zircon (transparent pale blue-green)'
	],
	100: [
		'Amber (transparent watery gold to rich gold)',
		'Amethyst (transparent deep purple)',
		'Chrysoberyl (transparent yellow-green to pale green)',
		'Coral (opaque crimson)',
		'Garnet (transparent red/brown-green/violet)',
		'Jade (translucent light green/deep green/white)',
		'Jet (opaque deep black)',
		'Pearl (opaque lustrous white/yellowish/pink/silver/black)',
		'Spinel (transparent red/red-brown/deep green)',
		'Tourmaline (transparent pale green/blue/brown/red)'
	],
	500: [
		'Alexandrite (transparent dark green)',
		'Aquamarine (transparent pale blue-green)',
		'Black pearl (opaque pure black)',
		'Blue spinel (transparent deep blue)',
		'Peridot (transparent rich olive green)',
		'Topaz (transparent golden yellow)'
	],
	1000: [
		'Black opal (translucent dark green with black/gold flecks)',
		'Blue sapphire (transparent blue-white to medium blue)',
		'Emerald (transparent deep bright green)',
		'Fire opal (translucent fiery red)',
		'Opal (translucent pale blue with green/golden mottling)',
		'Star ruby (translucent ruby with white star center)',
		'Star sapphire (translucent blue sapphire with white star center)',
		'Yellow sapphire (transparent fiery yellow/yellow-green)'
	],
	5000: [
		'Black sapphire (translucent lustrous black with glowing highlights)',
		'Diamond (transparent blue-white/canary/pink/brown/blue)',
		'Jacinth (transparent fiery orange)',
		'Ruby (transparent clear red to deep crimson)'
	]
};

/**
 * Art object descriptions by value
 */
export const ART_DESCRIPTIONS: Record<ArtValue, string[]> = {
	25: [
		'Silver ewer',
		'Carved bone statuette',
		'Small gold bracelet',
		'Cloth-of-gold vestments',
		'Black velvet mask stitched with silver thread',
		'Copper chalice with silver filigree',
		'Pair of engraved bone dice',
		'Small mirror set in a painted wooden frame',
		'Embroidered silk handkerchief',
		'Gold locket with a painted portrait inside'
	],
	250: [
		'Gold ring set with bloodstones',
		'Carved ivory statuette',
		'Large gold bracelet',
		'Silver necklace with a gemstone pendant',
		'Bronze crown',
		'Silk robe with gold embroidery',
		'Large well-made tapestry',
		'Brass mug with jade inlay',
		'Box of turquoise animal figurines',
		'Gold bird cage with electrum filigree'
	],
	750: [
		'Silver chalice set with moonstones',
		'Silver-plated steel longsword with jet set in hilt',
		'Carved harp of exotic wood with ivory inlay and zircon gems',
		'Small gold idol',
		'Gold dragon comb set with red garnets as eyes',
		'Bottle stopper cork embossed with gold leaf and set with amethysts',
		'Ceremonial electrum dagger with a black pearl in the pommel',
		'Silver and gold brooch',
		'Obsidian statuette with gold fittings and inlay',
		'Painted gold war mask'
	],
	2500: [
		'Fine gold chain set with a fire opal',
		'Old masterpiece painting',
		'Embroidered silk and velvet mantle set with numerous moonstones',
		'Platinum bracelet set with a sapphire',
		'Embroidered glove set with jewel chips',
		'Jeweled anklet',
		'Gold music box',
		'Gold circlet set with four aquamarines',
		'Eye patch with a mock eye set in blue sapphire and moonstone',
		'A necklace string of small pink pearls'
	],
	7500: [
		'Jeweled gold crown',
		'Jeweled platinum ring',
		'Small gold statuette set with rubies',
		'Gold cup set with emeralds',
		'Gold jewelry box with platinum filigree',
		'Painted gold child\'s sarcophagus',
		'Jade game board with solid gold playing pieces',
		'Bejeweled ivory drinking horn with gold filigree'
	]
};

/**
 * Get CR tier from challenge rating
 */
export function getCRTier(cr: number): CRTier {
	if (cr <= 4) return '0-4';
	if (cr <= 10) return '5-10';
	if (cr <= 16) return '11-16';
	return '17+';
}

/**
 * Get a random gem description for a given value
 */
export function getRandomGemDescription(value: GemValue, rng: () => number): string {
	const descriptions = GEM_DESCRIPTIONS[value];
	const index = Math.floor(rng() * descriptions.length);
	return descriptions[index];
}

/**
 * Get a random art object description for a given value
 */
export function getRandomArtDescription(value: ArtValue, rng: () => number): string {
	const descriptions = ART_DESCRIPTIONS[value];
	const index = Math.floor(rng() * descriptions.length);
	return descriptions[index];
}

/**
 * Biome-specific gem flavor text modifiers
 */
export const BIOME_GEM_MODIFIERS: Record<BiomeType, (baseDescription: string) => string> = {
	dungeon: (desc) => desc,
	forest: (desc) => `${desc}, found in a moss-covered pouch`,
	mountain: (desc) => `${desc}, still encased in rough stone`,
	aquatic: (desc) => `${desc}, smoothed by ocean currents`,
	underdark: (desc) => `${desc}, faintly luminescent`,
	urban: (desc) => `${desc}, expertly cut and polished`,
	planar: (desc) => `${desc}, with otherworldly iridescence`,
	desert: (desc) => `${desc}, sun-bleached and weathered`
};

/**
 * Biome-specific art object flavor text modifiers
 */
export const BIOME_ART_MODIFIERS: Record<BiomeType, (baseDescription: string) => string> = {
	dungeon: (desc) => desc,
	forest: (desc) => `${desc}, decorated with nature motifs`,
	mountain: (desc) => `${desc}, carved with dwarven runes`,
	aquatic: (desc) => `${desc}, featuring aquatic imagery`,
	underdark: (desc) => `${desc}, made from rare underground materials`,
	urban: (desc) => `${desc}, in the latest fashion`,
	planar: (desc) => `${desc}, of extraplanar origin`,
	desert: (desc) => `${desc}, with ancient desert kingdom insignia`
};

/**
 * Container descriptions by type
 */
export const CONTAINER_DESCRIPTIONS: Record<string, string[]> = {
	chest: [
		'an ornate wooden chest bound with iron',
		'a heavy iron strongbox',
		'a lacquered wooden chest with brass fittings',
		'a weathered sea chest',
		'a stone coffer with a rusted lock',
		'an ancient chest covered in cobwebs'
	],
	pouch: [
		'a worn leather pouch',
		'a silk purse embroidered with gold thread',
		'a small velvet bag',
		'a burlap sack',
		'a waterproof oilskin pouch',
		'a decorative drawstring bag'
	],
	'on-body': [
		'carried on the creature\'s person',
		'hidden in a secret pocket',
		'attached to a belt',
		'stuffed in various pockets',
		'concealed in the creature\'s clothing',
		'tucked into boots and pouches'
	],
	scattered: [
		'scattered across the ground',
		'partially buried in debris',
		'strewn about the area',
		'hidden among the rubble',
		'loosely piled in a corner',
		'carelessly left in the open'
	],
	vault: [
		'secured in a reinforced vault',
		'hidden in a secret compartment',
		'locked in a magical safe',
		'stored in a treasure room',
		'protected behind locked doors',
		'carefully organized in a stronghold'
	],
	none: [
		'lying in plain sight',
		'simply present',
		'available'
	]
};

/**
 * Get random container description
 */
export function getRandomContainerDescription(type: string, rng: () => number): string {
	const descriptions = CONTAINER_DESCRIPTIONS[type] || CONTAINER_DESCRIPTIONS.chest;
	const index = Math.floor(rng() * descriptions.length);
	return descriptions[index];
}
