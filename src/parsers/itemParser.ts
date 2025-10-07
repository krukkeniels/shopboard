import { App, TFile, CachedMetadata } from 'obsidian';
import { ItemData, ItemCache } from '../types';

/**
 * Parser for item notes - scans folders and caches item data
 */
export class ItemParser {
	private app: App;
	private cache: ItemCache;
	private readonly MAX_CACHE_SIZE = 10000; // Maximum items to cache

	constructor(app: App) {
		this.app = app;
		this.cache = {
			items: new Map<string, ItemData>(),
			lastUpdated: 0
		};
	}

	/**
	 * Scan configured folders for item notes
	 * @param folders - Array of folder paths to scan
	 * @returns Array of parsed item data
	 */
	async scanItemFolders(folders: string[]): Promise<ItemData[]> {
		const startTime = Date.now();
		console.log('Scanning item folders:', folders);

		// Clear existing cache
		this.cache.items.clear();

		const items: ItemData[] = [];
		const allFiles = this.app.vault.getMarkdownFiles();

		// Filter files by configured folders
		const itemFiles = allFiles.filter(file => {
			return folders.some(folder => {
				// Normalize folder paths
				const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/|\/$/g, '');
				const normalizedPath = file.path.replace(/\\/g, '/');

				// Check if file is in folder or subfolder
				return normalizedPath.startsWith(normalizedFolder + '/') ||
				       normalizedPath.startsWith(normalizedFolder);
			});
		});

		console.log(`Found ${itemFiles.length} files in item folders`);

		// Check cache size limit
		if (itemFiles.length > this.MAX_CACHE_SIZE) {
			console.warn(
				`Item file count (${itemFiles.length}) exceeds maximum cache size (${this.MAX_CACHE_SIZE}). ` +
				'Only the first items will be cached.'
			);
		}

		// Parse each file
		for (let i = 0; i < Math.min(itemFiles.length, this.MAX_CACHE_SIZE); i++) {
			const file = itemFiles[i];
			const itemData = await this.parseItemNote(file);
			if (itemData) {
				items.push(itemData);
				// Add to cache with both name and path as keys for O(1) lookups
				this.cache.items.set(itemData.name.toLowerCase(), itemData);
				this.cache.items.set(itemData.path, itemData);
			}
		}

		this.cache.lastUpdated = Date.now();
		const elapsed = Date.now() - startTime;
		console.log(`Parsed ${items.length} valid items in ${elapsed}ms`);

		return items;
	}

	/**
	 * Parse a single item note
	 * @param file - File to parse
	 * @returns Parsed item data or null if invalid
	 */
	async parseItemNote(file: TFile): Promise<ItemData | null> {
		try {
			const metadata = this.app.metadataCache.getFileCache(file);

			if (!metadata || !metadata.frontmatter) {
				return null;
			}

			const fm = metadata.frontmatter;

			// Validate required fields
			if (fm.type !== 'item') {
				return null;
			}

			if (!fm.name || typeof fm.name !== 'string') {
				console.warn(`Item ${file.path} missing required field: name`);
				return null;
			}

			if (fm.base_price === undefined || typeof fm.base_price !== 'number') {
				console.warn(`Item ${file.path} missing required field: base_price`);
				return null;
			}

			// Extract item data
			const itemData: ItemData = {
				path: file.path,
				name: fm.name,
				basePrice: fm.base_price,
				rarity: fm.rarity,
				description: fm.description,
				metadata: { ...fm }
			};

			return itemData;

		} catch (error) {
			console.error(`Error parsing item ${file.path}:`, error);
			return null;
		}
	}

	/**
	 * Get item by name (case-insensitive)
	 * @param name - Item name to look up
	 * @returns Item data or null if not found
	 */
	getItemByName(name: string): ItemData | null {
		return this.cache.items.get(name.toLowerCase()) || null;
	}

	/**
	 * Get item by file path
	 * @param path - File path to look up
	 * @returns Item data or null if not found
	 */
	getItemByPath(path: string): ItemData | null {
		return this.cache.items.get(path) || null;
	}

	/**
	 * Invalidate the cache
	 */
	invalidateCache(): void {
		this.cache.items.clear();
		this.cache.lastUpdated = 0;
		console.log('Item cache invalidated');
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { itemCount: number; lastUpdated: number } {
		return {
			itemCount: this.cache.items.size,
			lastUpdated: this.cache.lastUpdated
		};
	}
}
