import { App, Modal, Notice } from 'obsidian';
import { ItemParser } from '../parsers/itemParser';
import { ItemData } from '../types';

/**
 * Modal for searching and adding items to a shop
 */
export class AddItemModal extends Modal {
	private itemParser: ItemParser;
	private selectedItem: ItemData | null = null;
	private quantity: number = 1;
	private priceOverride: number | null = null;
	private searchQuery: string = '';
	private onSubmit: (itemRef: string, quantity: number, priceOverride: number | null) => void;

	private searchInputEl: HTMLInputElement | null = null;
	private tableBodyEl: HTMLElement | null = null;
	private quantityInputEl: HTMLInputElement | null = null;
	private priceInputEl: HTMLInputElement | null = null;
	private selectedItemEl: HTMLElement | null = null;

	constructor(
		app: App,
		itemParser: ItemParser,
		onSubmit: (itemRef: string, quantity: number, priceOverride: number | null) => void
	) {
		super(app);
		this.itemParser = itemParser;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('shopboard-add-item-modal');

		// Modal title
		contentEl.createEl('h2', { text: 'Add Item to Shop' });

		// Search section
		this.createSearchSection(contentEl);

		// Item table section
		this.createItemTable(contentEl);

		// Selected item display
		this.createSelectedItemSection(contentEl);

		// Form inputs
		this.createFormInputs(contentEl);

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

		const searchLabel = searchContainer.createEl('label', {
			text: 'Search Items',
			cls: 'search-label'
		});

		this.searchInputEl = searchContainer.createEl('input', {
			type: 'text',
			cls: 'search-input',
			placeholder: 'Type to search by name, rarity, or description...'
		});

		this.searchInputEl.addEventListener('input', () => {
			this.searchQuery = this.searchInputEl?.value.toLowerCase() || '';
			this.renderItems();
		});

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

		// Table body
		this.tableBodyEl = table.createEl('tbody');
	}

	/**
	 * Create selected item display section
	 */
	private createSelectedItemSection(container: HTMLElement) {
		this.selectedItemEl = container.createDiv('selected-item-container');
		this.updateSelectedItemDisplay();
	}

	/**
	 * Create form input fields
	 */
	private createFormInputs(container: HTMLElement) {
		const formContainer = container.createDiv('form-container');

		// Quantity input
		const quantityGroup = formContainer.createDiv('form-group');
		quantityGroup.createEl('label', { text: 'Quantity' });
		this.quantityInputEl = quantityGroup.createEl('input', {
			type: 'number',
			cls: 'quantity-input',
			value: '1',
			attr: { min: '1' }
		});

		this.quantityInputEl.addEventListener('input', () => {
			const value = parseInt(this.quantityInputEl?.value || '1');
			this.quantity = value > 0 ? value : 1;
		});

		// Price override input
		const priceGroup = formContainer.createDiv('form-group');
		priceGroup.createEl('label', { text: 'Price Override (optional)' });
		const priceInputWrapper = priceGroup.createDiv('price-input-wrapper');
		this.priceInputEl = priceInputWrapper.createEl('input', {
			type: 'number',
			cls: 'price-input',
			placeholder: 'Leave empty for calculated price',
			attr: { min: '0' }
		});

		priceInputWrapper.createSpan({
			text: 'cp',
			cls: 'price-suffix'
		});

		this.priceInputEl.addEventListener('input', () => {
			const value = this.priceInputEl?.value;
			if (value && value.trim() !== '') {
				const numValue = parseInt(value);
				this.priceOverride = numValue >= 0 ? numValue : null;
			} else {
				this.priceOverride = null;
			}
		});
	}

	/**
	 * Create action buttons
	 */
	private createButtons(container: HTMLElement) {
		const buttonContainer = container.createDiv('modal-button-container');

		// Add button
		const addButton = buttonContainer.createEl('button', {
			text: 'Add to Shop',
			cls: 'mod-cta'
		});

		addButton.addEventListener('click', async () => {
			await this.handleAdd();
		});

		// Cancel button
		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});

		cancelButton.addEventListener('click', () => {
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
				attr: { colspan: '3' }
			});
			return;
		}

		// Render items (limit to 100 for performance)
		const itemsToShow = filteredItems.slice(0, 100);

		for (const item of itemsToShow) {
			const row = this.tableBodyEl.createEl('tr', { cls: 'item-row' });

			// Add selected class if this is the selected item
			if (this.selectedItem && this.selectedItem.path === item.path) {
				row.addClass('selected');
			}

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

			// Base price
			const priceText = item.basePrice ? `${item.basePrice} cp` : '-';
			row.createEl('td', { text: priceText, cls: 'price-cell' });

			// Click handler
			row.addEventListener('click', () => {
				this.selectItem(item);
			});
		}

		// Show count if limited
		if (filteredItems.length > 100) {
			const noteRow = this.tableBodyEl.createEl('tr', { cls: 'note-row' });
			noteRow.createEl('td', {
				text: `Showing first 100 of ${filteredItems.length} items. Use search to narrow results.`,
				attr: { colspan: '3' }
			});
		}
	}

	/**
	 * Select an item
	 */
	private selectItem(item: ItemData) {
		this.selectedItem = item;
		this.renderItems(); // Re-render to update selection
		this.updateSelectedItemDisplay();
	}

	/**
	 * Update selected item display
	 */
	private updateSelectedItemDisplay() {
		if (!this.selectedItemEl) return;

		this.selectedItemEl.empty();

		if (!this.selectedItem) {
			this.selectedItemEl.createEl('p', {
				text: 'Select an item from the table above',
				cls: 'no-selection'
			});
			return;
		}

		this.selectedItemEl.createEl('h3', { text: 'Selected Item' });

		const itemCard = this.selectedItemEl.createDiv('selected-item-card');

		itemCard.createEl('div', {
			text: this.selectedItem.name,
			cls: 'selected-item-name'
		});

		if (this.selectedItem.rarity) {
			const rarityBadge = itemCard.createSpan({
				text: this.selectedItem.rarity,
				cls: `rarity-badge rarity-${this.selectedItem.rarity.toLowerCase().replace(/\s+/g, '-')}`
			});
		}

		if (this.selectedItem.description) {
			itemCard.createEl('p', {
				text: this.selectedItem.description,
				cls: 'selected-item-description'
			});
		}

		itemCard.createEl('div', {
			text: `Base Price: ${this.selectedItem.basePrice} cp`,
			cls: 'selected-item-price'
		});
	}

	/**
	 * Handle adding the item
	 */
	private async handleAdd() {
		// Validate selection
		if (!this.selectedItem) {
			new Notice('Please select an item from the table');
			return;
		}

		// Validate quantity
		if (this.quantity < 1) {
			new Notice('Quantity must be at least 1');
			return;
		}

		// Create wikilink reference
		const itemRef = `[[${this.selectedItem.name}]]`;

		// Call the onSubmit callback
		this.onSubmit(itemRef, this.quantity, this.priceOverride);

		// Close the modal
		this.close();
	}
}
