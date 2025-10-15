import { App, Modal, Setting, Notice } from 'obsidian';
import { LootGenerator } from '../utils/lootGenerator';
import { GeneratedLoot } from '../types';

/**
 * Simplified loot type for UI
 */
type SimpleLootType = 'coins' | 'treasure' | 'magic' | 'equipment' | 'everything';

/**
 * Simplified modal for generating random loot
 */
export class LootGeneratorModal extends Modal {
	private lootGenerator: LootGenerator;
	private onGenerate: (loot: GeneratedLoot) => void;

	// Simplified form state
	private partySize: number = 4;
	private partyLevel: number = 5;
	private lootType: SimpleLootType = 'everything';
	private amountMultiplier: number = 1.0;

	// Generated loot
	private generatedLoot: GeneratedLoot | null = null;

	constructor(
		app: App,
		lootGenerator: LootGenerator,
		onGenerate: (loot: GeneratedLoot) => void
	) {
		super(app);
		this.lootGenerator = lootGenerator;
		this.onGenerate = onGenerate;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('shopboard-loot-generator-modal');

		// Set modal width
		this.modalEl.style.maxWidth = '700px';
		this.modalEl.style.minWidth = '500px';

		// Modal title
		contentEl.createEl('h2', { text: 'Generate Loot' });
		contentEl.createEl('p', {
			text: 'Simple and powerful D&D treasure generation.',
			cls: 'modal-description'
		});

		// Create simplified form
		this.createSimplifiedForm(contentEl);

		// Create loot display area
		this.createLootDisplay(contentEl);

		// Create action buttons
		this.createButtons(contentEl);

		// Auto-generate loot on open
		this.handleGenerate();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Create simplified form with 4 inputs
	 */
	private createSimplifiedForm(container: HTMLElement) {
		const formSection = container.createDiv('loot-form-section');

		// Party Size
		new Setting(formSection)
			.setName('Party Size')
			.setDesc('Number of players')
			.addText(text => {
				text
					.setPlaceholder('4')
					.setValue(this.partySize.toString())
					.onChange(value => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0 && num <= 10) {
							this.partySize = num;
						}
					});
				text.inputEl.type = 'number';
				text.inputEl.setAttribute('min', '1');
				text.inputEl.setAttribute('max', '10');
				return text;
			});

		// Party Level
		new Setting(formSection)
			.setName('Party Level')
			.setDesc('Average character level')
			.addText(text => {
				text
					.setPlaceholder('5')
					.setValue(this.partyLevel.toString())
					.onChange(value => {
						const num = parseInt(value);
						if (!isNaN(num) && num > 0 && num <= 20) {
							this.partyLevel = num;
						}
					});
				text.inputEl.type = 'number';
				text.inputEl.setAttribute('min', '1');
				text.inputEl.setAttribute('max', '20');
				return text;
			});

		// Loot Type - Button Group
		const lootTypeSetting = new Setting(formSection)
			.setName('Loot Type')
			.setDesc('Choose what kind of treasure to generate');

		const buttonContainer = lootTypeSetting.controlEl.createDiv('loot-type-buttons');

		const lootTypes: Array<{ value: SimpleLootType; label: string; icon: string }> = [
			{ value: 'coins', label: 'Coins', icon: '💰' },
			{ value: 'treasure', label: 'Treasure', icon: '💎' },
			{ value: 'magic', label: 'Magic', icon: '✨' },
			{ value: 'equipment', label: 'Equipment', icon: '⚔️' },
			{ value: 'everything', label: 'Everything', icon: '🎲' }
		];

		lootTypes.forEach(type => {
			const button = buttonContainer.createEl('button', {
				cls: 'loot-type-button',
				text: `${type.icon} ${type.label}`
			});

			if (type.value === this.lootType) {
				button.addClass('active');
			}

			button.addEventListener('click', () => {
				this.lootType = type.value;
				// Update button active states
				buttonContainer.querySelectorAll('.loot-type-button').forEach(btn => {
					btn.removeClass('active');
				});
				button.addClass('active');
			});
		});

