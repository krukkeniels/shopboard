import { App, Modal, Setting, TFile, Notice } from 'obsidian';
import { ShopGenerator } from '../utils/shopGenerator';
import { ShopboardSettings } from '../settings';
import {
	ShopSize,
	ShopSizePreset,
	RarityLevel,
	ShopGenerationParams,
	GeneratedInventory
} from '../types';

/**
 * Modal for building a custom shop with random generation
 */
export class ShopBuilderModal extends Modal {
	private generator: ShopGenerator;
	private settings: ShopboardSettings;
	private onSubmit: (file: TFile) => void;

	// Form state
	private shopName: string = '';
	private shopType: string = '';
	private priceModifier: number = 0;
	private selectedSize: ShopSize;
	private customMinItems: number = 10;
	private customMaxItems: number = 20;
	private budget: number = 0; // 0 = unlimited
	private minRarity: RarityLevel | null = null;
	private maxRarity: RarityLevel | null = null;
	private folderPath: string = '';
	private includeStapleItems: boolean = true;

	// Generation state
	private generatedInventory: GeneratedInventory | null = null;
	private hasGenerated: boolean = false;

	constructor(
		app: App,
		generator: ShopGenerator,
		settings: ShopboardSettings,
		onSubmit: (file: TFile) => void
	) {
		super(app);
		this.generator = generator;
		this.settings = settings;
		this.onSubmit = onSubmit;

		// Default to medium size
		this.selectedSize = generator.getSizePreset('medium');
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('shopboard-builder-modal');

		// Modal title
		contentEl.createEl('h2', { text: 'Build Custom Shop' });
		contentEl.createEl('p', {
			text: 'Create a shop with randomly generated inventory based on your parameters.',
			cls: 'modal-description'
		});

		// Create form sections
		this.createBasicInfoSection(contentEl);
		this.createSizeSection(contentEl);
		this.createBudgetSection(contentEl);
		this.createRaritySection(contentEl);
		this.createPriceModifierSection(contentEl);
		this.createFolderSection(contentEl);
		this.createGenerationSection(contentEl);
		this.createPreviewSection(contentEl);
		this.createButtons(contentEl);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Basic shop information section
	 */
	private createBasicInfoSection(container: HTMLElement) {
		container.createEl('h3', { text: 'Basic Information' });

		// Shop name
		new Setting(container)
			.setName('Shop Name')
			.setDesc('Enter a unique name for your shop')
			.addText(text => {
				text
					.setPlaceholder('e.g., The Wandering Wizard')
					.setValue(this.shopName)
					.onChange(value => {
						this.shopName = value;
					});

				text.inputEl.focus();
				return text;
			});

		// Shop type
		new Setting(container)
			.setName('Shop Type')
			.setDesc('Select the type of shop')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Select a type...');

				// Add shop types from settings
				for (const [key, shopType] of Object.entries(this.settings.shopTypes)) {
					dropdown.addOption(key, shopType.label);
				}

				dropdown.onChange(value => {
					this.shopType = value;
				});

				return dropdown;
			});

