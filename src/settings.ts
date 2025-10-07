import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type ShopboardPlugin from './main';
import { ShopboardSettings } from './types';

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: ShopboardSettings = {
	itemFolders: ['Items'],
	currency: {
		system: 'dnd',
		denominations: [
			{ name: 'gp', label: 'Gold', value: 1 },
			{ name: 'sp', label: 'Silver', value: 0.1 },
			{ name: 'cp', label: 'Copper', value: 0.01 }
		],
		display: 'auto'
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

					// Trigger item cache refresh
					await this.plugin.itemParser.scanItemFolders(folders);
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
