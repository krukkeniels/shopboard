import { App, TFile } from 'obsidian';

/**
 * Shop Modifier - Handles editing shop properties and inventory
 * Updates shop note frontmatter with changes
 */
export class ShopModifier {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Update shop price modifier
	 * @param shopFile Shop note file
	 * @param newModifier New price modifier percentage (-100 to +1000)
	 */
	async updatePriceModifier(
		shopFile: TFile,
		newModifier: number
	): Promise<void> {
		// Validate modifier
		if (typeof newModifier !== 'number' || isNaN(newModifier)) {
			throw new Error('Price modifier must be a valid number');
		}

		// Read current file content
		const content = await this.app.vault.read(shopFile);

		// Parse frontmatter
		const { frontmatter, body } = this.parseFrontmatter(content, shopFile);

		if (!frontmatter) {
			throw new Error('Shop note has no frontmatter');
		}

		// Update price modifier
		frontmatter.price_modifier = newModifier;

		// Serialize back to YAML and write
		const updatedContent = this.serializeFrontmatter(frontmatter, body);
		await this.app.vault.modify(shopFile, updatedContent);

		console.log(`Price modifier updated to: ${newModifier}%`);
	}

	/**
	 * Update shop column count
	 * @param shopFile Shop note file
	 * @param columns New column count (2-8)
	 */
	async updateColumns(
		shopFile: TFile,
		columns: number
	): Promise<void> {
		// Validate column count
		if (!Number.isInteger(columns) || columns < 2 || columns > 8) {
			throw new Error('Column count must be an integer between 2 and 8');
		}

		// Read current file content
		const content = await this.app.vault.read(shopFile);

		// Parse frontmatter
		const { frontmatter, body } = this.parseFrontmatter(content, shopFile);

		if (!frontmatter) {
			throw new Error('Shop note has no frontmatter');
		}

		// Update columns
		frontmatter.columns = columns;

		// Serialize back to YAML and write
		const updatedContent = this.serializeFrontmatter(frontmatter, body);
		await this.app.vault.modify(shopFile, updatedContent);

		console.log(`Columns updated to: ${columns}`);
	}

	/**
	 * Update whether to show item descriptions
	 * @param shopFile Shop note file
	 * @param showDescriptions Whether to show descriptions
	 */
	async updateShowDescriptions(
		shopFile: TFile,
		showDescriptions: boolean
	): Promise<void> {
		// Validate boolean
		if (typeof showDescriptions !== 'boolean') {
			throw new Error('showDescriptions must be a boolean');
		}

		// Read current file content
		const content = await this.app.vault.read(shopFile);

		// Parse frontmatter
		const { frontmatter, body } = this.parseFrontmatter(content, shopFile);

		if (!frontmatter) {
			throw new Error('Shop note has no frontmatter');
		}

		// Update showDescriptions
		frontmatter.show_descriptions = showDescriptions;

		// Serialize back to YAML and write
		const updatedContent = this.serializeFrontmatter(frontmatter, body);
		await this.app.vault.modify(shopFile, updatedContent);

		console.log(`Show descriptions updated to: ${showDescriptions}`);
	}

	/**
	 * Update shop current page
	 * @param shopFile Shop note file
	 * @param page New current page (must be >= 1)
	 */
	async updateCurrentPage(
		shopFile: TFile,
		page: number
	): Promise<void> {
		// Validate page number
		if (!Number.isInteger(page) || page < 1) {
			throw new Error('Page must be a positive integer');
		}

		// Read current file content
		const content = await this.app.vault.read(shopFile);

		// Parse frontmatter
		const { frontmatter, body } = this.parseFrontmatter(content, shopFile);

		if (!frontmatter) {
			throw new Error('Shop note has no frontmatter');
		}

		// Update current page
		frontmatter.current_page = page;

		// Serialize back to YAML and write
		const updatedContent = this.serializeFrontmatter(frontmatter, body);
		await this.app.vault.modify(shopFile, updatedContent);

		console.log(`Current page updated to: ${page}`);
	}

	/**
	 * Add item to shop inventory
	 * @param shopFile Shop note file
	 * @param itemRef Wikilink reference to item (e.g., "[[Potion of Healing]]")
	 * @param quantity Quantity to add
	 * @param priceOverride Optional price override (null to use calculated price)
	 */
	async addInventoryItem(
		shopFile: TFile,
		itemRef: string,
		quantity: number,
		priceOverride: number | null = null
	): Promise<void> {
		// Validate inputs
		if (!itemRef || typeof itemRef !== 'string') {
			throw new Error('Item reference is required');
		}

		if (!Number.isInteger(quantity) || quantity < 1) {
			throw new Error('Quantity must be a positive integer');
		}

		if (priceOverride !== null && (typeof priceOverride !== 'number' || priceOverride < 0)) {
			throw new Error('Price override must be a positive number or null');
		}

		// Read current file content
		const content = await this.app.vault.read(shopFile);

		// Parse frontmatter
		const { frontmatter, body } = this.parseFrontmatter(content, shopFile);

		if (!frontmatter) {
			throw new Error('Shop note has no frontmatter');
		}

		// Ensure inventory array exists
		if (!frontmatter.inventory) {
			frontmatter.inventory = [];
		}

		if (!Array.isArray(frontmatter.inventory)) {
			throw new Error('Shop note has invalid inventory');
		}

		// Create new inventory item
		const newItem = {
			item: itemRef,
			quantity: quantity,
			price_override: priceOverride
		};

		// Add to inventory
		frontmatter.inventory.push(newItem);

		// Serialize back to YAML and write
		const updatedContent = this.serializeFrontmatter(frontmatter, body);
		await this.app.vault.modify(shopFile, updatedContent);

		console.log(`Added item to inventory: ${itemRef} (qty: ${quantity})`);
	}

