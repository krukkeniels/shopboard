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

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
			frontmatter.price_modifier = newModifier;
		});

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

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
			frontmatter.columns = columns;
		});

		console.log(`Columns updated to: ${columns}`);
	}

	/**
	 * Update shop row count
	 * @param shopFile Shop note file
	 * @param rows New row count (1-30)
	 */
	async updateRows(
		shopFile: TFile,
		rows: number
	): Promise<void> {
		// Validate row count
		if (!Number.isInteger(rows) || rows < 1 || rows > 30) {
			throw new Error('Row count must be an integer between 1 and 30');
		}

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
			frontmatter.rows = rows;
		});

		console.log(`Rows updated to: ${rows}`);
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

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
			frontmatter.show_descriptions = showDescriptions;
		});

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

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
			frontmatter.current_page = page;
		});

		console.log(`Current page updated to: ${page}`);
	}

	/**
	 * Update multiple display settings atomically (prevents race conditions)
	 * This method performs a single read-modify-write operation, preventing the
	 * race condition where sequential updates can overwrite each other.
	 *
	 * @param shopFile Shop note file
	 * @param updates Object containing the settings to update
	 */
	async updateDisplaySettings(
		shopFile: TFile,
		updates: {
			columns?: number;
			rows?: number;
			currentPage?: number;
			showDescriptions?: boolean;
		}
	): Promise<void> {
		// Validate inputs
		if (updates.columns !== undefined) {
			if (!Number.isInteger(updates.columns) || updates.columns < 2 || updates.columns > 8) {
				throw new Error('Column count must be an integer between 2 and 8');
			}
		}

		if (updates.rows !== undefined) {
			if (!Number.isInteger(updates.rows) || updates.rows < 1 || updates.rows > 30) {
				throw new Error('Row count must be an integer between 1 and 30');
			}
		}

		if (updates.currentPage !== undefined) {
			if (!Number.isInteger(updates.currentPage) || updates.currentPage < 1) {
				throw new Error('Page must be a positive integer');
			}
		}

		if (updates.showDescriptions !== undefined) {
			if (typeof updates.showDescriptions !== 'boolean') {
				throw new Error('showDescriptions must be a boolean');
			}
		}

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
			// Update all provided fields in a single operation
			if (updates.columns !== undefined) {
				frontmatter.columns = updates.columns;
			}

			if (updates.rows !== undefined) {
				frontmatter.rows = updates.rows;
			}

			if (updates.currentPage !== undefined) {
				frontmatter.current_page = updates.currentPage;
			}

			if (updates.showDescriptions !== undefined) {
				frontmatter.show_descriptions = updates.showDescriptions;
			}
		});

		// Log what was updated
		const updatedFields = Object.keys(updates).join(', ');
		console.log(`Display settings updated: ${updatedFields}`);
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

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
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
		});

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

		let itemName = 'Unknown';

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
			// Validate inventory
			if (!frontmatter.inventory || !Array.isArray(frontmatter.inventory)) {
				throw new Error('Shop note has invalid inventory');
			}

			if (itemIndex < 0 || itemIndex >= frontmatter.inventory.length) {
				throw new Error('Invalid item index');
			}

			// Get item name for logging
			const removedItem = frontmatter.inventory[itemIndex];
			itemName = removedItem?.item || 'Unknown';

			// Remove item
			frontmatter.inventory.splice(itemIndex, 1);
		});

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

		let itemName = 'Unknown';

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
			// Validate inventory
			if (!frontmatter.inventory || !Array.isArray(frontmatter.inventory)) {
				throw new Error('Shop note has invalid inventory');
			}

			if (itemIndex < 0 || itemIndex >= frontmatter.inventory.length) {
				throw new Error('Invalid item index');
			}

			// Update quantity
			frontmatter.inventory[itemIndex].quantity = newQuantity;

			itemName = frontmatter.inventory[itemIndex]?.item || 'Unknown';
		});

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

		// Convert inventory to proper format
		const formattedInventory = inventory.map(item => ({
			item: item.itemRef,
			quantity: item.quantity,
			price_override: item.priceOverride
		}));

		// Use Obsidian's atomic frontmatter API (preserves all fields automatically)
		await this.app.fileManager.processFrontMatter(shopFile, (frontmatter) => {
			// Update inventory
			frontmatter.inventory = formattedInventory;
		});

		console.log(`Updated inventory: ${inventory.length} items`);
	}

}
