import { ItemParser } from '../parsers/itemParser';
import { ShopGenerator } from './shopGenerator';
import {
	ItemData,
	RarityLevel,
	RestockParams,
	RestockResult,
	ShopData,
	RestockIntensity
} from '../types';

/**
 * Utility for restocking shop inventories
 * Simulates natural shop dynamics: items being sold, new stock arriving
 */
export class ShopRestocker {
	private itemParser: ItemParser;
	private shopGenerator: ShopGenerator;

	// Rarity order for comparison
	private readonly RARITY_ORDER: RarityLevel[] = [
		'common',
		'uncommon',
		'rare',
		'very rare',
		'legendary'
	];

	// Intensity configuration
	private readonly INTENSITY_CONFIG = {
		light: {
			removeChance: 0.20, // 20% of items removed
			reduceChance: 0.30, // 30% of remaining items reduced
			minQuantityReduction: 0.30, // Reduce by at least 30%
			maxQuantityReduction: 0.60  // Reduce by at most 60%
		},
		medium: {
			removeChance: 0.35,
			reduceChance: 0.45,
			minQuantityReduction: 0.40,
			maxQuantityReduction: 0.70
		},
		heavy: {
			removeChance: 0.50,
			reduceChance: 0.60,
			minQuantityReduction: 0.50,
			maxQuantityReduction: 0.80
		}
	};

	constructor(itemParser: ItemParser, shopGenerator: ShopGenerator) {
		this.itemParser = itemParser;
		this.shopGenerator = shopGenerator;
	}

	/**
	 * Restock a shop's inventory
	 * @param shopData Current shop data
	 * @param params Restock parameters
	 * @returns Result with updated inventory and statistics
	 */
	restockInventory(shopData: ShopData, params: RestockParams): RestockResult {
		const config = this.INTENSITY_CONFIG[params.intensity];
		const currentInventory = shopData.inventory;

		if (currentInventory.length === 0) {
			// Shop is empty, just add new items
			return this.addNewItems([], shopData, params, 0);
		}

		// Step 1: Remove items (simulate sold out)
		const { remaining, removedCount } = this.removeItems(currentInventory, config, shopData);

		// Step 2: Reduce quantities (simulate partial sales)
		const { reduced, reducedCount } = this.reduceQuantities(remaining, config, shopData.shopType);

		// Step 3: Add new items (simulate restocking)
		return this.addNewItems(reduced, shopData, params, removedCount + reducedCount);
	}

	/**
	 * Remove items from inventory (simulate sold out items)
	 * Common items are more likely to be removed than rare items
	 * Staple items for this shop type are never removed
	 */
	private removeItems(
		inventory: Array<{ itemRef: string; quantity: number; priceOverride: number | null; itemData: ItemData | null }>,
		config: { removeChance: number },
		shopData: ShopData
	): { remaining: typeof inventory; removedCount: number } {
		const remaining: typeof inventory = [];
		let removedCount = 0;

		for (const item of inventory) {
			// Check if this is a staple item for this shop type
			const isStapleItem = item.itemData?.stapleForShops?.includes(shopData.shopType) || false;

			if (isStapleItem) {
				// Never remove staple items
				remaining.push(item);
				continue;
			}

			// Calculate removal chance based on rarity
			const rarityMultiplier = this.getRarityRemovalMultiplier(item.itemData?.rarity);
			const adjustedRemoveChance = config.removeChance * rarityMultiplier;

			// Randomly decide if item should be removed
			if (Math.random() < adjustedRemoveChance) {
				removedCount++;
				console.log(`Restock: Removed ${item.itemRef} (sold out)`);
			} else {
				remaining.push(item);
			}
		}

		return { remaining, removedCount };
	}

	/**
	 * Get removal multiplier based on rarity
	 * Common items sell faster, legendary items sell slower
	 */
	private getRarityRemovalMultiplier(rarity: string | undefined): number {
		const normalizedRarity = rarity?.toLowerCase() || 'common';

		switch (normalizedRarity) {
			case 'common':
				return 1.5; // 50% more likely to be removed
			case 'uncommon':
				return 1.2;
			case 'rare':
				return 1.0;
			case 'very rare':
				return 0.7;
			case 'legendary':
				return 0.5; // 50% less likely to be removed
			default:
				return 1.0;
		}
	}

