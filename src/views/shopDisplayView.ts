import { ItemView, WorkspaceLeaf, TFile, MarkdownRenderer } from 'obsidian';
import { ShopData, ItemData, DisplayMode } from '../types';
import ShopboardPlugin from '../main';

/**
 * View type identifier for shop display
 */
export const VIEW_TYPE_SHOP_DISPLAY = 'shopboard-display';

/**
 * Shop Display View - Player-facing shop display window
 * Can be popped out to second monitor for players
 */
export class ShopDisplayView extends ItemView {
	private plugin: ShopboardPlugin;
	private shopData: ShopData | null = null;
	private shopFile: TFile | null = null;
	private refreshInterval: number | null = null;
	private selectedItem: ItemData | null = null;
	private isUpdating: boolean = false;
	private currentPage: number = 1;
	private itemsPerPage: number = 20; // Will be calculated dynamically

	constructor(leaf: WorkspaceLeaf, plugin: ShopboardPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	/**
	 * Returns the view type identifier
	 */
	getViewType(): string {
		return VIEW_TYPE_SHOP_DISPLAY;
	}

	/**
	 * Returns the display text for the view
	 */
	getDisplayText(): string {
		return this.shopData ? this.shopData.name : 'Shop Display';
	}

	/**
	 * Returns the icon for the view
	 */
	getIcon(): string {
		return 'shopping-bag';
	}

	/**
	 * Called when the view is opened
	 */
	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('shopboard-display-container');

		// Initial render
		this.render();

		// Setup auto-refresh if enabled
		if (this.plugin.settings.autoRefresh) {
			this.setupAutoRefresh();
		}

		// Listen for item detail events from DM control
		this.registerEvent(
			this.app.workspace.on('shopboard:show-item-detail', (itemData: ItemData) => {
				this.showItemDetail(itemData);
			})
		);

		// Listen for display mode change events from DM control
		this.registerEvent(
			this.app.workspace.on('shopboard:set-display-mode', (mode: DisplayMode) => {
				this.setDisplayMode(mode);
			})
		);

		// Listen for page change events from DM control
		this.registerEvent(
			this.app.workspace.on('shopboard:change-page', (page: number) => {
				this.setCurrentPage(page);
			})
		);
	}

	/**
	 * Called when the view is closed
	 */
	async onClose(): Promise<void> {
		// Clear refresh interval
		if (this.refreshInterval !== null) {
			window.clearInterval(this.refreshInterval);
			this.refreshInterval = null;
		}

		// Clean up resources
		this.shopData = null;
		this.shopFile = null;
	}

	/**
	 * Set the shop to display
	 */
	async setShop(file: TFile): Promise<void> {
		this.shopFile = file;

		// Parse the shop note
		const shopData = await this.plugin.shopParser.parseShopNote(file);

		if (shopData) {
			this.shopData = shopData;

			// Load current page from shop data (default to 1)
			this.currentPage = shopData.currentPage || 1;

			// Calculate items per page based on viewport
			this.itemsPerPage = this.calculateItemsPerPage();

			// Validate current page
			const totalPages = this.calculateTotalPages();
			if (this.currentPage > totalPages) {
				this.currentPage = 1;
			}

			this.render();
		} else {
			this.renderError('Failed to parse shop note. Please check the frontmatter.');
		}
	}

