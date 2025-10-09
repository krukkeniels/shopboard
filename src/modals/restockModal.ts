import { App, Modal, Setting, Notice } from 'obsidian';
import { ShopRestocker } from '../utils/shopRestocker';
import { ShopGenerator } from '../utils/shopGenerator';
import {
	ShopData,
	RestockParams,
	RestockIntensity,
	RarityLevel,
	RestockResult
} from '../types';

/**
 * Modal for restocking a shop
 * Allows configuration of restock parameters and previews changes
 */
export class RestockModal extends Modal {
	private shopData: ShopData;
	private restocker: ShopRestocker;
	private generator: ShopGenerator;
	private onSubmit: (result: RestockResult) => void;

	// Form state
	private intensity: RestockIntensity = 'medium';
	private minRarity: RarityLevel | null = null;
	private maxRarity: RarityLevel | null = null;
	private budget: number = 0; // 0 = unlimited

	constructor(
		app: App,
		shopData: ShopData,
		restocker: ShopRestocker,
		generator: ShopGenerator,
		onSubmit: (result: RestockResult) => void
	) {
		super(app);
		this.shopData = shopData;
		this.restocker = restocker;
		this.generator = generator;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('shopboard-restock-modal');

		// Modal title
		contentEl.createEl('h2', { text: 'Restock Shop' });
		contentEl.createEl('p', {
			text: 'Simulate time passing: some items sold, new stock arrives.',
			cls: 'modal-description'
		});

		// Current inventory stats
		this.createInventoryStats(contentEl);

		// Intensity section
		this.createIntensitySection(contentEl);

		// Rarity filters section
		this.createRaritySection(contentEl);

		// Budget section
		this.createBudgetSection(contentEl);

		// Action buttons
		this.createButtons(contentEl);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Display current inventory statistics
	 */
	private createInventoryStats(container: HTMLElement) {
		const statsContainer = container.createDiv('inventory-stats');

		statsContainer.createEl('h3', { text: 'Current Inventory' });

		const statsGrid = statsContainer.createDiv('stats-grid');

		// Total items
		statsGrid.createDiv({
			cls: 'stat-item',
			text: `${this.shopData.inventory.length} items`
		});

		// Total quantity
		const totalQuantity = this.shopData.inventory.reduce(
			(sum, item) => sum + item.quantity,
			0
		);
		statsGrid.createDiv({
			cls: 'stat-item',
			text: `${totalQuantity} total units`
		});

		// Average quantity
		const avgQuantity = Math.round(totalQuantity / this.shopData.inventory.length);
		statsGrid.createDiv({
			cls: 'stat-item',
			text: `~${avgQuantity} avg per item`
		});
	}

	/**
	 * Intensity selection section
	 */
	private createIntensitySection(container: HTMLElement) {
		container.createEl('h3', { text: 'Restock Intensity' });

		const intensityDesc = container.createDiv('intensity-description');
		intensityDesc.innerHTML = `
			<p><strong>Light:</strong> 20-30% turnover (minimal changes)</p>
			<p><strong>Medium:</strong> 40-50% turnover (moderate changes)</p>
			<p><strong>Heavy:</strong> 60-80% turnover (significant changes)</p>
		`;

		new Setting(container)
			.setName('Intensity Level')
			.setDesc('How much the shop inventory changes')
			.addDropdown(dropdown => {
				dropdown.addOption('light', 'Light (20-30% turnover)');
				dropdown.addOption('medium', 'Medium (40-50% turnover)');
				dropdown.addOption('heavy', 'Heavy (60-80% turnover)');

				dropdown.setValue(this.intensity);

				dropdown.onChange(value => {
					this.intensity = value as RestockIntensity;
				});

				return dropdown;
			});
	}

	/**
	 * Rarity filter section
	 */
	private createRaritySection(container: HTMLElement) {
		container.createEl('h3', { text: 'New Item Filters' });
		container.createEl('p', {
			text: 'Optional: Restrict rarity of new items (leave empty to auto-detect from shop)',
			cls: 'section-description'
		});

		const rarityLevels = this.generator.getRarityLevels();

		new Setting(container)
			.setName('Minimum Rarity')
			.setDesc('Exclude items below this rarity')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Auto-detect from shop');

				rarityLevels.forEach(rarity => {
					dropdown.addOption(rarity, rarity.charAt(0).toUpperCase() + rarity.slice(1));
				});

				dropdown.onChange(value => {
					this.minRarity = value ? (value as RarityLevel) : null;
				});

				return dropdown;
			});

		new Setting(container)
			.setName('Maximum Rarity')
			.setDesc('Exclude items above this rarity')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Auto-detect from shop');

				rarityLevels.forEach(rarity => {
					dropdown.addOption(rarity, rarity.charAt(0).toUpperCase() + rarity.slice(1));
				});

				dropdown.onChange(value => {
					this.maxRarity = value ? (value as RarityLevel) : null;
				});

				return dropdown;
			});
	}

	/**
	 * Budget section
	 */
	private createBudgetSection(container: HTMLElement) {
		container.createEl('h3', { text: 'Budget for New Items' });

		new Setting(container)
			.setName('Budget (Gold Pieces)')
			.setDesc('Maximum value for new items (0 = unlimited)')
			.addText(text => {
				text
					.setPlaceholder('0')
					.setValue(this.budget.toString())
					.onChange(value => {
						const num = parseInt(value);
						if (!isNaN(num) && num >= 0) {
							this.budget = num;
						}
					});

				text.inputEl.type = 'number';
				return text;
			});
	}

	/**
	 * Action buttons section
	 */
	private createButtons(container: HTMLElement) {
		const buttonContainer = container.createDiv('modal-button-container');

		// Restock button
		const restockButton = buttonContainer.createEl('button', {
			text: 'Apply Restock',
			cls: 'mod-cta'
		});

		restockButton.addEventListener('click', async () => {
			await this.handleRestock(restockButton);
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
	 * Handle restock operation
	 */
	private async handleRestock(button: HTMLButtonElement) {
		// Disable button during processing
		button.disabled = true;
		button.textContent = 'Restocking...';

		try {
			// Create restock parameters
			const params: RestockParams = {
				intensity: this.intensity,
				minRarity: this.minRarity,
				maxRarity: this.maxRarity,
				budget: this.budget * 100 // Convert gold to copper
			};

			// Perform restock
			const result = this.restocker.restockInventory(this.shopData, params);

			// Show summary
			new Notice(
				`Restock complete: ${result.addedCount} added, ${result.removedCount} removed, ${result.reducedCount} reduced`
			);

			// Call success callback
			this.onSubmit(result);

			// Close modal
			this.close();

		} catch (error) {
			console.error('Error restocking shop:', error);
			new Notice('Failed to restock shop. See console for details.');

			// Re-enable button on error
			button.disabled = false;
			button.textContent = 'Apply Restock';
		}
	}
}
