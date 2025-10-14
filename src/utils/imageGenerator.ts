import { App, Notice, TFile, normalizePath, requestUrl } from 'obsidian';
import OpenAI from 'openai';
import { ImageStyle } from '../types';

/**
 * Service for generating item images using OpenAI DALL-E
 */
export class ImageGenerator {
	private app: App;
	private apiKey: string;
	private imageStyle: ImageStyle;
	private attachmentFolder: string;
	private openai: OpenAI | null = null;

	constructor(app: App, apiKey: string, imageStyle: ImageStyle, attachmentFolder: string) {
		this.app = app;
		this.apiKey = apiKey;
		this.imageStyle = imageStyle;
		this.attachmentFolder = attachmentFolder;

		if (apiKey && apiKey.length > 0) {
			this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
		}
	}

	/**
	 * Update the API key
	 */
	updateApiKey(apiKey: string): void {
		this.apiKey = apiKey;

		if (apiKey && apiKey.length > 0) {
			this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
		} else {
			this.openai = null;
		}
	}

	/**
	 * Update the image style
	 */
	updateImageStyle(imageStyle: ImageStyle): void {
		this.imageStyle = imageStyle;
	}

	/**
	 * Update the attachment folder
	 */
	updateAttachmentFolder(attachmentFolder: string): void {
		this.attachmentFolder = attachmentFolder;
	}

	/**
	 * Check if the image generator is configured
	 */
	isConfigured(): boolean {
		return this.openai !== null;
	}

	/**
	 * Generate an image for an item and save it to the vault
	 * @param itemFile - The item file to generate an image for
	 * @returns The relative path to the generated image, or null if failed
	 */
	async generateImageForItem(itemFile: TFile): Promise<string | null> {
		if (!this.openai) {
			new Notice('OpenAI API key not configured. Please add your API key in settings.');
			return null;
		}

		try {
			// Get item metadata
			const metadata = this.app.metadataCache.getFileCache(itemFile);
			if (!metadata?.frontmatter) {
				new Notice('Unable to read item metadata');
				return null;
			}

			const fm = metadata.frontmatter;
			const itemName = fm.name || itemFile.basename;
			const description = fm.description || '';
			const rarity = fm.rarity || 'common';

			// Capture existing image URL (if any) to delete it later after successful generation
			const oldImageUrl = fm.image_url || fm.imageUrl;

			// Generate prompt for DALL-E
			const prompt = this.buildPrompt(itemName, description, rarity);

			new Notice(`Generating image for "${itemName}"...`);

			// Call DALL-E API
			const response = await this.openai.images.generate({
				model: 'dall-e-3',
				prompt: prompt,
				n: 1,
				size: '1024x1024',
				quality: 'standard',
				response_format: 'url'
			});

			const imageUrl = response.data[0]?.url;
			if (!imageUrl) {
				new Notice('Failed to generate image: No URL returned');
				return null;
			}

			// Download the image
			const imageData = await this.downloadImage(imageUrl);
			if (!imageData) {
				new Notice('Failed to download generated image');
				return null;
			}

			// Save the image to attachment folder
			const imagePath = await this.saveImage(itemFile, imageData, itemName);
			if (!imagePath) {
				new Notice('Failed to save image to vault');
				return null;
			}

			// Delete old image if it exists and is different from the new one
			if (oldImageUrl && oldImageUrl !== imagePath) {
				await this.deleteOldImage(oldImageUrl);
			}

			// Update item frontmatter
			await this.updateItemFrontmatter(itemFile, imagePath);

			new Notice(`Image generated successfully for "${itemName}"`);
			return imagePath;

		} catch (error) {
			console.error('Error generating image:', error);

			// Provide more specific error messages
			if (error instanceof Error) {
				if (error.message.includes('API key')) {
					new Notice('Invalid OpenAI API key. Please check your settings.');
				} else if (error.message.includes('rate_limit')) {
					new Notice('OpenAI rate limit exceeded. Please try again later.');
				} else if (error.message.includes('billing')) {
					new Notice('OpenAI billing issue. Please check your account.');
				} else {
					new Notice(`Failed to generate image: ${error.message}`);
				}
			} else {
				new Notice('Failed to generate image. Check console for details.');
			}

			return null;
		}
	}

