import { ItemView, WorkspaceLeaf, TFile, MarkdownRenderer } from 'obsidian';
import { ShopData, ItemData } from '../types';
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
			this.render();
		} else {
			this.renderError('Failed to parse shop note. Please check the frontmatter.');
		}
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
	}

	/**
	 * Render inventory items
	 */
	private renderInventory(container: HTMLElement): void {
		const inventoryEl = container.createDiv({ cls: 'shop-inventory' });

		// Filter out items with 0 quantity
		const availableItems = this.shopData!.inventory.filter(item => item.quantity > 0);

		if (availableItems.length === 0) {
			inventoryEl.createDiv({
				cls: 'inventory-empty',
				text: 'This shop has no items in stock.'
			});
			return;
		}

		// Render each inventory item
		for (const invItem of availableItems) {
			this.renderInventoryItem(inventoryEl, invItem);
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
				// Local file path - use Obsidian's resource path
				const resourcePath = this.app.vault.adapter.getResourcePath(item.imageUrl);
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

		// Item name
		itemEl.createDiv({
			cls: 'item-name',
			text: item.name
		});

		// Item description
		if (item.description) {
			itemEl.createDiv({
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
				const resourcePath = this.app.vault.adapter.getResourcePath(this.selectedItem.imageUrl);
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
	 * Setup auto-refresh on file changes
	 */
	private setupAutoRefresh(): void {
		// Register event handler for file modifications
		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				// Check if the modified file is our current shop
				if (this.shopFile && file.path === this.shopFile.path) {
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
