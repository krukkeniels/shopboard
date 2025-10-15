# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shopboard is an Obsidian plugin for managing and displaying D&D shop inventories during gaming sessions. It provides a DM-facing control panel and a player-facing display window (pop-out capable for second monitor) with fantasy-themed styling.

**Key Features:**
- Shop management via YAML frontmatter in Obsidian notes
- Player display with 4 themed visual styles (magic shop, blacksmith, general store, alchemist)
- DM control panel for recording purchases and managing inventory
- Loot generator for D&D treasure
- AI image generation for items (requires OpenAI API key)
- Automatic price calculation with shop-specific modifiers

## Build and Development Commands

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Deploy to Obsidian vault (Windows only)
./deploy.bat
```

**Important:** The `deploy.bat` script builds the plugin AND copies it to the Obsidian vault specified in the script. Edit `deploy.bat` to point to your vault location.

## Architecture Overview

### Plugin Entry Point
**`src/main.ts`** - Main plugin class that orchestrates all components:
- Initializes parsers, handlers, and utilities
- Registers views (Shop Display, DM Control, Loot Display)
- Registers commands and context menus
- Manages plugin lifecycle

### Core Data Flow

```
Item Notes (YAML)
    → ItemParser (scans folders, caches items)
    → ShopParser (reads shop notes, resolves item references)
    → PriceCalculator (applies modifiers)
    → ShopDisplayView (renders for players)

Shop Note Changes
    → PurchaseHandler (updates quantities)
    → Auto-refresh in display view
