import { App, Modal, Notice } from 'obsidian';
import { ItemParser } from '../parsers/itemParser';
import { ItemData, ShopboardSettings } from '../types';
import { PriceCalculator } from '../utils/priceCalculator';

/**
 * Modal for searching and adding items to a shop
 */
export class AddItemModal extends Modal {
	private itemParser: ItemParser;
	private settings: ShopboardSettings;
	private priceCalculator: PriceCalculator;
	private searchQuery: string = '';
	private onSubmit: (itemRef: string, quantity: number) => void;

	private searchInputEl: HTMLInputElement | null = null;
	private tableBodyEl: HTMLElement | null = null;

	constructor(
		app: App,
		itemParser: ItemParser,
		settings: ShopboardSettings,
		priceCalculator: PriceCalculator,
		onSubmit: (itemRef: string, quantity: number) => void
	) {
		super(app);
		this.itemParser = itemParser;
		this.settings = settings;
		this.priceCalculator = priceCalculator;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('shopboard-add-item-modal');

		// Modal title
		contentEl.createEl('h2', { text: 'Add Items to Shop' });

		// Search section
		this.createSearchSection(contentEl);

		// Item table section
		this.createItemTable(contentEl);

		// Buttons
		this.createButtons(contentEl);

		// Initial render
		this.renderItems();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Create search input section
	 */
	private createSearchSection(container: HTMLElement) {
		const searchContainer = container.createDiv('search-container');

		this.searchInputEl = searchContainer.createEl('input', {
			type: 'text',
			cls: 'search-input',
			placeholder: 'Search items...'
		});

		this.searchInputEl.addEventListener('input', () => {
			this.searchQuery = this.searchInputEl?.value.toLowerCase() || '';
			this.renderItems();
		});

		// Clear search button
		if (this.searchQuery) {
			const clearButton = searchContainer.createEl('button', {
				text: '×',
				cls: 'search-clear-button'
			});
			clearButton.addEventListener('click', () => {
				this.searchQuery = '';
				if (this.searchInputEl) {
					this.searchInputEl.value = '';
				}
				this.renderItems();
			});
		}

		// Auto-focus search input
		this.searchInputEl.focus();
	}

	/**
	 * Create item table
	 */
	private createItemTable(container: HTMLElement) {
		const tableContainer = container.createDiv('item-table-container');

		const table = tableContainer.createEl('table', { cls: 'item-table' });

		// Table header
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: 'Item Name' });
		headerRow.createEl('th', { text: 'Rarity' });
		headerRow.createEl('th', { text: 'Base Price' });
		headerRow.createEl('th', { text: 'Quick Add' });

		// Table body
		this.tableBodyEl = table.createEl('tbody');
	}

	/**
	 * Create action buttons
	 */
	private createButtons(container: HTMLElement) {
		const buttonContainer = container.createDiv('modal-button-container');

		// Close button
		const closeButton = buttonContainer.createEl('button', {
			text: 'Close',
			cls: 'mod-cta'
		});

		closeButton.addEventListener('click', () => {
			this.close();
		});
	}

	/**
	 * Render items in table based on search
	 */
	private renderItems() {
		if (!this.tableBodyEl) return;

		this.tableBodyEl.empty();

		// Get all items
		const stats = this.itemParser.getCacheStats();
		const allItems = stats.items;

		// Filter items based on search
		const filteredItems = allItems.filter(item => {
			if (!this.searchQuery) return true;

			const searchLower = this.searchQuery;
			const nameLower = item.name.toLowerCase();
			const rarityLower = (item.rarity || '').toLowerCase();
			const descLower = (item.description || '').toLowerCase();

			return nameLower.includes(searchLower) ||
				rarityLower.includes(searchLower) ||
				descLower.includes(searchLower);
		});

		// Show empty state if no items
		if (filteredItems.length === 0) {
			const emptyRow = this.tableBodyEl.createEl('tr', { cls: 'empty-row' });
			const emptyCell = emptyRow.createEl('td', {
				text: this.searchQuery ? 'No items found matching your search' : 'No items available',
				attr: { colspan: '4' }
			});
			return;
		}

		// Render items (limit to 100 for performance)
		const itemsToShow = filteredItems.slice(0, 100);

		for (const item of itemsToShow) {
			const row = this.tableBodyEl.createEl('tr', { cls: 'item-row' });

			// Item name
			row.createEl('td', { text: item.name, cls: 'item-name-cell' });

			// Rarity
			const rarityCell = row.createEl('td', { cls: 'rarity-cell' });
			if (item.rarity) {
				const rarityBadge = rarityCell.createSpan({
					text: item.rarity,
					cls: `rarity-badge rarity-${item.rarity.toLowerCase().replace(/\s+/g, '-')}`
				});
			} else {
				rarityCell.textContent = '-';
			}

			// Base price with converted display value
			let priceText = '-';
			if (item.basePrice) {
				const baseCurrency = this.settings.currency.baseCurrency;
				const displayCurrency = this.settings.currency.displayCurrency;

				priceText = `${item.basePrice} ${baseCurrency}`;

				// Show converted display currency if different from base
				if (baseCurrency !== displayCurrency) {
					const displayPrice = this.priceCalculator.convertCurrency(
						item.basePrice,
						baseCurrency,
						displayCurrency
					);

					// Format display price with appropriate decimal places
					const formattedDisplay = displayPrice % 1 === 0
						? displayPrice.toString()
						: displayPrice.toFixed(2);

					priceText += ` (${formattedDisplay} ${displayCurrency})`;
				}
			}
			row.createEl('td', { text: priceText, cls: 'price-cell' });

			// Quick add buttons
			const actionsCell = row.createEl('td', { cls: 'actions-cell' });

			// +1 button
			const add1Button = actionsCell.createEl('button', {
				text: '+1',
				cls: 'btn-small btn-add'
			});
			add1Button.addEventListener('click', () => {
				this.handleQuickAdd(item, 1);
			});

			// +5 button
			const add5Button = actionsCell.createEl('button', {
				text: '+5',
				cls: 'btn-small btn-add'
			});
			add5Button.addEventListener('click', () => {
				this.handleQuickAdd(item, 5);
			});

			// +20 button
			const add20Button = actionsCell.createEl('button', {
				text: '+20',
				cls: 'btn-small btn-add'
			});
			add20Button.addEventListener('click', () => {
				this.handleQuickAdd(item, 20);
			});
		}

		// Show count if limited
		if (filteredItems.length > 100) {
			const noteRow = this.tableBodyEl.createEl('tr', { cls: 'note-row' });
			noteRow.createEl('td', {
				text: `Showing first 100 of ${filteredItems.length} items. Use search to narrow results.`,
				attr: { colspan: '4' }
			});
		}
	}

	/**
	 * Handle quick add button click
	 */
	private handleQuickAdd(item: ItemData, quantity: number) {
		// Create wikilink reference
		const itemRef = `[[${item.name}]]`;

		// Call the onSubmit callback
		this.onSubmit(itemRef, quantity);

		// Show success notice
		new Notice(`Added ${quantity}x ${item.name} to shop`);

		// Keep modal open for adding more items
	}
}
