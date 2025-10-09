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
	/** Image URL (can be online resource or local file path) */
	imageUrl?: string;
	/** List of shop types where this item is always available (e.g., ["alchemist", "general_store"]) */
	stapleForShops?: string[];
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
	/** Display mode for shop view */
	displayMode?: DisplayMode;
	/** Current page for paginated display (defaults to 1) */
	currentPage?: number;
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
	/** OpenAI API key for image generation */
	openaiApiKey: string;
	/** Image generation style */
	imageStyle: ImageStyle;
	/** Attachment folder name for generated images */
	attachmentFolder: string;
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

/**
 * Rarity levels in D&D 5e (ordered from common to legendary)
 */
export type RarityLevel = 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';

/**
 * Image generation style options for DALL-E
 */
export type ImageStyle = 'realistic' | 'fantasy-painting' | 'digital-art' | 'isometric' | 'sketch';

/**
 * Display mode options for shop inventory view
 */
export type DisplayMode =
	| 'standard'       // Auto-sizing grid based on item count
	| 'large-cards'    // 2-3 columns, large cards
	| 'compact-cards'  // 5-6 columns, small cards
	| 'list-2col'      // 2-column list format
	| 'list-3col'      // 3-column list format
	| 'dense-list'     // Multi-column compact list
	| 'gallery'        // Image-focused display
	| 'table';         // Spreadsheet-style table

/**
 * Shop size presets
 */
export type ShopSizePreset = 'small' | 'medium' | 'large' | 'huge' | 'custom';

/**
 * Shop size configuration
 */
export interface ShopSize {
	/** Size preset identifier */
	preset: ShopSizePreset;
	/** Minimum number of unique items */
	minItems: number;
	/** Maximum number of unique items */
	maxItems: number;
	/** Display label */
	label: string;
}

/**
 * Parameters for generating a shop
 */
export interface ShopGenerationParams {
	/** Shop name */
	name: string;
	/** Shop type identifier */
	shopType: string;
	/** Price modifier percentage */
	priceModifier: number;
	/** Shop size configuration */
	size: ShopSize;
	/** Total inventory budget in base currency (copper pieces) */
	budget: number;
	/** Minimum rarity to include (null = no minimum) */
	minRarity: RarityLevel | null;
	/** Maximum rarity to include (null = no maximum) */
	maxRarity: RarityLevel | null;
	/** Folder path for the shop file */
	folderPath: string;
	/** Include staple items for this shop type */
	includeStapleItems: boolean;
}

/**
 * Generated inventory result
 */
export interface GeneratedInventory {
	/** Generated inventory items */
	items: Array<{
		itemRef: string;
		quantity: number;
		priceOverride: number | null;
	}>;
	/** Total value of generated inventory */
	totalValue: number;
	/** Number of items generated */
	itemCount: number;
}

/**
 * Restock intensity levels
 */
export type RestockIntensity = 'light' | 'medium' | 'heavy';

/**
 * Parameters for restocking a shop
 */
export interface RestockParams {
	/** Restock intensity level */
	intensity: RestockIntensity;
	/** Minimum rarity for new items (null = no minimum) */
	minRarity: RarityLevel | null;
	/** Maximum rarity for new items (null = no maximum) */
	maxRarity: RarityLevel | null;
	/** Budget for new items in base currency (0 = unlimited) */
	budget: number;
}

/**
 * Result of a restock operation
 */
export interface RestockResult {
	/** Updated inventory */
	inventory: Array<{
		itemRef: string;
		quantity: number;
		priceOverride: number | null;
	}>;
	/** Items that were removed */
	removedCount: number;
	/** Items that were added */
	addedCount: number;
	/** Items whose quantities were reduced */
	reducedCount: number;
}
