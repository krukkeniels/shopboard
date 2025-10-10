import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import { ShopData, ShopInventoryItem } from '../types';
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
	private currentColumns: number = 4;
	private currentShowDescriptions: boolean = true;
	private modifyDebounceTimer: number | null = null;
	private isUpdating: boolean = false;
	private searchQuery: string = '';
	private searchInputCursorPosition: number | null = null;

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

		// Listen for item detail events to sync with shop display view
		// Note: Currently this event is only triggered by handleShowItemDetail in this view,
		// which already updates selectedItemPath before triggering. So this listener is primarily
		// for keeping state in sync if other sources start triggering this event in the future.
		this.registerEvent(
			this.app.workspace.on('shopboard:show-item-detail', (itemData: any) => {
				// Do nothing - handleShowItemDetail already manages selectedItemPath before triggering this event
				// If in the future other views trigger this event, we can add sync logic here
			})
		);

		// Listen for column change events from display view
		this.registerEvent(
			this.app.workspace.on('shopboard:columns-changed', (columns: number) => {
				this.currentColumns = columns;
				this.render();
			})
		);

		// Listen for show descriptions toggle events from display view
		this.registerEvent(
			this.app.workspace.on('shopboard:show-descriptions-changed', (show: boolean) => {
				this.currentShowDescriptions = show;
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

					// Sync columns from display view
					if ('getColumns' in view) {
						this.currentColumns = (view as any).getColumns();
					}

					// Sync showDescriptions from shop data
					this.currentShowDescriptions = shopData.showDescriptions ?? true;

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

		// Column controls
		this.renderColumnControls(headerEl);

		// Description toggle
		this.renderDescriptionToggle(headerEl);

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
	 * Render column controls for player display
	 */
	private renderColumnControls(container: HTMLElement): void {
		const columnContainer = container.createDiv({ cls: 'column-controls' });

		columnContainer.createEl('label', {
			text: 'Display Columns:',
			cls: 'column-label'
		});

		const controlsRow = columnContainer.createDiv({ cls: 'column-controls-row' });

		// Decrease button
		const decreaseButton = controlsRow.createEl('button', {
			text: '−',
			cls: 'column-adjust-button'
		});

		// Disable if at minimum
		if (this.currentColumns <= 2) {
			decreaseButton.disabled = true;
		}

		decreaseButton.addEventListener('click', async () => {
			await this.handleColumnsChange(this.currentColumns - 1);
		});

		// Column count display
		controlsRow.createDiv({
			cls: 'column-display',
			text: `${this.currentColumns} columns`
		});

		// Increase button
		const increaseButton = controlsRow.createEl('button', {
			text: '+',
			cls: 'column-adjust-button'
		});

		// Disable if at maximum
		if (this.currentColumns >= 8) {
			increaseButton.disabled = true;
		}

		increaseButton.addEventListener('click', async () => {
			await this.handleColumnsChange(this.currentColumns + 1);
		});
	}

	/**
	 * Handle column count change
	 */
	private async handleColumnsChange(columns: number): Promise<void> {
		// Validate range
		columns = Math.max(2, Math.min(8, columns));

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Update local tracking
			this.currentColumns = columns;

			// Trigger event for display view
			this.app.workspace.trigger('shopboard:set-columns', columns);

			// Re-render to update button states
			this.render();

			// Wait a bit for async operations to complete
			await new Promise(resolve => setTimeout(resolve, 100));
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Render description toggle control
	 */
	private renderDescriptionToggle(container: HTMLElement): void {
		const toggleContainer = container.createDiv({ cls: 'description-toggle-controls' });

		toggleContainer.createEl('label', {
			text: 'Show Descriptions:',
			cls: 'description-toggle-label'
		});

		const toggleRow = toggleContainer.createDiv({ cls: 'description-toggle-row' });

		// Toggle checkbox
		const checkbox = toggleRow.createEl('input', {
			type: 'checkbox',
			cls: 'description-toggle-checkbox'
		});

		checkbox.checked = this.currentShowDescriptions;

		checkbox.addEventListener('change', async () => {
			await this.handleDescriptionToggle(checkbox.checked);
		});

		// Label for checkbox
		toggleRow.createSpan({
			cls: 'description-toggle-text',
			text: this.currentShowDescriptions ? 'Enabled' : 'Disabled'
		});
	}

	/**
	 * Handle description toggle change
	 */
	private async handleDescriptionToggle(show: boolean): Promise<void> {
		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Update local tracking
			this.currentShowDescriptions = show;

			// Trigger event for display view
			this.app.workspace.trigger('shopboard:set-show-descriptions', show);

			// Re-render to update toggle state
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
				if (invItem.itemData) {
					// Get the TFile - either from itemData.file or by looking up the path
					let itemFile = invItem.itemData.file;
					if (!itemFile) {
						const file = this.app.vault.getAbstractFileByPath(invItem.itemData.path);
						if (file instanceof TFile) {
							itemFile = file;
						}
					}

					if (itemFile) {
						// Use file path as key to avoid duplicates
						const filePath = itemFile.path;
						if (!itemFiles.has(filePath)) {
							itemFiles.set(filePath, itemFile);
						}
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
						// Refresh the item cache so the new image appears immediately
						await this.plugin.itemParser.refreshItem(itemFile);
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
	 * Handle generating an image for a single item
	 */
	private async handleGenerateItemImage(invItem: ShopInventoryItem, button: HTMLButtonElement): Promise<void> {
		// Check if item has valid data
		if (!invItem.itemData) {
			new Notice('Cannot generate image for this item - item data not found.');
			return;
		}

		// Check if API key is configured
		if (!this.plugin.imageGenerator.isConfigured()) {
			new Notice('OpenAI API key not configured. Please add your API key in Shopboard settings.');
			return;
		}

		// Get the TFile - either from itemData.file or by looking up the path
		let itemFile = invItem.itemData.file;
		if (!itemFile) {
			const file = this.app.vault.getAbstractFileByPath(invItem.itemData.path);
			if (file instanceof TFile) {
				itemFile = file;
			}
		}

		if (!itemFile) {
			new Notice('Cannot find item file for image generation.');
			return;
		}

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		// Disable button during processing
		button.disabled = true;
		const originalText = button.textContent;
		button.textContent = '⏳';

		try {
			const result = await this.plugin.imageGenerator.generateImageForItem(itemFile);

			if (result) {
				new Notice(`Successfully generated image for ${invItem.itemData.name}!`);

				// Refresh the item cache so the new image appears immediately
				await this.plugin.itemParser.refreshItem(itemFile);

				// Re-sync to update display with new image
				await this.syncWithShop(this.currentShopFile!);
			} else {
				new Notice(`Failed to generate image for ${invItem.itemData.name}. Check console for details.`);
			}

		} catch (error) {
			console.error('Error generating item image:', error);
			new Notice(`Failed to generate image. See console for details.`);
		} finally {
			// Re-enable button
			button.disabled = false;
			button.textContent = originalText || '🎨';
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

		// Add search field
		const searchContainer = inventoryEl.createDiv({ cls: 'inventory-search-container' });
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			cls: 'inventory-search-input',
			placeholder: 'Search items...',
			value: this.searchQuery
		});

		// Restore cursor position if we have one
		if (this.searchInputCursorPosition !== null) {
			searchInput.setSelectionRange(this.searchInputCursorPosition, this.searchInputCursorPosition);
			searchInput.focus();
			this.searchInputCursorPosition = null;
		}

		searchInput.addEventListener('input', () => {
			// Save cursor position before render
			this.searchInputCursorPosition = searchInput.selectionStart;
			this.searchQuery = searchInput.value;
			this.render();
		});

		// Clear search button
		if (this.searchQuery) {
			const clearButton = searchContainer.createEl('button', {
				text: '×',
				cls: 'search-clear-button'
			});
			clearButton.addEventListener('click', () => {
				this.searchQuery = '';
				this.searchInputCursorPosition = null;
				this.render();
			});
		}

		// Filter items by search query
		const filteredInventory = this.currentShop!.inventory
			.map((invItem, index) => ({ invItem, index }))
			.filter(({ invItem }) => {
				if (!this.searchQuery) return true;
				const itemName = invItem.itemData?.name || invItem.itemRef;
				return itemName.toLowerCase().includes(this.searchQuery.toLowerCase());
			});

		if (filteredInventory.length === 0) {
			inventoryEl.createDiv({
				cls: 'inventory-empty',
				text: 'No items match your search'
			});
			return;
		}

		// Group items by category (matching player view)
		const itemsByCategory = new Map<string, typeof filteredInventory>();

		for (const item of filteredInventory) {
			const rawType = item.invItem.itemData?.metadata?.item_type || 'uncategorized';
			const category = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();

			if (!itemsByCategory.has(category)) {
				itemsByCategory.set(category, []);
			}
			itemsByCategory.get(category)!.push(item);
		}

		// Sort each category's items by price (lowest first)
		for (const items of itemsByCategory.values()) {
			items.sort((a, b) => a.invItem.calculatedPrice - b.invItem.calculatedPrice);
		}

		// Sort categories alphabetically, but put "Uncategorized" at the end
		const sortedCategories = Array.from(itemsByCategory.keys()).sort((a, b) => {
			if (a === 'Uncategorized') return 1;
			if (b === 'Uncategorized') return -1;
			return a.localeCompare(b);
		});

		// Create table
		const tableContainer = inventoryEl.createDiv({ cls: 'inventory-table-container' });
		const table = tableContainer.createEl('table', { cls: 'inventory-table' });

		// Table header
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Item' });
		headerRow.createEl('th', { text: 'Category' });
		headerRow.createEl('th', { text: 'Price' });
		headerRow.createEl('th', { text: 'Stock' });
		headerRow.createEl('th', { text: 'Actions' });

		// Table body
		const tbody = table.createEl('tbody');

		// Render items by category
		for (const category of sortedCategories) {
			const categoryItems = itemsByCategory.get(category)!;

			for (const { invItem, index } of categoryItems) {
				this.renderItemRow(tbody, invItem, index, category);
			}
		}
	}

	/**
	 * Render a single inventory item as a table row
	 */
	private renderItemRow(tbody: HTMLElement, invItem: ShopInventoryItem, index: number, category: string): void {
		const row = tbody.createEl('tr', { cls: 'inventory-item-row' });

		// Handle missing item data
		if (!invItem.itemData) {
			row.addClass('item-missing');
			row.createEl('td', { text: invItem.itemRef });
			row.createEl('td', { text: category });
			row.createEl('td', { text: '—' });
			row.createEl('td', { text: '—' });
			row.createEl('td', { text: '⚠️ Not found' });
			return;
		}

		const item = invItem.itemData;

		// Add selected class if this item is selected
		if (this.selectedItemPath === item.path) {
			row.addClass('item-row-selected');
		}

		// Item name column
		const nameCell = row.createEl('td', { cls: 'item-name-cell' });
		const nameLink = nameCell.createSpan({ cls: 'item-name-text item-name-link', text: item.name });

		// Make name clickable to open the item note
		nameLink.addEventListener('click', async () => {
			const itemFile = item.file || this.app.vault.getAbstractFileByPath(item.path);
			if (itemFile instanceof TFile) {
				await this.app.workspace.getLeaf(false).openFile(itemFile);
			} else {
				new Notice('Could not open item note');
			}
		});

		// Category column
		row.createEl('td', { text: category, cls: 'category-cell' });

		// Price column
		const priceText = this.plugin.priceCalculator.formatCurrency(invItem.calculatedPrice);
		row.createEl('td', { text: priceText, cls: 'price-cell' });

		// Stock column with controls
		const stockCell = row.createEl('td', { cls: 'stock-cell' });
		const stockControls = stockCell.createDiv({ cls: 'stock-controls-inline' });

		// Decrement button
		const decrementButton = stockControls.createEl('button', {
			cls: 'btn-small btn-stock',
			text: '−',
			attr: { title: 'Decrease stock' }
		});
		decrementButton.addEventListener('click', async () => {
			await this.handleStockDecrement(index, invItem, decrementButton);
		});

		// Stock display
		const stockSpan = stockControls.createSpan({
			cls: 'stock-value',
			text: invItem.quantity.toString()
		});
		if (invItem.quantity === 0) {
			stockSpan.addClass('out-of-stock');
		}

		// Increment button
		const incrementButton = stockControls.createEl('button', {
			cls: 'btn-small btn-stock',
			text: '+',
			attr: { title: 'Increase stock' }
		});
		incrementButton.addEventListener('click', async () => {
			await this.handleStockIncrement(index, invItem, incrementButton);
		});

		// Actions column
		const actionsCell = row.createEl('td', { cls: 'actions-cell' });

		// Info button (first action)
		const infoButtonClass = this.selectedItemPath === item.path
			? 'btn-small btn-info btn-info-active'
			: 'btn-small btn-info';
		const infoButton = actionsCell.createEl('button', {
			cls: infoButtonClass,
			text: 'ℹ️',
			attr: { title: 'More Info' }
		});
		infoButton.addEventListener('click', () => {
			this.handleShowItemDetail(invItem);
		});

		// Generate Image button
		const generateImageButton = actionsCell.createEl('button', {
			cls: 'btn-small btn-generate-image',
			text: '🎨',
			attr: { title: 'Generate Image' }
		});
		generateImageButton.addEventListener('click', async () => {
			await this.handleGenerateItemImage(invItem, generateImageButton);
		});

		// Purchase controls (only if item is in stock)
		if (invItem.quantity > 0) {
			const quantityInput = actionsCell.createEl('input', {
				type: 'number',
				cls: 'input-small qty-input',
				attr: {
					min: '1',
					max: invItem.quantity.toString(),
					value: '1',
					title: 'Quantity to sell'
				}
			});

			const recordButton = actionsCell.createEl('button', {
				cls: 'btn-small btn-primary',
				text: 'Sell',
				attr: { title: 'Record sale' }
			});
			recordButton.addEventListener('click', async () => {
				const quantity = parseInt(quantityInput.value);
				await this.handlePurchase(index, quantity, recordButton, quantityInput);
			});
		}

		// Remove button
		const removeButton = actionsCell.createEl('button', {
			cls: 'btn-small btn-danger',
			text: '🗑️',
			attr: { title: 'Remove item' }
		});
		removeButton.addEventListener('click', async () => {
			await this.handleRemoveItem(index, invItem, removeButton);
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

		// Toggle selection directly
		if (this.selectedItemPath === invItem.itemData.path) {
			this.selectedItemPath = null;
		} else {
			this.selectedItemPath = invItem.itemData.path;
		}

		// Re-render to update button styling immediately
		this.render();

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
