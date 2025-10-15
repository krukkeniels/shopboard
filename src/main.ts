import { Plugin, TFile, WorkspaceLeaf, Menu, Notice } from 'obsidian';
import { ShopboardSettings, GeneratedLoot } from './types';
import { DEFAULT_SETTINGS, ShopboardSettingTab } from './settings';
import { ItemParser } from './parsers/itemParser';
import { ShopParser } from './parsers/shopParser';
import { PriceCalculator } from './utils/priceCalculator';
import { ShopDisplayView, VIEW_TYPE_SHOP_DISPLAY } from './views/shopDisplayView';
import { DMControlView, VIEW_TYPE_DM_CONTROL } from './views/dmControlView';
import { LootDisplayView, VIEW_TYPE_LOOT_DISPLAY } from './views/lootDisplayView';
import { PurchaseHandler } from './handlers/purchaseHandler';
import { ShopModifier } from './handlers/shopModifier';
import { TemplateProvider } from './utils/templateProvider';
import { ShopGenerator } from './utils/shopGenerator';
import { ShopRestocker } from './utils/shopRestocker';
import { ImageGenerator } from './utils/imageGenerator';
import { LootGenerator } from './utils/lootGenerator';
import { TemplateSelectionModal } from './modals/templateSelectionModal';
import { ShopBuilderModal } from './modals/shopBuilderModal';
import { LootGeneratorModal } from './modals/lootGeneratorModal';

/**
 * Main Shopboard plugin class
 */
export default class ShopboardPlugin extends Plugin {
	settings!: ShopboardSettings;
	itemParser!: ItemParser;
	shopParser!: ShopParser;
	priceCalculator!: PriceCalculator;
	purchaseHandler!: PurchaseHandler;
	shopModifier!: ShopModifier;
	templateProvider!: TemplateProvider;
	shopGenerator!: ShopGenerator;
	shopRestocker!: ShopRestocker;
	imageGenerator!: ImageGenerator;
	lootGenerator!: LootGenerator;

	/**
	 * Plugin initialization
	 */
	async onload() {
		console.log('Loading Shopboard plugin');

		// Load settings
		await this.loadSettings();

		// Register settings tab
		this.addSettingTab(new ShopboardSettingTab(this.app, this));

		// Initialize parsers (Phase 1)
		this.itemParser = new ItemParser(this.app);
		this.shopParser = new ShopParser(this.app, this.itemParser, this.settings);
		this.priceCalculator = new PriceCalculator(this.settings.currency);

		// Initialize handlers (Phase 3)
		this.purchaseHandler = new PurchaseHandler(this.app);
		this.shopModifier = new ShopModifier(this.app);

		// Initialize template provider (Phase 4)
		this.templateProvider = new TemplateProvider(this.settings);

		// Initialize shop generator
		this.shopGenerator = new ShopGenerator(this.itemParser, this.settings);

		// Initialize shop restocker
		this.shopRestocker = new ShopRestocker(this.itemParser, this.shopGenerator);

		// Initialize image generator
		this.imageGenerator = new ImageGenerator(this.app, this.settings.openaiApiKey, this.settings.imageStyle, this.settings.attachmentFolder);

		// Initialize loot generator
		this.lootGenerator = new LootGenerator(this.itemParser);

		// Perform initial item scan
		try {
			// Scan both item and equipment folders
			const allFolders = [...this.settings.itemFolders, ...this.settings.equipmentFolders];
			await this.itemParser.scanItemFolders(allFolders);
			const stats = this.itemParser.getCacheStats();
			console.log(`Item cache initialized: ${stats.itemCount} items loaded`);

			if (stats.itemCount === 0) {
				new Notice('Shopboard: No items found. Please configure item/equipment folders in settings.');
			}
		} catch (error) {
			console.error('Error during initial item scan:', error);
			new Notice('Shopboard: Failed to load items. Check console for details.');
		}

		// Register views (Phase 2 & 3)
		this.registerView(
			VIEW_TYPE_SHOP_DISPLAY,
			(leaf) => new ShopDisplayView(leaf, this)
		);

		this.registerView(
			VIEW_TYPE_DM_CONTROL,
			(leaf) => new DMControlView(leaf, this)
		);

		this.registerView(
			VIEW_TYPE_LOOT_DISPLAY,
			(leaf) => new LootDisplayView(leaf, this)
		);

		// Register commands
		this.registerCommands();

		// Register context menu
		this.registerContextMenu();

		// Register item file modification listener
		this.registerItemModificationListener();

		// Register ribbon icon with menu (Phase 3)
		this.addRibbonIcon('clipboard-list', 'Shopboard Menu', (evt: MouseEvent) => {
			this.showRibbonMenu(evt);
		});

		console.log('Shopboard plugin loaded successfully');
	}