	/**
	 * Build a DALL-E prompt from item properties
	 */
	private buildPrompt(name: string, description: string, rarity: string): string {
		// Base prompt for D&D item style
		let prompt = `A fantasy RPG item illustration of ${name}. `;

		// Add description if available
		if (description && description.length > 0) {
			prompt += `${description}. `;
		}

		// Add rarity-based visual styling - colors match UI border colors for consistency
		switch (rarity.toLowerCase()) {
			case 'artifact':
				prompt += 'Mythical artifact of ultimate power with overwhelming magical presence in crimson-red energy (#f44336), intense red magical auras and flames, scarlet and ruby divine energy radiating from the item, red arcane lightning and particles, godlike legendary materials with blood-red shimmer, ancient divine runes glowing red, radiating immense power with red and crimson tones. ';
				break;
			case 'legendary':
				prompt += 'Legendary artifact with intense magical auras in golden-orange hues (#ff9800), dramatic orange and gold energy emanating from the item, golden-orange floating magical particles, warm ethereal glows, pristine legendary materials like mithril or adamantine, intricate divine engravings with orange shimmer, radiating overwhelming magical power in orange and gold tones. ';
				break;
			case 'very rare':
				prompt += 'Very rare magical item with strong arcane effects in purple and magenta colors (#9c27b0), vibrant purple magical glows, violet and magenta enchantment runes, high-quality exotic materials with purple shimmer, intricate craftsmanship with purple magical details, clearly powerful with purple arcane energy. ';
				break;
			case 'rare':
				prompt += 'Rare enchanted item with moderate blue magical glow (#2196f3), blue arcane shimmer and aura, fine craftsmanship with quality materials, visible blue enchantment runes or magical sheen, well-made with clear blue magical effects. ';
				break;
			case 'uncommon':
				prompt += 'Uncommon item with light magical properties in green tones (#4caf50), subtle green magical hint or faint green glow, good quality materials and solid craftsmanship, light green enchanted shimmer, practical with minor green magical touch. ';
				break;
			case 'common':
			default:
				prompt += 'Common mundane item with simple practical design, gray or silver mundane materials (#9e9e9e), basic functional craftsmanship, no magical effects or glows, clean utilitarian appearance, ordinary non-magical item. ';
				break;
		}

		// Add style-specific guidelines with improved composition and clarity
		switch (this.imageStyle) {
			case 'realistic':
				prompt += 'Photorealistic product photography style, professional studio lighting with soft shadows, clean white background, item centered and isolated, sharp focus on every detail, highly detailed realistic textures and materials, museum-quality presentation. ';
				break;
			case 'fantasy-painting':
				prompt += 'Classic fantasy art oil painting style, rich vibrant colors, painterly brushstrokes with visible texture, dramatic cinematic lighting, clean white or neutral background, item centered as the focal point, epic fantasy illustration quality, traditional fantasy art. ';
				break;
			case 'digital-art':
				prompt += 'Clean modern digital illustration, video game asset style, vibrant saturated colors, crisp clean lines, white background, item perfectly centered and isolated, professional game-ready quality, polished digital painting. ';
				break;
			case 'isometric':
				prompt += 'Isometric video game asset, precise isometric perspective (30° angle), pixel-perfect design, clean geometric lines, white background, item centered in frame, retro game style, clear readable silhouette. ';
				break;
			case 'sketch':
				prompt += 'Hand-drawn traditional sketch, detailed pencil and ink line work, crosshatching and shading, white paper background, item centered as main subject, traditional illustration style, monochrome or subtle color wash, artistic hand-drawn quality. ';
				break;
		}

		// Universal composition and quality guidelines
		prompt += 'Single item centered in frame, isolated object on clean background, professional quality, highly detailed. ';

		// CRITICAL: Strong anti-text instructions (DALL-E often generates text unless explicitly prevented)
		prompt += 'IMPORTANT: No text, no labels, no words, no letters, no names, no titles, no UI elements, no writing of any kind on or near the item.';

		return prompt;
	}

