import { ItemParser } from '../parsers/itemParser';
import {
	ItemData,
	RarityLevel,
	ShopSize,
	ShopSizePreset,
	ShopGenerationParams,
	GeneratedInventory,
	ShopboardSettings,
	ShopTypeConfig
} from '../types';

/**
 * Utility for generating random shop inventories
 */
export class ShopGenerator {
	private itemParser: ItemParser;
	private settings: ShopboardSettings;

	// Rarity order for comparison
	private readonly RARITY_ORDER: RarityLevel[] = [
		'common',
		'uncommon',
		'rare',
		'very rare',
		'legendary'
	];

	// Shop size presets
	private readonly SIZE_PRESETS: Record<ShopSizePreset, ShopSize> = {
		small: {
			preset: 'small',
			minItems: 5,
			maxItems: 10,
			label: 'Small (5-10 items)'
		},
		medium: {
			preset: 'medium',
			minItems: 10,
			maxItems: 20,
			label: 'Medium (10-20 items)'
		},
		large: {
			preset: 'large',
			minItems: 20,
			maxItems: 35,
			label: 'Large (20-35 items)'
		},
		huge: {
			preset: 'huge',
			minItems: 35,
			maxItems: 50,
			label: 'Huge (35-50 items)'
		},
		custom: {
			preset: 'custom',
			minItems: 1,
			maxItems: 100,
			label: 'Custom'
		}
	};

	constructor(itemParser: ItemParser, settings: ShopboardSettings) {
		this.itemParser = itemParser;
		this.settings = settings;
	}

	/**
	 * Get all shop size presets
	 */
	getSizePresets(): ShopSize[] {
		return Object.values(this.SIZE_PRESETS);
	}

	/**
	 * Get a specific size preset
	 */
	getSizePreset(preset: ShopSizePreset): ShopSize {
		return this.SIZE_PRESETS[preset];
	}

	/**
	 * Get rarity levels in order
	 */
	getRarityLevels(): RarityLevel[] {
		return [...this.RARITY_ORDER];
	}

	/**
	 * Compare two rarity levels
	 * @returns negative if a < b, 0 if equal, positive if a > b
	 */
	private compareRarity(a: string, b: string): number {
		const indexA = this.RARITY_ORDER.indexOf(a as RarityLevel);
		const indexB = this.RARITY_ORDER.indexOf(b as RarityLevel);

		// If rarity is not in the standard list, treat as common
		const finalA = indexA === -1 ? 0 : indexA;
		const finalB = indexB === -1 ? 0 : indexB;

		return finalA - finalB;
	}

	/**
	 * Check if item rarity is within specified range
	 */
	private isRarityInRange(
		itemRarity: string | undefined,
		minRarity: RarityLevel | null,
		maxRarity: RarityLevel | null
	): boolean {
		// If no rarity specified on item, treat as common
		const rarity = itemRarity?.toLowerCase() || 'common';

		// Check minimum rarity
		if (minRarity && this.compareRarity(rarity, minRarity) < 0) {
			return false;
		}

		// Check maximum rarity
		if (maxRarity && this.compareRarity(rarity, maxRarity) > 0) {
			return false;
		}

		return true;
	}

	/**
	 * Filter items by rarity constraints
	 */
	filterItemsByRarity(
		items: ItemData[],
		minRarity: RarityLevel | null,
		maxRarity: RarityLevel | null
	): ItemData[] {
		return items.filter(item =>
			this.isRarityInRange(item.rarity, minRarity, maxRarity)
		);
	}

	/**
	 * Filter items by shop type constraints
	 * Checks if item's type matches the shop's allowed types
	 */
	filterItemsByShopType(
		items: ItemData[],
		shopType: string,
		includeVariety: boolean = false
	): ItemData[] {
		// Get shop type configuration
		const shopConfig: ShopTypeConfig | undefined = this.settings.shopTypes[shopType];

		// If shop type not configured, allow all items
		if (!shopConfig) {
			console.warn(`Shop type "${shopType}" not found in settings, allowing all items`);
			return items;
		}

		// Check if wildcards are used (allow all types)
		const allowAllItemTypes = shopConfig.allowedItemTypes.includes('*');
		const allowAllEquipmentTypes = shopConfig.allowedEquipmentTypes.includes('*');

		// If both are wildcards, no filtering needed
		if (allowAllItemTypes && allowAllEquipmentTypes) {
			return items;
		}

		return items.filter(item => {
			// Check if item is a staple for this shop type (always include staples)
			if (item.stapleForShops && item.stapleForShops.includes(shopType)) {
				return true;
			}

			// Apply variety logic: 15% chance to include items that don't match
			if (includeVariety && shopConfig.allowVariety && Math.random() < 0.15) {
				return true;
			}

			// Get item type information from metadata
			const metadata = item.metadata || {};
			const metaType = metadata.type;

			// Check equipment type
			if (metaType === 'equipment') {
				const equipmentType = metadata.equipment_type;
				if (equipmentType) {
					// Normalize to lowercase for comparison
					const normalizedType = equipmentType.toLowerCase();
					return allowAllEquipmentTypes ||
						shopConfig.allowedEquipmentTypes.some(allowed =>
							allowed.toLowerCase() === normalizedType
						);
				}
				// If no equipment_type specified, check against item types as fallback
				return allowAllItemTypes;
			}

			// Check item type
			const itemType = metadata.item_type;
			if (itemType) {
				// Normalize to lowercase for comparison
				const normalizedType = itemType.toLowerCase();
				return allowAllItemTypes ||
					shopConfig.allowedItemTypes.some(allowed =>
						allowed.toLowerCase() === normalizedType
					);
			}

			// If no type metadata, include by default if wildcards are used
			return allowAllItemTypes || allowAllEquipmentTypes;
		});
	}

