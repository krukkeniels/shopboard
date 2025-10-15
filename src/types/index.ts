/**
 * Core type definitions for Shopboard plugin
 */

import { TFile } from 'obsidian';

/**
 * Item data structure representing an item note
 */
export interface ItemData {
	/** File path of the item note */
	path: string;
	/** TFile reference to the item note */
	file?: TFile;
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
	/** Number of columns for shop display grid */
	columns: number;
	/** Number of rows for shop display grid */
	rows: number;
	/** Show item descriptions in display (defaults to true) */
	showDescriptions?: boolean;
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
	/** Round prices up to nearest gold integer for player display */
	roundForPlayers?: boolean;
	/** Base currency denomination for storage (e.g., 'cp' - what base_price values are stored in) */
	baseCurrency: string;
	/** Display currency denomination for players (e.g., 'gp' - what denomination to show) */
	displayCurrency: string;
}

/**
 * Shop type configuration
 */
export interface ShopTypeConfig {
	/** Display label for shop type */
	label: string;
	/** Theme identifier (mystical, forge, rustic, potion) */
	theme: string;
	/** Allowed item_type values for this shop (use ["*"] for all types) */
	allowedItemTypes: string[];
	/** Allowed equipment_type values for this shop (use ["*"] for all types) */
	allowedEquipmentTypes: string[];
	/** Allow 10-20% variety items outside the allowed types for realism */
	allowVariety: boolean;
}

/**
 * Plugin settings structure
 */
export interface ShopboardSettings {
	/** Folders to scan for item notes */
	itemFolders: string[];
	/** Folders to scan for equipment notes */
	equipmentFolders: string[];
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
	/** Default number of columns for shops that haven't specified */
	defaultColumns: number;
	/** Default number of rows for shops that haven't specified */
	defaultRows: number;
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

/**
 * Loot type for treasure generation
 */
export type LootType = 'individual' | 'hoard' | 'lair';

/**
 * Environment/biome for loot flavor
 */
export type BiomeType = 'dungeon' | 'forest' | 'mountain' | 'aquatic' | 'underdark' | 'urban' | 'planar' | 'desert';

/**
 * Container type for loot
 */
export type ContainerType = 'chest' | 'pouch' | 'on-body' | 'scattered' | 'vault' | 'none';

/**
 * Challenge Rating tier for treasure tables
 */
export type CRTier = '0-4' | '5-10' | '11-16' | '17+';

/**
 * Gem value tier
 */
export type GemValue = 10 | 50 | 100 | 500 | 1000 | 5000;

/**
 * Art object value tier
 */
export type ArtValue = 25 | 250 | 750 | 2500 | 7500;

/**
 * Magic item table identifier (DMG tables)
 */
export type MagicItemTable = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

/**
 * Parameters for generating loot
 */
export interface LootGenerationParams {
	/** Challenge rating for treasure budget (null = manual XP) */
	challengeRating: number | null;
	/** Experience points (used if CR is null) */
	experiencePoints: number;
	/** Party size for scaling */
	partySize: number;
	/** Average party level */
	partyLevel: number;
	/** Type of loot to generate */
	lootType: LootType;
	/** Environment/biome for flavor */
	biome: BiomeType;
	/** Container type */
	containerType: ContainerType;
	/** Coin amount percentage (0-100, higher = more coins) */
	coinPercentage: number;
	/** Minimum magic item rarity (null = no minimum) */
	minRarity: RarityLevel | null;
	/** Maximum magic item rarity (null = no maximum) */
	maxRarity: RarityLevel | null;
	/** Percentage of consumable items (0-100) */
	consumablePercentage: number;
	/** Low magic setting - reduces magic item drops */
	lowMagic: boolean;
	/** Generate art objects (paintings, sculptures, jewelry) */
	generateArtObjects: boolean;
	/** Generate equipment (weapons, armor, tools) */
	generateEquipment: boolean;
	/** Enable salvage material generation from monsters */
	enableSalvage: boolean;
	/** Track which magic items are identified */
	trackIdentification: boolean;
	/** Monster type for salvage flavor (if enableSalvage) */
	monsterType: string;
	/** Include encumbrance notes */
	includeEncumbrance: boolean;
	/** RNG seed for reproducibility (null = random) */
	seed: string | null;
}

/**
 * Generated coin loot (simplified to gold only)
 */
export interface CoinLoot {
	/** Total value in gold pieces (all denominations converted) */
	gold: number;
}

/**
 * Generated gem
 */
export interface Gem {
	/** Gem value in gold pieces */
	value: GemValue;
	/** Gem description */
	description: string;
	/** Quantity */
	quantity: number;
}

/**
 * Generated art object
 */
export interface ArtObject {
	/** Art object value in gold pieces */
	value: ArtValue;
	/** Art object description */
	description: string;
}

/**
 * Generated magic item
 */
export interface MagicItemLoot {
	/** Reference to item note */
	itemRef: string;
	/** Item data (resolved) */
	itemData: ItemData | null;
	/** Quantity */
	quantity: number;
	/** Whether item is identified */
	identified: boolean;
	/** Table rolled on */
	table: MagicItemTable;
}

/**
 * Generated equipment item
 */
export interface EquipmentLoot {
	/** Reference to equipment note */
	itemRef: string;
	/** Equipment data (resolved) */
	itemData: ItemData | null;
	/** Quantity */
	quantity: number;
}

/**
 * Salvage material
 */
export interface SalvageMaterial {
	/** Material name */
	name: string;
	/** Material description */
	description: string;
	/** Estimated value in gp */
	value: number;
	/** Crafting tags/uses */
	craftingTags: string[];
	/** Difficulty to harvest (DC) */
	harvestDC: number;
}

/**
 * Generated loot result
 */
export interface GeneratedLoot {
	/** Coins */
	coins: CoinLoot;
	/** Generated gems */
	gems: Gem[];
	/** Generated art objects */
	artObjects: ArtObject[];
	/** Generated magic items */
	magicItems: MagicItemLoot[];
	/** Generated equipment */
	equipment: EquipmentLoot[];
	/** Generated mundane items */
	mundaneItems: Array<{
		name: string;
		quantity: number;
		value: number;
	}>;
	/** Generated salvage materials */
	salvage: SalvageMaterial[];
	/** Container description */
	containerDescription: string;
	/** Total value in gold pieces */
	totalValue: number;
	/** Total weight in pounds */
	totalWeight: number;
	/** Generation metadata */
	metadata: {
		challengeRating: number | null;
		experiencePoints: number;
		partySize: number;
		partyLevel: number;
		lootType: LootType;
		timestamp: number;
		seed: string;
	};
}
