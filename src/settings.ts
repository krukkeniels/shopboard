import { App, PluginSettingTab, Setting, Notice, Modal } from 'obsidian';
import type ShopboardPlugin from './main';
import { ShopboardSettings, ImageStyle } from './types';

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: ShopboardSettings = {
	itemFolders: ['Items'],
	equipmentFolders: ['Equipment'],
	currency: {
		system: 'dnd',
		denominations: [
			{ name: 'gp', label: 'Gold', value: 1 },
			{ name: 'sp', label: 'Silver', value: 0.1 },
			{ name: 'cp', label: 'Copper', value: 0.01 }
		],
		display: 'auto',
		roundForPlayers: false,
		baseCurrency: 'cp',
		displayCurrency: 'gp'
	},
	shopTypes: {
		magic_shop: {
			label: 'Magic Shop',
			theme: 'mystical'
		},
		blacksmith: {
			label: 'Blacksmith',
			theme: 'forge'
		},
		general_store: {
			label: 'General Store',
			theme: 'rustic'
		},
		alchemist: {
			label: 'Alchemist',
			theme: 'potion'
		}
	},
	themeOverride: true,
	autoRefresh: true,
	openaiApiKey: '',
	imageStyle: 'digital-art',
	attachmentFolder: '_attachments',
	version: '1.0.0'
};

/**
 * Settings tab for Shopboard plugin
 */
export class ShopboardSettingTab extends PluginSettingTab {
	plugin: ShopboardPlugin;

