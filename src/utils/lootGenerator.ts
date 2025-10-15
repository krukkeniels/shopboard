import {
	LootGenerationParams,
	GeneratedLoot,
	CoinLoot,
	CRTier,
	Gem,
	GemValue,
	ArtObject,
	ArtValue,
	MagicItemLoot,
	EquipmentLoot,
	MagicItemTable,
	SalvageMaterial,
	ItemData,
	RarityLevel
} from '../types';
import {
	INDIVIDUAL_TREASURE,
	HOARD_TREASURE,
	GEM_DESCRIPTIONS,
	ART_DESCRIPTIONS,
	getCRTier,
	getRandomContainerDescription
} from './treasureTables';
import { ItemParser } from './itemParser';

/**
 * Loot Generator - Generates random treasure based on D&D 5e rules
 */
export class LootGenerator {
	private rng: () => number;
	private itemParser: ItemParser;

	constructor(itemParser: ItemParser) {
		this.rng = Math.random;
		this.itemParser = itemParser;
	}

	/**
	 * Seed the random number generator for reproducibility
	 */
	private seedRNG(seed: string): void {
		// Simple seeded random number generator (mulberry32)
		let h = 0;
		for (let i = 0; i < seed.length; i++) {
			h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
		}

		this.rng = () => {
			h = Math.imul(h ^ h >>> 15, h | 1);
			h ^= h + Math.imul(h ^ h >>> 7, h | 61);
			return ((h ^ h >>> 14) >>> 0) / 4294967296;
		};
	}

	/**
	 * Generate loot based on parameters
	 */
	generateLoot(params: LootGenerationParams): GeneratedLoot {
		// Seed RNG if provided
		const seed = params.seed || Date.now().toString();
		this.seedRNG(seed);

		// Determine CR tier
		const crTier = this.getCRTierFromParams(params);

		// Generate all treasure components
		const coins = this.generateCoins(params, crTier);
		const gems = this.generateGems(params, crTier);
		const artObjects = params.generateArtObjects ? this.generateArtObjects(params, crTier) : [];
		const magicItems = this.generateMagicItems(params, crTier);
		const equipment = params.generateEquipment ? this.generateEquipment(params, crTier) : [];
		const mundaneItems = this.generateMundaneItems(params, crTier);
		const salvage = params.enableSalvage ? this.generateSalvage(params) : [];

		// Calculate total value and weight
		const totalValue = this.calculateTotalValue(coins, gems, artObjects, magicItems, equipment, mundaneItems, salvage);
		const totalWeight = params.includeEncumbrance
			? this.calculateTotalWeight(coins, gems, artObjects, magicItems, equipment, mundaneItems, salvage)
			: 0;

		// Generate container description
		const containerDescription = getRandomContainerDescription(params.containerType, this.rng);

		return {
			coins,
			gems,
			artObjects,
			magicItems,
			equipment,
			mundaneItems,
			salvage,
			containerDescription,
			totalValue,
			totalWeight,
			metadata: {
				challengeRating: params.challengeRating,
				experiencePoints: params.experiencePoints,
				partySize: params.partySize,
				partyLevel: params.partyLevel,
				lootType: params.lootType,
				timestamp: Date.now(),
				seed
			}
		};
	}

	/**
	 * Determine CR tier from parameters
	 */
	private getCRTierFromParams(params: LootGenerationParams): CRTier {
		if (params.challengeRating !== null) {
			return getCRTier(params.challengeRating);
		}

		// Estimate CR from XP (rough approximation)
		const xp = params.experiencePoints;
		if (xp < 1100) return '0-4';
		if (xp < 7200) return '5-10';
		if (xp < 25000) return '11-16';
		return '17+';
	}