	/**
	 * Reduce quantities on remaining items (simulate partial sales)
	 * Staple items have reduced chance of quantity reduction
	 */
	private reduceQuantities(
		inventory: Array<{ itemRef: string; quantity: number; priceOverride: number | null; itemData: ItemData | null }>,
		config: { reduceChance: number; minQuantityReduction: number; maxQuantityReduction: number },
		shopType: string
	): {
		reduced: Array<{ itemRef: string; quantity: number; priceOverride: number | null }>;
		reducedCount: number;
	} {
		const reduced: Array<{ itemRef: string; quantity: number; priceOverride: number | null }> = [];
		let reducedCount = 0;

		for (const item of inventory) {
			// Check if this is a staple item for this shop type
			const isStapleItem = item.itemData?.stapleForShops?.includes(shopType) || false;

			// Staple items have 50% less chance of quantity reduction
			const effectiveReduceChance = isStapleItem ? config.reduceChance * 0.5 : config.reduceChance;

			// Randomly decide if quantity should be reduced
			if (Math.random() < effectiveReduceChance && item.quantity > 1) {
				// Calculate reduction percentage
				// Staple items get reduced less (min reduction)
				const reductionPercent = isStapleItem
					? config.minQuantityReduction
					: this.randomFloat(config.minQuantityReduction, config.maxQuantityReduction);

				// Calculate new quantity
				const reduction = Math.ceil(item.quantity * reductionPercent);
				const newQuantity = Math.max(1, item.quantity - reduction);

				reduced.push({
					itemRef: item.itemRef,
					quantity: newQuantity,
					priceOverride: item.priceOverride
				});

				reducedCount++;
				console.log(`Restock: Reduced ${item.itemRef} from ${item.quantity} to ${newQuantity}`);
			} else {
				// Keep item unchanged
				reduced.push({
					itemRef: item.itemRef,
					quantity: item.quantity,
					priceOverride: item.priceOverride
				});
			}
		}

		return { reduced, reducedCount };
	}

	/**
	 * Add new items to inventory (simulate restocking)
	 * Priority: Re-add missing staple items first, then fill with random items
	 */
	private addNewItems(
		currentInventory: Array<{ itemRef: string; quantity: number; priceOverride: number | null }>,
		shopData: ShopData,
		params: RestockParams,
		changesCount: number
	): RestockResult {
		// Get all available items from cache
		const allItems = this.getAllCachedItems();
		if (allItems.length === 0) {
			console.warn('No items available for restocking');
			return {
				inventory: currentInventory,
				removedCount: 0,
				addedCount: 0,
				reducedCount: changesCount
			};
		}

		// Get rarity distribution from existing inventory
		const { minRarity, maxRarity } = this.inferRarityRange(shopData.inventory, params);

		// Filter by shop type first (applies variety logic)
		const shopTypeFilteredItems = this.shopGenerator.filterItemsByShopType(
			allItems,
			shopData.shopType,
			true // Include variety items
		);

		// Filter by rarity
		const filteredItems = this.shopGenerator.filterItemsByRarity(
			shopTypeFilteredItems,
			minRarity,
			maxRarity
		);

		// Get staple items for this shop type
		const stapleItems = this.shopGenerator.getStapleItems(shopData.shopType, allItems);
		const filteredStapleItems = this.shopGenerator.filterItemsByRarity(
			stapleItems,
			minRarity,
			maxRarity
		);

		// Track current inventory items
		const existingRefs = new Set(currentInventory.map(item => item.itemRef));

		// Find missing staple items
		const missingStapleItems = filteredStapleItems.filter(
			item => !existingRefs.has(`[[${item.name}]]`)
		);

		// Add new items with quantities
		const addedItems: typeof currentInventory = [];
		let totalValue = 0;

		// Step 1: Re-add missing staple items first
		for (const item of missingStapleItems) {
			// Calculate quantity based on rarity
			const quantity = this.calculateQuantity(item.rarity);

			// Check budget if specified
			if (params.budget > 0) {
				const itemValue = item.basePrice * quantity;
				if (totalValue + itemValue > params.budget) {
					// Try reduced quantity for staple items
					const reducedQuantity = Math.max(1, Math.floor(quantity / 2));
					const reducedValue = item.basePrice * reducedQuantity;

					if (totalValue + reducedValue <= params.budget) {
						addedItems.push({
							itemRef: `[[${item.name}]]`,
							quantity: reducedQuantity,
							priceOverride: null
						});
						totalValue += reducedValue;
						existingRefs.add(`[[${item.name}]]`);
						console.log(`Restock: Re-added staple item ${item.name} (qty: ${reducedQuantity})`);
					}
					// Skip if still over budget
					continue;
				}

				totalValue += itemValue;
			}

			addedItems.push({
				itemRef: `[[${item.name}]]`,
				quantity: quantity,
				priceOverride: null
			});
			existingRefs.add(`[[${item.name}]]`);

			console.log(`Restock: Re-added staple item ${item.name} (qty: ${quantity})`);
		}

		// Step 2: Fill remaining slots with random items
		const originalSize = shopData.inventory.length;
		const currentSize = currentInventory.length + addedItems.length;
		const targetAddCount = Math.max(0, Math.ceil((originalSize - currentSize) * 1.2));

		if (targetAddCount > 0) {
			// Filter out items already in inventory
			const newItemsPool = filteredItems.filter(item => !existingRefs.has(`[[${item.name}]]`));

			if (newItemsPool.length > 0) {
				// Shuffle and select new items
				const shuffled = this.shuffleArray(newItemsPool);
				const selectedItems = shuffled.slice(0, Math.min(targetAddCount, newItemsPool.length));

				for (const item of selectedItems) {
					// Calculate quantity based on rarity
					const quantity = this.calculateQuantity(item.rarity);

					// Check budget if specified
					if (params.budget > 0) {
						const itemValue = item.basePrice * quantity;
						if (totalValue + itemValue > params.budget) {
							// Try reduced quantity
							const reducedQuantity = Math.max(1, Math.floor(quantity / 2));
							const reducedValue = item.basePrice * reducedQuantity;

							if (totalValue + reducedValue <= params.budget) {
								addedItems.push({
									itemRef: `[[${item.name}]]`,
									quantity: reducedQuantity,
									priceOverride: null
								});
								totalValue += reducedValue;
							}
							// Skip if still over budget
							continue;
						}

						totalValue += itemValue;
					}

					addedItems.push({
						itemRef: `[[${item.name}]]`,
						quantity: quantity,
						priceOverride: null
					});

					console.log(`Restock: Added ${item.name} (qty: ${quantity})`);
				}
			}
		}

		// Combine current and new items
		const finalInventory = [...currentInventory, ...addedItems];

		return {
			inventory: finalInventory,
			removedCount: shopData.inventory.length - currentInventory.length,
			addedCount: addedItems.length,
			reducedCount: changesCount
		};
	}