		// Include staple items
		new Setting(container)
			.setName('Include Staple Items')
			.setDesc('Include items marked as staples for this shop type (always available)')
			.addToggle(toggle => {
				toggle
					.setValue(this.includeStapleItems)
					.onChange(value => {
						this.includeStapleItems = value;
					});

				return toggle;
			});
	}

	/**
	 * Shop size section
	 */
	private createSizeSection(container: HTMLElement) {
		container.createEl('h3', { text: 'Shop Size' });

		const sizePresets = this.generator.getSizePresets();

		new Setting(container)
			.setName('Size Preset')
			.setDesc('Choose the size of your shop (affects number of items)')
			.addDropdown(dropdown => {
				// Add all presets except 'custom'
				sizePresets
					.filter(preset => preset.preset !== 'custom')
					.forEach(preset => {
						dropdown.addOption(preset.preset, preset.label);
					});

				dropdown.addOption('custom', 'Custom');

				dropdown.setValue(this.selectedSize.preset);

				dropdown.onChange(value => {
					this.selectedSize = this.generator.getSizePreset(value as ShopSizePreset);
					this.updateSizeControls();
				});

				return dropdown;
			});

		// Container for custom size controls (initially hidden)
		const customSizeContainer = container.createDiv('custom-size-container');
		customSizeContainer.style.display = 'none';
		customSizeContainer.setAttribute('data-custom-size', 'true');

		new Setting(customSizeContainer)
			.setName('Minimum Items')
			.setDesc('Minimum number of unique items')
			.addText(text => {
				text
					.setPlaceholder('10')
					.setValue(this.customMinItems.toString())
					.onChange(value => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.customMinItems = num;
							this.selectedSize.minItems = num;
						}
					});

				text.inputEl.type = 'number';
				return text;
			});

		new Setting(customSizeContainer)
			.setName('Maximum Items')
			.setDesc('Maximum number of unique items')
			.addText(text => {
				text
					.setPlaceholder('20')
					.setValue(this.customMaxItems.toString())
					.onChange(value => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0) {
							this.customMaxItems = num;
							this.selectedSize.maxItems = num;
						}
					});

				text.inputEl.type = 'number';
				return text;
			});
	}

	/**
	 * Update visibility of custom size controls
	 */
	private updateSizeControls() {
		const customContainer = this.contentEl.querySelector('[data-custom-size="true"]') as HTMLElement;
		if (customContainer) {
			customContainer.style.display =
				this.selectedSize.preset === 'custom' ? 'block' : 'none';
		}
	}

	/**
	 * Budget section
	 */
	private createBudgetSection(container: HTMLElement) {
		container.createEl('h3', { text: 'Inventory Budget' });

		new Setting(container)
			.setName('Budget (Gold Pieces)')
			.setDesc('Maximum total value of inventory (0 = unlimited)')
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
	 * Rarity filter section
	 */
	private createRaritySection(container: HTMLElement) {
		container.createEl('h3', { text: 'Rarity Filters' });

		const rarityLevels = this.generator.getRarityLevels();

		new Setting(container)
			.setName('Minimum Rarity')
			.setDesc('Exclude items below this rarity')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'No minimum');

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
				dropdown.addOption('', 'No maximum');

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
	 * Price modifier section
	 */
	private createPriceModifierSection(container: HTMLElement) {
		container.createEl('h3', { text: 'Pricing' });

		new Setting(container)
			.setName('Price Modifier (%)')
			.setDesc('Percentage markup (+) or discount (-) on all items')
			.addText(text => {
				text
					.setPlaceholder('0')
					.setValue(this.priceModifier.toString())
					.onChange(value => {
						const num = parseInt(value);
						if (!isNaN(num)) {
							this.priceModifier = num;
						}
					});

				text.inputEl.type = 'number';
				return text;
			});
	}

	/**
	 * Folder path section
	 */
	private createFolderSection(container: HTMLElement) {
		new Setting(container)
			.setName('Folder Path')
			.setDesc('Optional: Specify a folder to create the shop in')
			.addText(text => {
				text
					.setPlaceholder('Leave empty for vault root')
					.setValue(this.folderPath)
					.onChange(value => {
						this.folderPath = value;
					});

				return text;
			});
	}

	/**
	 * Generation controls section
	 */
	private createGenerationSection(container: HTMLElement) {
		container.createEl('h3', { text: 'Generate Inventory' });

		const buttonContainer = container.createDiv('generation-buttons');

		const generateButton = buttonContainer.createEl('button', {
			text: this.hasGenerated ? 'Regenerate Inventory' : 'Generate Inventory',
			cls: 'mod-cta'
		});

		generateButton.addEventListener('click', () => {
			this.handleGenerate(generateButton);
		});
	}

	/**
	 * Preview section
	 */
	private createPreviewSection(container: HTMLElement) {
		const previewContainer = container.createDiv('inventory-preview-container');

		const previewTitle = previewContainer.createEl('h3', { text: 'Generated Inventory' });
		previewTitle.addClass('preview-title');

		const previewContent = previewContainer.createDiv('inventory-preview-content');
		previewContent.setAttribute('data-preview', 'true');

		this.updatePreview();
	}

	/**
	 * Action buttons section
	 */
	private createButtons(container: HTMLElement) {
		const buttonContainer = container.createDiv('modal-button-container');

		// Create button
		const createButton = buttonContainer.createEl('button', {
			text: 'Create Shop',
			cls: 'mod-cta'
		});

		createButton.addEventListener('click', async () => {
			await this.handleCreate();
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
	 * Handle inventory generation
	 */
	private handleGenerate(button: HTMLButtonElement) {
		// Validate inputs
		if (!this.shopType) {
			new Notice('Please select a shop type');
			return;
		}

		// Show loading state
		button.disabled = true;
		button.textContent = 'Generating...';

		try {
			// Create generation parameters
			const params: ShopGenerationParams = {
				name: this.shopName || 'Unnamed Shop',
				shopType: this.shopType,
				priceModifier: this.priceModifier,
				size: this.selectedSize,
				budget: this.budget * 100, // Convert gold to copper
				minRarity: this.minRarity,
				maxRarity: this.maxRarity,
				folderPath: this.folderPath,
				includeStapleItems: this.includeStapleItems
			};

			// Generate inventory
			this.generatedInventory = this.generator.generateInventory(params);
			this.hasGenerated = true;

			// Update preview
			this.updatePreview();

			// Update button text
			button.textContent = 'Regenerate Inventory';

			new Notice(`Generated ${this.generatedInventory.itemCount} items`);

		} catch (error) {
			console.error('Error generating inventory:', error);
			new Notice('Failed to generate inventory. See console for details.');
		} finally {
			button.disabled = false;
		}
	}

	/**
	 * Update the inventory preview
	 */
	private updatePreview() {
		const previewElement = this.contentEl.querySelector('[data-preview="true"]');
		if (!previewElement) return;

		if (!this.generatedInventory || this.generatedInventory.items.length === 0) {
			previewElement.innerHTML =
				'<p class="preview-empty">Click "Generate Inventory" to create random items based on your parameters</p>';
			return;
		}

		const totalGold = Math.floor(this.generatedInventory.totalValue / 100);
		const totalSilver = Math.floor((this.generatedInventory.totalValue % 100) / 10);
		const totalCopper = this.generatedInventory.totalValue % 10;

		let html = '<div class="inventory-preview">';

		// Summary
		html += '<div class="preview-summary">';
		html += `<strong>${this.generatedInventory.itemCount} items</strong> `;
		html += `with total base value of `;
		html += `<strong>${totalGold}gp`;
		if (totalSilver > 0) html += ` ${totalSilver}sp`;
		if (totalCopper > 0) html += ` ${totalCopper}cp`;
		html += '</strong>';
		html += '</div>';

		// Item list
		html += '<div class="preview-items">';
		html += '<ul>';

		this.generatedInventory.items.forEach(item => {
			const itemName = item.itemRef.replace(/\[\[|\]\]/g, '');
			html += `<li>`;
			html += `<span class="preview-item-name">${itemName}</span>`;
			html += `<span class="preview-item-quantity"> ×${item.quantity}</span>`;
			html += `</li>`;
		});

		html += '</ul>';
		html += '</div>';

		html += '</div>';

		previewElement.innerHTML = html;
	}

	/**
	 * Handle shop creation
	 */
	private async handleCreate() {
		// Validate inputs
		if (!this.shopName || this.shopName.trim().length === 0) {
			new Notice('Please enter a shop name');
			return;
		}

		if (!this.shopType) {
			new Notice('Please select a shop type');
			return;
		}

		if (!this.hasGenerated || !this.generatedInventory) {
			new Notice('Please generate inventory first');
			return;
		}

		try {
			// Ensure folder exists if specified
			if (this.folderPath && this.folderPath.trim().length > 0) {
				const folderExists = this.app.vault.getAbstractFileByPath(this.folderPath);
				if (!folderExists) {
					await this.app.vault.createFolder(this.folderPath);
				}
			}

			// Create generation parameters
			const params: ShopGenerationParams = {
				name: this.shopName.trim(),
				shopType: this.shopType,
				priceModifier: this.priceModifier,
				size: this.selectedSize,
				budget: this.budget * 100,
				minRarity: this.minRarity,
				maxRarity: this.maxRarity,
				folderPath: this.folderPath.trim(),
				includeStapleItems: this.includeStapleItems
			};

			// Generate file content
			const content = this.generator.createShopContent(params, this.generatedInventory);

			// Sanitize filename
			const sanitizedName = this.shopName.trim().replace(/[\\/:*?"<>|]/g, '-');

			// Build full path
			let fullPath = this.folderPath
				? `${this.folderPath}/${sanitizedName}.md`
				: `${sanitizedName}.md`;

			// Ensure path doesn't exist
			let counter = 1;
			let basePath = fullPath.replace(/\.md$/, '');
			while (this.app.vault.getAbstractFileByPath(fullPath)) {
				fullPath = `${basePath} ${counter}.md`;
				counter++;
			}

			// Create the file
			const file = await this.app.vault.create(fullPath, content);

			// Call success callback
			this.onSubmit(file);

			// Close modal
			this.close();

		} catch (error) {
			console.error('Error creating shop:', error);
			new Notice('Failed to create shop: ' + error.message);
		}
	}
}