	/**
	 * Generate coins (simplified to gold only)
	 */
	private generateCoins(params: LootGenerationParams, crTier: CRTier): CoinLoot {
		const table = params.lootType === 'individual'
			? INDIVIDUAL_TREASURE[crTier]
			: HOARD_TREASURE[crTier].coins;

		// Roll for each denomination
		const cp = this.rollDice(table.cp.dice) * table.cp.multiplier;
		const sp = this.rollDice(table.sp.dice) * table.sp.multiplier;
		const ep = this.rollDice(table.ep.dice) * table.ep.multiplier;
		const gp = this.rollDice(table.gp.dice) * table.gp.multiplier;
		const pp = this.rollDice(table.pp.dice) * table.pp.multiplier;

		// Apply coin percentage
		const coinRatio = params.coinPercentage / 100;

		// Convert all denominations to gold
		let totalGold = 0;
		totalGold += (cp * coinRatio) * 0.01; // 100 cp = 1 gp
		totalGold += (sp * coinRatio) * 0.1;  // 10 sp = 1 gp
		totalGold += (ep * coinRatio) * 0.5;  // 2 ep = 1 gp
		totalGold += (gp * coinRatio);        // 1 gp = 1 gp
		totalGold += (pp * coinRatio) * 10;   // 1 pp = 10 gp

		return {
			gold: Math.round(totalGold)
		};
	}

	/**
	 * Roll dice notation (e.g., "2d6", "1d4")
	 */
	private rollDice(notation: string): number {
		if (!notation || notation === '0d6') return 0;

		const match = notation.match(/(\d+)d(\d+)/);
		if (!match) return 0;

		const count = parseInt(match[1]);
		const sides = parseInt(match[2]);

		let total = 0;
		for (let i = 0; i < count; i++) {
			total += Math.floor(this.rng() * sides) + 1;
		}

		return total;
	}

	/**
	 * Generate gems from hoard treasure
	 */
	private generateGems(params: LootGenerationParams, crTier: CRTier): Gem[] {
		if (params.lootType === 'individual') return [];

		const table = HOARD_TREASURE[crTier];
		if (!table.gems || table.gems.length === 0) return [];

		const gems: Gem[] = [];

		// Roll d100 for gem generation (cumulative chance)
		const roll = Math.floor(this.rng() * 100) + 1;
		const gemEntry = table.gems.find(g => roll <= g.chance);

		if (gemEntry) {
			const count = this.rollDice(gemEntry.dice);
			const value = gemEntry.value;
			const descriptions = GEM_DESCRIPTIONS[value];

			// Generate individual gems
			for (let i = 0; i < count; i++) {
				const description = descriptions[Math.floor(this.rng() * descriptions.length)];
				gems.push({
					value,
					description,
					quantity: 1
				});
			}
		}

		return gems;
	}

	/**
	 * Generate art objects from hoard treasure
	 */
	private generateArtObjects(params: LootGenerationParams, crTier: CRTier): ArtObject[] {
		if (params.lootType === 'individual') return [];

		const table = HOARD_TREASURE[crTier];
		if (!table.art || table.art.length === 0) return [];

		const artObjects: ArtObject[] = [];

		// Roll d100 for art object generation (cumulative chance)
		const roll = Math.floor(this.rng() * 100) + 1;
		const artEntry = table.art.find(a => roll <= a.chance);

		if (artEntry) {
			const count = this.rollDice(artEntry.dice);
			const value = artEntry.value;
			const descriptions = ART_DESCRIPTIONS[value];

			// Generate individual art objects
			for (let i = 0; i < count; i++) {
				const description = descriptions[Math.floor(this.rng() * descriptions.length)];
				artObjects.push({
					value,
					description
				});
			}
		}

		return artObjects;
	}