	/**
	 * Infer rarity range from existing inventory
	 * If params specify rarity, use those; otherwise infer from shop
	 */
	private inferRarityRange(
		inventory: Array<{ itemData: ItemData | null }>,
		params: RestockParams
	): { minRarity: RarityLevel | null; maxRarity: RarityLevel | null } {
		// If params specify rarity, use those
		if (params.minRarity || params.maxRarity) {
			return {
				minRarity: params.minRarity,
				maxRarity: params.maxRarity
			};
		}

		// Otherwise, infer from existing inventory
		const rarities: RarityLevel[] = [];
		for (const item of inventory) {
			if (item.itemData?.rarity) {
				const rarity = item.itemData.rarity.toLowerCase() as RarityLevel;
				if (this.RARITY_ORDER.includes(rarity)) {
					rarities.push(rarity);
				}
			}
		}

		if (rarities.length === 0) {
			return { minRarity: null, maxRarity: null };
		}

		// Find min and max rarity
		const rarityIndices = rarities.map(r => this.RARITY_ORDER.indexOf(r));
		const minIndex = Math.min(...rarityIndices);
		const maxIndex = Math.max(...rarityIndices);

		// Expand range slightly for variety
		const expandedMinIndex = Math.max(0, minIndex - 1);
		const expandedMaxIndex = Math.min(this.RARITY_ORDER.length - 1, maxIndex + 1);

		return {
			minRarity: this.RARITY_ORDER[expandedMinIndex],
			maxRarity: this.RARITY_ORDER[expandedMaxIndex]
		};
	}

	/**
	 * Calculate quantity based on item rarity
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
	 * Get all items from the item parser cache
	 */
	private getAllCachedItems(): ItemData[] {
		const items: ItemData[] = [];

		// Use reflection to access the private cache
		const cache = (this.itemParser as any).cache;
		if (cache && cache.items) {
			const seen = new Set<string>();
			for (const [key, item] of cache.items.entries()) {
				if (item && !seen.has(item.path)) {
					items.push(item);
					seen.add(item.path);
				}
			}
		}

		return items;
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
	 * Generate random integer between min and max (inclusive)
	 */
	private randomInt(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	/**
	 * Generate random float between min and max
	 */
	private randomFloat(min: number, max: number): number {
		return Math.random() * (max - min) + min;
	}
}
