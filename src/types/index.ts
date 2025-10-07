/**
 * Core type definitions for Shopboard plugin
 */

/**
 * Item data structure representing an item note
 */
export interface ItemData {
	/** File path of the item note */
	path: string;
	/** Display name of the item */
	name: string;
	/** Base price in smallest currency denomination (e.g., copper pieces) */
	basePrice: number;
	/** Item rarity (common, uncommon, rare, very rare, legendary) */
	rarity?: string;
	/** Item description */
	description?: string;
	/** Additional metadata from frontmatter */
	metadata: Record<string, any>;
}

/**
 * Shop inventory item with calculated price and resolved data
 */
export interface ShopInventoryItem {
	/** Wikilink reference to item (e.g., "[[Potion of Healing]]") */
	itemRef: string;
	/** Resolved item data (null if item not found) */
	itemData: ItemData | null;
	/** Quantity available in shop */
	quantity: number;
	/** Price override for this specific item (null to use calculated price) */
	priceOverride: number | null;
	/** Final calculated price after modifiers */
	calculatedPrice: number;
}

/**
 * Shop data structure representing a shop note
 */
export interface ShopData {
	/** File path of the shop note */
	path: string;
	/** Display name of the shop */
	name: string;
	/** Shop type (magic_shop, blacksmith, general_store, alchemist, etc.) */
	shopType: string;
	/** Price modifier percentage (e.g., -20 for 20% discount, +50 for 50% markup) */
	priceModifier: number;
	/** Shop inventory with resolved items */
	inventory: ShopInventoryItem[];
	/** Additional metadata from frontmatter */
	metadata: Record<string, any>;
}

/**
 * Item cache for fast lookups
 */
export interface ItemCache {
	/** Map of item name/path to item data */
	items: Map<string, ItemData>;
	/** Timestamp of last cache update */
	lastUpdated: number;
}

/**
 * Currency denomination configuration
 */
export interface Denomination {
	/** Short name (e.g., "gp", "sp", "cp") */
	name: string;
	/** Display label (e.g., "Gold", "Silver", "Copper") */
	label: string;
	/** Value relative to base unit (e.g., 1, 0.1, 0.01) */
	value: number;
}

/**
 * Currency system configuration
 */
export interface CurrencyConfig {
	/** Currency system type */
	system: 'dnd' | 'custom';
	/** List of denominations */
	denominations: Denomination[];
	/** Display mode: auto = convert to multiple denominations, simple = single denomination */
	display: 'auto' | 'simple';
}

/**
 * Shop type configuration
 */
export interface ShopTypeConfig {
	/** Display label for shop type */
	label: string;
	/** Theme identifier (mystical, forge, rustic, potion) */
	theme: string;
}

/**
 * Plugin settings structure
 */
export interface ShopboardSettings {
	/** Folders to scan for item notes */
	itemFolders: string[];
	/** Currency system configuration */
	currency: CurrencyConfig;
	/** Shop type configurations */
	shopTypes: Record<string, ShopTypeConfig>;
	/** Override Obsidian theme with fantasy theme */
	themeOverride: boolean;
	/** Enable auto-refresh on shop note changes */
	autoRefresh: boolean;
	/** Settings version for migration */
	version: string;
}

/**
 * Currency breakdown for display
 */
export interface CurrencyBreakdown {
	/** List of denominations with amounts */
	denominations: Array<{ name: string; amount: number }>;
	/** Formatted display string */
	formatted: string;
}

/**
 * Shop template for creation wizard
 */
export interface ShopTemplate {
	/** Template name */
	name: string;
	/** Shop type identifier */
	shopType: string;
	/** Default price modifier */
	priceModifier: number;
	/** Sample inventory items */
	sampleInventory: Array<{
		item: string;
		quantity: number;
	}>;
}