	/**
	 * Generate magic items from hoard treasure
	 */
	private generateMagicItems(params: LootGenerationParams, crTier: CRTier): MagicItemLoot[] {
		if (params.lootType === 'individual') return [];

		const table = HOARD_TREASURE[crTier];
		if (!table.magicItems || table.magicItems.length === 0) return [];

		const magicItems: MagicItemLoot[] = [];

		// Roll d100 for magic item generation (cumulative chance)
		const roll = Math.floor(this.rng() * 100) + 1;
		const magicEntry = table.magicItems.find(m => roll <= m.chance);

		if (magicEntry) {
			const count = this.rollDice(magicEntry.rolls);

			// Apply low magic modifier
			const actualCount = params.lowMagic ? Math.max(1, Math.floor(count / 2)) : count;

			// Generate individual magic items
			for (let i = 0; i < actualCount; i++) {
				const item = this.selectMagicItem(params, magicEntry.table);
				if (item) {
					magicItems.push(item);
				}
			}
		}

		return magicItems;
	}

	/**
	 * Select a magic item from the item cache
	 */
	private selectMagicItem(params: LootGenerationParams, table: MagicItemTable): MagicItemLoot | null {
		const allItems = this.itemParser.getCacheStats().items;

		// Filter by rarity AND exclude equipment (only include type: item)
		let filteredItems = allItems.filter(item => {
			// Only include magic items, not equipment
			if (item.metadata?.type === 'equipment') {
				return false;
			}

			const rarity = (item.rarity?.toLowerCase() || 'common') as RarityLevel;

			// Apply min/max rarity filters
			if (params.minRarity) {
				const rarityOrder: RarityLevel[] = ['common', 'uncommon', 'rare', 'very rare', 'legendary'];
				const minIndex = rarityOrder.indexOf(params.minRarity);
				const itemIndex = rarityOrder.indexOf(rarity);
				if (itemIndex < minIndex) return false;
			}

			if (params.maxRarity) {
				const rarityOrder: RarityLevel[] = ['common', 'uncommon', 'rare', 'very rare', 'legendary'];
				const maxIndex = rarityOrder.indexOf(params.maxRarity);
				const itemIndex = rarityOrder.indexOf(rarity);
				if (itemIndex > maxIndex) return false;
			}

			return true;
		});

		if (filteredItems.length === 0) return null;

		// Filter by consumable percentage
		const wantConsumable = this.rng() * 100 < params.consumablePercentage;
		const consumableTypes = ['potion', 'scroll', 'consumable', 'ammunition'];

		if (wantConsumable) {
			const consumables = filteredItems.filter(item => {
				const itemType = item.metadata?.item_type?.toLowerCase() || '';
				const equipmentType = item.metadata?.equipment_type?.toLowerCase() || '';
				return consumableTypes.some(type =>
					itemType.includes(type) || equipmentType.includes(type)
				);
			});
			if (consumables.length > 0) {
				filteredItems = consumables;
			}
		}

		// Select random item
		const selectedItem = filteredItems[Math.floor(this.rng() * filteredItems.length)];

		return {
			itemRef: `[[${selectedItem.name}]]`,
			itemData: selectedItem,
			quantity: 1,
			identified: !params.trackIdentification || this.rng() > 0.5,
			table
		};
	}

	/**
	 * Generate equipment (weapons, armor, tools)
	 */
	private generateEquipment(params: LootGenerationParams, crTier: CRTier): EquipmentLoot[] {
		// 30% chance for equipment in hoard loot
		if (params.lootType === 'individual' || this.rng() > 0.3) return [];

		const allItems = this.itemParser.getCacheStats().items;
		const equipment = allItems.filter(item => item.metadata?.type === 'equipment');

		if (equipment.length === 0) return [];

		// Generate 1-4 equipment items based on CR tier
		const countMap: Record<CRTier, string> = {
			'0-4': '1d2',
			'5-10': '1d3',
			'11-16': '1d4',
			'17+': '2d2'
		};
		const count = this.rollDice(countMap[crTier]);

		const result: EquipmentLoot[] = [];
		for (let i = 0; i < count; i++) {
			const selectedItem = equipment[Math.floor(this.rng() * equipment.length)];
			result.push({
				itemRef: `[[${selectedItem.name}]]`,
				itemData: selectedItem,
				quantity: 1
			});
		}

		return result;
	}