	/**
	 * Get staple items for a specific shop type
	 */
	getStapleItems(shopType: string, allItems: ItemData[]): ItemData[] {
		return allItems.filter(item => {
			if (!item.stapleForShops || item.stapleForShops.length === 0) {
				return false;
			}
			return item.stapleForShops.includes(shopType);
		});
	}

	/**
	 * Calculate quantity based on item rarity
	 * Common items get more stock, legendary items get less
	 */
	private calculateQuantity(rarity: string | undefined): number {
		const normalizedRarity = rarity?.toLowerCase() || 'common';

		switch (normalizedRarity) {
			case 'common':
				return this.randomInt(3, 15);
			case 'uncommon':
				return this.randomInt(2, 8);
			case 'rare':
				return this.randomInt(1, 5);
			case 'very rare':
				return this.randomInt(1, 3);
			case 'legendary':
				return this.randomInt(1, 2);
			default:
				return this.randomInt(1, 10);
		}
	}

	/**
	 * Generate random integer between min and max (inclusive)
	 */
	private randomInt(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	/**
	 * Shuffle array using Fisher-Yates algorithm
	 */
	private shuffleArray<T>(array: T[]): T[] {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	/**
	 * Generate inventory based on parameters
	 */
	generateInventory(params: ShopGenerationParams): GeneratedInventory {
		// Get all available items from cache
		const allItems = this.getAllCachedItems();

		if (allItems.length === 0) {
			console.warn('No items available in cache for generation');
			return {
				items: [],
				totalValue: 0,
				itemCount: 0
			};
		}

		// Generate inventory with quantities
		const inventory: Array<{
			itemRef: string;
			quantity: number;
			priceOverride: number | null;
		}> = [];

		let totalValue = 0;
		const addedItemNames = new Set<string>();

		// Step 1: Add staple items if enabled
		if (params.includeStapleItems) {
			const stapleItems = this.getStapleItems(params.shopType, allItems);

			// Filter staple items by rarity
			const filteredStapleItems = this.filterItemsByRarity(
				stapleItems,
				params.minRarity,
				params.maxRarity
			);

			for (const item of filteredStapleItems) {
				// Calculate quantity based on rarity
				const quantity = this.calculateQuantity(item.rarity);
				const itemValue = item.basePrice * quantity;

				// Check if we're within budget (allow some flexibility)
				if (params.budget > 0 && totalValue + itemValue > params.budget * 1.2) {
					// Try with reduced quantity
					const reducedQuantity = Math.max(1, Math.floor(quantity / 2));
					const reducedValue = item.basePrice * reducedQuantity;

					if (totalValue + reducedValue <= params.budget * 1.2) {
						inventory.push({
							itemRef: `[[${item.name}]]`,
							quantity: reducedQuantity,
							priceOverride: null
						});
						totalValue += reducedValue;
						addedItemNames.add(item.name);
					}
					// Skip item if still over budget
				} else {
					inventory.push({
						itemRef: `[[${item.name}]]`,
						quantity: quantity,
						priceOverride: null
					});
					totalValue += itemValue;
					addedItemNames.add(item.name);
				}
			}

			console.log(`Added ${addedItemNames.size} staple items for ${params.shopType}`);
		}

		// Step 2: Filter by shop type (before rarity)
		const shopTypeFilteredItems = this.filterItemsByShopType(
			allItems,
			params.shopType,
			true // Include variety items
		);

		if (shopTypeFilteredItems.length === 0) {
			console.warn(`No items match the shop type "${params.shopType}"`);
			// Return staple items only if any were added
			return {
				items: inventory,
				totalValue: totalValue,
				itemCount: inventory.length
			};
		}

		// Step 3: Filter by rarity for random items
		const filteredItems = this.filterItemsByRarity(
			shopTypeFilteredItems,
			params.minRarity,
			params.maxRarity
		);

		if (filteredItems.length === 0) {
			console.warn('No items match the rarity constraints');
			// Return staple items only if any were added
			return {
				items: inventory,
				totalValue: totalValue,
				itemCount: inventory.length
			};
		}

		// Step 4: Fill remaining slots with random items
		const targetCount = this.randomInt(params.size.minItems, params.size.maxItems);
		const remainingSlots = Math.max(0, targetCount - inventory.length);

		if (remainingSlots > 0) {
			// Filter out already added items
			const availableItems = filteredItems.filter(item => !addedItemNames.has(item.name));

			if (availableItems.length > 0) {
				// Shuffle and select items
				const shuffled = this.shuffleArray(availableItems);
				const itemsToAdd = Math.min(remainingSlots, shuffled.length);
				const selectedItems = shuffled.slice(0, itemsToAdd);

				for (const item of selectedItems) {
					// Calculate quantity based on rarity
					const quantity = this.calculateQuantity(item.rarity);
					const itemValue = item.basePrice * quantity;

					// Check if we're within budget (allow some flexibility)
					if (params.budget > 0 && totalValue + itemValue > params.budget * 1.2) {
						// Try with reduced quantity
						const reducedQuantity = Math.max(1, Math.floor(quantity / 2));
						const reducedValue = item.basePrice * reducedQuantity;

						if (totalValue + reducedValue <= params.budget * 1.2) {
							inventory.push({
								itemRef: `[[${item.name}]]`,
								quantity: reducedQuantity,
								priceOverride: null
							});
							totalValue += reducedValue;
						}
						// Skip item if still over budget
					} else {
						inventory.push({
							itemRef: `[[${item.name}]]`,
							quantity: quantity,
							priceOverride: null
						});
						totalValue += itemValue;
					}
				}
			}
		}

		return {
			items: inventory,
			totalValue: totalValue,
			itemCount: inventory.length
		};
	}

	/**
	 * Get all items from the item parser cache
	 */
	private getAllCachedItems(): ItemData[] {
		// Access the cache through the parser
		// Since cache is private, we need to iterate through possible lookups
		// For now, we'll need to add a method to ItemParser to expose all items
		// This is a limitation we'll work around

		// Temporary solution: return empty array and log warning
		// This will be resolved by adding a getAllItems() method to ItemParser
		const items: ItemData[] = [];

		// We can access cache stats to see if there are items
		const stats = this.itemParser.getCacheStats();
		if (stats.itemCount === 0) {
			return items;
		}

		// Use reflection to access the private cache (TypeScript workaround)
		// This is not ideal but works for the plugin context
		const cache = (this.itemParser as any).cache;
		if (cache && cache.items) {
			const seen = new Set<string>();
			for (const [key, item] of cache.items.entries()) {
				// Only add unique items (cache has both name and path keys)
				if (item && !seen.has(item.path)) {
					items.push(item);
					seen.add(item.path);
				}
			}
		}

		return items;
	}

	/**
	 * Create shop file content from generation result
	 */
	createShopContent(params: ShopGenerationParams, inventory: GeneratedInventory): string {
		let content = '---\n';
		content += 'type: shop\n';
		content += `name: "${params.name}"\n`;
		content += `shop_type: ${params.shopType}\n`;
		content += `price_modifier: ${params.priceModifier}\n`;
		content += 'inventory:\n';

		for (const item of inventory.items) {
			content += `  - item: "${item.itemRef}"\n`;
			content += `    quantity: ${item.quantity}\n`;
			if (item.priceOverride !== null && item.priceOverride !== undefined) {
				content += `    price_override: ${item.priceOverride}\n`;
			} else {
				content += `    price_override: null\n`;
			}
		}

		content += '---\n\n';
		content += `# ${params.name}\n\n`;

		// Add generation details as a comment
		content += '<!-- Generated using Shopboard Shop Builder -->\n\n';
		content += `**Size**: ${params.size.label}\n`;
		content += `**Price Modifier**: ${params.priceModifier > 0 ? '+' : ''}${params.priceModifier}%\n`;
		content += `**Rarity Range**: ${params.minRarity || 'Any'} to ${params.maxRarity || 'Any'}\n\n`;

		content += '## Inventory\n\n';
		content += `This shop contains ${inventory.itemCount} unique items with a total base value of `;
		content += `${Math.floor(inventory.totalValue / 100)} gold pieces.\n\n`;
		content += '## Notes\n\n';
		content += '<!-- Add any additional notes about this shop here -->\n';

		return content;
	}
}