	/**
	 * Plugin cleanup
	 */
	async onunload() {
		console.log('Unloading Shopboard plugin');

		// Detach all views
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_SHOP_DISPLAY);
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_DM_CONTROL);
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_LOOT_DISPLAY);
	}

	/**
	 * Load plugin settings from disk
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Migration: Ensure equipmentFolders exists for older versions
		if (!this.settings.equipmentFolders || this.settings.equipmentFolders.length === 0) {
			this.settings.equipmentFolders = ['Equipment'];
		}

		// Migration: Ensure currency baseCurrency and displayCurrency exist
		if (!this.settings.currency.baseCurrency) {
			this.settings.currency.baseCurrency = 'cp';
		}
		if (!this.settings.currency.displayCurrency) {
			this.settings.currency.displayCurrency = 'gp';
		}

		// Migration: Ensure default columns and rows exist
		if (this.settings.defaultColumns === undefined) {
			this.settings.defaultColumns = 4;
		}
		if (this.settings.defaultRows === undefined) {
			this.settings.defaultRows = 5;
		}

		// Migration: Ensure shop types have item type filtering fields
		for (const [key, shopType] of Object.entries(this.settings.shopTypes)) {
			if (!shopType.allowedItemTypes) {
				// Default to allowing all item types for existing shops
				shopType.allowedItemTypes = ['*'];
			}
			if (!shopType.allowedEquipmentTypes) {
				// Default to allowing all equipment types for existing shops
				shopType.allowedEquipmentTypes = ['*'];
			}
			if (shopType.allowVariety === undefined) {
				// Default to allowing variety
				shopType.allowVariety = true;
			}
		}
	}

	/**
	 * Save plugin settings to disk
	 */
	async saveSettings() {
		await this.saveData(this.settings);

		// Update image generator with new settings
		if (this.imageGenerator) {
			this.imageGenerator.updateApiKey(this.settings.openaiApiKey);
			this.imageGenerator.updateImageStyle(this.settings.imageStyle);
			this.imageGenerator.updateAttachmentFolder(this.settings.attachmentFolder);
		}
	}

	/**
	 * Register plugin commands
	 */
	private registerCommands(): void {
		// Command: Display shop in new pane
		this.addCommand({
			id: 'display-shop',
			name: 'Display shop in new pane',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) return false;

				// Check if file has shop frontmatter
				const cache = this.app.metadataCache.getFileCache(activeFile);
				const isShop = cache?.frontmatter?.type === 'shop';

				if (checking) {
					return isShop;
				}

				if (isShop) {
					this.displayShop(activeFile);
				}

				return isShop;
			}
		});

		// Command: Refresh item cache
		this.addCommand({
			id: 'refresh-items',
			name: 'Refresh item cache',
			callback: async () => {
				try {
					// Scan both item and equipment folders
					const allFolders = [...this.settings.itemFolders, ...this.settings.equipmentFolders];
					await this.itemParser.scanItemFolders(allFolders);
					const stats = this.itemParser.getCacheStats();
					console.log(`Item cache refreshed: ${stats.itemCount} items loaded`);
					new Notice(`Item cache refreshed: ${stats.itemCount} items found`);
				} catch (error) {
					console.error('Error refreshing item cache:', error);
					new Notice('Failed to refresh item cache. Check console for details.');
				}
			}
		});

		// Command: Open DM Control Panel (Phase 3)
		this.addCommand({
			id: 'open-dm-panel',
			name: 'Open DM Control Panel',
			callback: async () => {
				await this.activateDMPanel();
			}
		});

		// Command: Create new shop (Phase 4)
		this.addCommand({
			id: 'create-shop',
			name: 'Create new shop from template',
			callback: () => {
				this.openTemplateModal();
			}
		});

		// Command: Build custom shop
		this.addCommand({
			id: 'build-shop',
			name: 'Build custom shop',
			callback: () => {
				this.openShopBuilderModal();
			}
		});

		// Command: Generate loot
		this.addCommand({
			id: 'generate-loot',
			name: 'Generate loot',
			callback: () => {
				this.openLootGeneratorModal();
			}
		});
	}

	/**
	 * Register context menu for shop and item notes
	 */
	private registerContextMenu(): void {
		this.registerEvent(
			// @ts-ignore - file-menu event exists but may not be in type definitions
			this.app.workspace.on('file-menu', (menu: Menu, file: TFile) => {
				const cache = this.app.metadataCache.getFileCache(file);

				// Add menu item for shop notes
				if (cache?.frontmatter?.type === 'shop') {
					menu.addItem((item) => {
						item
							.setTitle('Display in Shop Window')
							.setIcon('shopping-bag')
							.onClick(() => {
								this.displayShop(file);
							});
					});
				}

				// Add menu item for item notes
				if (cache?.frontmatter?.type === 'item') {
					menu.addItem((item) => {
						item
							.setTitle('Generate Image with AI')
							.setIcon('image-plus')
							.onClick(async () => {
								await this.generateItemImage(file);
							});
					});
				}
			})
		);
	}

	/**
	 * Register listener for item file modifications
	 * When an item is modified, refresh its cache and notify open shop views
	 * Uses metadataCache 'changed' event to ensure cache is updated before refreshing
	 */
	private registerItemModificationListener(): void {
		this.registerEvent(
			this.app.metadataCache.on('changed', async (file, data, cache) => {
				// Check if this is an item file (cache is already updated at this point)
				// Accept both 'item' and 'equipment' types
				if (!cache.frontmatter || (cache.frontmatter.type !== 'item' && cache.frontmatter.type !== 'equipment')) {
					return;
				}

				// Refresh the item in the cache (will now read updated metadata)
				await this.itemParser.refreshItem(file);

				// Notify shop views that an item was modified
				this.app.workspace.trigger('shopboard:item-modified', file.path);
			})
		);
	}

	/**
	 * Display a shop in a new pane
	 */
	async displayShop(file: TFile): Promise<void> {
		try {
			// Validate shop file
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter || cache.frontmatter.type !== 'shop') {
				new Notice('This file is not a valid shop note. Please check the frontmatter.');
				return;
			}

			// Check if shop display is already open
			const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_SHOP_DISPLAY);

			let leaf: WorkspaceLeaf;
			if (existing.length > 0) {
				// Reuse existing shop display window
				leaf = existing[0];
				this.app.workspace.revealLeaf(leaf);
			} else {
				// Create new pop-out window for player display
				leaf = this.app.workspace.getLeaf('window');
			}

			await leaf.setViewState({
				type: VIEW_TYPE_SHOP_DISPLAY,
				active: true
			});

			const view = leaf.view;
			if (view instanceof ShopDisplayView) {
				await view.setShop(file);
			}

			// Automatically open DM control panel
			await this.activateDMPanel();
		} catch (error) {
			console.error('Error displaying shop:', error);
			new Notice('Failed to display shop. Check console for details.');
		}
	}

	/**
	 * Activate DM Control Panel (Phase 3)
	 */
	async activateDMPanel(): Promise<void> {
		// Check if DM panel is already open
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DM_CONTROL);

		if (existing.length > 0) {
			// Focus existing panel
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		// Open in right sidebar
		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_DM_CONTROL,
				active: true
			});

			this.app.workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Open template selection modal for shop creation (Phase 4)
	 */
	openTemplateModal(): void {
		const modal = new TemplateSelectionModal(
			this.app,
			this.templateProvider,
			async (file: TFile) => {
				// Success callback
				new Notice(`Shop created: ${file.basename}`);

				// Open the newly created file
				const leaf = this.app.workspace.getLeaf(false);
				await leaf.openFile(file);

				// Optionally, display the shop immediately
				// await this.displayShop(file);
			}
		);
		modal.open();
	}

	/**
	 * Open shop builder modal for custom shop creation
	 */
	openShopBuilderModal(): void {
		const modal = new ShopBuilderModal(
			this.app,
			this.shopGenerator,
			this.settings,
			async (file: TFile) => {
				// Success callback
				new Notice(`Shop created: ${file.basename}`);

				// Open the newly created file
				const leaf = this.app.workspace.getLeaf(false);
				await leaf.openFile(file);

				// Optionally, display the shop immediately
				// await this.displayShop(file);
			}
		);
		modal.open();
	}

	/**
	 * Open loot generator modal for treasure generation
	 */
	openLootGeneratorModal(): void {
		const modal = new LootGeneratorModal(
			this.app,
			this.lootGenerator,
			async (loot: GeneratedLoot) => {
				// Display the generated loot
				await this.displayLoot(loot);
			}
		);
		modal.open();
	}

	/**
	 * Display generated loot in a new window
	 */
	async displayLoot(loot: GeneratedLoot): Promise<void> {
		try {
			// Check if loot display is already open
			const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_LOOT_DISPLAY);

			let leaf: WorkspaceLeaf;
			if (existing.length > 0) {
				// Reuse existing loot display window
				leaf = existing[0];
				this.app.workspace.revealLeaf(leaf);
			} else {
				// Create new pop-out window for loot display
				leaf = this.app.workspace.getLeaf('window');
			}

			await leaf.setViewState({
				type: VIEW_TYPE_LOOT_DISPLAY,
				active: true
			});

			const view = leaf.view;
			if (view instanceof LootDisplayView) {
				view.setLoot(loot);
			}

			new Notice(`Loot displayed! Total value: ${loot.totalValue} gp`);
		} catch (error) {
			console.error('Error displaying loot:', error);
			new Notice('Failed to display loot. Check console for details.');
		}
	}

	/**
	 * Generate an AI image for an item
	 */
	async generateItemImage(file: TFile): Promise<void> {
		try {
			// Check if API key is configured
			if (!this.imageGenerator.isConfigured()) {
				new Notice('OpenAI API key not configured. Please add your API key in Shopboard settings.');
				return;
			}

			// Validate item file
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter || cache.frontmatter.type !== 'item') {
				new Notice('This file is not a valid item note.');
				return;
			}

			// Generate the image
			await this.imageGenerator.generateImageForItem(file);
		} catch (error) {
			console.error('Error generating item image:', error);
			new Notice('Failed to generate item image. Check console for details.');
		}
	}

	/**
	 * Show ribbon menu with shop creation options
	 */
	private showRibbonMenu(evt: MouseEvent): void {
		const menu = new Menu();

		menu.addItem((item) => {
			item
				.setTitle('Open Control Panel')
				.setIcon('clipboard-list')
				.onClick(async () => {
					await this.activateDMPanel();
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item
				.setTitle('Create from Template')
				.setIcon('file-plus')
				.onClick(() => {
					this.openTemplateModal();
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Build Custom Shop')
				.setIcon('wand-2')
				.onClick(() => {
					this.openShopBuilderModal();
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item
				.setTitle('Generate Loot')
				.setIcon('coins')
				.onClick(() => {
					this.openLootGeneratorModal();
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item
				.setTitle('Refresh Item Cache')
				.setIcon('refresh-cw')
				.onClick(async () => {
					try {
						// Scan both item and equipment folders
						const allFolders = [...this.settings.itemFolders, ...this.settings.equipmentFolders];
						await this.itemParser.scanItemFolders(allFolders);
						const stats = this.itemParser.getCacheStats();
						new Notice(`Item cache refreshed: ${stats.itemCount} items found`);
					} catch (error) {
						console.error('Error refreshing item cache:', error);
						new Notice('Failed to refresh item cache');
					}
				});
		});

		menu.showAtMouseEvent(evt);
	}
}
