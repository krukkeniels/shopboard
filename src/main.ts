import { Plugin, TFile, WorkspaceLeaf, Menu, Notice } from 'obsidian';
import { ShopboardSettings } from './types';
import { DEFAULT_SETTINGS, ShopboardSettingTab } from './settings';
import { ItemParser } from './parsers/itemParser';
import { ShopParser } from './parsers/shopParser';
import { PriceCalculator } from './utils/priceCalculator';
import { ShopDisplayView, VIEW_TYPE_SHOP_DISPLAY } from './views/shopDisplayView';
import { DMControlView, VIEW_TYPE_DM_CONTROL } from './views/dmControlView';
import { PurchaseHandler } from './handlers/purchaseHandler';
import { TemplateProvider } from './utils/templateProvider';
import { TemplateSelectionModal } from './modals/templateSelectionModal';

/**
 * Main Shopboard plugin class
 */
export default class ShopboardPlugin extends Plugin {
	settings!: ShopboardSettings;
	itemParser!: ItemParser;
	shopParser!: ShopParser;
	priceCalculator!: PriceCalculator;
	purchaseHandler!: PurchaseHandler;
	templateProvider!: TemplateProvider;

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
		this.shopParser = new ShopParser(this.app, this.itemParser);
		this.priceCalculator = new PriceCalculator(this.settings.currency);

		// Initialize handlers (Phase 3)
		this.purchaseHandler = new PurchaseHandler(this.app);

		// Initialize template provider (Phase 4)
		this.templateProvider = new TemplateProvider(this.settings);

		// Perform initial item scan
		try {
			await this.itemParser.scanItemFolders(this.settings.itemFolders);
			const stats = this.itemParser.getCacheStats();
			console.log(`Item cache initialized: ${stats.itemCount} items loaded`);

			if (stats.itemCount === 0) {
				new Notice('Shopboard: No items found. Please configure item folders in settings.');
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

		// Register commands
		this.registerCommands();

		// Register context menu
		this.registerContextMenu();

		// Register ribbon icon (Phase 3)
		this.addRibbonIcon('clipboard-list', 'Shop Control Panel', async (evt: MouseEvent) => {
			await this.activateDMPanel();
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
	}

	/**
	 * Load plugin settings from disk
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Save plugin settings to disk
	 */
	async saveSettings() {
		await this.saveData(this.settings);
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
					await this.itemParser.scanItemFolders(this.settings.itemFolders);
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
			name: 'Create new shop',
			callback: () => {
				this.openTemplateModal();
			}
		});
	}

	/**
	 * Register context menu for shop notes
	 */
	private registerContextMenu(): void {
		this.registerEvent(
			// @ts-ignore - file-menu event exists but may not be in type definitions
			this.app.workspace.on('file-menu', (menu: Menu, file: TFile) => {
				// Only add menu item for shop notes
				const cache = this.app.metadataCache.getFileCache(file);
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

			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.setViewState({
				type: VIEW_TYPE_SHOP_DISPLAY,
				active: true
			});

			const view = leaf.view;
			if (view instanceof ShopDisplayView) {
				await view.setShop(file);
			}
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
}
