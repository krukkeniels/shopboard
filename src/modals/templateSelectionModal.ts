import { App, Modal, Setting, TFile, Notice } from 'obsidian';
import { TemplateProvider, ShopTemplate } from '../utils/templateProvider';

/**
 * Modal for selecting a shop template and creating a new shop
 */
export class TemplateSelectionModal extends Modal {
	private templateProvider: TemplateProvider;
	private selectedTemplate: ShopTemplate | null = null;
	private shopName: string = '';
	private folderPath: string = '';
	private onSubmit: (file: TFile) => void;

	constructor(
		app: App,
		templateProvider: TemplateProvider,
		onSubmit: (file: TFile) => void
	) {
		super(app);
		this.templateProvider = templateProvider;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('shopboard-template-modal');

		// Modal title
		contentEl.createEl('h2', { text: 'Create New Shop' });

		// Template selection
		this.createTemplateSelection(contentEl);

		// Shop name input
		this.createShopNameInput(contentEl);

		// Folder path input
		this.createFolderPathInput(contentEl);

		// Template preview
		this.createTemplatePreview(contentEl);

		// Buttons
		this.createButtons(contentEl);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Create template selection dropdown
	 */
	private createTemplateSelection(container: HTMLElement) {
		const templates = this.templateProvider.getTemplates();

		new Setting(container)
			.setName('Shop Template')
			.setDesc('Choose a template for your shop')
			.addDropdown(dropdown => {
				dropdown.addOption('', 'Select a template...');

				templates.forEach(template => {
					dropdown.addOption(template.shopType, template.name);
				});

				dropdown.onChange(value => {
					if (value) {
						this.selectedTemplate = this.templateProvider.getTemplateByType(value);

						// Auto-fill shop name if empty
						if (!this.shopName && this.selectedTemplate) {
							this.shopName = this.selectedTemplate.name;
						}

						this.updatePreview();
					} else {
						this.selectedTemplate = null;
						this.updatePreview();
					}
				});

				return dropdown;
			});
	}

	/**
	 * Create shop name input field
	 */
	private createShopNameInput(container: HTMLElement) {
		new Setting(container)
			.setName('Shop Name')
			.setDesc('Enter a name for your shop')
			.addText(text => {
				text
					.setPlaceholder('e.g., The Prancing Pony')
					.setValue(this.shopName)
					.onChange(value => {
						this.shopName = value;
						this.updatePreview();
					});

				// Auto-focus the input
				text.inputEl.focus();

				return text;
			});
	}

	/**
	 * Create folder path input field
	 */
	private createFolderPathInput(container: HTMLElement) {
		new Setting(container)
			.setName('Folder Path')
			.setDesc('Optional: Specify a folder to create the shop in (e.g., "Shops" or "Campaign/Shops")')
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
	 * Create template preview section
	 */
	private createTemplatePreview(container: HTMLElement) {
		const previewContainer = container.createDiv('template-preview-container');

		const previewTitle = previewContainer.createEl('h3', { text: 'Preview' });
		previewTitle.addClass('template-preview-title');

		const previewContent = previewContainer.createDiv('template-preview-content');
		previewContent.setAttribute('data-preview', 'true');

		this.updatePreview();
	}

	/**
	 * Update the template preview
	 */
	private updatePreview() {
		const previewElement = this.contentEl.querySelector('.template-preview-content');
		if (!previewElement) return;

		if (!this.selectedTemplate) {
			previewElement.innerHTML = '<p class="template-preview-empty">Select a template to see a preview</p>';
			return;
		}

		const displayName = this.shopName || this.selectedTemplate.name;

		let html = '<div class="template-preview">';
		html += `<div class="preview-header">`;
		html += `<h4>${displayName}</h4>`;
		html += `<span class="preview-shop-type">${this.selectedTemplate.name}</span>`;
		html += `</div>`;

		html += `<p class="preview-description">${this.selectedTemplate.description}</p>`;

		html += `<div class="preview-details">`;
		html += `<div class="preview-detail">`;
		html += `<span class="preview-label">Price Modifier:</span> `;
		html += `<span class="preview-value">${this.selectedTemplate.priceModifier > 0 ? '+' : ''}${this.selectedTemplate.priceModifier}%</span>`;
		html += `</div>`;

		html += `<div class="preview-detail">`;
		html += `<span class="preview-label">Shop Type:</span> `;
		html += `<span class="preview-value">${this.selectedTemplate.shopType}</span>`;
		html += `</div>`;
		html += `</div>`;

		html += `<div class="preview-inventory">`;
		html += `<h5>Sample Inventory (${this.selectedTemplate.sampleInventory.length} items):</h5>`;
		html += `<ul>`;
		this.selectedTemplate.sampleInventory.slice(0, 5).forEach(item => {
			html += `<li>${item.item} <span class="preview-quantity">(×${item.quantity})</span></li>`;
		});
		if (this.selectedTemplate.sampleInventory.length > 5) {
			html += `<li><em>...and ${this.selectedTemplate.sampleInventory.length - 5} more</em></li>`;
		}
		html += `</ul>`;
		html += `</div>`;

		html += `</div>`;

		previewElement.innerHTML = html;
	}

	/**
	 * Create action buttons
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
	 * Handle shop creation
	 */
	private async handleCreate() {
		// Validate inputs
		if (!this.selectedTemplate) {
			new Notice('Please select a shop template');
			return;
		}

		if (!this.shopName || this.shopName.trim().length === 0) {
			new Notice('Please enter a shop name');
			return;
		}

		try {
			// Ensure folder exists if specified
			if (this.folderPath && this.folderPath.trim().length > 0) {
				const folderExists = this.app.vault.getAbstractFileByPath(this.folderPath);
				if (!folderExists) {
					// Try to create the folder
					await this.app.vault.createFolder(this.folderPath);
				}
			}

			// Create the shop
			const file = await this.templateProvider.createShopFromTemplate(
				this.selectedTemplate,
				this.app.vault,
				this.shopName.trim(),
				this.folderPath.trim()
			);

			// Call the onSubmit callback
			this.onSubmit(file);

			// Close the modal
			this.close();

		} catch (error) {
			console.error('Error creating shop:', error);
			new Notice('Failed to create shop: ' + error.message);
		}
	}
}