```

### View Architecture

The plugin uses Obsidian's `ItemView` system with three primary views:

1. **ShopDisplayView** (`src/views/shopDisplayView.ts`)
   - Player-facing shop display
   - Pop-out capable (opens in 'window' leaf)
   - Auto-refreshes when shop note changes
   - Grid-based pagination with category headers
   - Styled per shop type (magic_shop, blacksmith, etc.)

2. **DMControlView** (`src/views/dmControlView.ts`)
   - DM-facing sidebar panel (right leaf)
   - Purchase recording interface
   - Stock level management
   - Syncs with ShopDisplayView

3. **LootDisplayView** (`src/views/lootDisplayView.ts`)
   - Treasure display for generated loot
   - Shows coins, gems, art, magic items, mundane items, salvage
   - Pop-out capable

### Parser System

**ItemParser** (`src/parsers/itemParser.ts`):
- Scans configured folders for item/equipment notes
- Caches up to 10,000 items for performance
- Refreshes on file changes via metadata cache events
- Supports both `type: item` and `type: equipment`

**ShopParser** (`src/parsers/shopParser.ts`):
- Parses shop notes with `type: shop`
- Resolves wikilink references to items (handles folders, aliases)
- Calculates prices using PriceCalculator
- Returns ShopData structure with inventory

### Handler System

**PurchaseHandler** (`src/handlers/purchaseHandler.ts`):
- Records purchases by updating shop note frontmatter
- Decrements quantities atomically
- Preserves YAML structure and comments

**ShopModifier** (`src/handlers/shopModifier.ts`):
- Updates shop frontmatter fields (columns, rows, page, etc.)
- Used by DMControlView for display configuration

### Utility Components

**PriceCalculator** (`src/utils/priceCalculator.ts`):
- Applies shop-wide price modifiers (percentage)
- Handles per-item price overrides
- Formats currency (supports D&D GP/SP/CP conversion)

**ShopGenerator** (`src/utils/shopGenerator.ts`):
- Generates random shop inventories
- Filters items by shop type (magic_shop → magic items, etc.)
- Uses configured item folders

**LootGenerator** (`src/utils/lootGenerator.ts`):
- Generates D&D treasure based on CR/XP
- Uses treasure tables from `src/utils/treasureTables.ts`
- Outputs gems, art, magic items, mundane items, salvage

**ImageGenerator** (`src/utils/imageGenerator.ts`):
- Generates AI images for items using OpenAI DALL-E
- Saves images to configured attachment folder
- Updates item frontmatter with image path

## CSS Architecture

### Critical: Never Edit `styles.css` Directly!

**`styles.css` is auto-generated** by `build.js`. It bundles modular CSS files from `styles/` directory. Manual edits to `styles.css` are lost on every build.

### CSS Build Process

```
styles/*.css (source)
    → build.js (concatenates in order)
    → styles.css (output)
    → deploy.bat copies to vault
```

### CSS Module Organization

```
styles/
├── main.css              # Base styles, utilities, animations
├── display.css           # Shop display view (grid, items, themes)
├── loot-display.css      # Loot display view (treasure themes)
├── dm-control.css        # DM Control Panel (table, buttons)
├── template-modal.css    # Template selection modal
├── add-item-modal.css    # Add item modal
├── buy-item-modal.css    # Buy item modal
├── restock-modal.css     # Restock modal
└── themes/
    ├── magic-shop.css    # Mystical purple theme
    ├── blacksmith.css    # Forge red/orange theme
    ├── general-store.css # Rustic brown theme
    └── alchemist.css     # Potion green theme
```

### Adding New CSS

1. Create `styles/my-feature.css`
2. Add to `build.js` cssFiles array (order matters - later files override earlier)
3. Run `npm run build` or `deploy.bat`

### CSS Class Naming Convention

- View containers: `.shopboard-{view}-container`
- Display elements: `.{feature}-display`, `.{feature}-item`
- Themes: `.shop-type-{type}` (magic_shop, blacksmith, etc.)
- Grid: `.grid-item`, `.grid-category-header`

## Data Structures

### Shop Note Frontmatter
```yaml
type: shop
name: "Shop Name"
shop_type: magic_shop  # magic_shop | blacksmith | general_store | alchemist
price_modifier: 0      # Percentage: -20 = 20% discount, +50 = 50% markup
columns: 4             # Grid columns for display
rows: 5                # Grid rows for display
currentPage: 1         # Pagination state
inventory:
  - item: "[[Item Name]]"
    quantity: 5
    price_override: null  # Optional override
```

### Item Note Frontmatter
```yaml
type: item
name: "Item Name"
base_price: 50         # In copper pieces (cp)
rarity: common         # common | uncommon | rare | very rare | legendary | artifact
description: "Item description"
imageUrl: "path/to/image.png"  # Optional
```

### Equipment Note Frontmatter
```yaml
type: equipment
name: "Equipment Name"
base_price: 100
equipment_type: weapon  # weapon | armor | adventuring_gear | tool
description: "Equipment description"
```

## Event System

The plugin uses Obsidian's workspace events for cross-view communication:

```typescript
// Triggered when item is modified
this.app.workspace.trigger('shopboard:item-modified', itemPath);

// Triggered when shop display shows item detail
this.app.workspace.trigger('shopboard:show-item-detail', itemData);

// Triggered when grid configuration changes
this.app.workspace.trigger('shopboard:set-columns', columns);
this.app.workspace.trigger('shopboard:set-rows', rows);
```

Views listen to these events to stay synchronized.

## Frontmatter Parsing

The plugin uses Obsidian's built-in metadata cache (`app.metadataCache`) to read frontmatter. When updating frontmatter:

1. Read file content
2. Parse with regex to find YAML block
3. Parse YAML
4. Modify data structure
5. Stringify YAML
6. Replace YAML block in file content
7. Write file

**Important:** Preserve YAML structure and comments when updating.

## File Watching

The plugin watches for file changes using Obsidian's `metadataCache.on('changed')` event, which fires AFTER the cache is updated. This ensures the latest metadata is available before refreshing views.

Shop display views also watch for direct file modifications via `vault.on('modify')` with debouncing to prevent race conditions.

## Wikilink Resolution

The `ItemParser` resolves wikilinks in various formats:
- `[[Item Name]]` - Basic
- `[[Folder/Item Name]]` - With path
- `[[Item Name|Alias]]` - With alias
- `[[Folder/Item Name|Alias]]` - Full

It searches configured item/equipment folders and caches resolved paths.

## Modal System

Modals extend Obsidian's `Modal` class:
- `TemplateSelectionModal` - Choose shop template
- `ShopBuilderModal` - Custom shop creation with live preview
- `LootGeneratorModal` - Treasure generation interface
- `AddItemModal` - Add items to shop inventory
- `BuyItemModal` - Player purchase interface (future)
- `RestockModal` - Restock shop inventory

## Settings Structure

Settings are stored in Obsidian's plugin data:

```typescript
interface ShopboardSettings {
  itemFolders: string[];        // Folders to scan for items
  equipmentFolders: string[];   // Folders to scan for equipment
  currency: {
    system: 'dnd' | 'custom';
    baseCurrency: 'cp';         // Base denomination
    displayCurrency: 'gp';      // Display denomination
    denominations: Array<{name, label, value}>;
  };
  shopTypes: {
    [key: string]: {
      label: string;
      theme: string;
      allowedItemTypes: string[];      // ['*'] = all
      allowedEquipmentTypes: string[];
    }
  };
  defaultColumns: number;
  defaultRows: number;
  openaiApiKey: string;         // For image generation
  imageStyle: string;           // DALL-E style prompt
  attachmentFolder: string;     // Where to save images
}
```

## TypeScript Types

All interfaces are in `src/types/index.ts`:
- `ItemData` - Parsed item/equipment
- `ShopData` - Parsed shop with inventory
- `InventoryItem` - Shop inventory entry
- `GeneratedLoot` - Loot generator output
- `ShopboardSettings` - Plugin settings

## Common Development Patterns

### Creating a New View

1. Create class extending `ItemView` in `src/views/`
2. Define unique `VIEW_TYPE` constant
3. Register view in `main.ts` `onload()`
4. Create corresponding CSS in `styles/`
5. Add CSS to `build.js` cssFiles array

### Adding a Command

```typescript
this.addCommand({
  id: 'unique-id',
  name: 'Command Name',
  callback: async () => {
    // Command logic
  }
});
```

### Parsing a Note

```typescript
const cache = this.app.metadataCache.getFileCache(file);
const frontmatter = cache?.frontmatter;
if (frontmatter?.type === 'shop') {
  const shopData = await this.shopParser.parseShopNote(file);
}
```

### Updating Frontmatter

Use `PurchaseHandler.updateShopQuantity()` or `ShopModifier` methods rather than manual YAML manipulation.

## Deployment

The `deploy.bat` script:
1. Runs `npm run build` (builds JS + bundles CSS)
2. Copies `main.js`, `manifest.json`, `styles.css` to vault
3. Copies `assets/` folder (background images)
4. Displays build time

**Edit the VAULT_DIR path** in `deploy.bat` to match your Obsidian vault location.

## Testing in Obsidian

1. Run `deploy.bat` or manually copy files to `.obsidian/plugins/shopboard/`
2. Reload Obsidian (Ctrl+R or Settings → Community Plugins → Reload)
3. Enable plugin if not already enabled
4. Test features via Command Palette or ribbon menu

## Known Architectural Decisions

### Why Auto-Generated CSS?
Modular CSS improves maintainability (one file per view/theme) but requires bundling for Obsidian plugin deployment. The build system concatenates in a specific order so later files can override earlier ones (e.g., themes override base styles).

### Why Separate Item/Equipment Folders?
D&D has magic items (with rarity) and mundane equipment (weapons, armor). Separating them allows different frontmatter schemas and better shop type filtering.

### Why Item Cache?
Scanning 10,000+ item files on every shop load is slow. The cache is invalidated automatically when items are modified via the metadata cache 'changed' event.

### Why Grid Pagination?
Fixed grid dimensions (columns × rows) maximize screen real estate and provide a consistent layout across different shops. Category headers consume grid cells, creating natural grouping.

## Troubleshooting

**Items not appearing:**
- Check `itemFolders` and `equipmentFolders` in settings
- Run "Refresh item cache" command
- Verify frontmatter has `type: item` or `type: equipment`

**Shop display blank:**
- Check browser console for errors
- Verify shop frontmatter is valid YAML
- Check `styles.css` was deployed to vault

**CSS changes not appearing:**
- Did you edit `styles/` source files (not `styles.css`)?
- Did you run `npm run build`?
- Did you reload Obsidian?

**Purchase recording fails:**
- Check shop note is not open in another pane (edit mode)
- Verify quantities are valid numbers
- Check console for YAML parsing errors

---

Last Updated: 2025-10-15
