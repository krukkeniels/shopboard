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
	private isUpdating: boolean = false;
	private currentPage: number = 1;
	private itemsPerPage: number = 20; // Will be calculated dynamically
	private isFullscreen: boolean = false;
	private hiddenElements: HTMLElement[] = []; // Track Obsidian UI elements hidden during fullscreen

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

		// Listen for column change events from DM control
		this.registerEvent(
			this.app.workspace.on('shopboard:set-columns', (columns: number) => {
				this.setColumns(columns);
			})
		);

		// Listen for row change events from DM control
		this.registerEvent(
			this.app.workspace.on('shopboard:set-rows', (rows: number) => {
				this.setRows(rows);
			})
		);

		// Listen for show descriptions toggle from DM control
		this.registerEvent(
			this.app.workspace.on('shopboard:set-show-descriptions', (show: boolean) => {
				this.setShowDescriptions(show);
			})
		);

		// Listen for page change events from DM control
		this.registerEvent(
			this.app.workspace.on('shopboard:change-page', (page: number) => {
				this.setCurrentPage(page);
			})
		);

		// Listen for item modification events
		this.registerEvent(
			this.app.workspace.on('shopboard:item-modified', async (itemPath: string) => {
				// Skip if we're currently updating to prevent race conditions
				if (this.isUpdating) {
					return;
				}

				// Check if the modified item is in our current shop's inventory
				const isInInventory = this.shopData?.inventory.some(
					invItem => invItem.itemData?.path === itemPath
				);

				if (isInInventory) {
					// Refresh shop data while preserving pagination
					await this.refreshShopData();
				}
			})
		);

		// Listen for shop file modifications (inventory changes)
		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				if (this.shopFile && file.path === this.shopFile.path) {
					if (this.refreshInterval !== null) {
						window.clearTimeout(this.refreshInterval);
					}

					// Use setTimeout to queue refresh after current operation completes
					this.refreshInterval = window.setTimeout(async () => {
						// Skip if we're STILL updating (ongoing operation)
						if (this.isUpdating) {
							return;
						}
						await this.refreshShopData();
					}, 300);
				}
			})
		);

		// Listen for keyboard events (F11 for fullscreen, ESC to exit fullscreen)
		this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
			// Only handle events when this view's window is focused
			if (!this.isInWindow()) return;

			// F11 - Toggle fullscreen
			if (evt.key === 'F11') {
				evt.preventDefault();
				this.toggleFullscreen();
			}

			// ESC - Exit fullscreen
			if (evt.key === 'Escape' && this.isFullscreen) {
				evt.preventDefault();
				this.exitFullscreen();
			}
		});
	}

	/**
	 * Called when the view is closed
	 */
	async onClose(): Promise<void> {
		// Restore tab bar if we were in fullscreen mode
		if (this.isFullscreen) {
			this.showTabBar();
		}

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
	 * Refresh shop data without resetting pagination
	 * Used when items are modified to preserve current page state
	 */
	async refreshShopData(): Promise<void> {
		if (!this.shopFile) return;

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Store current display settings before refresh
			const previousPage = this.currentPage;
			const previousColumns = this.shopData?.columns;
			const previousRows = this.shopData?.rows;

			// Parse the shop note to get updated inventory
			const shopData = await this.plugin.shopParser.parseShopNote(this.shopFile);

			if (shopData) {
				this.shopData = shopData;

				// Preserve the current display settings (don't reload from frontmatter)
				// This prevents race conditions with file saves and iCloud sync
				this.currentPage = previousPage;
				if (previousColumns !== undefined) {
					this.shopData.columns = previousColumns;
				}
				if (previousRows !== undefined) {
					this.shopData.rows = previousRows;
				}

				// Recalculate items per page (in case viewport changed)
				this.itemsPerPage = this.calculateItemsPerPage();

				// Validate current page - only adjust if out of bounds
				const totalPages = this.calculateTotalPages();
				if (this.currentPage > totalPages) {
					this.currentPage = Math.max(1, totalPages);
				}

				this.render();
			}
		} catch (error) {
			console.error('Error refreshing shop data:', error);
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Set columns for the shop display
	 */
	async setColumns(columns: number): Promise<void> {
		if (!this.shopData || !this.shopFile) {
			return;
		}

		// Validate column count (2-8)
		columns = Math.max(2, Math.min(8, columns));

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Update shop data
			this.shopData.columns = columns;

			// Recalculate items per page for new column count
			this.itemsPerPage = this.calculateItemsPerPage();

			// Reset to page 1 when changing columns
			this.currentPage = 1;
			this.shopData.currentPage = 1;

			// Re-render to apply new columns
			this.render();

			// Save ONLY columns to shop frontmatter (page reset is in-memory only)
			await this.plugin.shopModifier.updateColumns(this.shopFile, columns);

			// Notify DM control of column change
			this.app.workspace.trigger('shopboard:columns-changed', columns);
		} catch (error) {
			console.error('Error updating columns:', error);
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Set rows for the shop display
	 */
	async setRows(rows: number): Promise<void> {
		if (!this.shopData || !this.shopFile) {
			return;
		}

		// Validate row count (1-30)
		rows = Math.max(1, Math.min(30, rows));

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Update shop data
			this.shopData.rows = rows;

			// Recalculate items per page for new row count
			this.itemsPerPage = this.calculateItemsPerPage();

			// Reset to page 1 when changing rows
			this.currentPage = 1;
			this.shopData.currentPage = 1;

			// Re-render to apply new rows
			this.render();

			// Save ONLY rows to shop frontmatter (page reset is in-memory only)
			await this.plugin.shopModifier.updateRows(this.shopFile, rows);

			// Notify DM control of row change
			this.app.workspace.trigger('shopboard:rows-changed', rows);
		} catch (error) {
			console.error('Error updating rows:', error);
		} finally {
			this.isUpdating = false;
		}
	}

	/**
	 * Set whether to show item descriptions
	 */
	async setShowDescriptions(show: boolean): Promise<void> {
		if (!this.shopData || !this.shopFile) {
			return;
		}

		// Set updating flag to prevent race conditions
		this.isUpdating = true;

		try {
			// Update shop data
			this.shopData.showDescriptions = show;

			// Re-render to show/hide descriptions
			this.render();

			// Save to shop frontmatter
			await this.plugin.shopModifier.updateShowDescriptions(this.shopFile, show);

			// Notify DM control of change
			this.app.workspace.trigger('shopboard:show-descriptions-changed', show);
		} catch (error) {
			console.error('Error updating show descriptions:', error);
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
	 * Get current column count
	 */
	getColumns(): number {
		return this.shopData?.columns || 4;
	}

	/**
	 * Get current row count
	 */
	getRows(): number {
		return this.shopData?.rows || 5;
	}

	/**
	 * Check if the view is in a pop-out window (vs a tab)
	 */
	private isInWindow(): boolean {
		// Check if this leaf is in a floating window
		const leaf = this.leaf;
		// @ts-ignore - accessing internal property
		return leaf?.view?.containerEl?.win !== window;
	}

	/**
	 * Get the Electron BrowserWindow for this view's window
	 */
	private getElectronWindow(): any {
		if (!this.isInWindow()) return null;

		// Get the window object for this view (the pop-out window)
		// @ts-ignore - accessing internal property
		const win = this.containerEl.win;
		if (!win) return null;

		try {
			// Try modern @electron/remote first (Electron 14+)
			// @ts-ignore - accessing Electron remote from window context
			const remote = win.require('@electron/remote');
			if (remote) {
				return remote.getCurrentWindow();
			}
		} catch (e) {
			// Fallback to deprecated electron.remote (older Electron versions)
			try {
				// @ts-ignore - accessing Electron remote from window context
				const { remote } = win.require('electron');
				if (remote) {
					return remote.getCurrentWindow();
				}
			} catch (e2) {
				console.error('Could not access Electron remote module:', e2);
			}
		}

		return null;
	}

	/**
	 * Hide all Obsidian UI elements in the pop-out window for immersive fullscreen
	 * Uses safety check to ensure we never hide elements that contain our shop content
	 */
	private hideTabBar(): void {
		// Get the pop-out window's document
		// @ts-ignore - accessing internal property
		const win = this.containerEl.win;
		if (!win?.document) return;

		// Clear any previously hidden elements
		this.hiddenElements = [];

		// Conservative list of selectors that should only match tab chrome, not content
		// Safety check below ensures we never hide elements that contain our shop content
		const selectors = [
			'.workspace-tab-header-container',    // Tab header area
			'.workspace-tab-header-inner',        // Inner tab header elements
			'.view-header',                       // View header elements
			'.titlebar',                          // Titlebar (some Obsidian versions)
			'.mod-top.workspace-tab-header',      // Top tab headers specifically
		];

		console.log('[Shopboard Fullscreen] Searching for Obsidian UI elements to hide...');
		console.log('[Shopboard Fullscreen] Our content container:', this.containerEl);

		// Find and hide all matching elements
		for (const selector of selectors) {
			const elements = win.document.querySelectorAll(selector);
			elements.forEach((el: Element) => {
				const htmlEl = el as HTMLElement;

				// SAFETY CHECK: Never hide elements that contain our shop content
				// If this element is an ancestor/parent of our containerEl, skip it
				if (htmlEl.contains(this.containerEl)) {
					console.log(`[Shopboard Fullscreen] SKIPPING ${selector} - contains our content`);
					return;
				}

				// Only hide if not already hidden
				if (htmlEl.style.display !== 'none') {
					console.log(`[Shopboard Fullscreen] Hiding element: ${selector}, class: ${htmlEl.className}`);
					htmlEl.style.display = 'none';
					this.hiddenElements.push(htmlEl);
				}
			});
		}

		console.log(`[Shopboard Fullscreen] Hidden ${this.hiddenElements.length} UI elements (content preserved)`);
	}

	/**
	 * Restore all previously hidden Obsidian UI elements
	 */
	private showTabBar(): void {
		console.log(`[Shopboard Fullscreen] Restoring ${this.hiddenElements.length} UI elements`);

		// Restore all previously hidden elements
		for (const el of this.hiddenElements) {
			console.log(`[Shopboard Fullscreen] Restoring element: ${el.className}`);
			el.style.display = '';
		}

		// Clear the tracking array
		this.hiddenElements = [];
	}

	/**
	 * Toggle fullscreen mode
	 */
	toggleFullscreen(): void {
		if (!this.isInWindow()) {
			console.warn('Fullscreen is only available for pop-out windows');
			return;
		}

		const electronWin = this.getElectronWindow();
		if (!electronWin) {
			console.warn('Could not access Electron window');
			return;
		}

		// Toggle fullscreen state
		this.isFullscreen = !this.isFullscreen;
		electronWin.setFullScreen(this.isFullscreen);

		// Hide or show Obsidian UI based on new state
		if (this.isFullscreen) {
			this.hideTabBar();
		} else {
			this.showTabBar();
		}

		// Re-render to update fullscreen button icon
		this.render();
	}

	/**
	 * Enter fullscreen mode
	 */
	enterFullscreen(): void {
		if (!this.isInWindow()) return;

		const electronWin = this.getElectronWindow();
		if (!electronWin) return;

		this.isFullscreen = true;
		electronWin.setFullScreen(true);
		this.hideTabBar(); // Hide Obsidian tab bar for immersive fullscreen
		this.render();
	}

	/**
	 * Exit fullscreen mode
	 */
	exitFullscreen(): void {
		if (!this.isInWindow()) return;

		const electronWin = this.getElectronWindow();
		if (!electronWin) return;

		this.isFullscreen = false;
		electronWin.setFullScreen(false);
		this.showTabBar(); // Restore Obsidian tab bar when exiting fullscreen
		this.render();
	}

	/**
	 * Get category for an item based on its type
	 * - Equipment uses equipment_type field
	 * - Magic items use item_type field
	 */
	private getItemCategory(itemData: ItemData | null | undefined): string {
		if (!itemData?.metadata) return 'uncategorized';

		const itemType = itemData.metadata.type;
		if (itemType === 'equipment') {
			const rawType = itemData.metadata.equipment_type || 'uncategorized';
			return rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
		} else {
			const rawType = itemData.metadata.item_type || 'uncategorized';
			return rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
		}
	}

	/**
	 * Calculate total pages based on total cells (items + category headers)
	 */
	private calculateTotalPages(): number {
		if (!this.shopData) return 1;

		const availableItems = this.shopData.inventory.filter(item => item.quantity > 0);
		if (availableItems.length === 0) return 1;

		// Count unique categories
		const categories = new Set<string>();
		for (const item of availableItems) {
			const category = this.getItemCategory(item.itemData);
			categories.add(category);
		}

		// Total cells = items + category headers
		const totalCells = availableItems.length + categories.size;

		return Math.ceil(totalCells / this.itemsPerPage);
	}

	/**
	 * Calculate items per page based on fixed grid cells
	 * Returns total cells (rows × columns)
	 */
	private calculateItemsPerPage(): number {
		const columns = this.getColumns();
		const rows = this.getRows();

		this.itemsPerPage = rows * columns;
		return rows * columns;
	}

	/**
	 * Get grid configuration based on column and row counts
	 */
	private getGridConfig(): { rows: number; columns: number; cellHeight: number } {
		const container = this.containerEl.children[1] as HTMLElement;
		const columns = this.getColumns();
		const rows = this.getRows();

		// Calculate viewport dimensions
		const viewportHeight = container?.clientHeight || 800;
		const headerHeight = 80;
		const gridPaddingVertical = 32; // Grid padding: 1rem top + 1rem bottom
		const headerMarginBottom = 8; // Header margin-bottom: 0.5rem
		const availableHeight = viewportHeight - headerHeight - gridPaddingVertical - headerMarginBottom;
		const gap = 8; // 0.5rem gap between rows (matches CSS)

		// Calculate cell height to fill viewport
		// Formula: rows * cellHeight + (rows - 1) * gap = availableHeight
		// Solving: cellHeight = (availableHeight - (rows - 1) * gap) / rows
		const cellHeight = Math.floor((availableHeight - (rows - 1) * gap) / rows);

		return { rows, columns, cellHeight };
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

			// Set background image dynamically using Obsidian's resource path
			this.setShopBackground(mainDisplay, this.shopData.shopType);

			this.renderHeader(mainDisplay);
			this.renderInventory(mainDisplay);

			// Detail panel (right side)
			this.renderDetailPanel(splitContainer);
		} else {
			// Create main display container with shop type class
			const displayEl = container.createDiv({
				cls: `shopboard-display shop-type-${this.shopData.shopType}`
			});

			// Set background image dynamically using Obsidian's resource path
			this.setShopBackground(displayEl, this.shopData.shopType);

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

		// Page indicator
		const totalPages = this.calculateTotalPages();
		if (totalPages > 1) {
			headerEl.createDiv({
				cls: 'page-indicator',
				text: `Page ${this.currentPage} of ${totalPages}`
			});
		}

		// Fullscreen button (only show in pop-out windows)
		if (this.isInWindow()) {
			const fullscreenButton = headerEl.createEl('button', {
				cls: 'fullscreen-button',
				attr: {
					title: this.isFullscreen ? 'Exit Fullscreen (F11/ESC)' : 'Enter Fullscreen (F11)',
					'aria-label': this.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
				}
			});

			// Icon changes based on fullscreen state
			fullscreenButton.textContent = this.isFullscreen ? '⛶' : '⛶';

			// Click handler
			fullscreenButton.addEventListener('click', () => {
				this.toggleFullscreen();
			});
		}
	}

	/**
	 * Render inventory items in fixed grid layout with cell-based pagination
	 */
	private renderInventory(container: HTMLElement): void {
		// Filter out items with 0 quantity
		const availableItems = this.shopData!.inventory.filter(item => item.quantity > 0);

		if (availableItems.length === 0) {
			const inventoryEl = container.createDiv({ cls: 'shop-inventory shop-inventory-grid' });
			inventoryEl.createDiv({
				cls: 'inventory-empty',
				text: 'This shop has no items in stock.'
			});
			return;
		}

		// Sort ALL items by price first
		const sortedItems = [...availableItems].sort((a, b) => a.calculatedPrice - b.calculatedPrice);

		// Group ALL items by category (don't slice yet)
		const itemsByCategory = new Map<string, typeof sortedItems>();

		for (const item of sortedItems) {
			const category = this.getItemCategory(item.itemData);

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

		// Flatten to cell list: [header, item, item, header, item, item...]
		const allCells: Array<{ type: 'header' | 'item'; data: any }> = [];

		for (const category of sortedCategories) {
			const categoryItems = itemsByCategory.get(category)!;

			// Add category header as a cell
			allCells.push({ type: 'header', data: category });

			// Add items as cells
			for (const item of categoryItems) {
				allCells.push({ type: 'item', data: item });
			}
		}

		// Slice cells by page (headers + items)
		const startIndex = (this.currentPage - 1) * this.itemsPerPage;
		const endIndex = startIndex + this.itemsPerPage;
		const pageCells = allCells.slice(startIndex, endIndex);

		// Get grid configuration
		const gridConfig = this.getGridConfig();

		// Create grid container with fixed rows and dynamic columns
		const inventoryEl = container.createDiv({
			cls: 'shop-inventory shop-inventory-grid',
			attr: {
				style: `grid-template-rows: repeat(${gridConfig.rows}, ${gridConfig.cellHeight}px); grid-template-columns: repeat(${gridConfig.columns}, 1fr);`
			}
		});

		// Render cells for this page
		// Use two separate indices:
		// - gridPosition: tracks where we are in the physical grid layout
		// - cellIndex: tracks which cell from pageCells we're processing
		let cellIndex = 0;
		for (let gridPosition = 0; gridPosition < this.itemsPerPage && cellIndex < pageCells.length; gridPosition++) {
			const cell = pageCells[cellIndex];

			// Check if this grid position is in the last row
			// Since grid-auto-flow: column, items fill DOWN first (gridPosition is in row gridPosition % rows)
			const rowInGrid = gridPosition % gridConfig.rows;
			const isLastRow = rowInGrid === (gridConfig.rows - 1);

			// If category header would be in last row, push it to next column
			if (cell.type === 'header' && isLastRow) {
				// Render empty cell to maintain grid structure
				inventoryEl.createDiv({ cls: 'grid-empty-cell' });
				// Don't increment cellIndex - header will be rendered at top of next column
				continue;
			}

			if (cell.type === 'header') {
				// Render category header with special styling for Cards category
				const categoryClass = cell.data.toLowerCase() === 'cards'
					? 'grid-category-header grid-category-header-cards'
					: 'grid-category-header';

				inventoryEl.createDiv({
					cls: categoryClass,
					text: cell.data
				});
			} else {
				// Render item
				this.renderGridItem(inventoryEl, cell.data, gridConfig);
			}

			// Move to next cell
			cellIndex++;
		}
	}

	/**
	 * Render a single item as a grid cell
	 */
	private renderGridItem(container: HTMLElement, invItem: any, gridConfig: { rows: number; columns: number; cellHeight: number }): void {
		const showDescriptions = this.shopData?.showDescriptions ?? true;
		const itemEl = container.createDiv({ cls: 'inventory-item grid-item grid-item-compact' });

		// Handle missing item data
		if (!invItem.itemData) {
			itemEl.addClass('item-missing');
			itemEl.createDiv({ cls: 'grid-item-name', text: invItem.itemRef });
			itemEl.createDiv({ cls: 'grid-item-warning', text: '⚠️' });
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

		// Add item type class for equipment (non-magical items)
		if (item.metadata?.type === 'equipment') {
			itemEl.addClass('item-type-equipment');
		}

		// Calculate image size based on cell height - fill the full height minus top and bottom padding
		const imageHeight = Math.floor(gridConfig.cellHeight - 16); // -16px for padding (8px top + 8px bottom)

		// Item image (top-left)
		if (item.imageUrl && imageHeight >= 20) {
			const imgContainer = itemEl.createDiv({
				cls: 'grid-item-image',
				attr: { style: `height: ${imageHeight}px; width: ${imageHeight}px;` }
			});
			const imgEl = imgContainer.createEl('img');

			// Handle both online URLs and local file paths
			if (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')) {
				imgEl.src = item.imageUrl;
			} else {
				const resolvedPath = this.resolveImagePath(item.imageUrl, item.path);
				const resourcePath = this.app.vault.adapter.getResourcePath(resolvedPath);
				imgEl.src = resourcePath;
			}

			imgEl.alt = item.name;
			imgEl.onerror = () => {
				imgContainer.empty();
				imgContainer.addClass('grid-item-image-error');
			};
		}

		// Stock indicator (top-right)
		if (invItem.quantity <= 3) {
			itemEl.createDiv({
				cls: 'grid-item-stock',
				text: `×${invItem.quantity}`
			});
		}

		// Content wrapper (name + description)
		const contentEl = itemEl.createDiv({ cls: 'grid-item-content' });

		// Item name
		contentEl.createDiv({
			cls: 'grid-item-name',
			text: item.name
		});

		// Item description (shown when enabled)
		if (showDescriptions && item.description) {
			contentEl.createDiv({
				cls: 'grid-item-description',
				text: item.description
			});
		}

		// Item price (bottom-right)
		const priceText = this.plugin.priceCalculator.formatCurrency(invItem.calculatedPrice);
		itemEl.createDiv({
			cls: 'grid-item-price',
			text: priceText
		});

		// Click handler
		itemEl.addEventListener('click', () => {
			this.showItemDetail(item);
		});
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

		// Add item type class for equipment (non-magical items)
		if (item.metadata?.type === 'equipment') {
			itemEl.addClass('item-type-equipment');
		}

		// Category badge at the top
		const category = this.getItemCategory(item);
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

		// Add item type class for equipment (non-magical items)
		if (item.metadata?.type === 'equipment') {
			itemEl.addClass('item-type-equipment');
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

				// Only refresh when ITEMS are modified, not the shop file itself
				// Shop file modifications are handled by explicit setColumns/setRows/etc methods
				// This prevents race conditions where saving shop settings triggers a refresh
				// that overwrites the values we just saved
				const isShopItem = this.shopData?.inventory.some(
					invItem => invItem.itemData?.path === file.path
				);

				if (isShopItem) {
					// Debounce: wait a bit before refreshing
					if (this.refreshInterval !== null) {
						window.clearTimeout(this.refreshInterval);
					}

					this.refreshInterval = window.setTimeout(async () => {
						await this.refreshShopData();
					}, 500);
				}
			})
		);
	}

	/**
	 * Set shop background image dynamically using Obsidian's resource path API
	 */
	private setShopBackground(element: HTMLElement, shopType: string): void {
		// Map shop types to background image filenames
		const backgroundMap: Record<string, string> = {
			'magic_shop': 'magic-shop-bg.png',
			'blacksmith': 'blacksmith-bg.png',
			'general_store': 'general-store-bg.png',
			'alchemist': 'alchemist-bg.png'
		};

		const backgroundFilename = backgroundMap[shopType];
		if (!backgroundFilename) {
			console.warn(`No background image defined for shop type: ${shopType}`);
			return;
		}

		// Construct path relative to vault root (not absolute path)
		const backgroundPath = `.obsidian/plugins/shopboard/assets/backgrounds/${backgroundFilename}`;

		// Use Obsidian's resource path API (same as item images)
		const resourcePath = this.app.vault.adapter.getResourcePath(backgroundPath);

		// Set as CSS custom property on the element
		element.style.setProperty('--shop-background-image', `url("${resourcePath}")`);
	}
}
