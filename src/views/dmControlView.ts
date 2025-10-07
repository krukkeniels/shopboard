import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { ShopData, ShopInventoryItem } from '../types';
import ShopboardPlugin from '../main';

/**
 * View type identifier for DM control panel
 */
export const VIEW_TYPE_DM_CONTROL = 'shopboard-dm-control';

/**
 * DM Control View - DM-facing control panel for managing shop transactions
 * Displayed in right sidebar for quick access during sessions
 */
export class DMControlView extends ItemView {
	private plugin: ShopboardPlugin;
	private currentShop: ShopData | null = null;
	private currentShopFile: TFile | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ShopboardPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	/**
	 * Returns the view type identifier
	 */
	getViewType(): string {
		return VIEW_TYPE_DM_CONTROL;
	}

	/**
	 * Returns the display text for the view
	 */
	getDisplayText(): string {
		return 'Shop Control';
	}

	/**
	 * Returns the icon for the view
	 */
	getIcon(): string {
		return 'clipboard-list';
	}

	/**
	 * Called when the view is opened
	 */
	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('shopboard-dm-control-container');

		// Initial render
		this.render();

		// Listen for shop display events to sync
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.checkForActiveShop();
			})
		);

		// Listen for file modifications to update display
		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				if (this.currentShopFile && file.path === this.currentShopFile.path) {
					// Re-parse and update display
					await this.syncWithShop(this.currentShopFile);
				}
			})
		);
	}

	/**
	 * Called when the view is closed
	 */
	async onClose(): Promise<void> {
		// Clean up resources
		this.currentShop = null;
		this.currentShopFile = null;
	}

	/**
	 * Check if there's an active shop display and sync with it
	 */
	private checkForActiveShop(): void {
		// Look for active shop display view
		const leaves = this.app.workspace.getLeavesOfType('shopboard-display');
		if (leaves.length > 0) {
			const view = leaves[0].view;
			if (view && 'shopFile' in view && 'shopData' in view) {
				const shopFile = (view as any).shopFile as TFile | null;
				const shopData = (view as any).shopData as ShopData | null;

				if (shopFile && shopData) {
					this.currentShopFile = shopFile;
					this.currentShop = shopData;
					this.render();
				}
			}
		}
	}

	/**
	 * Sync with a specific shop file
	 */
	async syncWithShop(file: TFile): Promise<void> {
		this.currentShopFile = file;

		// Parse the shop note
		const shopData = await this.plugin.shopParser.parseShopNote(file);

		if (shopData) {
			this.currentShop = shopData;
			this.render();
		} else {
			new Notice('Failed to parse shop note');
		}
	}

	/**
	 * Main render method
	 */
	private render(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		if (!this.currentShop) {
			this.renderEmpty(container);
			return;
		}

		// Create DM control panel
		const controlEl = container.createDiv({ cls: 'shopboard-dm-control' });

		// Render control header
		this.renderControlHeader(controlEl);

		// Render inventory controls
		this.renderInventoryControls(controlEl);
	}

	/**
	 * Render empty state
	 */
	private renderEmpty(container: HTMLElement): void {
		const emptyEl = container.createDiv({ cls: 'dm-control-empty' });
		emptyEl.createEl('h3', { text: 'No Shop Active' });
		emptyEl.createEl('p', {
			text: 'Open a shop in the display view to control it here.'
		});
	}

	/**
	 * Render control panel header
	 */
	private renderControlHeader(container: HTMLElement): void {
		const headerEl = container.createDiv({ cls: 'control-header' });

		headerEl.createEl('h3', { text: 'Current Shop' });

		const shopNameEl = headerEl.createDiv({ cls: 'shop-name' });
		shopNameEl.textContent = this.currentShop!.name;

		const shopTypeConfig = this.plugin.settings.shopTypes[this.currentShop!.shopType];
		const shopTypeLabel = shopTypeConfig ? shopTypeConfig.label : this.currentShop!.shopType;

		headerEl.createDiv({
			cls: 'shop-type-label',
			text: shopTypeLabel
		});
	}

	/**
	 * Render inventory controls
	 */
	private renderInventoryControls(container: HTMLElement): void {
		const inventoryEl = container.createDiv({ cls: 'inventory-controls' });

		if (this.currentShop!.inventory.length === 0) {
			inventoryEl.createDiv({
				cls: 'inventory-empty',
				text: 'No items in inventory'
			});
			return;
		}

		// Render control for each item
		this.currentShop!.inventory.forEach((invItem, index) => {
			this.renderItemControl(inventoryEl, invItem, index);
		});
	}

	/**
	 * Render control for a single inventory item
	 */
	private renderItemControl(container: HTMLElement, invItem: ShopInventoryItem, index: number): void {
		const controlEl = container.createDiv({ cls: 'control-item' });

		// Handle missing item data
		if (!invItem.itemData) {
			this.renderMissingItemControl(controlEl, invItem);
			return;
		}

		const item = invItem.itemData;

		// Item info section
		const infoEl = controlEl.createDiv({ cls: 'item-info' });

		// Item name
		infoEl.createSpan({
			cls: 'item-name',
			text: item.name
		});

		// Item stock
		const stockText = invItem.quantity === 0 ? 'Out of stock' : `Stock: ${invItem.quantity}`;
		const stockEl = infoEl.createSpan({
			cls: 'item-stock',
			text: stockText
		});

		if (invItem.quantity === 0) {
			stockEl.addClass('out-of-stock');
		}

		// Price display
		const priceText = this.plugin.priceCalculator.formatCurrency(invItem.calculatedPrice);
		infoEl.createDiv({
			cls: 'item-price-small',
			text: priceText
		});

		// Purchase controls section (only if item is in stock)
		if (invItem.quantity > 0) {
			const controlsEl = controlEl.createDiv({ cls: 'purchase-controls' });

			// Quantity input
			const quantityInput = controlsEl.createEl('input', {
				type: 'number',
				cls: 'quantity-input',
				attr: {
					min: '1',
					max: invItem.quantity.toString(),
					value: '1'
				}
			});

			// Record sale button
			const recordButton = controlsEl.createEl('button', {
				cls: 'record-sale-button',
				text: 'Record Sale'
			});

			// Button click handler
			recordButton.addEventListener('click', async () => {
				const quantity = parseInt(quantityInput.value);
				await this.handlePurchase(index, quantity, recordButton, quantityInput);
			});
		}
	}

	/**
	 * Render control for missing item
	 */
	private renderMissingItemControl(container: HTMLElement, invItem: ShopInventoryItem): void {
		container.addClass('item-missing');

		const infoEl = container.createDiv({ cls: 'item-info' });

		infoEl.createSpan({
			cls: 'item-name',
			text: invItem.itemRef
		});

		infoEl.createSpan({
			cls: 'item-warning',
			text: '⚠️ Item not found'
		});
	}

	/**
	 * Handle purchase recording
	 */
	private async handlePurchase(
		itemIndex: number,
		quantity: number,
		button: HTMLButtonElement,
		input: HTMLInputElement
	): Promise<void> {
		// Validate quantity
		const invItem = this.currentShop!.inventory[itemIndex];

		if (quantity < 1) {
			new Notice('Quantity must be at least 1');
			return;
		}

		if (quantity > invItem.quantity) {
			new Notice(`Cannot sell ${quantity} items. Only ${invItem.quantity} in stock.`);
			return;
		}

		// Disable controls during processing
		button.disabled = true;
		input.disabled = true;
		button.textContent = 'Recording...';

		try {
			// Record purchase using purchase handler
			await this.plugin.purchaseHandler.recordPurchase(
				this.currentShopFile!,
				itemIndex,
				quantity
			);

			// Show success message
			const itemName = invItem.itemData?.name || invItem.itemRef;
			const totalPrice = invItem.calculatedPrice * quantity;
			const priceText = this.plugin.priceCalculator.formatCurrency(totalPrice);

			new Notice(`Sold ${quantity}x ${itemName} for ${priceText}`);

			// Re-sync to update display
			await this.syncWithShop(this.currentShopFile!);

		} catch (error) {
			console.error('Error recording purchase:', error);
			new Notice('Failed to record purchase. See console for details.');

			// Re-enable controls on error
			button.disabled = false;
			input.disabled = false;
			button.textContent = 'Record Sale';
		}
	}
}
