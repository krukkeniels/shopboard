import { TFile, Vault } from 'obsidian';
import { ShopboardSettings } from '../settings';

/**
 * Interface for shop template data
 */
export interface ShopTemplate {
	name: string;
	shopType: string;
	priceModifier: number;
	description: string;
	sampleInventory: Array<{
		item: string;
		quantity: number;
		priceOverride?: number | null;
	}>;
}

/**
 * Provides built-in shop templates and handles shop creation
 */
export class TemplateProvider {
	constructor(private settings: ShopboardSettings) {}

	/**
	 * Get all available built-in templates
	 */
	getTemplates(): ShopTemplate[] {
		return [
			{
				name: 'Magic Shop',
				shopType: 'magic_shop',
				priceModifier: 50,
				description: 'A mystical emporium filled with arcane wonders and enchanted items',
				sampleInventory: [
					{ item: '[[Potion of Healing]]', quantity: 5, priceOverride: null },
					{ item: '[[Scroll of Fireball]]', quantity: 2, priceOverride: null },
					{ item: '[[Wand of Magic Missiles]]', quantity: 1, priceOverride: 1500 },
					{ item: '[[Ring of Protection]]', quantity: 1, priceOverride: null },
					{ item: '[[Cloak of Elvenkind]]', quantity: 1, priceOverride: null }
				]
			},
			{
				name: 'Blacksmith',
				shopType: 'blacksmith',
				priceModifier: 0,
				description: 'A sturdy forge where weapons and armor are crafted with masterful skill',
				sampleInventory: [
					{ item: '[[Longsword]]', quantity: 3, priceOverride: null },
					{ item: '[[Chain Mail]]', quantity: 2, priceOverride: null },
					{ item: '[[Shield]]', quantity: 4, priceOverride: null },
					{ item: '[[Battleaxe]]', quantity: 2, priceOverride: null },
					{ item: '[[Plate Armor]]', quantity: 1, priceOverride: null },
					{ item: '[[Arrows]]', quantity: 50, priceOverride: null }
				]
			},
			{
				name: 'General Store',
				shopType: 'general_store',
				priceModifier: -10,
				description: 'A welcoming merchant\'s shop stocked with everyday goods and supplies',
				sampleInventory: [
					{ item: '[[Rope (50 ft)]]', quantity: 10, priceOverride: null },
					{ item: '[[Rations (1 day)]]', quantity: 50, priceOverride: null },
					{ item: '[[Torch]]', quantity: 30, priceOverride: null },
					{ item: '[[Bedroll]]', quantity: 8, priceOverride: null },
					{ item: '[[Backpack]]', quantity: 5, priceOverride: null },
					{ item: '[[Waterskin]]', quantity: 12, priceOverride: null },
					{ item: '[[Tinderbox]]', quantity: 6, priceOverride: null }
				]
			},
			{
				name: 'Alchemist',
				shopType: 'alchemist',
				priceModifier: 20,
				description: 'A mysterious laboratory filled with bubbling potions and rare ingredients',
				sampleInventory: [
					{ item: '[[Potion of Healing]]', quantity: 8, priceOverride: null },
					{ item: '[[Potion of Greater Healing]]', quantity: 3, priceOverride: null },
					{ item: '[[Antitoxin]]', quantity: 5, priceOverride: null },
					{ item: '[[Alchemist\'s Fire]]', quantity: 6, priceOverride: null },
					{ item: '[[Potion of Invisibility]]', quantity: 1, priceOverride: 500 },
					{ item: '[[Oil of Slipperiness]]', quantity: 2, priceOverride: null }
				]
			}
		];
	}

	/**
	 * Get a specific template by shop type
	 */
	getTemplateByType(shopType: string): ShopTemplate | null {
		return this.getTemplates().find(t => t.shopType === shopType) || null;
	}

	/**
	 * Generate YAML frontmatter content from a template
	 */
	generateShopContent(template: ShopTemplate, customName?: string): string {
		const shopName = customName || template.name;

		let content = '---\n';
		content += 'type: shop\n';
		content += `name: "${shopName}"\n`;
		content += `shop_type: ${template.shopType}\n`;
		content += `price_modifier: ${template.priceModifier}\n`;
		content += 'inventory:\n';

		for (const item of template.sampleInventory) {
			content += `  - item: "${item.item}"\n`;
			content += `    quantity: ${item.quantity}\n`;
			if (item.priceOverride !== null && item.priceOverride !== undefined) {
				content += `    price_override: ${item.priceOverride}\n`;
			} else {
				content += `    price_override: null\n`;
			}
		}

		content += '---\n\n';
		content += `# ${shopName}\n\n`;
		content += `${template.description}\n\n`;
		content += '## Inventory\n\n';
		content += 'The items available in this shop are managed through the frontmatter above. ';
		content += 'Use the Shopboard plugin to display this shop to your players!\n\n';
		content += '## Notes\n\n';
		content += '<!-- Add any additional notes about this shop here -->\n';

		return content;
	}

	/**
	 * Create a new shop file from a template
	 */
	async createShopFromTemplate(
		template: ShopTemplate,
		vault: Vault,
		customName: string,
		folderPath: string = ''
	): Promise<TFile> {
		// Generate the file content
		const content = this.generateShopContent(template, customName);

		// Sanitize the filename (remove invalid characters)
		const sanitizedName = customName.replace(/[\\/:*?"<>|]/g, '-');

		// Build the full path
		let fullPath = folderPath ? `${folderPath}/${sanitizedName}.md` : `${sanitizedName}.md`;

		// Ensure the path doesn't already exist, add suffix if needed
		let counter = 1;
		let basePath = fullPath.replace(/\.md$/, '');
		while (vault.getAbstractFileByPath(fullPath)) {
			fullPath = `${basePath} ${counter}.md`;
			counter++;
		}

		// Create the file
		const file = await vault.create(fullPath, content);

		return file;
	}

	/**
	 * Validate a custom template
	 */
	validateTemplate(template: ShopTemplate): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!template.name || template.name.trim().length === 0) {
			errors.push('Template name is required');
		}

		if (!template.shopType || template.shopType.trim().length === 0) {
			errors.push('Shop type is required');
		}

		if (typeof template.priceModifier !== 'number') {
			errors.push('Price modifier must be a number');
		}

		if (!Array.isArray(template.sampleInventory)) {
			errors.push('Sample inventory must be an array');
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}
}