	/**
	 * Generate mundane items (torches, rope, etc.)
	 */
	private generateMundaneItems(params: LootGenerationParams, crTier: CRTier): Array<{ name: string; quantity: number; value: number }> {
		// 20% chance for mundane items in hoard
		if (params.lootType === 'individual' || this.rng() > 0.2) return [];

		const mundaneItems = [
			{ name: 'Torch', value: 0.01, quantity: '2d6' },
			{ name: 'Rope (50 ft)', value: 1, quantity: '1d4' },
			{ name: 'Rations (1 day)', value: 0.5, quantity: '1d6' },
			{ name: 'Waterskin', value: 0.2, quantity: '1d4' },
			{ name: 'Bedroll', value: 1, quantity: '1d2' },
			{ name: 'Tinderbox', value: 0.5, quantity: '1d2' }
		];

		const count = this.rollDice('1d3');
		const selected: Array<{ name: string; quantity: number; value: number }> = [];

		for (let i = 0; i < count; i++) {
			const item = mundaneItems[Math.floor(this.rng() * mundaneItems.length)];
			selected.push({
				name: item.name,
				quantity: this.rollDice(item.quantity),
				value: item.value
			});
		}

		return selected;
	}

	/**
	 * Generate salvage materials from monsters
	 */
	private generateSalvage(params: LootGenerationParams): SalvageMaterial[] {
		if (!params.enableSalvage) return [];

		const salvageTables: Record<string, Array<{ name: string; description: string; value: number; tags: string[]; dc: number }>> = {
			beast: [
				{ name: 'Beast Hide', description: 'Thick hide suitable for leather armor', value: 10, tags: ['leather', 'armor'], dc: 10 },
				{ name: 'Sharp Claws', description: 'Usable for weapons or jewelry', value: 5, tags: ['weapon', 'jewelry'], dc: 12 },
				{ name: 'Beast Teeth', description: 'Sharp fangs for decorations or weapons', value: 3, tags: ['weapon', 'jewelry'], dc: 10 }
			],
			dragon: [
				{ name: 'Dragon Scale', description: 'Incredibly tough scale with elemental resistance', value: 100, tags: ['armor', 'enchanting'], dc: 18 },
				{ name: 'Dragon Tooth', description: 'Massive fang crackling with power', value: 50, tags: ['weapon', 'enchanting'], dc: 16 },
				{ name: 'Dragon Blood Vial', description: 'Potent alchemical reagent', value: 75, tags: ['alchemy', 'enchanting'], dc: 20 }
			],
			undead: [
				{ name: 'Bone Dust', description: 'Fine powder from undead bones', value: 5, tags: ['necromancy', 'alchemy'], dc: 10 },
				{ name: 'Ectoplasm', description: 'Ghostly residue with magical properties', value: 15, tags: ['necromancy', 'enchanting'], dc: 14 },
				{ name: 'Soul Gem Fragment', description: 'Crystallized essence of trapped soul', value: 25, tags: ['necromancy', 'enchanting'], dc: 16 }
			],
			elemental: [
				{ name: 'Elemental Core', description: 'Pulsing heart of elemental energy', value: 40, tags: ['enchanting', 'alchemy'], dc: 15 },
				{ name: 'Primordial Dust', description: 'Raw elemental matter', value: 20, tags: ['alchemy', 'enchanting'], dc: 13 },
				{ name: 'Planar Crystal', description: 'Crystallized elemental essence', value: 30, tags: ['enchanting', 'jewelry'], dc: 16 }
			],
			fiend: [
				{ name: 'Demon Horn', description: 'Twisted horn radiating malevolence', value: 35, tags: ['weapon', 'enchanting'], dc: 17 },
				{ name: 'Infernal Ichor', description: 'Corrosive blood of fiendish origin', value: 25, tags: ['alchemy', 'poison'], dc: 15 },
				{ name: 'Hellfire Shard', description: 'Fragment of eternal flame', value: 50, tags: ['enchanting', 'alchemy'], dc: 18 }
			],
			aberration: [
				{ name: 'Aberrant Tentacle', description: 'Writhing appendage with strange properties', value: 20, tags: ['alchemy', 'enchanting'], dc: 16 },
				{ name: 'Mind Crystal', description: 'Psionic residue crystallized', value: 45, tags: ['enchanting', 'psionic'], dc: 18 },
				{ name: 'Void Essence', description: 'Dark substance from beyond reality', value: 60, tags: ['enchanting', 'necromancy'], dc: 20 }
			]
		};

		const monsterType = params.monsterType.toLowerCase();
		const table = salvageTables[monsterType] || salvageTables['beast'];

		// Generate 1-3 salvage items
		const count = this.rollDice('1d3');
		const salvage: SalvageMaterial[] = [];

		for (let i = 0; i < count; i++) {
			const item = table[Math.floor(this.rng() * table.length)];
			salvage.push({
				name: item.name,
				description: item.description,
				value: item.value,
				craftingTags: item.tags,
				harvestDC: item.dc
			});
		}

		return salvage;
	}

