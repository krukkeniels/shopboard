import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { ShopData, ShopInventoryItem, DisplayMode } from '../types';
import ShopboardPlugin from '../main';
import { AddItemModal } from '../modals/addItemModal';
import { RestockModal } from '../modals/restockModal';

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
	private selectedItemPath: string | null = null;
	private currentDisplayMode: DisplayMode = 'standard';
	private modifyDebounceTimer: number | null = null;
	private isUpdating: boolean = false;

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
					// Skip if we're currently updating to prevent race conditions
					if (this.isUpdating) {
						return;
					}

					// Debounce: wait for file operations to complete
					if (this.modifyDebounceTimer !== null) {
						window.clearTimeout(this.modifyDebounceTimer);
					}

					this.modifyDebounceTimer = window.setTimeout(async () => {
						// Re-parse and update display
						await this.syncWithShop(this.currentShopFile!);
						this.modifyDebounceTimer = null;
					}, 300);
				}
			})
		);

		// Listen for item detail events to track selected item
		this.registerEvent(
			this.app.workspace.on('shopboard:show-item-detail', (itemData: any) => {
				// Toggle selection
				if (this.selectedItemPath === itemData.path) {
					this.selectedItemPath = null;
				} else {
					this.selectedItemPath = itemData.path;
				}
				this.render();
			})
		);

		// Listen for display mode change events from display view
		this.registerEvent(
			this.app.workspace.on('shopboard:display-mode-changed', (mode: DisplayMode) => {
				this.currentDisplayMode = mode;
				this.render();
			})
		);
	}

	/**
	 * Called when the view is closed
	 */
	async onClose(): Promise<void> {
		// Clean up debounce timer
		if (this.modifyDebounceTimer !== null) {
			window.clearTimeout(this.modifyDebounceTimer);
			this.modifyDebounceTimer = null;
		}

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

					// Sync display mode from display view
					if ('getDisplayMode' in view) {
						this.currentDisplayMode = (view as any).getDisplayMode();
					}

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

		// Render shop actions section
		this.renderShopActionsSection(controlEl);

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

		// Price modifier controls
		this.renderPriceModifierControls(headerEl);

		// Display mode controls
		this.renderDisplayModeControls(headerEl);

		// Pagination controls
		this.renderPaginationControls(headerEl);
	}

	/**
	 * Render price modifier editing controls
	 */
	private renderPriceModifierControls(container: HTMLElement): void {
		const modifierContainer = container.createDiv({ cls: 'modifier-controls' });

		// Current modifier display
		const currentModifier = this.currentShop!.priceModifier;
		const modifierText = currentModifier >= 0 ? `+${currentModifier}%` : `${currentModifier}%`;

		modifierContainer.createEl('label', {
			text: 'Price Modifier:',
			cls: 'modifier-label'
		});

		// Input for new modifier
		const modifierInput = modifierContainer.createEl('input', {
			type: 'number',
			cls: 'modifier-input',
			value: currentModifier.toString(),
			attr: {
				min: '-100',
				max: '1000',
				step: '5'
			}
		});

		// Update button
		const updateButton = modifierContainer.createEl('button', {
			text: 'Update',
			cls: 'modifier-update-button'
		});

		updateButton.addEventListener('click', async () => {
			const newModifier = parseInt(modifierInput.value);

			if (isNaN(newModifier)) {
				new Notice('Please enter a valid number');
				return;
			}

			await this.handleUpdateModifier(newModifier, updateButton);
		});
	}

	/**
	 * Handle price modifier update
	 */
	private async handleUpdateModifier(newModifier: number, button: HTMLButtonElement): Promise<void> {
		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		// Disable button during processing
		button.disabled = true;
		button.textContent = 'Updating...';

		try {
			await this.plugin.shopModifier.updatePriceModifier(
				this.currentShopFile!,
				newModifier
			);

			new Notice(`Price modifier updated to ${newModifier >= 0 ? '+' : ''}${newModifier}%`);

			// Re-sync to update display
			await this.syncWithShop(this.currentShopFile!);

		} catch (error) {
			console.error('Error updating price modifier:', error);
			new Notice('Failed to update price modifier. See console for details.');

			// Re-enable button on error
			button.disabled = false;
			button.textContent = 'Update';
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Render display mode controls for player display
	 */
	private renderDisplayModeControls(container: HTMLElement): void {
		const modeContainer = container.createDiv({ cls: 'display-mode-controls' });

		modeContainer.createEl('label', {
			text: 'Display Mode:',
			cls: 'display-mode-label'
		});

		// Display mode buttons grid
		const buttonsGrid = modeContainer.createDiv({ cls: 'display-mode-buttons' });

		// Define main display modes
		const displayModes: Array<{ mode: DisplayMode; label: string }> = [
			{ mode: 'standard', label: 'Standard' },
			{ mode: 'list-2col', label: 'List' },
			{ mode: 'list-3col', label: 'Compact List' },
			{ mode: 'compact-cards', label: 'Compact' }
		];

		// Render mode buttons
		for (const { mode, label } of displayModes) {
			const button = buttonsGrid.createEl('button', {
				text: label,
				cls: 'display-mode-button'
			});

			// Add active class if current mode
			if (this.currentDisplayMode === mode) {
				button.addClass('display-mode-button-active');
			}

			// Disable button if currently updating
			if (this.isUpdating) {
				button.disabled = true;
			}

			button.addEventListener('click', async () => {
				await this.handleDisplayModeChange(mode);
			});
		}
	}

	/**
	 * Handle display mode change
	 */
	private async handleDisplayModeChange(mode: DisplayMode): Promise<void> {
		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Update local tracking
			this.currentDisplayMode = mode;

			// Trigger event for display view
			this.app.workspace.trigger('shopboard:set-display-mode', mode);

			// Re-render to update button states
			this.render();

			// Wait a bit for async operations to complete
			await new Promise(resolve => setTimeout(resolve, 100));
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Render pagination controls for navigating shop pages
	 */
	private renderPaginationControls(container: HTMLElement): void {
		// Get current page info from display view
		const displayLeaves = this.app.workspace.getLeavesOfType('shopboard-display');
		if (displayLeaves.length === 0) return;

		const displayView = displayLeaves[0].view as any;
		if (!displayView || !displayView.shopData) return;

		const currentPage = displayView.currentPage || 1;
		const totalPages = displayView.calculateTotalPages ? displayView.calculateTotalPages() : 1;

		// Don't show pagination if only 1 page
		if (totalPages <= 1) return;

		const paginationContainer = container.createDiv({ cls: 'pagination-controls' });

		paginationContainer.createEl('label', {
			text: 'Page Navigation:',
			cls: 'pagination-label'
		});

		const buttonsContainer = paginationContainer.createDiv({ cls: 'pagination-buttons' });

		// Previous button
		const prevButton = buttonsContainer.createEl('button', {
			text: '◀ Prev',
			cls: 'pagination-button pagination-prev'
		});

		if (currentPage <= 1) {
			prevButton.disabled = true;
			prevButton.addClass('pagination-button-disabled');
		}

		prevButton.addEventListener('click', async () => {
			await this.handlePageChange(currentPage - 1);
		});

		// Page indicator
		buttonsContainer.createDiv({
			cls: 'pagination-indicator',
			text: `Page ${currentPage} of ${totalPages}`
		});

		// Next button
		const nextButton = buttonsContainer.createEl('button', {
			text: 'Next ▶',
			cls: 'pagination-button pagination-next'
		});

		if (currentPage >= totalPages) {
			nextButton.disabled = true;
			nextButton.addClass('pagination-button-disabled');
		}

		nextButton.addEventListener('click', async () => {
			await this.handlePageChange(currentPage + 1);
		});
	}

	/**
	 * Handle page change
	 */
	private async handlePageChange(newPage: number): Promise<void> {
		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Trigger event for display view
			this.app.workspace.trigger('shopboard:change-page', newPage);

			// Re-render to update button states
			// Wait a bit for the display view to update
			await new Promise(resolve => setTimeout(resolve, 100));
			this.render();
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Render shop actions section (add item, restock, etc.)
	 */
	private renderShopActionsSection(container: HTMLElement): void {
		const actionsContainer = container.createDiv({ cls: 'shop-actions-section' });

		actionsContainer.createEl('h3', { text: 'Shop Actions' });

		const buttonsContainer = actionsContainer.createDiv({ cls: 'action-buttons' });

		// Add Item button
		const addItemButton = buttonsContainer.createEl('button', {
			text: '+ Add Item',
			cls: 'action-button add-item-button'
		});

		addItemButton.addEventListener('click', () => {
			this.openAddItemModal();
		});

		// Restock button
		const restockButton = buttonsContainer.createEl('button', {
			text: '🔄 Restock Shop',
			cls: 'action-button restock-button'
		});

		restockButton.addEventListener('click', () => {
			this.openRestockModal();
		});

		// Generate Images button
		const generateImagesButton = buttonsContainer.createEl('button', {
			text: '🎨 Generate Images',
			cls: 'action-button generate-images-button'
		});

		generateImagesButton.addEventListener('click', async () => {
			await this.handleGenerateImages(generateImagesButton);
		});
	}

	/**
	 * Open add item modal
	 */
	private openAddItemModal(): void {
		const modal = new AddItemModal(
			this.app,
			this.plugin.itemParser,
			async (itemRef: string, quantity: number, priceOverride: number | null) => {
				await this.handleAddItem(itemRef, quantity, priceOverride);
			}
		);
		modal.open();
	}

	/**
	 * Open restock modal
	 */
	private openRestockModal(): void {
		if (!this.currentShop || !this.currentShopFile) {
			new Notice('No shop active');
			return;
		}

		const modal = new RestockModal(
			this.app,
			this.currentShop,
			this.plugin.shopRestocker,
			this.plugin.shopGenerator,
			async (result) => {
				await this.handleRestock(result);
			}
		);
		modal.open();
	}

	/**
	 * Handle adding an item to the shop
	 */
	private async handleAddItem(
		itemRef: string,
		quantity: number,
		priceOverride: number | null
	): Promise<void> {
		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			await this.plugin.shopModifier.addInventoryItem(
				this.currentShopFile!,
				itemRef,
				quantity,
				priceOverride
			);

			new Notice(`Added ${itemRef} to shop (qty: ${quantity})`);

			// Re-sync to update display
			await this.syncWithShop(this.currentShopFile!);

		} catch (error) {
			console.error('Error adding item:', error);
			new Notice('Failed to add item. See console for details.');
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Handle restocking the shop
	 */
	private async handleRestock(result: any): Promise<void> {
		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Update the shop's inventory in the frontmatter
			await this.plugin.shopModifier.updateInventory(
				this.currentShopFile!,
				result.inventory
			);

			// Re-sync to update display
			await this.syncWithShop(this.currentShopFile!);

		} catch (error) {
			console.error('Error restocking shop:', error);
			new Notice('Failed to restock shop. See console for details.');
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Handle generating images for all items in the shop
	 */
	private async handleGenerateImages(button: HTMLButtonElement): Promise<void> {
		// Check if API key is configured
		if (!this.plugin.imageGenerator.isConfigured()) {
			new Notice('OpenAI API key not configured. Please add your API key in Shopboard settings.');
			return;
		}

		// Check if shop has any items
		if (!this.currentShop || this.currentShop.inventory.length === 0) {
			new Notice('No items in shop to generate images for.');
			return;
		}

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		// Disable button during processing
		button.disabled = true;
		const originalText = button.textContent;
		button.textContent = 'Generating...';

		try {
			// Collect all unique item files that have valid item data
			const itemFiles = new Map<string, TFile>();

			for (const invItem of this.currentShop.inventory) {
				if (invItem.itemData && invItem.itemData.file) {
					// Use file path as key to avoid duplicates
					const filePath = invItem.itemData.file.path;
					if (!itemFiles.has(filePath)) {
						itemFiles.set(filePath, invItem.itemData.file);
					}
				}
			}

			if (itemFiles.size === 0) {
				new Notice('No valid items found to generate images for.');
				return;
			}

			new Notice(`Generating images for ${itemFiles.size} item(s)...`);

			// Generate images for each unique item
			let successCount = 0;
			let failCount = 0;
			let current = 0;
			const total = itemFiles.size;

			for (const [filePath, itemFile] of itemFiles.entries()) {
				current++;
				button.textContent = `Generating ${current}/${total}...`;

				try {
					const result = await this.plugin.imageGenerator.generateImageForItem(itemFile);
					if (result) {
						successCount++;
					} else {
						failCount++;
					}
				} catch (error) {
					console.error(`Error generating image for ${itemFile.basename}:`, error);
					failCount++;
				}
			}

			// Show summary
			if (successCount > 0 && failCount === 0) {
				new Notice(`Successfully generated ${successCount} image(s)!`);
			} else if (successCount > 0 && failCount > 0) {
				new Notice(`Generated ${successCount} image(s), ${failCount} failed.`);
			} else {
				new Notice(`Failed to generate images. Check console for details.`);
			}

			// Re-sync to update display with new images
			await this.syncWithShop(this.currentShopFile!);

		} catch (error) {
			console.error('Error during image generation:', error);
			new Notice('Failed to generate images. See console for details.');
		} finally {
			// Re-enable button
			button.disabled = false;
			button.textContent = originalText || '🎨 Generate Images';
			this.isUpdating = false;
		}
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

		// Create sorted array with original indices preserved
		const sortedInventory = this.currentShop!.inventory
			.map((invItem, index) => ({ invItem, index }))
			.sort((a, b) => a.invItem.calculatedPrice - b.invItem.calculatedPrice);

		// Render control for each item (sorted by price, lowest first)
		sortedInventory.forEach(({ invItem, index }) => {
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

		// Add selected class if this item is selected
		if (this.selectedItemPath === item.path) {
			controlEl.addClass('control-item-selected');
		}

		// Item info section
		const infoEl = controlEl.createDiv({ cls: 'item-info' });

		// Item name
		infoEl.createSpan({
			cls: 'item-name',
			text: item.name
		});

		// Price display
		const priceText = this.plugin.priceCalculator.formatCurrency(invItem.calculatedPrice);
		infoEl.createDiv({
			cls: 'item-price-small',
			text: priceText
		});

		// Stock controls section
		const stockControlsEl = controlEl.createDiv({ cls: 'stock-controls' });

		// Decrement button
		const decrementButton = stockControlsEl.createEl('button', {
			cls: 'stock-adjust-button stock-decrement',
			text: '−'
		});

		decrementButton.addEventListener('click', async () => {
			await this.handleStockDecrement(index, invItem, decrementButton);
		});

		// Stock display
		const stockText = invItem.quantity === 0 ? 'Out of stock' : `Stock: ${invItem.quantity}`;
		const stockEl = stockControlsEl.createSpan({
			cls: 'stock-display',
			text: stockText
		});

		if (invItem.quantity === 0) {
			stockEl.addClass('out-of-stock');
		}

		// Increment button
		const incrementButton = stockControlsEl.createEl('button', {
			cls: 'stock-adjust-button stock-increment',
			text: '+'
		});

		incrementButton.addEventListener('click', async () => {
			await this.handleStockIncrement(index, invItem, incrementButton);
		});

		// Action controls section
		const controlsEl = controlEl.createDiv({ cls: 'action-controls' });

		// More Info button
		const infoButton = controlsEl.createEl('button', {
			cls: 'info-button',
			text: 'More Info'
		});

		// Info button click handler
		infoButton.addEventListener('click', () => {
			this.handleShowItemDetail(invItem);
		});

		// Purchase controls section (only if item is in stock)
		if (invItem.quantity > 0) {
			const purchaseEl = controlsEl.createDiv({ cls: 'purchase-controls' });

			// Quantity input
			const quantityInput = purchaseEl.createEl('input', {
				type: 'number',
				cls: 'quantity-input',
				attr: {
					min: '1',
					max: invItem.quantity.toString(),
					value: '1'
				}
			});

			// Record sale button
			const recordButton = purchaseEl.createEl('button', {
				cls: 'record-sale-button',
				text: 'Record Sale'
			});

			// Button click handler
			recordButton.addEventListener('click', async () => {
				const quantity = parseInt(quantityInput.value);
				await this.handlePurchase(index, quantity, recordButton, quantityInput);
			});
		}

		// Remove item button
		const removeButton = controlsEl.createEl('button', {
			cls: 'remove-item-button',
			text: '🗑️ Remove'
		});

		removeButton.addEventListener('click', async () => {
			await this.handleRemoveItem(index, invItem, removeButton);
		});
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
	 * Handle showing item detail
	 */
	private handleShowItemDetail(invItem: ShopInventoryItem): void {
		if (!invItem.itemData) {
			new Notice('Item data not available');
			return;
		}

		// Trigger event for shop display to show item detail
		this.app.workspace.trigger('shopboard:show-item-detail', invItem.itemData);
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

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

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
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Handle removing an item from the shop
	 */
	private async handleRemoveItem(
		itemIndex: number,
		invItem: ShopInventoryItem,
		button: HTMLButtonElement
	): Promise<void> {
		// Get item name for confirmation
		const itemName = invItem.itemData?.name || invItem.itemRef;

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		// Disable button during processing
		button.disabled = true;
		button.textContent = 'Removing...';

		try {
			await this.plugin.shopModifier.removeInventoryItem(
				this.currentShopFile!,
				itemIndex
			);

			new Notice(`Removed ${itemName} from shop`);

			// Re-sync to update display
			await this.syncWithShop(this.currentShopFile!);

		} catch (error) {
			console.error('Error removing item:', error);
			new Notice('Failed to remove item. See console for details.');

			// Re-enable button on error
			button.disabled = false;
			button.textContent = '🗑️ Remove';
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Handle incrementing item stock
	 */
	private async handleStockIncrement(
		itemIndex: number,
		invItem: ShopInventoryItem,
		button: HTMLButtonElement
	): Promise<void> {
		const newQuantity = invItem.quantity + 1;
		await this.updateItemStock(itemIndex, invItem, newQuantity, button);
	}

	/**
	 * Handle decrementing item stock
	 */
	private async handleStockDecrement(
		itemIndex: number,
		invItem: ShopInventoryItem,
		button: HTMLButtonElement
	): Promise<void> {
		// Prevent going below 0
		if (invItem.quantity <= 0) {
			new Notice('Stock is already at 0');
			return;
		}

		const newQuantity = invItem.quantity - 1;
		await this.updateItemStock(itemIndex, invItem, newQuantity, button);
	}

	/**
	 * Update item stock quantity
	 */
	private async updateItemStock(
		itemIndex: number,
		invItem: ShopInventoryItem,
		newQuantity: number,
		button: HTMLButtonElement
	): Promise<void> {
		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		// Disable button during processing
		button.disabled = true;

		try {
			await this.plugin.shopModifier.updateItemQuantity(
				this.currentShopFile!,
				itemIndex,
				newQuantity
			);

			// Re-sync to update display
			await this.syncWithShop(this.currentShopFile!);

		} catch (error) {
			console.error('Error updating stock:', error);
			new Notice('Failed to update stock. See console for details.');

			// Re-enable button on error
			button.disabled = false;
		} finally {
			this.isUpdating = false;
		}
	}
}