	/**
	 * Set display mode for the shop
	 */
	async setDisplayMode(mode: DisplayMode): Promise<void> {
		if (!this.shopData || !this.shopFile) {
			return;
		}

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Update shop data
			this.shopData.displayMode = mode;

			// Recalculate items per page for new display mode
			this.itemsPerPage = this.calculateItemsPerPage();

			// Reset to page 1 when changing display modes
			this.currentPage = 1;
			this.shopData.currentPage = 1;

			// Re-render to apply new display mode
			this.render();

			// Save to shop frontmatter
			await this.plugin.shopModifier.updateDisplayMode(this.shopFile, mode);
			await this.plugin.shopModifier.updateCurrentPage(this.shopFile, 1);

			// Notify DM control of display mode change
			this.app.workspace.trigger('shopboard:display-mode-changed', mode);
		} catch (error) {
			console.error('Error updating display mode:', error);
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Set current page for the shop
	 */
	async setCurrentPage(page: number): Promise<void> {
		if (!this.shopData || !this.shopFile) {
			return;
		}

		// Validate page number
		const totalPages = this.calculateTotalPages();
		if (page < 1 || page > totalPages) {
			return;
		}

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Update current page
			this.currentPage = page;
			this.shopData.currentPage = page;

			// Re-render to show new page
			this.render();

			// Save to shop frontmatter
			await this.plugin.shopModifier.updateCurrentPage(this.shopFile, page);
		} catch (error) {
			console.error('Error updating current page:', error);
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Get current display mode
	 */
	getDisplayMode(): DisplayMode {
		return this.shopData?.displayMode || 'standard';
	}

	/**
	 * Calculate total pages based on items per page
	 */
	private calculateTotalPages(): number {
		if (!this.shopData) return 1;

		const availableItems = this.shopData.inventory.filter(item => item.quantity > 0);
		if (availableItems.length === 0) return 1;

		return Math.ceil(availableItems.length / this.itemsPerPage);
	}

	/**
	 * Calculate items per page based on viewport height and display mode
	 */
	private calculateItemsPerPage(): number {
		const container = this.containerEl.children[1] as HTMLElement;
		if (!container) return 20;

		const displayMode = this.getDisplayMode();
		const viewportHeight = container.clientHeight;
		const headerHeight = 200;
		const availableHeight = viewportHeight - headerHeight;

		// Different item heights and column counts for each mode
		let itemHeight = 280;
		let columns = 2;

		switch (displayMode) {
			case 'large-cards':
				itemHeight = 350;
				columns = 2;
				break;
			case 'compact-cards':
				itemHeight = 200;
				columns = 5;
				break;
			case 'list-2col':
				itemHeight = 120;
				columns = 2;
				break;
			case 'list-3col':
				itemHeight = 100;
				columns = 3;
				break;
			case 'dense-list':
				itemHeight = 80;
				columns = 4;
				break;
			case 'gallery':
				itemHeight = 400;
				columns = 3;
				break;
			case 'table':
				itemHeight = 60;
				columns = 1;
				break;
			case 'standard':
			default:
				itemHeight = 280;
				columns = 2;
				break;
		}

		// Calculate rows that fit in viewport
		const rowsPerPage = Math.max(1, Math.floor(availableHeight / itemHeight));

		return rowsPerPage * columns;
	}

	/**
	 * Main render method
	 */
	private render(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		if (!this.shopData) {
			this.renderEmpty(container);
			return;
		}

		// Create split-view container if item is selected
		if (this.selectedItem) {
			const splitContainer = container.createDiv({ cls: 'shopboard-split-view' });

			// Main display (left side)
			const mainDisplay = splitContainer.createDiv({
				cls: `shopboard-display shop-type-${this.shopData.shopType} main-display`
			});
			this.renderHeader(mainDisplay);
			this.renderInventory(mainDisplay);

			// Detail panel (right side)
			this.renderDetailPanel(splitContainer);
		} else {
			// Create main display container with shop type class
			const displayEl = container.createDiv({
				cls: `shopboard-display shop-type-${this.shopData.shopType}`
			});

			// Render shop header
			this.renderHeader(displayEl);

			// Render inventory
			this.renderInventory(displayEl);
		}
	}

	/**
	 * Render empty state
	 */
	private renderEmpty(container: HTMLElement): void {
		const emptyEl = container.createDiv({ cls: 'shopboard-empty' });
		emptyEl.createEl('h2', { text: 'No Shop Selected' });
		emptyEl.createEl('p', {
			text: 'Right-click on a shop note and select "Display in Shop Window" to view it here.'
		});
	}

	/**
	 * Render error state
	 */
	private renderError(message: string): void {
		const container = this.containerEl.children[1];
		container.empty();

		const errorEl = container.createDiv({ cls: 'shopboard-error' });
		errorEl.createEl('h2', { text: 'Error' });
		errorEl.createEl('p', { text: message });
	}

	/**
	 * Render shop header
	 */
	private renderHeader(container: HTMLElement): void {
		const headerEl = container.createDiv({ cls: 'shop-header' });

		// Shop name
		headerEl.createEl('h1', {
			cls: 'shop-name',
			text: this.shopData!.name
		});

		// Shop type badge
		const shopTypeConfig = this.plugin.settings.shopTypes[this.shopData!.shopType];
		const shopTypeLabel = shopTypeConfig ? shopTypeConfig.label : this.shopData!.shopType;

		headerEl.createDiv({
			cls: 'shop-type-badge',
			text: shopTypeLabel
		});

		// Price modifier indicator (if not 0)
		if (this.shopData!.priceModifier !== 0) {
			const modifierText = this.shopData!.priceModifier > 0
				? `+${this.shopData!.priceModifier}%`
				: `${this.shopData!.priceModifier}%`;

			headerEl.createDiv({
				cls: 'price-modifier-badge',
				text: modifierText
			});
		}

		// Page indicator
		const totalPages = this.calculateTotalPages();
		if (totalPages > 1) {
			headerEl.createDiv({
				cls: 'page-indicator',
				text: `Page ${this.currentPage} of ${totalPages}`
			});
		}
	}

	/**
	 * Render inventory items
	 */
	private renderInventory(container: HTMLElement): void {
		// Filter out items with 0 quantity
		const availableItems = this.shopData!.inventory.filter(item => item.quantity > 0);

		if (availableItems.length === 0) {
			// Calculate size class for empty state
			const sizeClass = this.calculateSizeClass(0);
			const inventoryEl = container.createDiv({ cls: `shop-inventory ${sizeClass}` });
			inventoryEl.createDiv({
				cls: 'inventory-empty',
				text: 'This shop has no items in stock.'
			});
			return;
		}

		// Apply pagination slice
		const sortedItems = [...availableItems].sort((a, b) => a.calculatedPrice - b.calculatedPrice);
		const startIndex = (this.currentPage - 1) * this.itemsPerPage;
		const endIndex = startIndex + this.itemsPerPage;
		const pageItems = sortedItems.slice(startIndex, endIndex);

		// Group items by category
		const itemsByCategory = new Map<string, typeof pageItems>();

		for (const item of pageItems) {
			const rawType = item.itemData?.metadata?.item_type || 'uncategorized';
			const category = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();

			if (!itemsByCategory.has(category)) {
				itemsByCategory.set(category, []);
			}
			itemsByCategory.get(category)!.push(item);
		}

		// Sort each category's items by price (lowest first)
		for (const items of itemsByCategory.values()) {
			items.sort((a, b) => a.calculatedPrice - b.calculatedPrice);
		}

		// Sort categories alphabetically, but put "Uncategorized" at the end
		const sortedCategories = Array.from(itemsByCategory.keys()).sort((a, b) => {
			if (a === 'Uncategorized') return 1;
			if (b === 'Uncategorized') return -1;
			return a.localeCompare(b);
		});

		// Calculate size class based on page item count
		const sizeClass = this.calculateSizeClass(pageItems.length);

		const inventoryEl = container.createDiv({ cls: `shop-inventory ${sizeClass}` });

		// Render each category
		for (const category of sortedCategories) {
			const categoryItems = itemsByCategory.get(category)!;

			// Create category section container
			const categorySection = inventoryEl.createDiv({ cls: 'category-section' });

			// Render category label
			categorySection.createEl('h2', {
				cls: 'category-label',
				text: category
			});

			// Create items container
			const itemsContainer = categorySection.createDiv({ cls: 'category-items' });

			// Render items in this category
			for (const invItem of categoryItems) {
				this.renderInventoryItem(itemsContainer, invItem);
			}
		}
	}

	/**
	 * Calculate layout class based on display mode and item count
	 */
	private calculateSizeClass(itemCount: number): string {
		const displayMode = this.getDisplayMode();

		// Map display modes to layout classes
		switch (displayMode) {
			case 'large-cards':
				return 'size-large';
			case 'compact-cards':
				return 'size-tiny';
			case 'list-2col':
				return 'layout-list-2col';
			case 'list-3col':
				return 'layout-list-3col';
			case 'dense-list':
				return 'layout-dense-list';
			case 'gallery':
				return 'layout-gallery';
			case 'table':
				return 'layout-table';
			case 'standard':
			default:
				// Auto-calculate based on item count
				if (itemCount <= 6) return 'size-xlarge';
				if (itemCount <= 12) return 'size-large';
				if (itemCount <= 20) return 'size-medium';
				if (itemCount <= 30) return 'size-small';
				if (itemCount <= 50) return 'size-tiny';
				return 'size-scrollable';
		}
	}

	/**
	 * Render a single inventory item with category badge (for paginated view)
	 */
	private renderInventoryItemWithCategory(container: HTMLElement, invItem: any): void {
		const itemEl = container.createDiv({ cls: 'inventory-item' });

		// Handle missing item data
		if (!invItem.itemData) {
			this.renderMissingItem(itemEl, invItem);
			return;
		}

		const item = invItem.itemData;

		// Add selected class if this item is currently selected
		if (this.selectedItem && this.selectedItem.path === item.path) {
			itemEl.addClass('inventory-item-selected');
		}

		// Add rarity class if available
		if (item.rarity) {
			itemEl.addClass(`rarity-${item.rarity.toLowerCase().replace(/\s+/g, '-')}`);
		}

		// Category badge at the top
		const rawType = item.metadata?.item_type || 'uncategorized';
		const category = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
		itemEl.createDiv({
			cls: 'item-category-badge',
			text: category
		});

		// Item image (if available)
		if (item.imageUrl) {
			const imgContainer = itemEl.createDiv({ cls: 'item-image-container' });
			const imgEl = imgContainer.createEl('img', { cls: 'item-image' });

			// Handle both online URLs and local file paths
			if (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')) {
				// Online resource
				imgEl.src = item.imageUrl;
			} else {
				// Local file path - resolve relative to item file
				const resolvedPath = this.resolveImagePath(item.imageUrl, item.path);
				const resourcePath = this.app.vault.adapter.getResourcePath(resolvedPath);
				imgEl.src = resourcePath;
			}

			imgEl.alt = item.name;

			// Handle image load errors gracefully
			imgEl.onerror = () => {
				imgContainer.addClass('item-image-error');
				imgContainer.empty();
				imgContainer.createDiv({
					cls: 'item-image-placeholder',
					text: '🖼️'
				});
			};
		}

		// Item content wrapper (for name and description)
		const contentEl = itemEl.createDiv({ cls: 'item-content' });

		// Item name
		contentEl.createDiv({
			cls: 'item-name',
			text: item.name
		});

		// Item description
		if (item.description) {
			contentEl.createDiv({
				cls: 'item-description',
				text: item.description
			});
		}

		// Item price
		const priceText = this.plugin.priceCalculator.formatCurrency(invItem.calculatedPrice);
		itemEl.createDiv({
			cls: 'item-price',
			text: priceText
		});

		// Item quantity
		const quantityText = invItem.quantity === 1
			? '1 in stock'
			: `${invItem.quantity} in stock`;

		itemEl.createDiv({
			cls: 'item-quantity',
			text: quantityText
		});

		// Rarity badge
		if (item.rarity) {
			itemEl.createDiv({
				cls: 'item-rarity-badge',
				text: item.rarity
			});
		}
	}

	/**
	 * Render a single inventory item
	 */
	private renderInventoryItem(container: HTMLElement, invItem: any): void {
		const itemEl = container.createDiv({ cls: 'inventory-item' });

		// Handle missing item data
		if (!invItem.itemData) {
			this.renderMissingItem(itemEl, invItem);
			return;
		}

		const item = invItem.itemData;

		// Add selected class if this item is currently selected
		if (this.selectedItem && this.selectedItem.path === item.path) {
			itemEl.addClass('inventory-item-selected');
		}

		// Add rarity class if available
		if (item.rarity) {
			itemEl.addClass(`rarity-${item.rarity.toLowerCase().replace(/\s+/g, '-')}`);
		}

		// Item image (if available)
		if (item.imageUrl) {
			const imgContainer = itemEl.createDiv({ cls: 'item-image-container' });
			const imgEl = imgContainer.createEl('img', { cls: 'item-image' });

			// Handle both online URLs and local file paths
			if (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')) {
				// Online resource
				imgEl.src = item.imageUrl;
			} else {
				// Local file path - resolve relative to item file
				const resolvedPath = this.resolveImagePath(item.imageUrl, item.path);
				const resourcePath = this.app.vault.adapter.getResourcePath(resolvedPath);
				imgEl.src = resourcePath;
			}

			imgEl.alt = item.name;

			// Handle image load errors gracefully
			imgEl.onerror = () => {
				imgContainer.addClass('item-image-error');
				imgContainer.empty();
				imgContainer.createDiv({
					cls: 'item-image-placeholder',
					text: '🖼️'
				});
			};
		}

		// Item content wrapper (for name and description)
		const contentEl = itemEl.createDiv({ cls: 'item-content' });

		// Item name
		contentEl.createDiv({
			cls: 'item-name',
			text: item.name
		});

		// Item description
		if (item.description) {
			contentEl.createDiv({
				cls: 'item-description',
				text: item.description
			});
		}

		// Item price
		const priceText = this.plugin.priceCalculator.formatCurrency(invItem.calculatedPrice);
		itemEl.createDiv({
			cls: 'item-price',
			text: priceText
		});

		// Item quantity
		const quantityText = invItem.quantity === 1
			? '1 in stock'
			: `${invItem.quantity} in stock`;

		itemEl.createDiv({
			cls: 'item-quantity',
			text: quantityText
		});

		// Rarity badge
		if (item.rarity) {
			itemEl.createDiv({
				cls: 'item-rarity-badge',
				text: item.rarity
			});
		}
	}

	/**
	 * Render missing/unresolved item
	 */
	private renderMissingItem(container: HTMLElement, invItem: any): void {
		container.addClass('item-missing');

		// Show item reference
		container.createDiv({
			cls: 'item-name',
			text: invItem.itemRef
		});

		// Warning message
		container.createDiv({
			cls: 'item-warning',
			text: '⚠️ Item not found. Check item folder settings or wikilink.'
		});

		// Quantity (still show this)
		container.createDiv({
			cls: 'item-quantity',
			text: `${invItem.quantity} in stock`
		});
	}

	/**
	 * Show item detail panel (toggle if same item clicked again)
	 */
	private showItemDetail(itemData: ItemData): void {
		// Toggle if same item is clicked again
		if (this.selectedItem && this.selectedItem.path === itemData.path) {
			this.selectedItem = null;
		} else {
			this.selectedItem = itemData;
		}
		this.render();
	}

	/**
	 * Close item detail panel
	 */
	private closeItemDetail(): void {
		this.selectedItem = null;
		this.render();
	}

	/**
	 * Render detail panel with item markdown
	 */
	private async renderDetailPanel(container: HTMLElement): Promise<void> {
		if (!this.selectedItem) return;

		const detailPanel = container.createDiv({ cls: 'item-detail-panel' });

		// Content area (scrollable)
		const contentEl = detailPanel.createDiv({ cls: 'detail-panel-content' });

		// Item image
		if (this.selectedItem.imageUrl) {
			const imgContainer = contentEl.createDiv({ cls: 'detail-item-image-container' });
			const imgEl = imgContainer.createEl('img', { cls: 'detail-item-image' });

			// Handle both online URLs and local file paths
			if (this.selectedItem.imageUrl.startsWith('http://') || this.selectedItem.imageUrl.startsWith('https://')) {
				imgEl.src = this.selectedItem.imageUrl;
			} else {
				const resolvedPath = this.resolveImagePath(this.selectedItem.imageUrl, this.selectedItem.path);
				const resourcePath = this.app.vault.adapter.getResourcePath(resolvedPath);
				imgEl.src = resourcePath;
			}

			imgEl.alt = this.selectedItem.name;

			// Handle image load errors gracefully
			imgEl.onerror = () => {
				imgContainer.addClass('detail-image-error');
				imgContainer.empty();
				imgContainer.createDiv({
					cls: 'detail-image-placeholder',
					text: '🖼️'
				});
			};
		}

		// Item name
		contentEl.createEl('h1', {
			text: this.selectedItem.name,
			cls: 'detail-item-name'
		});

		// Get inventory item for price info
		const invItem = this.shopData?.inventory.find(
			item => item.itemData?.path === this.selectedItem?.path
		);

		// Item metadata section
		const metaSection = contentEl.createDiv({ cls: 'detail-meta-section' });

		// Price
		if (invItem) {
			const priceText = this.plugin.priceCalculator.formatCurrency(invItem.calculatedPrice);
			metaSection.createDiv({
				cls: 'detail-item-price',
				text: priceText
			});
		}

		// Rarity badge
		if (this.selectedItem.rarity) {
			const rarityBadge = metaSection.createDiv({
				cls: `detail-item-rarity rarity-${this.selectedItem.rarity.toLowerCase().replace(/\s+/g, '-')}`
			});
			rarityBadge.textContent = this.selectedItem.rarity;
		}

		// Description
		if (this.selectedItem.description) {
			contentEl.createDiv({
				cls: 'detail-item-description',
				text: this.selectedItem.description
			});
		}

		// Metadata info section
		const metadata = this.selectedItem.metadata;
		if (metadata && (metadata.item_category || metadata.attunement !== undefined)) {
			const metaInfoSection = contentEl.createDiv({ cls: 'detail-meta-info' });

			// Item category
			if (metadata.item_category) {
				const categoryDiv = metaInfoSection.createDiv({ cls: 'meta-info-item' });
				categoryDiv.createSpan({ cls: 'meta-info-label', text: '⚔️ ' });
				categoryDiv.createSpan({ cls: 'meta-info-value', text: metadata.item_category });
			}

			// Attunement
			if (metadata.attunement !== undefined) {
				const attunementDiv = metaInfoSection.createDiv({ cls: 'meta-info-item' });

				if (metadata.attunement) {
					attunementDiv.createSpan({ cls: 'meta-info-label attunement-required', text: '✨ Requires Attunement' });

					if (metadata.attunement_requirements) {
						attunementDiv.createSpan({
							cls: 'meta-info-subtext',
							text: ` (by ${metadata.attunement_requirements})`
						});
					}
				} else {
					attunementDiv.createSpan({ cls: 'meta-info-label attunement-not-required', text: '○ No Attunement Required' });
				}
			}
		}

		// Divider
		contentEl.createEl('hr', { cls: 'detail-divider' });

		// Fetch and render full markdown
		const itemFile = this.app.vault.getAbstractFileByPath(this.selectedItem.path);
		if (itemFile instanceof TFile) {
			const markdownContent = await this.app.vault.read(itemFile);

			// Create markdown container
			const markdownContainer = contentEl.createDiv({ cls: 'detail-markdown-content' });

			// Render markdown using Obsidian's renderer
			await MarkdownRenderer.render(
				this.app,
				markdownContent,
				markdownContainer,
				this.selectedItem.path,
				this
			);
		} else {
			contentEl.createDiv({
				text: 'Could not load additional details.',
				cls: 'detail-panel-error'
			});
		}
	}

	/**
	 * Resolve image path relative to item file location
	 */
	private resolveImagePath(imageUrl: string, itemPath: string): string {
		// If the path is already absolute (starts with vault root), return as-is
		if (!imageUrl.startsWith('./') && !imageUrl.startsWith('../')) {
			// Check if it looks like a relative path without ./ prefix
			if (!imageUrl.includes('/')) {
				// Single filename - make it relative to item directory
				const itemDir = itemPath.substring(0, itemPath.lastIndexOf('/'));
				return `${itemDir}/${imageUrl}`;
			}
			// Already a vault-absolute path
			return imageUrl;
		}

		// Resolve relative path
		const itemDir = itemPath.substring(0, itemPath.lastIndexOf('/'));
		const parts = imageUrl.split('/');
		const dirParts = itemDir.split('/');

		for (const part of parts) {
			if (part === '..') {
				dirParts.pop();
			} else if (part !== '.') {
				dirParts.push(part);
			}
		}

		return dirParts.join('/');
	}

	/**
	 * Setup auto-refresh on file changes
	 */
	private setupAutoRefresh(): void {
		// Register event handler for file modifications
		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				// Skip if we're currently updating to prevent race conditions
				if (this.isUpdating) {
					return;
				}

				// Check if the modified file is our current shop
				const isShopFile = this.shopFile && file.path === this.shopFile.path;

				// Check if the modified file is an item in our shop's inventory
				const isShopItem = this.shopData?.inventory.some(
					invItem => invItem.itemData?.path === file.path
				);

				if (isShopFile || isShopItem) {
					// Debounce: wait a bit before refreshing
					if (this.refreshInterval !== null) {
						window.clearTimeout(this.refreshInterval);
					}

					this.refreshInterval = window.setTimeout(async () => {
						await this.setShop(this.shopFile!);
					}, 500);
				}
			})
		);
	}
}