	/**
	 * Calculate total value in gold pieces
	 */
	private calculateTotalValue(
		coins: CoinLoot,
		gems: Gem[],
		artObjects: ArtObject[],
		magicItems: MagicItemLoot[],
		equipment: EquipmentLoot[],
		mundaneItems: Array<{ name: string; quantity: number; value: number }>,
		salvage: SalvageMaterial[]
	): number {
		let total = coins.gold;

		// Add gem values
		gems.forEach(gem => {
			total += gem.value * gem.quantity;
		});

		// Add art object values
		artObjects.forEach(art => {
			total += art.value;
		});

		// Add magic item values
		magicItems.forEach(item => {
			if (item.itemData) {
				total += item.itemData.basePrice / 100; // Convert from cp to gp
			}
		});

		// Add equipment values
		equipment.forEach(item => {
			if (item.itemData) {
				total += item.itemData.basePrice / 100; // Convert from cp to gp
			}
		});

		// Add mundane item values
		mundaneItems.forEach(item => {
			total += item.value * item.quantity;
		});

		// Add salvage values
		salvage.forEach(mat => {
			total += mat.value;
		});

		return Math.round(total);
	}

	/**
	 * Calculate total weight in pounds
	 */
	private calculateTotalWeight(
		coins: CoinLoot,
		gems: Gem[],
		artObjects: ArtObject[],
		magicItems: MagicItemLoot[],
		equipment: EquipmentLoot[],
		mundaneItems: Array<{ name: string; quantity: number; value: number }>,
		salvage: SalvageMaterial[]
	): number {
		let weight = 0;

		// Coins (50 coins = 1 lb, simplified to gold only)
		weight += coins.gold / 50;

		// Gems (negligible weight, ~0.01 lb each)
		weight += gems.length * 0.01;

		// Art objects (~1-5 lbs each)
		weight += artObjects.length * 2;

		// Magic items (estimate based on item type, default 1 lb)
		magicItems.forEach(item => {
			weight += 1; // Simplified weight
		});

		// Equipment (weapons ~5 lbs, armor ~20 lbs, tools ~2 lbs, average ~5 lbs)
		equipment.forEach(item => {
			weight += 5; // Simplified weight
		});

		// Mundane items (estimate)
		mundaneItems.forEach(item => {
			weight += item.quantity * 0.5; // Simplified weight
		});

		// Salvage materials (~1 lb each)
		weight += salvage.length * 1;

		return Math.round(weight * 10) / 10; // Round to 1 decimal place
	}
}