		// Amount Slider
		new Setting(formSection)
			.setName('Loot Amount')
			.setDesc(`Multiplier: ${this.amountMultiplier.toFixed(1)}x`)
			.addSlider(slider => {
				slider
					.setLimits(0.5, 3.0, 0.1)
					.setValue(this.amountMultiplier)
					.setDynamicTooltip()
					.onChange(value => {
						this.amountMultiplier = value;
						// Update description
						const descEl = formSection.querySelector('.setting-item:last-child .setting-item-description');
						if (descEl) {
							descEl.textContent = `Multiplier: ${value.toFixed(1)}x`;
						}
					});

				return slider;
			});
	}

	/**
	 * Create loot display area
	 */
	private createLootDisplay(container: HTMLElement) {
		const displaySection = container.createDiv('loot-display-section');

		const displayContent = displaySection.createDiv('loot-display-content');
		displayContent.setAttribute('id', 'loot-display-content');

		if (this.generatedLoot) {
			this.renderLootDisplay(displayContent);
		} else {
			displayContent.createEl('p', {
				text: 'Generating loot...',
				cls: 'loot-loading'
			});
		}
	}

	/**
	 * Render loot display
	 */
	private renderLootDisplay(container: HTMLElement) {
		container.empty();

		if (!this.generatedLoot) return;

		const loot = this.generatedLoot;

		// Summary header
		const summaryEl = container.createDiv({ cls: 'loot-summary' });
		summaryEl.createEl('div', {
			cls: 'loot-total-value',
			text: `⚜️ Total Value: ${loot.totalValue} gp`
		});
		if (loot.totalWeight > 0) {
			summaryEl.createEl('div', {
				cls: 'loot-total-weight',
				text: `Weight: ${loot.totalWeight} lbs`
			});
		}

		// Container description
		if (loot.containerDescription) {
			container.createEl('div', {
				cls: 'loot-container-desc',
				text: `Found in ${loot.containerDescription}`
			});
		}

		// Coins
		if (loot.coins.gold > 0) {
			const coinSection = container.createDiv({ cls: 'loot-category loot-category-coins' });
			coinSection.textContent = `💰 ${loot.coins.gold} gp`;
		}

		// Gems
		if (loot.gems.length > 0) {
			const gemSection = container.createDiv({ cls: 'loot-category' });
			gemSection.createEl('strong', { text: '💎 Gems: ' });
			const gemValue = loot.gems.reduce((sum, g) => sum + g.value * g.quantity, 0);
			gemSection.createSpan({ text: `${loot.gems.length} gems (${gemValue} gp)` });
		}

		// Art Objects
		if (loot.artObjects.length > 0) {
			const artSection = container.createDiv({ cls: 'loot-category' });
			artSection.createEl('strong', { text: '🎨 Art Objects: ' });
			const artValue = loot.artObjects.reduce((sum, a) => sum + a.value, 0);
			artSection.createSpan({ text: `${loot.artObjects.length} objects (${artValue} gp)` });
		}

		// Combined Items (Magic Items + Equipment)
		const totalItems = loot.magicItems.length + loot.equipment.length;
		if (totalItems > 0) {
			const itemsSection = container.createDiv({ cls: 'loot-category' });
			itemsSection.createEl('strong', { text: '⚔️ Items: ' });
			itemsSection.createSpan({ text: `${totalItems} items` });

			// List all items
			const itemsList = container.createDiv({ cls: 'loot-item-list' });

			// Add magic items first
			loot.magicItems.forEach(item => {
				const itemEl = itemsList.createDiv({ cls: 'loot-item loot-item-magic' });
				if (item.itemData) {
					itemEl.textContent = `• ${item.itemData.name}`;
					if (item.itemData.rarity) {
						itemEl.createSpan({
							cls: `rarity-badge rarity-${item.itemData.rarity.toLowerCase().replace(' ', '-')}`,
							text: ` ${item.itemData.rarity}`
						});
					}
				}
			});

			// Add equipment
			loot.equipment.forEach(item => {
				if (item.itemData) {
					itemsList.createDiv({
						cls: 'loot-item loot-item-equipment',
						text: `• ${item.itemData.name}`
					});
				}
			});
		}

		// Mundane Items
		if (loot.mundaneItems.length > 0) {
			const mundaneSection = container.createDiv({ cls: 'loot-category' });
			mundaneSection.createEl('strong', { text: '🎒 Mundane Items: ' });
			mundaneSection.createSpan({ text: `${loot.mundaneItems.length} items` });

			// List mundane items
			const mundaneList = container.createDiv({ cls: 'loot-item-list' });
			loot.mundaneItems.forEach(item => {
				mundaneList.createDiv({
					cls: 'loot-item',
					text: `• ${item.quantity}x ${item.name}`
				});
			});
		}

		// Salvage
		if (loot.salvage.length > 0) {
			const salvageSection = container.createDiv({ cls: 'loot-category' });
			salvageSection.createEl('strong', { text: '⚗️ Salvage: ' });
			const salvageValue = loot.salvage.reduce((sum, s) => sum + s.value, 0);
			salvageSection.createSpan({ text: `${loot.salvage.length} materials (${salvageValue} gp)` });
		}
	}

	/**
	 * Action buttons section
	 */
	private createButtons(container: HTMLElement) {
		const buttonContainer = container.createDiv('modal-button-container');

		// Randomize button - regenerate with same params
		const randomizeButton = buttonContainer.createEl('button', {
			text: '🎲 Randomize',
			cls: 'mod-cta'
		});

		randomizeButton.addEventListener('click', () => {
			this.handleGenerate();
		});

		// Display button - open in Loot Display View
		const displayButton = buttonContainer.createEl('button', {
			text: '👁️ Display to Players',
			cls: 'mod-cta'
		});

		displayButton.addEventListener('click', () => {
			if (!this.generatedLoot) {
				new Notice('Please generate loot first');
				return;
			}
			this.handleDisplay();
		});

		// Close button
		const closeButton = buttonContainer.createEl('button', {
			text: 'Close'
		});

		closeButton.addEventListener('click', () => {
			this.close();
		});
	}

	/**
	 * Handle loot generation with simplified parameters
	 */
	private handleGenerate() {
		try {
			// Map simplified loot type to full parameters
			const params = this.buildLootParams();

			// Generate loot
			this.generatedLoot = this.lootGenerator.generateLoot(params);

			// Update display
			const displayContent = this.modalEl.querySelector('#loot-display-content') as HTMLElement;
			if (displayContent) {
				this.renderLootDisplay(displayContent);
			}

			new Notice(`Generated loot worth ${this.generatedLoot.totalValue} gp!`);

		} catch (error) {
			console.error('Error generating loot:', error);
			new Notice('Failed to generate loot. See console for details.');
		}
	}

	/**
	 * Build full LootGenerationParams from simplified inputs
	 */
	private buildLootParams() {
		// Estimate CR from party level
		const estimatedCR = Math.max(0, this.partyLevel - 2);

		// Base parameters for all loot types
		const baseParams = {
			challengeRating: estimatedCR,
			experiencePoints: this.estimateXPFromCR(estimatedCR),
			partySize: this.partySize,
			partyLevel: this.partyLevel,
			biome: 'dungeon' as const,
			containerType: 'chest' as const,
			coinPercentage: Math.round(this.amountMultiplier * 100),
			consumablePercentage: 30,
			lowMagic: false,
			trackIdentification: false,
			monsterType: 'beast',
			includeEncumbrance: true,
			seed: null
		};

		// Map simplified loot type to specific parameters
		switch (this.lootType) {
			case 'coins':
				return {
					...baseParams,
					lootType: 'individual' as const,
					minRarity: null,
					maxRarity: null,
					generateArtObjects: false,
					generateEquipment: false,
					enableSalvage: false
				};

			case 'treasure':
				return {
					...baseParams,
					lootType: 'hoard' as const,
					minRarity: null,
					maxRarity: null,
					generateArtObjects: true,
					generateEquipment: false,
					enableSalvage: false
				};

			case 'magic':
				return {
					...baseParams,
					lootType: 'hoard' as const,
					minRarity: 'common' as const,
					maxRarity: 'rare' as const,
					generateArtObjects: false,
					generateEquipment: false,
					enableSalvage: false
				};

			case 'equipment':
				return {
					...baseParams,
					lootType: 'hoard' as const,
					minRarity: null,
					maxRarity: null,
					generateArtObjects: false,
					generateEquipment: true,
					enableSalvage: false
				};

			case 'everything':
			default:
				return {
					...baseParams,
					lootType: 'hoard' as const,
					minRarity: null,
					maxRarity: null,
					generateArtObjects: true,
					generateEquipment: true,
					enableSalvage: false
				};
		}
	}

	/**
	 * Estimate XP from CR (rough approximation based on DMG)
	 */
	private estimateXPFromCR(cr: number): number {
		const xpByCR: Record<number, number> = {
			0: 10, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
			6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
			11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000,
			16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000
		};

		// Find closest CR
		const crKeys = Object.keys(xpByCR).map(Number);
		const closest = crKeys.reduce((prev, curr) =>
			Math.abs(curr - cr) < Math.abs(prev - cr) ? curr : prev
		);

		return xpByCR[closest] || 1800;
	}

	/**
	 * Handle displaying loot to players
	 */
	private handleDisplay() {
		if (!this.generatedLoot) {
			new Notice('Please generate loot first');
			return;
		}

		this.onGenerate(this.generatedLoot);
		this.close();
	}
}
