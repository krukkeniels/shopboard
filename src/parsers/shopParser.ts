import { App, TFile } from 'obsidian';
import { ShopData, ShopInventoryItem, ShopboardSettings } from '../types';
import { ItemParser } from './itemParser';

/**
 * Parser for shop notes - resolves inventory and calculates prices
 */
export class ShopParser {
	private app: App;
	private itemParser: ItemParser;
	private settings: ShopboardSettings;

	constructor(app: App, itemParser: ItemParser, settings: ShopboardSettings) {
		this.app = app;
		this.itemParser = itemParser;
		this.settings = settings;
	}

	/**
	 * Parse a shop note
	 * @param file - Shop note file to parse
	 * @returns Parsed shop data or null if invalid
	 */
	async parseShopNote(file: TFile): Promise<ShopData | null> {
		try {
			const metadata = this.app.metadataCache.getFileCache(file);

			if (!metadata || !metadata.frontmatter) {
				console.warn(`Shop ${file.path} has no frontmatter`);
				return null;
			}

			const fm = metadata.frontmatter;

			// Validate shop data
			if (!this.validateShopData(fm)) {
				console.warn(`Shop ${file.path} failed validation`);
				return null;
			}

			// Extract shop metadata
			const shopData: ShopData = {
				path: file.path,
				name: fm.name,
				shopType: fm.shop_type,
				priceModifier: fm.price_modifier || 0,
				inventory: [],
				columns: fm.columns ?? this.settings.defaultColumns,
			rows: fm.rows ?? this.settings.defaultRows,
				showDescriptions: fm.show_descriptions !== undefined ? fm.show_descriptions : true, // Default to true
				currentPage: fm.current_page || 1,
				metadata: { ...fm }
			};

			// Resolve inventory
			if (fm.inventory && Array.isArray(fm.inventory)) {
				shopData.inventory = this.resolveInventory(fm.inventory, shopData.priceModifier);
			}

			return shopData;

		} catch (error) {
			console.error(`Error parsing shop ${file.path}:`, error);
			return null;
		}
	}

	/**
	 * Resolve inventory items and calculate prices
	 * @param inventory - Raw inventory array from frontmatter
	 * @param priceModifier - Shop-wide price modifier percentage
	 * @returns Array of resolved inventory items
	 */
	resolveInventory(inventory: any[], priceModifier: number): ShopInventoryItem[] {
		const resolved: ShopInventoryItem[] = [];

		for (const entry of inventory) {
			if (!entry || typeof entry !== 'object') {
				console.warn('Invalid inventory entry:', entry);
				continue;
			}

			// Extract wikilink reference
			const itemRef = entry.item || '';
			if (!itemRef) {
				console.warn('Inventory entry missing item reference');
				continue;
			}

			// Parse wikilink to get item name
			const itemName = this.parseWikilink(itemRef);

			// Resolve item data
			const itemData = this.itemParser.getItemByName(itemName);

			if (!itemData) {
				console.warn(`Could not resolve item: ${itemRef}`);
			}

			// Calculate price
			let calculatedPrice = 0;
			if (entry.price_override !== null && entry.price_override !== undefined) {
				calculatedPrice = entry.price_override;
			} else if (itemData) {
				// Apply price modifier: basePrice * (1 + modifier / 100)
				const multiplier = 1 + (priceModifier / 100);
				calculatedPrice = Math.round(itemData.basePrice * multiplier);
			}

			const inventoryItem: ShopInventoryItem = {
				itemRef,
				itemData,
				quantity: entry.quantity || 0,
				priceOverride: entry.price_override || null,
				calculatedPrice
			};

			resolved.push(inventoryItem);
		}

		return resolved;
	}

	/**
	 * Parse wikilink to extract item name
	 * Supports formats:
	 * - [[Item Name]]
	 * - [[Folder/Item Name]]
	 * - [[Item Name|Display Name]]
	 * @param wikilink - Wikilink string
	 * @returns Extracted item name
	 */
	parseWikilink(wikilink: string): string {
		// Remove [[ and ]]
		let content = wikilink.replace(/^\[\[|\]\]$/g, '').trim();

		// Handle display name (|Display Name)
		if (content.includes('|')) {
			content = content.split('|')[0].trim();
		}

		// Handle folder paths (Folder/Item Name)
		if (content.includes('/')) {
			const parts = content.split('/');
			content = parts[parts.length - 1].trim();
		}

		return content;
	}

	/**
	 * Validate shop frontmatter data
	 * @param frontmatter - Frontmatter object
	 * @returns True if valid, false otherwise
	 */
	validateShopData(frontmatter: any): boolean {
		// Check required fields
		if (frontmatter.type !== 'shop') {
			console.warn('Missing or invalid type field (expected "shop")');
			return false;
		}

		if (!frontmatter.name || typeof frontmatter.name !== 'string') {
			console.warn('Missing or invalid name field');
			return false;
		}

		if (!frontmatter.shop_type || typeof frontmatter.shop_type !== 'string') {
			console.warn('Missing or invalid shop_type field');
			return false;
		}

		// Validate price_modifier if present
		if (frontmatter.price_modifier !== undefined && typeof frontmatter.price_modifier !== 'number') {
			console.warn('Invalid price_modifier field (must be a number)');
			return false;
		}

		// Validate inventory if present
		if (frontmatter.inventory !== undefined && !Array.isArray(frontmatter.inventory)) {
			console.warn('Invalid inventory field (must be an array)');
			return false;
		}

		return true;
	}
}
