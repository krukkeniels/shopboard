import { ItemView, WorkspaceLeaf } from 'obsidian';
import { GeneratedLoot } from '../types';
import ShopboardPlugin from '../main';

/**
 * View type identifier for loot display
 */
export const VIEW_TYPE_LOOT_DISPLAY = 'shopboard-loot-display';

/**
 * Loot Display View - Player-facing view for generated treasure (coins only)
 * Can be popped out to a second monitor for display during sessions
 */
export class LootDisplayView extends ItemView {
	private plugin: ShopboardPlugin;
	private lootData: GeneratedLoot | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ShopboardPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	/**
	 * Returns the view type identifier
	 */
	getViewType(): string {
		return VIEW_TYPE_LOOT_DISPLAY;
	}

	/**
	 * Returns the display text for the view
	 */
	getDisplayText(): string {
		return 'Loot Display';
	}

	/**
	 * Returns the icon for the view
	 */
	getIcon(): string {
		return 'coins';
	}

	/**
	 * Called when the view is opened
	 */
	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('shopboard-loot-display-container');

		this.render();
	}

	/**
	 * Called when the view is closed
	 */
	async onClose(): Promise<void> {
		this.lootData = null;
	}

	/**
	 * Set the loot to display
	 */
	setLoot(loot: GeneratedLoot): void {
		this.lootData = loot;
		this.render();
	}

	/**
	 * Main render method
	 */
	private render(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		if (!this.lootData) {
			this.renderEmpty(container);
			return;
		}

		// Create loot display
		const displayEl = container.createDiv({ cls: 'loot-display' });

		// Add treasure theme styling
		displayEl.addClass('treasure-theme');

		// Render header
		this.renderHeader(displayEl);

		// Render coins
		this.renderCoins(displayEl);

		// Render all items in a unified section
		this.renderAllItems(displayEl);

		// Render footer with metadata
		this.renderFooter(displayEl);
	}

	/**
	 * Render empty state
	 */
	private renderEmpty(container: HTMLElement): void {
		const emptyEl = container.createDiv({ cls: 'loot-display-empty' });
		emptyEl.createEl('h2', { text: 'No Loot Generated' });
		emptyEl.createEl('p', {
			text: 'Use the Loot Generator to create treasure.'
		});
	}

	/**
	 * Render display header
	 */
	private renderHeader(container: HTMLElement): void {
		const headerEl = container.createDiv({ cls: 'loot-header' });

		headerEl.createEl('h1', { text: '⚜️ Treasure Found ⚜️', cls: 'loot-title' });

		// Container description
		if (this.lootData!.containerDescription) {
			const descEl = headerEl.createDiv({ cls: 'loot-container-description' });
			descEl.textContent = `Found in ${this.lootData!.containerDescription}`;
		}

		// Weight (if included)
		if (this.lootData!.totalWeight > 0) {
			const weightEl = headerEl.createDiv({ cls: 'loot-total-weight' });
			weightEl.innerHTML = `<strong>Total Weight:</strong> ${this.lootData!.totalWeight} lbs`;
		}
	}

	/**
	 * Render coins section (redesigned for visual impact)
	 */
	private renderCoins(container: HTMLElement): void {
		const coins = this.lootData!.coins;

		// Check if there are any coins
		if (!coins.gold || coins.gold === 0) {
			return; // Don't show empty coin section
		}

		const section = container.createDiv({ cls: 'loot-section loot-coins' });
		section.createEl('h2', { text: '💰 Treasure' });

		const coinDisplay = section.createDiv({ cls: 'coin-display' });
		const coinEl = coinDisplay.createDiv({ cls: 'coin-gold' });
		coinEl.createDiv({ text: coins.gold.toString(), cls: 'coin-amount' });
		coinEl.createDiv({ text: 'Gold Pieces', cls: 'coin-label' });
	}

	/**
	 * Render all items in a unified section
	 */
	private renderAllItems(container: HTMLElement): void {
		// Check if there are any items at all
		const hasItems = (this.lootData!.magicItems && this.lootData!.magicItems.length > 0) ||
			(this.lootData!.equipment && this.lootData!.equipment.length > 0) ||
			(this.lootData!.mundaneItems && this.lootData!.mundaneItems.length > 0) ||
			(this.lootData!.gems && this.lootData!.gems.length > 0) ||
			(this.lootData!.artObjects && this.lootData!.artObjects.length > 0) ||
			(this.lootData!.salvage && this.lootData!.salvage.length > 0);

		if (!hasItems) return;

		const section = container.createDiv({ cls: 'loot-section loot-all-items' });
		section.createEl('h2', { text: '✨ Items Found' });

		const itemsContainer = section.createDiv({ cls: 'all-items-container' });

		// Render all item types in order
		this.renderGemsInline(itemsContainer);
		this.renderArtObjectsInline(itemsContainer);
		this.renderMagicItemsInline(itemsContainer);
		this.renderEquipmentInline(itemsContainer);
		this.renderMundaneItemsInline(itemsContainer);
		this.renderSalvageInline(itemsContainer);
	}

	/**
	 * Render gems section
	 */
	private renderGems(container: HTMLElement): void {
		const gems = this.lootData!.gems;
		if (!gems || gems.length === 0) return;

		const section = container.createDiv({ cls: 'loot-section loot-gems' });
		section.createEl('h2', { text: '💎 Gems' });

		const gemList = section.createDiv({ cls: 'gem-list' });

		gems.forEach(gem => {
			const gemEl = gemList.createDiv({ cls: 'gem-item' });
			gemEl.createEl('div', {
				text: gem.description,
				cls: 'gem-description'
			});
			gemEl.createEl('div', {
				text: `${gem.quantity}x`,
				cls: 'gem-quantity'
			});
		});
	}

	/**
	 * Render art objects section
	 */
	private renderArtObjects(container: HTMLElement): void {
		const artObjects = this.lootData!.artObjects;
		if (!artObjects || artObjects.length === 0) return;

		const section = container.createDiv({ cls: 'loot-section loot-art' });
		section.createEl('h2', { text: '🎨 Art Objects' });

		const artList = section.createDiv({ cls: 'art-list' });

		artObjects.forEach(art => {
			const artEl = artList.createDiv({ cls: 'art-item' });
			artEl.createEl('div', {
				text: art.description,
				cls: 'art-description'
			});
		});
	}

	/**
	 * Render magic items section
	 */
	private renderMagicItems(container: HTMLElement): void {
		const magicItems = this.lootData!.magicItems;
		if (!magicItems || magicItems.length === 0) return;

		const section = container.createDiv({ cls: 'loot-section loot-magic-items' });
		section.createEl('h2', { text: '✨ Magic Items' });

		const itemGrid = section.createDiv({ cls: 'magic-item-grid' });

		magicItems.forEach(item => {
			const itemEl = itemGrid.createDiv({ cls: 'magic-item' });

			if (item.itemData) {
				// Show item name
				const nameEl = itemEl.createDiv({ cls: 'magic-item-name' });
				nameEl.textContent = item.identified ? item.itemData.name : 'Unidentified Item';

				// Show rarity
				if (item.itemData.rarity) {
					const rarityEl = itemEl.createDiv({ cls: `magic-item-rarity rarity-${item.itemData.rarity.toLowerCase().replace(' ', '-')}` });
					rarityEl.textContent = item.itemData.rarity;
				}

				// Show description if identified
				if (item.identified && item.itemData.description) {
					const descEl = itemEl.createDiv({ cls: 'magic-item-description' });
					descEl.textContent = item.itemData.description;
				}

				// Show image if available
				if (item.itemData.imageUrl) {
					const imgEl = itemEl.createEl('img', { cls: 'magic-item-image' });

					// Handle both online URLs and local file paths
					if (item.itemData.imageUrl.startsWith('http://') || item.itemData.imageUrl.startsWith('https://')) {
						imgEl.src = item.itemData.imageUrl;
					} else {
						// Local file path - resolve relative to item file
						const resolvedPath = this.resolveImagePath(item.itemData.imageUrl, item.itemData.path);
						const resourcePath = this.plugin.app.vault.adapter.getResourcePath(resolvedPath);
						imgEl.src = resourcePath;
					}

					imgEl.alt = item.itemData.name;

					// Handle image load errors gracefully
					imgEl.onerror = () => {
						imgEl.style.display = 'none';
					};
				}
			} else {
				// Fallback for missing item data
				itemEl.createDiv({
					text: item.itemRef,
					cls: 'magic-item-name'
				});
			}
		});
	}

	/**
	 * Render equipment section
	 */
	private renderEquipment(container: HTMLElement): void {
		const equipment = this.lootData!.equipment;
		if (!equipment || equipment.length === 0) return;

		const section = container.createDiv({ cls: 'loot-section loot-equipment' });
		section.createEl('h2', { text: '⚔️ Equipment' });

		const itemGrid = section.createDiv({ cls: 'equipment-grid' });

		equipment.forEach(item => {
			const itemEl = itemGrid.createDiv({ cls: 'equipment-item' });

			if (item.itemData) {
				// Show item name
				const nameEl = itemEl.createDiv({ cls: 'equipment-item-name' });
				nameEl.textContent = item.itemData.name;

				// Show equipment type if available
				if (item.itemData.metadata?.equipment_type) {
					const typeEl = itemEl.createDiv({ cls: 'equipment-item-type' });
					typeEl.textContent = item.itemData.metadata.equipment_type;
				}

				// Show description
				if (item.itemData.description) {
					const descEl = itemEl.createDiv({ cls: 'equipment-item-description' });
					descEl.textContent = item.itemData.description;
				}

				// Show image if available
				if (item.itemData.imageUrl) {
					const imgEl = itemEl.createEl('img', { cls: 'equipment-item-image' });

					// Handle both online URLs and local file paths
					if (item.itemData.imageUrl.startsWith('http://') || item.itemData.imageUrl.startsWith('https://')) {
						imgEl.src = item.itemData.imageUrl;
					} else {
						// Local file path - resolve relative to item file
						const resolvedPath = this.resolveImagePath(item.itemData.imageUrl, item.itemData.path);
						const resourcePath = this.plugin.app.vault.adapter.getResourcePath(resolvedPath);
						imgEl.src = resourcePath;
					}

					imgEl.alt = item.itemData.name;

					// Handle image load errors gracefully
					imgEl.onerror = () => {
						imgEl.style.display = 'none';
					};
				}
			} else {
				// Fallback for missing item data
				itemEl.createDiv({
					text: item.itemRef,
					cls: 'equipment-item-name'
				});
			}
		});
	}

	/**
	 * Render mundane items section
	 */
	private renderMundaneItems(container: HTMLElement): void {
		const mundaneItems = this.lootData!.mundaneItems;
		if (!mundaneItems || mundaneItems.length === 0) return;

		const section = container.createDiv({ cls: 'loot-section loot-mundane-items' });
		section.createEl('h2', { text: '🎒 Mundane Items' });

		const itemList = section.createDiv({ cls: 'mundane-item-list' });

		mundaneItems.forEach(item => {
			const itemEl = itemList.createDiv({ cls: 'mundane-item' });
			itemEl.createEl('span', {
				text: `${item.quantity}x ${item.name}`,
				cls: 'mundane-item-name'
			});
		});
	}

	/**
	 * Render salvage materials section
	 */
	private renderSalvage(container: HTMLElement): void {
		const salvage = this.lootData!.salvage;
		if (!salvage || salvage.length === 0) return;

		const section = container.createDiv({ cls: 'loot-section loot-salvage' });
		section.createEl('h2', { text: '⚗️ Salvage Materials' });

		const salvageList = section.createDiv({ cls: 'salvage-list' });

		salvage.forEach(material => {
			const materialEl = salvageList.createDiv({ cls: 'salvage-item' });

			materialEl.createEl('div', {
				text: material.name,
				cls: 'salvage-name'
			});

			materialEl.createEl('div', {
				text: material.description,
				cls: 'salvage-description'
			});

			const metaEl = materialEl.createDiv({ cls: 'salvage-meta' });
			metaEl.createEl('span', {
				text: `Harvest DC: ${material.harvestDC}`,
				cls: 'salvage-dc'
			});

			if (material.craftingTags.length > 0) {
				const tagsEl = materialEl.createDiv({ cls: 'salvage-tags' });
				tagsEl.textContent = `Uses: ${material.craftingTags.join(', ')}`;
			}
		});
	}

	/**
	 * Render footer with metadata
	 */
	private renderFooter(container: HTMLElement): void {
		const footerEl = container.createDiv({ cls: 'loot-footer' });

		const metadata = this.lootData!.metadata;

		// CR or XP
		if (metadata.challengeRating !== null) {
			footerEl.createSpan({ text: `CR ${metadata.challengeRating} | ` });
		} else {
			footerEl.createSpan({ text: `${metadata.experiencePoints} XP | ` });
		}

		// Party info
		footerEl.createSpan({ text: `Party of ${metadata.partySize} (Level ${metadata.partyLevel}) | ` });

		// Loot type
		footerEl.createSpan({
			text: metadata.lootType.charAt(0).toUpperCase() + metadata.lootType.slice(1) + ' Treasure'
		});
	}

	/**
	 * Render gems inline (without section header)
	 */
	private renderGemsInline(container: HTMLElement): void {
		const gems = this.lootData!.gems;
		if (!gems || gems.length === 0) return;

		gems.forEach(gem => {
			const gemEl = container.createDiv({ cls: 'gem-item inline-item' });
			gemEl.createEl('div', {
				text: gem.description,
				cls: 'gem-description'
			});
			gemEl.createEl('div', {
				text: `${gem.quantity}x`,
				cls: 'gem-quantity'
			});
		});
	}

	/**
	 * Render art objects inline (without section header)
	 */
	private renderArtObjectsInline(container: HTMLElement): void {
		const artObjects = this.lootData!.artObjects;
		if (!artObjects || artObjects.length === 0) return;

		artObjects.forEach(art => {
			const artEl = container.createDiv({ cls: 'art-item inline-item' });
			artEl.createEl('div', {
				text: art.description,
				cls: 'art-description'
			});
		});
	}

	/**
	 * Render magic items inline (without section header)
	 */
	private renderMagicItemsInline(container: HTMLElement): void {
		const magicItems = this.lootData!.magicItems;
		if (!magicItems || magicItems.length === 0) return;

		magicItems.forEach(item => {
			const itemEl = container.createDiv({ cls: 'magic-item inline-item' });

			if (item.itemData) {
				// Show item name
				const nameEl = itemEl.createDiv({ cls: 'magic-item-name' });
				nameEl.textContent = item.identified ? item.itemData.name : 'Unidentified Item';

				// Show rarity
				if (item.itemData.rarity) {
					const rarityEl = itemEl.createDiv({ cls: `magic-item-rarity rarity-${item.itemData.rarity.toLowerCase().replace(' ', '-')}` });
					rarityEl.textContent = item.itemData.rarity;
				}

				// Show description if identified
				if (item.identified && item.itemData.description) {
					const descEl = itemEl.createDiv({ cls: 'magic-item-description' });
					descEl.textContent = item.itemData.description;
				}

				// Show image if available
				if (item.itemData.imageUrl) {
					const imgEl = itemEl.createEl('img', { cls: 'magic-item-image' });

					// Handle both online URLs and local file paths
					if (item.itemData.imageUrl.startsWith('http://') || item.itemData.imageUrl.startsWith('https://')) {
						imgEl.src = item.itemData.imageUrl;
					} else {
						// Local file path - resolve relative to item file
						const resolvedPath = this.resolveImagePath(item.itemData.imageUrl, item.itemData.path);
						const resourcePath = this.plugin.app.vault.adapter.getResourcePath(resolvedPath);
						imgEl.src = resourcePath;
					}

					imgEl.alt = item.itemData.name;

					// Handle image load errors gracefully
					imgEl.onerror = () => {
						imgEl.style.display = 'none';
					};
				}
			} else {
				// Fallback for missing item data
				itemEl.createDiv({
					text: item.itemRef,
					cls: 'magic-item-name'
				});
			}
		});
	}

	/**
	 * Render equipment inline (without section header)
	 */
	private renderEquipmentInline(container: HTMLElement): void {
		const equipment = this.lootData!.equipment;
		if (!equipment || equipment.length === 0) return;

		equipment.forEach(item => {
			const itemEl = container.createDiv({ cls: 'equipment-item inline-item' });

			if (item.itemData) {
				// Show item name
				const nameEl = itemEl.createDiv({ cls: 'equipment-item-name' });
				nameEl.textContent = item.itemData.name;

				// Show equipment type if available
				if (item.itemData.metadata?.equipment_type) {
					const typeEl = itemEl.createDiv({ cls: 'equipment-item-type' });
					typeEl.textContent = item.itemData.metadata.equipment_type;
				}

				// Show description
				if (item.itemData.description) {
					const descEl = itemEl.createDiv({ cls: 'equipment-item-description' });
					descEl.textContent = item.itemData.description;
				}

				// Show image if available
				if (item.itemData.imageUrl) {
					const imgEl = itemEl.createEl('img', { cls: 'equipment-item-image' });

					// Handle both online URLs and local file paths
					if (item.itemData.imageUrl.startsWith('http://') || item.itemData.imageUrl.startsWith('https://')) {
						imgEl.src = item.itemData.imageUrl;
					} else {
						// Local file path - resolve relative to item file
						const resolvedPath = this.resolveImagePath(item.itemData.imageUrl, item.itemData.path);
						const resourcePath = this.plugin.app.vault.adapter.getResourcePath(resolvedPath);
						imgEl.src = resourcePath;
					}

					imgEl.alt = item.itemData.name;

					// Handle image load errors gracefully
					imgEl.onerror = () => {
						imgEl.style.display = 'none';
					};
				}
			} else {
				// Fallback for missing item data
				itemEl.createDiv({
					text: item.itemRef,
					cls: 'equipment-item-name'
				});
			}
		});
	}

	/**
	 * Render mundane items inline (without section header)
	 */
	private renderMundaneItemsInline(container: HTMLElement): void {
		const mundaneItems = this.lootData!.mundaneItems;
		if (!mundaneItems || mundaneItems.length === 0) return;

		mundaneItems.forEach(item => {
			const itemEl = container.createDiv({ cls: 'mundane-item inline-item' });
			itemEl.createEl('span', {
				text: `${item.quantity}x ${item.name}`,
				cls: 'mundane-item-name'
			});
		});
	}

	/**
	 * Render salvage inline (without section header)
	 */
	private renderSalvageInline(container: HTMLElement): void {
		const salvage = this.lootData!.salvage;
		if (!salvage || salvage.length === 0) return;

		salvage.forEach(material => {
			const materialEl = container.createDiv({ cls: 'salvage-item inline-item' });

			materialEl.createEl('div', {
				text: material.name,
				cls: 'salvage-name'
			});

			materialEl.createEl('div', {
				text: material.description,
				cls: 'salvage-description'
			});

			const metaEl = materialEl.createDiv({ cls: 'salvage-meta' });
			metaEl.createEl('span', {
				text: `Harvest DC: ${material.harvestDC}`,
				cls: 'salvage-dc'
			});

			if (material.craftingTags.length > 0) {
				const tagsEl = materialEl.createDiv({ cls: 'salvage-tags' });
				tagsEl.textContent = `Uses: ${material.craftingTags.join(', ')}`;
			}
		});
	}

	/**
	 * Resolve image path relative to item file location
	 */
	private resolveImagePath(imageUrl: string, itemPath: string): string {
		// If the path is already absolute (starts with vault root), return as-is
		if (!imageUrl.startsWith('./') && !imageUrl.startsWith('../')) {
			// Check if it looks like a relative path without ./ prefix
			if (!imageUrl.includes('/')) {
				// Single filename - make it relative to item directory
				const itemDir = itemPath.substring(0, itemPath.lastIndexOf('/'));
				return `${itemDir}/${imageUrl}`;
			}
			// Already a vault-absolute path
			return imageUrl;
		}

		// Resolve relative path
		const itemDir = itemPath.substring(0, itemPath.lastIndexOf('/'));
		const parts = imageUrl.split('/');
		const dirParts = itemDir.split('/');

		for (const part of parts) {
			if (part === '..') {
				dirParts.pop();
			} else if (part !== '.') {
				dirParts.push(part);
			}
		}

		return dirParts.join('/');
	}
}
