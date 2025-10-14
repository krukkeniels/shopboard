import { App, Modal, Notice } from 'obsidian';
import { ItemParser } from '../parsers/itemParser';
import { ItemData, ShopboardSettings } from '../types';
import { PriceCalculator } from '../utils/priceCalculator';

/**
 * Modal for buying items from players and adding them to shop
 * Shows buy prices (what shop pays player) but adds items at normal shop pricing
 */
export class BuyItemModal extends Modal {
	private itemParser: ItemParser;
	private settings: ShopboardSettings;
	private priceCalculator: PriceCalculator;
	private shopPriceModifier: number;
	private buyModifier: number;
	private searchQuery: string = '';
	private onSubmit: (itemRef: string, quantity: number) => void;

	private searchInputEl: HTMLInputElement | null = null;
	private buyModifierInputEl: HTMLInputElement | null = null;
	private tableBodyEl: HTMLElement | null = null;

	constructor(
		app: App,
		itemParser: ItemParser,
		settings: ShopboardSettings,
		priceCalculator: PriceCalculator,
		shopPriceModifier: number,
		onSubmit: (itemRef: string, quantity: number) => void
	) {
		super(app);
		this.itemParser = itemParser;
		this.settings = settings;
		this.priceCalculator = priceCalculator;
		this.shopPriceModifier = shopPriceModifier;
		// Default buy modifier: shop modifier - 10
		this.buyModifier = shopPriceModifier - 10;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('shopboard-buy-item-modal');

		// Set inline styles on modalEl (the actual modal container, not just content)
		this.modalEl.style.maxWidth = '1000px';
		this.modalEl.style.minWidth = '800px';
		this.modalEl.style.width = '100%';

		// Modal title
		contentEl.createEl('h2', { text: 'Buy Items from Players' });

		// Description
		contentEl.createEl('p', {
			text: 'Buy prices shown are what you pay the player. Items will be added to shop at normal pricing.',
			cls: 'modal-description'
		});

		// Buy modifier section
		this.createBuyModifierSection(contentEl);

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
	 * Create buy modifier input section
	 */
	private createBuyModifierSection(container: HTMLElement) {
		const modifierContainer = container.createDiv('buy-modifier-container');

		modifierContainer.createEl('label', {
			text: 'Buy Price Modifier (%):',
			cls: 'buy-modifier-label'
		});

		this.buyModifierInputEl = modifierContainer.createEl('input', {
			type: 'number',
			cls: 'buy-modifier-input',
			value: this.buyModifier.toString(),
			attr: {
				min: '-100',
				max: '1000',
				step: '5'
			}
		});

		this.buyModifierInputEl.addEventListener('input', () => {
			const value = parseInt(this.buyModifierInputEl?.value || '0');
			if (!isNaN(value)) {
				this.buyModifier = value;
				this.renderItems(); // Re-render to update prices
			}
		});

		// Show explanation
		const explanation = modifierContainer.createDiv({ cls: 'buy-modifier-explanation' });
		explanation.textContent = `Shop sells at ${this.shopPriceModifier >= 0 ? '+' : ''}${this.shopPriceModifier}%. Default buy modifier is ${this.buyModifier >= 0 ? '+' : ''}${this.buyModifier}%.`;
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
		headerRow.createEl('th', { text: 'Buy Price' });
		headerRow.createEl('th', { text: 'Quick Buy' });

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
				attr: { colspan: '5' }
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
			let basePriceText = '-';
			if (item.basePrice) {
				const baseCurrency = this.settings.currency.baseCurrency;
				const displayCurrency = this.settings.currency.displayCurrency;

				basePriceText = `${item.basePrice} ${baseCurrency}`;

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

					basePriceText += ` (${formattedDisplay} ${displayCurrency})`;
				}
			}
			row.createEl('td', { text: basePriceText, cls: 'price-cell' });

			// Buy price (what shop pays player)
			let buyPriceText = '-';
			if (item.basePrice) {
				const buyPriceInBase = this.priceCalculator.calculatePrice(
					item.basePrice,
					this.buyModifier
				);
				buyPriceText = this.priceCalculator.formatCurrency(buyPriceInBase);
			}
			row.createEl('td', { text: buyPriceText, cls: 'buy-price-cell' });

			// Quick buy buttons
			const actionsCell = row.createEl('td', { cls: 'actions-cell' });

			// +1 button
			const buy1Button = actionsCell.createEl('button', {
				text: '+1',
				cls: 'btn-small btn-add'
			});
			buy1Button.addEventListener('click', () => {
				this.handleQuickBuy(item, 1);
			});

			// +5 button
			const buy5Button = actionsCell.createEl('button', {
				text: '+5',
				cls: 'btn-small btn-add'
			});
			buy5Button.addEventListener('click', () => {
				this.handleQuickBuy(item, 5);
			});

			// +20 button
			const buy20Button = actionsCell.createEl('button', {
				text: '+20',
				cls: 'btn-small btn-add'
			});
			buy20Button.addEventListener('click', () => {
				this.handleQuickBuy(item, 20);
			});
		}

		// Show count if limited
		if (filteredItems.length > 100) {
			const noteRow = this.tableBodyEl.createEl('tr', { cls: 'note-row' });
			noteRow.createEl('td', {
				text: `Showing first 100 of ${filteredItems.length} items. Use search to narrow results.`,
				attr: { colspan: '5' }
			});
		}
	}

	/**
	 * Handle quick buy button click
	 */
	private async handleQuickBuy(item: ItemData, quantity: number) {
		// Create wikilink reference
		const itemRef = `[[${item.name}]]`;

		// Calculate buy price for display in notice
		const buyPriceInBase = this.priceCalculator.calculatePrice(
			item.basePrice,
			this.buyModifier
		);
		const totalBuyPrice = buyPriceInBase * quantity;
		const buyPriceText = this.priceCalculator.formatCurrency(totalBuyPrice);

		// Await the onSubmit callback to ensure item is added before showing notice
		await this.onSubmit(itemRef, quantity);

		// Show success notice with buy price AFTER item is added
		new Notice(`Bought ${quantity}x ${item.name} for ${buyPriceText}`);

		// Keep modal open for buying more items
	}
}
