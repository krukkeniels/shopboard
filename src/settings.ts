import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
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
		roundForPlayers: false
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
				}));

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
}