	constructor(app: App, plugin: ShopboardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Shopboard Settings' });

		// Item Folders Setting
		new Setting(containerEl)
			.setName('Item Folders')
			.setDesc('Folders to scan for item notes (comma-separated)')
			.addText(text => text
				.setPlaceholder('Items, Weapons, Potions')
				.setValue(this.plugin.settings.itemFolders.join(', '))
				.onChange(async (value) => {
					const folders = value
						.split(',')
						.map(f => f.trim())
						.filter(f => f.length > 0);

					// Validation: Ensure at least one folder is specified
					if (folders.length === 0) {
						this.plugin.settings.itemFolders = ['Items'];
						await this.plugin.saveSettings();
						text.setValue('Items');
						return;
					}

					this.plugin.settings.itemFolders = folders;
					await this.plugin.saveSettings();

					// Trigger item cache refresh with both item and equipment folders
					const allFolders = [...this.plugin.settings.itemFolders, ...this.plugin.settings.equipmentFolders];
					await this.plugin.itemParser.scanItemFolders(allFolders);
				}));

		// Equipment Folders Setting
		new Setting(containerEl)
			.setName('Equipment Folders')
			.setDesc('Folders to scan for equipment notes (comma-separated)')
			.addText(text => text
				.setPlaceholder('Equipment, Weapons, Armor')
				.setValue(this.plugin.settings.equipmentFolders.join(', '))
				.onChange(async (value) => {
					const folders = value
						.split(',')
						.map(f => f.trim())
						.filter(f => f.length > 0);

					// Validation: Ensure at least one folder is specified
					if (folders.length === 0) {
						this.plugin.settings.equipmentFolders = ['Equipment'];
						await this.plugin.saveSettings();
						text.setValue('Equipment');
						return;
					}

					this.plugin.settings.equipmentFolders = folders;
					await this.plugin.saveSettings();

					// Trigger item cache refresh with both folders
					const allFolders = [...this.plugin.settings.itemFolders, ...this.plugin.settings.equipmentFolders];
					await this.plugin.itemParser.scanItemFolders(allFolders);
				}));

		// Currency System Setting
		new Setting(containerEl)
			.setName('Currency System')
			.setDesc('Choose currency system (D&D or custom)')
			.addDropdown(dropdown => dropdown
				.addOption('dnd', 'D&D (Gold/Silver/Copper)')
				.addOption('custom', 'Custom')
				.setValue(this.plugin.settings.currency.system)
				.onChange(async (value) => {
					this.plugin.settings.currency.system = value as 'dnd' | 'custom';
					await this.plugin.saveSettings();
					// Refresh display to show/hide denomination editor
					this.display();
				}));

		// Custom Denomination Editor (only shown when system is 'custom')
		if (this.plugin.settings.currency.system === 'custom') {
			containerEl.createEl('h4', { text: 'Custom Denominations' });
			containerEl.createEl('p', {
				text: 'Configure your custom currency denominations. Value is the multiplier relative to your base unit.',
				cls: 'setting-item-description'
			});

			// Display current denominations
			for (let i = 0; i < this.plugin.settings.currency.denominations.length; i++) {
				const denom = this.plugin.settings.currency.denominations[i];
				const denomSetting = new Setting(containerEl)
					.setName(`${denom.label} (${denom.name})`)
					.setDesc(`Value: ${denom.value}`);

				// Edit button
				denomSetting.addButton(button => button
					.setButtonText('Edit')
					.onClick(() => {
						this.openDenominationEditModal(i);
					}));

				// Delete button
				denomSetting.addButton(button => button
					.setButtonText('Delete')
					.setWarning()
					.onClick(async () => {
						// Prevent deleting if it's the last denomination
						if (this.plugin.settings.currency.denominations.length === 1) {
							new Notice('Cannot delete the last denomination');
							return;
						}

						// Warn if base or display currency uses this denomination
						if (this.plugin.settings.currency.baseCurrency === denom.name ||
							this.plugin.settings.currency.displayCurrency === denom.name) {
							new Notice('Cannot delete denomination currently used as base or display currency');
							return;
						}

						// Remove denomination
						this.plugin.settings.currency.denominations.splice(i, 1);
						await this.plugin.saveSettings();
						this.display(); // Refresh display
						new Notice(`Deleted denomination: ${denom.label}`);
					}));
			}

			// Add Denomination button
			new Setting(containerEl)
				.addButton(button => button
					.setButtonText('Add Denomination')
					.setCta()
					.onClick(() => {
						this.openDenominationAddModal();
					}));
		}

		// Currency Display Mode Setting
		new Setting(containerEl)
			.setName('Currency Display Mode')
			.setDesc('Auto: Convert to multiple denominations (1gp 5sp 6cp). Simple: Single denomination (156cp)')
			.addDropdown(dropdown => dropdown
				.addOption('auto', 'Auto (Multiple Denominations)')
				.addOption('simple', 'Simple (Single Denomination)')
				.setValue(this.plugin.settings.currency.display)
				.onChange(async (value) => {
					this.plugin.settings.currency.display = value as 'auto' | 'simple';
					await this.plugin.saveSettings();
				}));

		// Round Prices for Players Setting
		new Setting(containerEl)
			.setName('Round Prices for Players')
			.setDesc('When gold price is >= 1, round up to nearest integer (e.g., 1.56 gp → 2 gp). Prices below 1 gp remain unchanged.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.currency.roundForPlayers ?? false)
				.onChange(async (value) => {
					this.plugin.settings.currency.roundForPlayers = value;
					await this.plugin.saveSettings();
				}));

		// Base Currency Setting
		new Setting(containerEl)
			.setName('Base Currency for Storage')
			.setDesc('Currency denomination that item base_price values are stored in')
			.addDropdown(dropdown => {
				// Populate dropdown with current denominations
				for (const denom of this.plugin.settings.currency.denominations) {
					dropdown.addOption(denom.name, `${denom.label} (${denom.name})`);
				}
				return dropdown
					.setValue(this.plugin.settings.currency.baseCurrency)
					.onChange(async (value) => {
						this.plugin.settings.currency.baseCurrency = value;
						await this.plugin.saveSettings();
					});
			});

		// Display Currency Setting
		new Setting(containerEl)
			.setName('Display Currency for Players')
			.setDesc('Currency denomination to display prices in (player window, DM control, add item modal)')
			.addDropdown(dropdown => {
				// Populate dropdown with current denominations
				for (const denom of this.plugin.settings.currency.denominations) {
					dropdown.addOption(denom.name, `${denom.label} (${denom.name})`);
				}
				return dropdown
					.setValue(this.plugin.settings.currency.displayCurrency)
					.onChange(async (value) => {
						this.plugin.settings.currency.displayCurrency = value;
						await this.plugin.saveSettings();
					});
			});

		// Theme Override Setting
		new Setting(containerEl)
			.setName('Fantasy Theme Override')
			.setDesc('Use fantasy-themed styling instead of adapting to vault theme')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.themeOverride)
				.onChange(async (value) => {
					this.plugin.settings.themeOverride = value;
					await this.plugin.saveSettings();
				}));

		// Auto-Refresh Setting
		new Setting(containerEl)
			.setName('Auto-Refresh')
			.setDesc('Automatically refresh shop display when shop note is saved')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRefresh)
				.onChange(async (value) => {
					this.plugin.settings.autoRefresh = value;
					await this.plugin.saveSettings();
				}));

		// OpenAI API Key Setting
		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('API key for generating item images with DALL-E. Get your key at https://platform.openai.com/api-keys')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.openaiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openaiApiKey = value.trim();
					await this.plugin.saveSettings();
				})
				.inputEl.setAttribute('type', 'password'));

		// Image Style Setting
		new Setting(containerEl)
			.setName('Image Generation Style')
			.setDesc('Art style for AI-generated item images')
			.addDropdown(dropdown => dropdown
				.addOption('realistic', 'Realistic Photo')
				.addOption('fantasy-painting', 'Fantasy Painting')
				.addOption('digital-art', 'Digital Illustration')
				.addOption('isometric', 'Isometric Game Asset')
				.addOption('sketch', 'Hand-Drawn Sketch')
				.setValue(this.plugin.settings.imageStyle)
				.onChange(async (value) => {
					this.plugin.settings.imageStyle = value as ImageStyle;
					await this.plugin.saveSettings();
				}));

		// Attachment Folder Setting
		new Setting(containerEl)
			.setName('Attachment Folder')
			.setDesc('Folder name for AI-generated images (relative to item file location)')
			.addText(text => text
				.setPlaceholder('_attachments')
				.setValue(this.plugin.settings.attachmentFolder)
				.onChange(async (value) => {
					const folderName = value.trim() || '_attachments';
					this.plugin.settings.attachmentFolder = folderName;
					await this.plugin.saveSettings();

					// Update the image generator with new folder
					this.plugin.imageGenerator.updateAttachmentFolder(folderName);
				}));

		// Shop Types Section
		containerEl.createEl('h3', { text: 'Shop Types' });
		containerEl.createEl('p', {
			text: 'Configure shop types and their themes. Changes require plugin reload.',
			cls: 'setting-item-description'
		});

		// Display existing shop types
		for (const [key, shopType] of Object.entries(this.plugin.settings.shopTypes)) {
			new Setting(containerEl)
				.setName(shopType.label)
				.setDesc(`Type: ${key} | Theme: ${shopType.theme}`)
				.addExtraButton(button => button
					.setIcon('trash')
					.setTooltip('Remove shop type')
					.onClick(async () => {
						delete this.plugin.settings.shopTypes[key];
						await this.plugin.saveSettings();
						this.display(); // Refresh display
					}));
		}
	}

	/**
	 * Open modal to edit an existing denomination
	 */
	private openDenominationEditModal(index: number): void {
		const denom = this.plugin.settings.currency.denominations[index];

		const modal = new DenominationEditModal(
			this.app,
			denom,
			async (name: string, label: string, value: number) => {
				// Update denomination
				this.plugin.settings.currency.denominations[index] = { name, label, value };

				// Update base/display currency if the name changed
				if (this.plugin.settings.currency.baseCurrency === denom.name) {
					this.plugin.settings.currency.baseCurrency = name;
				}
				if (this.plugin.settings.currency.displayCurrency === denom.name) {
					this.plugin.settings.currency.displayCurrency = name;
				}

				await this.plugin.saveSettings();
				this.display(); // Refresh display
				new Notice(`Updated denomination: ${label}`);
			}
		);
		modal.open();
	}

	/**
	 * Open modal to add a new denomination
	 */
	private openDenominationAddModal(): void {
		const modal = new DenominationEditModal(
			this.app,
			{ name: '', label: '', value: 1 },
			async (name: string, label: string, value: number) => {
				// Check if name already exists
				const exists = this.plugin.settings.currency.denominations.some(d => d.name === name);
				if (exists) {
					new Notice(`Denomination with name "${name}" already exists`);
					return;
				}

				// Add new denomination
				this.plugin.settings.currency.denominations.push({ name, label, value });
				await this.plugin.saveSettings();
				this.display(); // Refresh display
				new Notice(`Added denomination: ${label}`);
			}
		);
		modal.open();
	}
}