	/**
	 * Download an image from a URL using Obsidian's requestUrl to bypass CORS
	 */
	private async downloadImage(url: string): Promise<ArrayBuffer | null> {
		try {
			const response = await requestUrl({
				url: url,
				method: 'GET'
			});

			if (response.status !== 200) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			return response.arrayBuffer;
		} catch (error) {
			console.error('Error downloading image:', error);
			return null;
		}
	}

	/**
	 * Save image data to attachment folder at vault root
	 */
	private async saveImage(itemFile: TFile, imageData: ArrayBuffer, itemName: string): Promise<string | null> {
		try {
			// Create attachment folder path at vault root
			const attachmentsDir = normalizePath(this.attachmentFolder);

			// Ensure attachment folder exists
			if (!(await this.app.vault.adapter.exists(attachmentsDir))) {
				await this.app.vault.createFolder(attachmentsDir);
			}

			// Create safe filename from item name
			const safeFileName = itemName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '');

			const imagePath = normalizePath(`${attachmentsDir}/${safeFileName}.png`);

			// Save the image
			await this.app.vault.adapter.writeBinary(imagePath, imageData);

			// Return path from vault root
			return imagePath;
		} catch (error) {
			console.error('Error saving image:', error);
			return null;
		}
	}

	/**
	 * Update item frontmatter with the image path
	 */
	private async updateItemFrontmatter(itemFile: TFile, imagePath: string): Promise<void> {
		try {
			// Use Obsidian's atomic frontmatter API (handles all line endings, preserves all fields)
			await this.app.fileManager.processFrontMatter(itemFile, (frontmatter) => {
				frontmatter.image_url = imagePath;
			});

			// Wait for Obsidian's metadata cache to update
			await this.waitForMetadataUpdate(itemFile);
		} catch (error) {
			console.error('Error updating frontmatter:', error);
			throw error;
		}
	}

	/**
	 * Wait for Obsidian's metadata cache to update for a specific file
	 */
	private async waitForMetadataUpdate(file: TFile, timeoutMs: number = 5000): Promise<void> {
		return new Promise((resolve) => {
			let resolved = false;

			// Set up timeout fallback
			const timeout = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					console.warn(`Metadata cache update timeout for ${file.path}`);
					resolve();
				}
			}, timeoutMs);

			// Listen for metadata cache changes
			const handler = (updatedFile: TFile) => {
				if (updatedFile.path === file.path && !resolved) {
					resolved = true;
					clearTimeout(timeout);
					this.app.metadataCache.off('changed', handler);
					console.log(`Metadata cache updated for ${file.path}`);
					resolve();
				}
			};

			this.app.metadataCache.on('changed', handler);
		});
	}

	/**
	 * Delete old image file from vault
	 */
	private async deleteOldImage(oldImagePath: string): Promise<void> {
		try {
			// Check if it's a vault path (not an external URL)
			if (oldImagePath.startsWith('http://') || oldImagePath.startsWith('https://')) {
				// External URL, don't try to delete
				return;
			}

			// Normalize the path
			const normalizedPath = normalizePath(oldImagePath);

			// Check if file exists before trying to delete
			if (await this.app.vault.adapter.exists(normalizedPath)) {
				await this.app.vault.adapter.remove(normalizedPath);
				console.log(`Deleted old image: ${normalizedPath}`);
			}
		} catch (error) {
			// Log error but don't fail the operation
			console.warn('Failed to delete old image:', error);
		}
	}
}