	/**
	 * Remove item from shop inventory
	 * @param shopFile Shop note file
	 * @param itemIndex Index of item in inventory array
	 */
	async removeInventoryItem(
		shopFile: TFile,
		itemIndex: number
	): Promise<void> {
		// Validate index
		if (!Number.isInteger(itemIndex) || itemIndex < 0) {
			throw new Error('Invalid item index');
		}

		// Read current file content
		const content = await this.app.vault.read(shopFile);

		// Parse frontmatter
		const { frontmatter, body } = this.parseFrontmatter(content, shopFile);

		if (!frontmatter) {
			throw new Error('Shop note has no frontmatter');
		}

		// Validate inventory
		if (!frontmatter.inventory || !Array.isArray(frontmatter.inventory)) {
			throw new Error('Shop note has invalid inventory');
		}

		if (itemIndex < 0 || itemIndex >= frontmatter.inventory.length) {
			throw new Error('Invalid item index');
		}

		// Get item name for logging
		const removedItem = frontmatter.inventory[itemIndex];
		const itemName = removedItem?.item || 'Unknown';

		// Remove item
		frontmatter.inventory.splice(itemIndex, 1);

		// Serialize back to YAML and write
		const updatedContent = this.serializeFrontmatter(frontmatter, body);
		await this.app.vault.modify(shopFile, updatedContent);

		console.log(`Removed item from inventory: ${itemName}`);
	}

	/**
	 * Update item quantity in shop inventory
	 * @param shopFile Shop note file
	 * @param itemIndex Index of item in inventory array
	 * @param newQuantity New quantity (must be >= 0)
	 */
	async updateItemQuantity(
		shopFile: TFile,
		itemIndex: number,
		newQuantity: number
	): Promise<void> {
		// Validate inputs
		if (!Number.isInteger(itemIndex) || itemIndex < 0) {
			throw new Error('Invalid item index');
		}

		if (!Number.isInteger(newQuantity) || newQuantity < 0) {
			throw new Error('Quantity must be a non-negative integer');
		}

		// Read current file content
		const content = await this.app.vault.read(shopFile);

		// Parse frontmatter
		const { frontmatter, body } = this.parseFrontmatter(content, shopFile);

		if (!frontmatter) {
			throw new Error('Shop note has no frontmatter');
		}

		// Validate inventory
		if (!frontmatter.inventory || !Array.isArray(frontmatter.inventory)) {
			throw new Error('Shop note has invalid inventory');
		}

		if (itemIndex < 0 || itemIndex >= frontmatter.inventory.length) {
			throw new Error('Invalid item index');
		}

		// Update quantity
		frontmatter.inventory[itemIndex].quantity = newQuantity;

		// Serialize back to YAML and write
		const updatedContent = this.serializeFrontmatter(frontmatter, body);
		await this.app.vault.modify(shopFile, updatedContent);

		const itemName = frontmatter.inventory[itemIndex]?.item || 'Unknown';
		console.log(`Updated item quantity: ${itemName} (qty: ${newQuantity})`);
	}

	/**
	 * Update entire shop inventory
	 * @param shopFile Shop note file
	 * @param inventory New inventory array
	 */
	async updateInventory(
		shopFile: TFile,
		inventory: Array<{
			itemRef: string;
			quantity: number;
			priceOverride: number | null;
		}>
	): Promise<void> {
		// Validate inventory
		if (!Array.isArray(inventory)) {
			throw new Error('Inventory must be an array');
		}

		// Read current file content
		const content = await this.app.vault.read(shopFile);

		// Parse frontmatter
		const { frontmatter, body } = this.parseFrontmatter(content, shopFile);

		if (!frontmatter) {
			throw new Error('Shop note has no frontmatter');
		}

		// Convert inventory to proper format
		const formattedInventory = inventory.map(item => ({
			item: item.itemRef,
			quantity: item.quantity,
			price_override: item.priceOverride
		}));

		// Update inventory
		frontmatter.inventory = formattedInventory;

		// Serialize back to YAML and write
		const updatedContent = this.serializeFrontmatter(frontmatter, body);
		await this.app.vault.modify(shopFile, updatedContent);

		console.log(`Updated inventory: ${inventory.length} items`);
	}

	/**
	 * Parse frontmatter from markdown content
	 * Uses a simple regex-based parser for frontmatter
	 */
	private parseFrontmatter(content: string, file: TFile): {
		frontmatter: any | null;
		body: string;
	} {
		// Match YAML frontmatter between --- delimiters
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			return { frontmatter: null, body: content };
		}

