import { App, TFile, Notice } from 'obsidian';

/**
 * Purchase Handler - Handles recording purchases and updating shop inventory
 * Updates shop note frontmatter with new quantities after sales
 */
export class PurchaseHandler {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Record a purchase and update shop note
	 * @param shopFile Shop note file
	 * @param itemIndex Index of item in inventory array
	 * @param quantitySold Quantity sold
	 */
	async recordPurchase(
		shopFile: TFile,
		itemIndex: number,
		quantitySold: number
	): Promise<void> {
		// Validate inputs
		if (!Number.isInteger(quantitySold) || quantitySold < 1) {
			throw new Error('Quantity sold must be a positive integer');
		}

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

		// Validate shop data
		if (!frontmatter.inventory || !Array.isArray(frontmatter.inventory)) {
			throw new Error('Shop note has invalid inventory');
		}

		if (itemIndex < 0 || itemIndex >= frontmatter.inventory.length) {
			throw new Error('Invalid item index');
		}

		// Get current item
		const item = frontmatter.inventory[itemIndex];

		if (typeof item.quantity !== 'number') {
			throw new Error('Item has invalid quantity');
		}

		// Validate purchase
		if (quantitySold > item.quantity) {
			throw new Error(
				`Cannot sell ${quantitySold} items. Only ${item.quantity} in stock.`
			);
		}

		// Update quantity
		const newQuantity = item.quantity - quantitySold;
		frontmatter.inventory[itemIndex].quantity = newQuantity;

		// Serialize back to YAML and write
		const updatedContent = this.serializeFrontmatter(frontmatter, body);
		await this.app.vault.modify(shopFile, updatedContent);

		console.log(
			`Purchase recorded: ${quantitySold} items sold. New quantity: ${newQuantity}`
		);
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