/**
 * Modal for editing/adding currency denominations
 */
class DenominationEditModal extends Modal {
	private denom: { name: string; label: string; value: number };
	private onSubmit: (name: string, label: string, value: number) => void;

	constructor(
		app: App,
		denom: { name: string; label: string; value: number },
		onSubmit: (name: string, label: string, value: number) => void
	) {
		super(app);
		this.denom = denom;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: this.denom.name ? 'Edit Denomination' : 'Add Denomination' });

		// Name input
		const nameSetting = new Setting(contentEl)
			.setName('Name')
			.setDesc('Short code (e.g., "gp", "sp", "cp", "cr")');

		const nameInput = nameSetting.controlEl.createEl('input', {
			type: 'text',
			value: this.denom.name,
			attr: { placeholder: 'e.g., gp' }
		});

		// Label input
		const labelSetting = new Setting(contentEl)
			.setName('Label')
			.setDesc('Display name (e.g., "Gold", "Silver", "Copper")');

		const labelInput = labelSetting.controlEl.createEl('input', {
			type: 'text',
			value: this.denom.label,
			attr: { placeholder: 'e.g., Gold' }
		});

		// Value input
		const valueSetting = new Setting(contentEl)
			.setName('Value')
			.setDesc('Multiplier relative to your base unit (e.g., if copper is base: copper=1, silver=10, gold=100)');

		const valueInput = valueSetting.controlEl.createEl('input', {
			type: 'number',
			value: this.denom.value.toString(),
			attr: { placeholder: 'e.g., 100', step: 'any', min: '0' }
		});

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		// Submit button
		const submitButton = buttonContainer.createEl('button', {
			text: this.denom.name ? 'Update' : 'Add',
			cls: 'mod-cta'
		});

		submitButton.addEventListener('click', () => {
			const name = nameInput.value.trim();
			const label = labelInput.value.trim();
			const value = parseFloat(valueInput.value);

			// Validation
			if (!name) {
				new Notice('Name is required');
				return;
			}
			if (!label) {
				new Notice('Label is required');
				return;
			}
			if (isNaN(value) || value <= 0) {
				new Notice('Value must be a positive number');
				return;
			}

			this.onSubmit(name, label, value);
			this.close();
		});

		// Cancel button
		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});

		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