		const yamlContent = match[1];
		const body = match[2];

		try {
			// Use Obsidian's metadata cache to parse YAML
			const cache = this.app.metadataCache.getFileCache(file);

			if (cache?.frontmatter) {
				// Return a copy so we can modify it
				return {
					frontmatter: { ...cache.frontmatter },
					body
				};
			}

			// Fallback: parse YAML manually (basic implementation)
			const frontmatter = this.parseYAMLBasic(yamlContent);
			return { frontmatter, body };
		} catch (error) {
			console.error('Error parsing frontmatter:', error);
			throw new Error('Failed to parse shop frontmatter');
		}
	}

	/**
	 * Basic YAML parser for inventory updates
	 * Handles the specific structure we need for shop notes
	 */
	private parseYAMLBasic(yaml: string): any {
		const result: any = {};
		const lines = yaml.split('\n');
		let currentKey: string | null = null;
		let currentArray: any[] | null = null;
		let currentObject: any | null = null;

		for (const line of lines) {
			const trimmed = line.trim();

			// Skip empty lines and comments
			if (!trimmed || trimmed.startsWith('#')) continue;

			// Check for array item (starts with -)
			if (trimmed.startsWith('- ')) {
				if (!currentArray) {
					currentArray = [];
					if (currentKey) {
						result[currentKey] = currentArray;
					}
				}

				// Parse object in array
				if (trimmed.includes(':')) {
					currentObject = {};
					currentArray.push(currentObject);

					// Parse key-value in array item
					const kvMatch = trimmed.match(/^- (\w+):\s*(.+)$/);
					if (kvMatch) {
						const [, key, value] = kvMatch;
						currentObject[key] = this.parseValue(value);
					}
				}
			}
			// Check for object property within array item
			else if (currentObject && trimmed.match(/^\w+:/)) {
				const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
				if (kvMatch) {
					const [, key, value] = kvMatch;
					currentObject[key] = this.parseValue(value);
				}
			}
			// Regular key-value pair
			else if (trimmed.includes(':')) {
				const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
				if (kvMatch) {
					const [, key, value] = kvMatch;
					currentKey = key;

					// Check if this starts an array
					if (!value) {
						currentArray = [];
						result[key] = currentArray;
					} else {
						result[key] = this.parseValue(value);
						currentArray = null;
						currentObject = null;
					}
				}
			}
		}

		return result;
	}

	/**
	 * Parse YAML value (string, number, boolean, null)
	 */
	private parseValue(value: string): any {
		const trimmed = value.trim();

		// null
		if (trimmed === 'null' || trimmed === '~' || trimmed === '') {
			return null;
		}

		// Boolean
		if (trimmed === 'true') return true;
		if (trimmed === 'false') return false;

		// Number
		if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
			return parseFloat(trimmed);
		}

		// String (remove quotes if present)
		if (
			(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
			(trimmed.startsWith("'") && trimmed.endsWith("'"))
		) {
			return trimmed.slice(1, -1);
		}

		return trimmed;
	}

	/**
	 * Serialize frontmatter back to YAML format
	 * Preserves the original structure as much as possible
	 */
	private serializeFrontmatter(frontmatter: any, body: string): string {
		const yaml = this.toYAML(frontmatter, 0);
		return `---\n${yaml}---\n${body}`;
	}

	/**
	 * Convert object to YAML string
	 */
	private toYAML(obj: any, indent: number = 0): string {
		const indentStr = '  '.repeat(indent);
		let result = '';

		for (const [key, value] of Object.entries(obj)) {
			if (Array.isArray(value)) {
				result += `${indentStr}${key}:\n`;
				for (const item of value) {
					if (typeof item === 'object' && item !== null) {
						// Object in array
						result += `${indentStr}  -`;
						let first = true;
						for (const [k, v] of Object.entries(item)) {
							if (first) {
								result += ` ${k}: ${this.formatValue(v)}\n`;
								first = false;
							} else {
								result += `${indentStr}    ${k}: ${this.formatValue(v)}\n`;
							}
						}
					} else {
						result += `${indentStr}  - ${this.formatValue(item)}\n`;
					}
				}
			} else if (typeof value === 'object' && value !== null) {
				result += `${indentStr}${key}:\n`;
				result += this.toYAML(value, indent + 1);
			} else {
				result += `${indentStr}${key}: ${this.formatValue(value)}\n`;
			}
		}

		return result;
	}

	/**
	 * Format a value for YAML output
	 */
	private formatValue(value: any): string {
		if (value === null || value === undefined) {
			return 'null';
		}

		if (typeof value === 'string') {
			// Quote strings with special characters or that look like wikilinks
			if (
				value.includes(':') ||
				value.includes('#') ||
				value.includes('[') ||
				value.includes(']') ||
				value.includes('{') ||
				value.includes('}')
			) {
				return `"${value}"`;
			}
			return value;
		}

		if (typeof value === 'boolean') {
			return value ? 'true' : 'false';
		}

		return String(value);
	}
}
