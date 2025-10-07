# Shopboard - Implementation Tasks

## Task Organization

This document breaks down the implementation plan into actionable tasks, organized by phase. Each task includes acceptance criteria and dependencies.

**Development Approach:**
- Follow phased implementation (Phase 1 → Phase 5)
- Basic tests for critical components (parsers, price calculator)
- Start with Obsidian built-in API, fallback to gray-matter if needed
- Detailed CSS design for all shop themes

---

## Phase 1: Foundation (Week 1) ✅ COMPLETE

**Goal:** Setup plugin skeleton and data layer

### 1.1 Project Setup

#### Task 1.1.1: Initialize Plugin Project Structure ✅
- [x] Create plugin directory structure
  ```
  shopboard/
  ├── src/
  │   ├── main.ts
  │   ├── settings.ts
  │   ├── parsers/
  │   ├── views/
  │   ├── handlers/
  │   ├── utils/
  │   └── types/
  ├── styles/
  │   ├── main.css
  │   ├── display.css
  │   ├── themes/
  │   └── dm-control.css
  └── manifest.json
  ```
- [x] Create `manifest.json` with plugin metadata
- [x] Create `package.json` with dependencies
- [x] Create `tsconfig.json` for TypeScript configuration
- [x] Create `build.js` with esbuild configuration
- [x] Add `.gitignore` for node_modules, build artifacts

**Acceptance Criteria:**
- Directory structure matches plan
- Plugin can be built with `npm run build`
- No TypeScript errors

**Dependencies:** None

---

#### Task 1.1.2: Setup TypeScript Configuration ✅
- [x] Configure `tsconfig.json` with strict mode
- [x] Set target to ES6 or later
- [x] Configure module resolution for Obsidian
- [x] Enable source maps for debugging
- [x] Set output directory

**Acceptance Criteria:**
- TypeScript compiler runs without errors
- IDE provides proper type hints

**Dependencies:** Task 1.1.1

---

#### Task 1.1.3: Setup Build System ✅
- [x] Install esbuild as dev dependency
- [x] Create `build.js` script for bundling
- [x] Configure production and development builds
- [x] Add npm scripts: `build`, `dev`, `watch`
- [x] Test build outputs `main.js`

**Acceptance Criteria:**
- `npm run build` produces `main.js`
- `npm run dev` watches for changes
- Build completes in < 5 seconds

**Dependencies:** Task 1.1.1, 1.1.2

---

#### Task 1.1.4: Install Core Dependencies ✅
- [x] Install `obsidian` package (latest)
- [x] Install `@types/node` for type definitions
- [x] Install TypeScript (4.7+)
- [x] Install esbuild (0.17+)
- [x] Document version requirements in README

**Acceptance Criteria:**
- All dependencies install without errors
- `package.json` has correct version constraints

**Dependencies:** Task 1.1.1

---

### 1.2 Type Definitions

#### Task 1.2.1: Create Core Type Interfaces ✅
- [x] Create `src/types/index.ts`
- [x] Define `ItemData` interface
  ```typescript
  interface ItemData {
    path: string;
    name: string;
    basePrice: number;
    rarity?: string;
    description?: string;
    metadata: Record<string, any>;
  }
  ```
- [x] Define `ShopData` interface
  ```typescript
  interface ShopData {
    path: string;
    name: string;
    shopType: string;
    priceModifier: number;
    inventory: ShopInventoryItem[];
    metadata: Record<string, any>;
  }
  ```
- [x] Define `ShopInventoryItem` interface
  ```typescript
  interface ShopInventoryItem {
    itemRef: string;
    itemData: ItemData | null;
    quantity: number;
    priceOverride: number | null;
    calculatedPrice: number;
  }
  ```

**Acceptance Criteria:**
- All interfaces compile without errors
- Interfaces match SPEC.md data structures

**Dependencies:** Task 1.1.2

---

#### Task 1.2.2: Create Settings Type Interfaces ✅
- [x] Define `ShopboardSettings` interface
- [x] Define `CurrencyConfig` interface with system and denominations
- [x] Define `Denomination` interface
- [x] Define `ShopTypeConfig` interface
- [x] Add JSDoc comments for all interfaces

**Acceptance Criteria:**
- Settings interfaces complete per SPEC.md
- Type-safe access to all settings

**Dependencies:** Task 1.2.1

---

#### Task 1.2.3: Create Cache Type Interfaces ✅
- [x] Define `ItemCache` interface
  ```typescript
  interface ItemCache {
    items: Map<string, ItemData>;
    lastUpdated: number;
  }
  ```
- [x] Define `CurrencyBreakdown` interface for price calculator
- [x] Define `ShopTemplate` interface for template provider

**Acceptance Criteria:**
- All cache-related types defined
- Types support efficient lookups

**Dependencies:** Task 1.2.1

---

### 1.3 Settings Manager

#### Task 1.3.1: Create Default Settings ✅
- [x] Create `src/settings.ts`
- [x] Define `DEFAULT_SETTINGS` constant
- [x] Include default D&D currency (GP/SP/CP)
- [x] Include 4 default shop types:
  - magic_shop (mystical theme)
  - blacksmith (forge theme)
  - general_store (rustic theme)
  - alchemist (potion theme)
- [x] Set sensible defaults for all options

**Acceptance Criteria:**
- Default settings compile without errors
- All required fields present

**Dependencies:** Task 1.2.2

---

#### Task 1.3.2: Implement Settings Manager Class ✅
- [x] Create `ShopboardSettingTab` class extending `PluginSettingTab`
- [x] Implement `display()` method
- [x] Add setting for item folders (text input with validation)
- [x] Add setting for currency system dropdown
- [x] Add settings for shop types (add/edit/remove)
- [x] Add toggle for theme override
- [x] Add toggle for auto-refresh

**Acceptance Criteria:**
- Settings tab renders in Obsidian
- All settings persist correctly
- Input validation works

**Dependencies:** Task 1.3.1

---

#### Task 1.3.3: Implement Settings Persistence ✅
- [x] Implement `loadSettings()` method in main plugin
- [x] Implement `saveSettings()` method in main plugin
- [x] Use Obsidian's `loadData()` and `saveData()` APIs
- [x] Handle settings migration for future versions
- [x] Add error handling for corrupted settings

**Acceptance Criteria:**
- Settings persist across Obsidian restarts
- Settings load correctly on plugin initialization

**Dependencies:** Task 1.3.2

---

### 1.4 Item Parser

#### Task 1.4.1: Create Item Parser Class ✅
- [x] Create `src/parsers/itemParser.ts`
- [x] Create `ItemParser` class
- [x] Add private `cache: ItemCache` property
- [x] Implement constructor with App reference
- [x] Add initialization logic

**Acceptance Criteria:**
- ItemParser class instantiates correctly
- Basic structure in place

**Dependencies:** Task 1.2.1, 1.2.3

---

#### Task 1.4.2: Implement Folder Scanning ✅
- [x] Implement `scanItemFolders(folders: string[]): Promise<ItemData[]>`
- [x] Use `app.vault.getMarkdownFiles()` to get all files
- [x] Filter files by configured folders
- [x] Handle nested folder structures
- [x] Return list of file paths to parse

**Acceptance Criteria:**
- Correctly finds files in configured folders
- Handles multiple folders
- Skips non-markdown files

**Dependencies:** Task 1.4.1

---

#### Task 1.4.3: Implement Frontmatter Parsing ✅
- [x] Implement `parseItemNote(file: TFile): Promise<ItemData | null>`
- [x] Use `app.metadataCache.getFileCache()` for parsing
- [x] Validate `type: item` exists in frontmatter
- [x] Extract required fields: name, base_price
- [x] Extract optional fields: rarity, description
- [x] Store additional metadata in `metadata` object
- [x] Return null for invalid items with console warning

**Acceptance Criteria:**
- Correctly parses valid item notes
- Returns null for invalid items
- Logs helpful warnings for missing fields

**Dependencies:** Task 1.4.2

---

#### Task 1.4.4: Implement Item Cache ✅
- [x] Implement cache population in `scanItemFolders()`
- [x] Store parsed items in `Map<string, ItemData>`
- [x] Implement `getItemByName(name: string): ItemData | null`
- [x] Implement `getItemByPath(path: string): ItemData | null`
- [x] Implement `invalidateCache(): void`
- [x] Add timestamp tracking for cache freshness

**Acceptance Criteria:**
- Cache provides O(1) lookups
- Cache updates correctly
- Memory usage reasonable (< 1MB for 1000 items)

**Dependencies:** Task 1.4.3

---

#### Task 1.4.5: Add Error Handling ✅
- [x] Handle missing required fields gracefully
- [x] Handle invalid YAML frontmatter
- [x] Handle broken file references
- [x] Add console warnings for skipped items
- [x] Log parsing errors with file paths

**Acceptance Criteria:**
- Parser never crashes on bad data
- Clear error messages for debugging
- Skips invalid items without stopping scan

**Dependencies:** Task 1.4.3

---

#### Task 1.4.6: Write Tests for Item Parser ✅
- [x] Test parsing valid item note
- [x] Test parsing item with missing required fields
- [x] Test parsing item with invalid YAML
- [x] Test cache lookup performance
- [x] Test folder scanning with nested directories

**Acceptance Criteria:**
- All test cases pass
- 80%+ code coverage for item parser

**Dependencies:** Task 1.4.4, 1.4.5

---

### 1.5 Shop Parser

#### Task 1.5.1: Create Shop Parser Class ✅
- [x] Create `src/parsers/shopParser.ts`
- [x] Create `ShopParser` class
- [x] Add constructor accepting `ItemParser` instance
- [x] Add App reference
- [x] Initialize class structure

**Acceptance Criteria:**
- ShopParser class instantiates correctly
- Has access to ItemParser

**Dependencies:** Task 1.4.1

---

#### Task 1.5.2: Implement Shop Note Parsing ✅
- [x] Implement `parseShopNote(file: TFile): Promise<ShopData | null>`
- [x] Use `app.metadataCache.getFileCache()` for parsing
- [x] Validate `type: shop` exists
- [x] Extract shop metadata: name, shop_type, price_modifier
- [x] Extract inventory array from frontmatter
- [x] Return null for invalid shops

**Acceptance Criteria:**
- Correctly parses valid shop notes
- Returns null for invalid shops
- Extracts all required fields

**Dependencies:** Task 1.5.1

---

#### Task 1.5.3: Implement Inventory Resolution ✅
- [x] Implement `resolveInventory(inventory: any[], modifier: number): ShopInventoryItem[]`
- [x] Parse each inventory entry
- [x] Extract wikilink reference (item field)
- [x] Extract quantity and price_override
- [x] Resolve wikilinks using ItemParser
- [x] Handle unresolved items gracefully (null itemData)
- [x] Return array of ShopInventoryItem

**Acceptance Criteria:**
- Correctly resolves valid item references
- Handles missing items without crashing
- Preserves all inventory metadata

**Dependencies:** Task 1.5.2, Task 1.4.4

---

#### Task 1.5.4: Implement Shop Data Validation ✅
- [x] Implement `validateShopData(frontmatter: any): boolean`
- [x] Check required fields exist
- [x] Validate price_modifier is a number
- [x] Validate inventory is an array
- [x] Validate shop_type exists
- [x] Return true/false with console warnings

**Acceptance Criteria:**
- Validates all required fields
- Provides helpful error messages
- Prevents invalid shops from being processed

**Dependencies:** Task 1.5.2

---

#### Task 1.5.5: Add Wikilink Parsing Support ✅
- [x] Support `[[Item Name]]` format
- [x] Support `[[Folder/Item Name]]` format
- [x] Support `[[Item Name|Display Name]]` format
- [x] Extract actual item reference from wikilink
- [x] Handle edge cases (spaces, special characters)

**Acceptance Criteria:**
- All wikilink formats work correctly
- Item resolution succeeds for valid links

**Dependencies:** Task 1.5.3

---

#### Task 1.5.6: Write Tests for Shop Parser ✅
- [x] Test parsing valid shop note
- [x] Test parsing shop with missing items
- [x] Test wikilink resolution
- [x] Test inventory with price overrides
- [x] Test invalid shop frontmatter

**Acceptance Criteria:**
- All test cases pass
- 80%+ code coverage for shop parser

**Dependencies:** Task 1.5.4, 1.5.5

---

### 1.6 Price Calculator

#### Task 1.6.1: Create Price Calculator Class ✅
- [x] Create `src/utils/priceCalculator.ts`
- [x] Create `PriceCalculator` class
- [x] Add constructor accepting `CurrencyConfig`
- [x] Store currency configuration

**Acceptance Criteria:**
- PriceCalculator instantiates correctly
- Has access to currency config

**Dependencies:** Task 1.2.2

---

#### Task 1.6.2: Implement Price Calculation Logic ✅
- [x] Implement `calculatePrice(basePrice: number, modifier: number, override?: number): number`
- [x] If override exists, return override directly
- [x] Otherwise apply percentage modifier: `basePrice * (1 + modifier / 100)`
- [x] Round result to avoid floating point issues
- [x] Handle negative modifiers (discounts)

**Acceptance Criteria:**
- Correctly applies modifiers
- Overrides take precedence
- Results are properly rounded

**Dependencies:** Task 1.6.1

---

#### Task 1.6.3: Implement Currency Formatting (Simple Mode) ✅
- [x] Implement `formatCurrency(price: number): string` for simple mode
- [x] Display in smallest denomination
- [x] Format with appropriate label (e.g., "156 cp" or "1.56 gp")
- [x] Use configured currency denominations

**Acceptance Criteria:**
- Formats prices correctly in simple mode
- Uses correct denomination labels

**Dependencies:** Task 1.6.2

---

#### Task 1.6.4: Implement Currency Conversion (Auto Mode) ✅
- [x] Implement `convertToMultipleDenominations(price: number): CurrencyBreakdown`
- [x] Break price into multiple denominations
- [x] Example: 156 cp → 1 gp, 5 sp, 6 cp
- [x] Return structured breakdown with formatted string
- [x] Use configured denomination values

**Acceptance Criteria:**
- Correctly converts to multiple denominations
- Minimizes number of coins used
- Handles edge cases (0 price, very large values)

**Dependencies:** Task 1.6.3

---

#### Task 1.6.5: Write Tests for Price Calculator ✅
- [x] Test price calculation with positive modifiers
- [x] Test price calculation with negative modifiers
- [x] Test price overrides
- [x] Test simple currency formatting
- [x] Test auto currency conversion (156 cp → 1g 5s 6c)
- [x] Test edge cases (0, negative, very large)

**Acceptance Criteria:**
- All test cases pass
- 90%+ code coverage for price calculator

**Dependencies:** Task 1.6.4

---

### 1.7 Main Plugin Integration

#### Task 1.7.1: Create Main Plugin Class ✅
- [x] Create `src/main.ts`
- [x] Create `ShopboardPlugin` class extending `Plugin`
- [x] Add `settings: ShopboardSettings` property
- [x] Add references to parsers and utilities
- [x] Implement basic plugin structure

**Acceptance Criteria:**
- Plugin class compiles correctly
- Extends Obsidian Plugin class

**Dependencies:** Task 1.2.2, 1.3.1

---

#### Task 1.7.2: Implement Plugin Lifecycle Methods ✅
- [x] Implement `onload(): Promise<void>`
  - Load settings
  - Initialize parsers
  - Register views (placeholder)
  - Register commands (placeholder)
- [x] Implement `onunload(): Promise<void>`
  - Cleanup resources
  - Unregister listeners
- [x] Add error handling for initialization

**Acceptance Criteria:**
- Plugin loads without errors in Obsidian
- Plugin unloads cleanly

**Dependencies:** Task 1.7.1, Task 1.3.3

---

#### Task 1.7.3: Initialize Parsers in Plugin ✅
- [x] Create ItemParser instance in `onload()`
- [x] Create ShopParser instance with ItemParser
- [x] Create PriceCalculator instance with currency config
- [x] Trigger initial item scan
- [x] Store parser instances as plugin properties

**Acceptance Criteria:**
- All parsers initialize correctly
- Item cache populated on plugin load

**Dependencies:** Task 1.7.2, Task 1.4.4, Task 1.5.1, Task 1.6.1

---

#### Task 1.7.4: Register Settings Tab ✅
- [x] Register ShopboardSettingTab in `onload()`
- [x] Pass plugin reference to settings tab
- [x] Test settings tab appears in Obsidian settings

**Acceptance Criteria:**
- Settings tab appears in Community Plugins settings
- Settings can be modified and saved

**Dependencies:** Task 1.7.2, Task 1.3.2

---

### Phase 1 Deliverables Checklist ✅
- [x] Plugin loads in Obsidian without errors
- [x] Settings tab accessible and functional
- [x] Item scanning works for configured folders
- [x] Shop parsing resolves items correctly
- [x] Price calculations accurate with modifiers
- [x] Basic tests pass for critical components
- [x] Code compiles without TypeScript errors

---

## Phase 2: Display System (Week 2) ✅ COMPLETE

**Goal:** Implement shop display view for players

### 2.1 Shop Display View Structure

#### Task 2.1.1: Create Shop Display View Class ✅
- [x] Create `src/views/shopDisplayView.ts`
- [x] Create `ShopDisplayView` class extending `ItemView`
- [x] Implement required methods:
  - `getViewType(): string` → return `'shopboard-display'`
  - `getDisplayText(): string` → return shop name or "Shop Display"
  - `getIcon(): string` → return `'shopping-bag'`
- [x] Add private properties: `shopData`, `refreshInterval`

**Acceptance Criteria:**
- View class compiles correctly
- Extends ItemView properly

**Dependencies:** Task 1.7.1, Task 1.2.1

---

#### Task 2.1.2: Implement View Lifecycle Methods ✅
- [x] Implement `onOpen(): Promise<void>`
  - Create container element
  - Set up event listeners
  - Initialize auto-refresh if enabled
- [x] Implement `onClose(): Promise<void>`
  - Clear refresh interval
  - Remove event listeners
  - Clean up resources

**Acceptance Criteria:**
- View opens without errors
- Resources cleaned up on close

**Dependencies:** Task 2.1.1

---

#### Task 2.1.3: Register Display View in Plugin ✅
- [x] Register view type in plugin `onload()`
- [x] Use `registerView()` with view type and constructor
- [x] Add method to activate view: `activateDisplayView(shopData: ShopData)`
- [x] Handle existing view instances

**Acceptance Criteria:**
- View registered successfully
- Can be opened programmatically

**Dependencies:** Task 2.1.2, Task 1.7.2

---

### 2.2 Display Rendering

#### Task 2.2.1: Implement Basic Render Method ✅
- [x] Implement `render(): void` method
- [x] Clear container
- [x] Create shop header with name and type
- [x] Create inventory container
- [x] Render each item in inventory
- [x] Handle empty inventory case

**Acceptance Criteria:**
- Shop displays with all items
- Layout is readable

**Dependencies:** Task 2.1.2

---

#### Task 2.2.2: Create HTML Structure ✅
- [x] Generate shop header HTML
  ```html
  <div class="shop-header">
    <h1 class="shop-name">{name}</h1>
    <div class="shop-type">{shopType}</div>
  </div>
  ```
- [x] Generate inventory grid HTML
  ```html
  <div class="shop-inventory">
    <div class="inventory-item" data-rarity="{rarity}">
      <div class="item-name">{name}</div>
      <div class="item-description">{description}</div>
      <div class="item-price">{formattedPrice}</div>
      <div class="item-quantity">Stock: {quantity}</div>
    </div>
  </div>
  ```
- [x] Add data attributes for styling hooks

**Acceptance Criteria:**
- HTML structure matches plan specification
- All data attributes present

**Dependencies:** Task 2.2.1

---

#### Task 2.2.3: Integrate Price Calculator ✅
- [x] Use PriceCalculator to format prices
- [x] Display calculated prices (with modifiers)
- [x] Show price overrides when present
- [x] Use configured currency display mode (auto/simple)

**Acceptance Criteria:**
- Prices display correctly with modifiers applied
- Currency formatting matches settings

**Dependencies:** Task 2.2.2, Task 1.6.4

---

#### Task 2.2.4: Handle Missing Item Data ✅
- [x] Display placeholder for unresolved items
- [x] Show warning indicator for missing items
- [x] Display item reference (wikilink) even if item not found
- [x] Add helpful message for DM

**Acceptance Criteria:**
- Display doesn't break with missing items
- DM can identify which items are missing

**Dependencies:** Task 2.2.2

---

### 2.3 Fantasy Theme CSS

#### Task 2.3.1: Create Base Display Styles ✅
- [x] Create `styles/display.css`
- [x] Style shop container with fantasy theme
- [x] Add decorative borders and backgrounds
- [x] Style shop header with fantasy fonts
- [x] Create responsive grid layout for inventory
- [x] Add spacing and padding

**Acceptance Criteria:**
- Display has cohesive fantasy aesthetic
- Layout is responsive
- Readable on various screen sizes

**Dependencies:** Task 2.2.2

---

#### Task 2.3.2: Create Magic Shop Theme ✅
- [x] Create `styles/themes/magic-shop.css`
- [x] Design mystical color scheme (purples, blues, golds)
- [x] Add magical decorative elements:
  - Arcane borders
  - Glowing effects
  - Mystical patterns
- [x] Style for `.shop-type-magic_shop` selector
- [x] Include rarity-based item coloring (common, uncommon, rare, etc.)

**Acceptance Criteria:**
- Theme evokes magical atmosphere
- Visually distinct from other themes
- All fantasy elements present

**Dependencies:** Task 2.3.1

---

#### Task 2.3.3: Create Blacksmith Theme ✅
- [x] Create `styles/themes/blacksmith.css`
- [x] Design forge color scheme (reds, oranges, iron grays)
- [x] Add forge decorative elements:
  - Anvil/hammer motifs
  - Metal textures
  - Flame accents
- [x] Style for `.shop-type-blacksmith` selector
- [x] Heavy, sturdy visual weight

**Acceptance Criteria:**
- Theme evokes forge/smithy atmosphere
- Visually distinct from other themes
- Conveys craftsmanship

**Dependencies:** Task 2.3.1

---

#### Task 2.3.4: Create General Store Theme ✅
- [x] Create `styles/themes/general-store.css`
- [x] Design rustic color scheme (browns, tans, warm tones)
- [x] Add rustic decorative elements:
  - Wooden textures
  - Simple borders
  - Merchant aesthetic
- [x] Style for `.shop-type-general_store` selector
- [x] Approachable, practical feel

**Acceptance Criteria:**
- Theme evokes general store atmosphere
- Visually distinct from other themes
- Welcoming aesthetic

**Dependencies:** Task 2.3.1

---

#### Task 2.3.5: Create Alchemist Theme ✅
- [x] Create `styles/themes/alchemist.css`
- [x] Design potion color scheme (greens, purples, amber)
- [x] Add alchemical decorative elements:
  - Potion bottle motifs
  - Bubbling effects
  - Herb/ingredient imagery
- [x] Style for `.shop-type-alchemist` selector
- [x] Mysterious, scientific feel

**Acceptance Criteria:**
- Theme evokes alchemy shop atmosphere
- Visually distinct from other themes
- Conveys mystical science

**Dependencies:** Task 2.3.1

---

#### Task 2.3.6: Implement Theme-Aware CSS Variables ✅
- [x] Define CSS variables for theme overrides
- [x] Create variables for:
  - Primary colors
  - Background colors
  - Border styles
  - Font choices
- [x] Implement theme override logic in settings
- [x] Allow themes to adapt to Obsidian theme when override disabled

**Acceptance Criteria:**
- Theme variables defined
- Override setting works correctly
- Themes adapt to light/dark Obsidian themes

**Dependencies:** Task 2.3.5

---

#### Task 2.3.7: Create Main CSS File ✅
- [x] Create `styles/main.css`
- [x] Import all theme CSS files
- [x] Import display.css
- [x] Add global plugin styles
- [x] Configure build to bundle CSS

**Acceptance Criteria:**
- All styles bundled correctly
- CSS loads with plugin
- No style conflicts

**Dependencies:** Task 2.3.6

---

### 2.4 Auto-Refresh System

#### Task 2.4.1: Create File Watcher Utility ✅
- [x] Create `src/utils/fileWatcher.ts`
- [x] Create `FileWatcher` class
- [x] Add constructor with Vault reference
- [x] Implement `watchFile(path: string, callback: () => void): void`
- [x] Implement `unwatchFile(path: string): void`
- [x] Store watched files in Set

**Acceptance Criteria:**
- FileWatcher instantiates correctly
- Can register callbacks for file changes

**Dependencies:** Task 1.7.1

---

#### Task 2.4.2: Implement File Change Listeners ✅
- [x] Setup vault listeners in constructor
- [x] Use `vault.on('modify', handler)` event
- [x] Implement `handleFileModify(file: TAbstractFile): void`
- [x] Check if modified file is watched
- [x] Trigger registered callbacks

**Acceptance Criteria:**
- Detects file modifications
- Calls correct callbacks

**Dependencies:** Task 2.4.1

---

#### Task 2.4.3: Implement Debouncing ✅
- [x] Add debounce utility function or use library
- [x] Wrap file change callbacks with debounce (500ms)
- [x] Prevent rapid successive refreshes
- [x] Clear pending debounces on unwatchFile

**Acceptance Criteria:**
- Multiple rapid changes trigger single refresh
- 500ms delay works correctly

**Dependencies:** Task 2.4.2

---

#### Task 2.4.4: Integrate Auto-Refresh in Display View ✅
- [x] Add `setupAutoRefresh(): void` method to ShopDisplayView
- [x] Register file watcher for current shop file
- [x] Implement refresh callback:
  - Re-parse shop note
  - Re-render display
- [x] Unregister watcher on view close
- [x] Respect auto-refresh setting

**Acceptance Criteria:**
- Display refreshes when shop note saved
- No refresh when auto-refresh disabled
- Watcher cleaned up on close

**Dependencies:** Task 2.4.3, Task 2.2.1

---

### 2.5 Commands and Context Menu

#### Task 2.5.1: Add Display Shop Command ✅
- [x] Register command in plugin `onload()`
- [x] Command ID: `shopboard:display-shop`
- [x] Command name: "Display shop in new pane"
- [x] Check if active file is shop note
- [x] Parse shop and open in display view
- [x] Handle errors gracefully

**Acceptance Criteria:**
- Command appears in command palette
- Opens display view for shop notes
- Shows error for non-shop notes

**Dependencies:** Task 2.1.3

---

#### Task 2.5.2: Add Context Menu Integration ✅
- [x] Register context menu in plugin `onload()`
- [x] Use `registerEvent()` with `file-menu` event
- [x] Add menu item: "Display in Shop Window"
- [x] Only show for files with `type: shop` frontmatter
- [x] Open display view on click

**Acceptance Criteria:**
- Context menu item appears for shop notes
- Opens display view correctly
- Not shown for non-shop notes

**Dependencies:** Task 2.5.1

---

#### Task 2.5.3: Test Pop-Out Functionality ✅
- [x] Verify display view can be dragged to new window
- [x] Test pop-out on Windows
- [x] Test on multiple monitors
- [x] Verify auto-refresh works in popped-out window
- [x] Test closing and reopening

**Acceptance Criteria:**
- View can be popped out
- All functionality works in separate window
- No memory leaks

**Dependencies:** Task 2.4.4, Task 2.5.1

---

### Phase 2 Deliverables Checklist ✅
- [x] Shop display view opens in new pane
- [x] All 4 fantasy themes implemented and visually distinct
- [x] Display updates automatically on shop note changes
- [x] Can be popped out to second window
- [x] Context menu integration works
- [x] Prices display correctly with modifiers
- [x] Missing items handled gracefully

---

## Phase 3: DM Control Panel (Week 3)

**Goal:** Implement DM-facing control interface

### 3.1 DM Control View Structure

#### Task 3.1.1: Create DM Control View Class
- [ ] Create `src/views/dmControlView.ts`
- [ ] Create `DMControlView` class extending `ItemView`
- [ ] Implement required methods:
  - `getViewType(): string` → return `'shopboard-dm-control'`
  - `getDisplayText(): string` → return "Shop Control"
  - `getIcon(): string` → return `'clipboard-list'`
- [ ] Add property: `currentShop: ShopData | null`

**Acceptance Criteria:**
- View class compiles correctly
- Extends ItemView properly

**Dependencies:** Task 2.1.1

---

#### Task 3.1.2: Implement View Lifecycle Methods
- [ ] Implement `onOpen(): Promise<void>`
  - Create container
  - Render initial UI
  - Setup event listeners
- [ ] Implement `onClose(): Promise<void>`
  - Clean up resources
  - Remove event listeners

**Acceptance Criteria:**
- View opens without errors
- Closes cleanly

**Dependencies:** Task 3.1.1

---

#### Task 3.1.3: Register DM Control View in Plugin
- [ ] Register view type in plugin `onload()`
- [ ] Configure view to open in right sidebar
- [ ] Add method to activate view: `activateDMPanel()`
- [ ] Handle existing view instances

**Acceptance Criteria:**
- View registered successfully
- Opens in right sidebar by default

**Dependencies:** Task 3.1.2, Task 1.7.2

---

### 3.2 DM Panel UI

#### Task 3.2.1: Create DM Panel HTML Structure
- [ ] Create panel header with current shop name
- [ ] Create inventory controls container
- [ ] For each item, create control element:
  ```html
  <div class="control-item">
    <div class="item-info">
      <span class="item-name">{name}</span>
      <span class="item-stock">Stock: {quantity}</span>
    </div>
    <div class="purchase-controls">
      <input type="number" min="1" max="{quantity}" value="1" />
      <button class="record-sale">Record Sale</button>
    </div>
  </div>
  ```

**Acceptance Criteria:**
- UI displays all shop inventory items
- Controls are functional
- Layout is clear and usable

**Dependencies:** Task 3.1.2

---

#### Task 3.2.2: Implement Render Method
- [ ] Implement `render(): void` method
- [ ] Clear container
- [ ] Render shop header
- [ ] Render inventory controls for each item
- [ ] Attach event listeners to buttons
- [ ] Handle empty shop case

**Acceptance Criteria:**
- DM panel renders current shop
- All controls visible and clickable

**Dependencies:** Task 3.2.1

---

#### Task 3.2.3: Sync with Display View
- [ ] Implement `syncWithDisplay(shopData: ShopData): void`
- [ ] Update currentShop property
- [ ] Re-render panel with new data
- [ ] Connect to display view changes
- [ ] Ensure both views show same shop

**Acceptance Criteria:**
- DM panel syncs with display view
- Shows correct shop data

**Dependencies:** Task 3.2.2

---

### 3.3 Purchase Handler

#### Task 3.3.1: Create Purchase Handler Class
- [ ] Create `src/handlers/purchaseHandler.ts`
- [ ] Create `PurchaseHandler` class
- [ ] Add constructor with Vault reference
- [ ] Initialize class structure

**Acceptance Criteria:**
- PurchaseHandler instantiates correctly
- Has vault access

**Dependencies:** Task 1.7.1

---

#### Task 3.3.2: Implement Record Purchase Method
- [ ] Implement `recordPurchase(shopFile: TFile, itemIndex: number, quantitySold: number): Promise<void>`
- [ ] Read current shop note content
- [ ] Parse frontmatter
- [ ] Update inventory quantity (subtract sold amount)
- [ ] Handle quantity becoming 0
- [ ] Call update method

**Acceptance Criteria:**
- Correctly updates inventory quantities
- Handles edge cases (0 stock)

**Dependencies:** Task 3.3.1

---

#### Task 3.3.3: Implement Frontmatter Update Method
- [ ] Implement `updateFrontmatter(file: TFile, updates: Record<string, any>): Promise<void>`
- [ ] Read file content using `vault.read()`
- [ ] Parse frontmatter with Obsidian API
- [ ] Apply updates to frontmatter
- [ ] Serialize back to YAML
- [ ] Write updated content using `vault.modify()`
- [ ] Preserve formatting where possible

**Acceptance Criteria:**
- Frontmatter updates correctly
- File formatting preserved
- No data corruption

**Dependencies:** Task 3.3.2

---

#### Task 3.3.4: Add Validation Logic
- [ ] Validate quantity sold ≤ current stock
- [ ] Validate quantity sold > 0
- [ ] Validate item index is valid
- [ ] Show error messages for invalid inputs
- [ ] Prevent negative quantities

**Acceptance Criteria:**
- Invalid purchases rejected
- Clear error messages shown
- Data integrity maintained

**Dependencies:** Task 3.3.2

---

#### Task 3.3.5: Implement Fallback to gray-matter
- [ ] Add gray-matter as optional dependency
- [ ] Implement fallback parsing if Obsidian API fails
- [ ] Test both parsing methods
- [ ] Document when fallback is used
- [ ] Add error handling for both methods

**Acceptance Criteria:**
- Fallback works when needed
- Both methods tested
- No data loss

**Dependencies:** Task 3.3.3

---

### 3.4 Purchase Recording Integration

#### Task 3.4.1: Integrate Purchase Handler in DM View
- [ ] Create PurchaseHandler instance in DMControlView
- [ ] Connect "Record Sale" buttons to handler
- [ ] Implement `handlePurchase(itemIndex: number, quantity: number): Promise<void>`
- [ ] Get quantity from input field
- [ ] Call PurchaseHandler.recordPurchase()
- [ ] Show success/error messages

**Acceptance Criteria:**
- Purchases recorded on button click
- Shop note updated correctly
- User feedback provided

**Dependencies:** Task 3.3.4, Task 3.2.2

---

#### Task 3.4.2: Trigger Display Refresh After Purchase
- [ ] Listen for shop file modifications
- [ ] Trigger display view refresh after purchase
- [ ] Re-sync DM panel with updated data
- [ ] Update stock counts in UI immediately
- [ ] Handle rapid multiple purchases

**Acceptance Criteria:**
- Display updates after purchase
- DM panel shows updated stock
- No race conditions

**Dependencies:** Task 3.4.1, Task 2.4.4

---

#### Task 3.4.3: Add Transaction Feedback
- [ ] Show loading state during purchase recording
- [ ] Display success message with purchase details
- [ ] Show error message if purchase fails
- [ ] Disable controls during processing
- [ ] Re-enable controls after completion

**Acceptance Criteria:**
- User knows when purchase is processing
- Clear feedback on success/failure
- UI doesn't allow duplicate submissions

**Dependencies:** Task 3.4.1

---

### 3.5 Ribbon Icon and Commands

#### Task 3.5.1: Add Ribbon Icon
- [ ] Register ribbon icon in plugin `onload()`
- [ ] Use `addRibbonIcon()` with 'clipboard-list' icon
- [ ] Set tooltip: "Shop Control Panel"
- [ ] Toggle DM panel visibility on click
- [ ] Highlight when panel is open

**Acceptance Criteria:**
- Ribbon icon appears in left sidebar
- Toggles DM panel correctly
- Tooltip shows on hover

**Dependencies:** Task 3.1.3

---

#### Task 3.5.2: Add Open DM Panel Command
- [ ] Register command: `shopboard:open-dm-panel`
- [ ] Command name: "Open DM Control Panel"
- [ ] Activate DM control view
- [ ] Focus on right sidebar

**Acceptance Criteria:**
- Command works from command palette
- Opens DM panel correctly

**Dependencies:** Task 3.5.1

---

### 3.6 DM Panel Styling

#### Task 3.6.1: Create DM Control CSS
- [ ] Create `styles/dm-control.css`
- [ ] Style control panel header
- [ ] Style inventory control items
- [ ] Style purchase inputs and buttons
- [ ] Add hover and active states
- [ ] Ensure readability in sidebar

**Acceptance Criteria:**
- DM panel is visually clear
- Controls are easy to use
- Fits well in sidebar

**Dependencies:** Task 3.2.1

---

#### Task 3.6.2: Add Responsive Design
- [ ] Handle narrow sidebar widths
- [ ] Stack controls vertically if needed
- [ ] Ensure buttons are clickable
- [ ] Test with different Obsidian themes

**Acceptance Criteria:**
- Panel usable at various widths
- Works in light and dark themes

**Dependencies:** Task 3.6.1

---

### Phase 3 Deliverables Checklist
- [ ] DM control panel opens in sidebar
- [ ] Purchase recording works correctly
- [ ] Shop notes update with new quantities
- [ ] Display view reflects changes immediately
- [ ] Ribbon icon provides quick access
- [ ] Error handling for edge cases (0 stock, over-purchase)
- [ ] UI provides clear feedback

---

## Phase 4: Template System (Week 4)

**Goal:** Add shop creation helpers

### 4.1 Template Provider

#### Task 4.1.1: Create Template Provider Class
- [ ] Create `src/utils/templateProvider.ts`
- [ ] Define `ShopTemplate` interface
- [ ] Create `TemplateProvider` class
- [ ] Add constructor with settings reference

**Acceptance Criteria:**
- TemplateProvider instantiates correctly
- Interface defined

**Dependencies:** Task 1.2.1

---

#### Task 4.1.2: Define Built-in Templates
- [ ] Create template for Magic Shop
  - shop_type: magic_shop
  - price_modifier: +50
  - Sample magical items
- [ ] Create template for Blacksmith
  - shop_type: blacksmith
  - price_modifier: 0
  - Sample weapons/armor
- [ ] Create template for General Store
  - shop_type: general_store
  - price_modifier: -10
  - Sample general goods
- [ ] Create template for Alchemist
  - shop_type: alchemist
  - price_modifier: +20
  - Sample potions/ingredients

**Acceptance Criteria:**
- All 4 templates defined
- Each has appropriate defaults
- Sample inventories included

**Dependencies:** Task 4.1.1

---

#### Task 4.1.3: Implement Template Generation
- [ ] Implement `generateShopContent(template: ShopTemplate): string`
- [ ] Generate YAML frontmatter from template
- [ ] Include shop metadata
- [ ] Include sample inventory
- [ ] Format cleanly

**Acceptance Criteria:**
- Generated content is valid YAML
- Contains all required fields
- Readable formatting

**Dependencies:** Task 4.1.2

---

#### Task 4.1.4: Implement Shop Creation
- [ ] Implement `createShopFromTemplate(template: ShopTemplate, vault: Vault, name: string, path: string): Promise<TFile>`
- [ ] Generate shop content
- [ ] Create file at specified path
- [ ] Write content to file
- [ ] Return TFile reference

**Acceptance Criteria:**
- Successfully creates shop files
- Files are valid shop notes
- Can be parsed by ShopParser

**Dependencies:** Task 4.1.3

---

### 4.2 Template Selection Modal

#### Task 4.2.1: Create Template Selection Modal Class
- [ ] Create `src/modals/templateSelectionModal.ts`
- [ ] Create `TemplateSelectionModal` class extending `Modal`
- [ ] Display list of available templates
- [ ] Add preview for each template
- [ ] Handle template selection

**Acceptance Criteria:**
- Modal displays correctly
- Shows all templates
- Selection works

**Dependencies:** Task 4.1.2

---

#### Task 4.2.2: Add Shop Name Input
- [ ] Add text input for shop name
- [ ] Add text input for file path (with default)
- [ ] Validate inputs
- [ ] Show preview of file path

**Acceptance Criteria:**
- Inputs work correctly
- Validation prevents invalid names
- Default path is sensible

**Dependencies:** Task 4.2.1

---

#### Task 4.2.3: Implement Template Preview
- [ ] Display template details
- [ ] Show shop type and theme
- [ ] Show sample inventory
- [ ] Show price modifier
- [ ] Update preview on template selection

**Acceptance Criteria:**
- Preview updates in real-time
- Shows relevant template info

**Dependencies:** Task 4.2.1

---

### 4.3 Shop Creation Command

#### Task 4.3.1: Add Create Shop Command
- [ ] Register command: `shopboard:create-shop`
- [ ] Command name: "Create new shop"
- [ ] Open TemplateSelectionModal
- [ ] Handle user selection
- [ ] Create shop from template

**Acceptance Criteria:**
- Command appears in palette
- Opens modal correctly
- Creates shop successfully

**Dependencies:** Task 4.2.2, Task 4.1.4

---

#### Task 4.3.2: Add Success Feedback
- [ ] Show notice on successful creation
- [ ] Open newly created shop file
- [ ] Optionally open in display view
- [ ] Handle creation errors

**Acceptance Criteria:**
- User knows shop was created
- New file opens automatically
- Errors handled gracefully

**Dependencies:** Task 4.3.1

---

### 4.4 Sample Items

#### Task 4.4.1: Create Sample Item Pack
- [ ] Create directory: `sample-items/`
- [ ] Create 10-15 sample weapon items
- [ ] Create 10-15 sample potion items
- [ ] Create 10-15 sample magic items
- [ ] Create 5-10 sample general goods
- [ ] All items have proper frontmatter

**Acceptance Criteria:**
- Sample items are diverse
- All items parseable
- Cover different rarities and prices

**Dependencies:** Task 1.4.3

---

#### Task 4.4.2: Add Sample Items to Plugin Release
- [ ] Include sample-items/ in plugin bundle
- [ ] Add instructions for using samples
- [ ] Provide command to copy samples to vault
- [ ] Document sample item structure

**Acceptance Criteria:**
- Samples available in release
- Easy for users to access
- Documentation clear

**Dependencies:** Task 4.4.1

---

### 4.5 Template Customization

#### Task 4.5.1: Document Custom Template Creation
- [ ] Add documentation for custom templates
- [ ] Explain template structure
- [ ] Provide examples
- [ ] Explain how to override built-in templates

**Acceptance Criteria:**
- Users can create custom templates
- Documentation is clear

**Dependencies:** Task 4.1.2

---

### Phase 4 Deliverables Checklist
- [ ] Shop creation wizard works
- [ ] All 4 templates generate correct frontmatter
- [ ] Sample items included and documented
- [ ] Template selection modal is intuitive
- [ ] Newly created shops can be displayed immediately

---

## Phase 5: Polish & Documentation (Week 5)

**Goal:** Finalize plugin for release

### 5.1 Error Handling & Validation

#### Task 5.1.1: Add User-Friendly Error Messages
- [ ] Review all error scenarios
- [ ] Replace generic errors with helpful messages
- [ ] Add suggestions for fixing issues
- [ ] Use Obsidian Notice API for user-visible errors
- [ ] Log technical details to console

**Acceptance Criteria:**
- All errors have helpful messages
- Users know how to fix issues
- Technical details logged for debugging

**Dependencies:** All previous tasks

---

#### Task 5.1.2: Validate Settings Input
- [ ] Validate folder paths exist
- [ ] Validate currency denominations are valid
- [ ] Validate shop types are properly configured
- [ ] Show warnings for invalid settings
- [ ] Prevent invalid settings from being saved

**Acceptance Criteria:**
- Invalid settings rejected
- Warnings guide users to corrections
- No crashes from bad settings

**Dependencies:** Task 1.3.2

---

#### Task 5.1.3: Handle Missing Items Gracefully
- [ ] Display clear warnings for unresolved wikilinks
- [ ] Show which items are missing in DM panel
- [ ] Provide suggestions (check item folder, check wikilink)
- [ ] Don't break display when items missing

**Acceptance Criteria:**
- Missing items don't crash plugin
- Users can identify and fix missing items
- Display still functional

**Dependencies:** Task 2.2.4

---

#### Task 5.1.4: Add Boundary Checks
- [ ] Check for empty inventories
- [ ] Check for negative prices
- [ ] Check for invalid quantities
- [ ] Check for malformed frontmatter
- [ ] Handle extremely large values

**Acceptance Criteria:**
- All edge cases handled
- No unexpected crashes
- Graceful degradation

**Dependencies:** All parser tasks

---

### 5.2 Performance Optimization

#### Task 5.2.1: Optimize Item Cache
- [ ] Profile item cache performance
- [ ] Optimize cache lookup speed (target: O(1))
- [ ] Implement incremental cache updates
- [ ] Add cache size limits (max 10,000 items)
- [ ] Clear cache on settings change

**Acceptance Criteria:**
- Item lookups < 100ms for 1000 items
- Memory usage reasonable
- No memory leaks

**Dependencies:** Task 1.4.4

---

#### Task 5.2.2: Optimize Display Rendering
- [ ] Profile render performance
- [ ] Minimize DOM manipulations
- [ ] Use document fragments for batch updates
- [ ] Avoid full re-renders when possible
- [ ] Target: < 50ms render time

**Acceptance Criteria:**
- Rendering is fast and smooth
- No visible lag
- Efficient DOM updates

**Dependencies:** Task 2.2.1

---

#### Task 5.2.3: Optimize Auto-Refresh
- [ ] Only refresh if shop is currently displayed
- [ ] Skip refresh if content unchanged
- [ ] Optimize debounce delay (test different values)
- [ ] Batch multiple changes if needed

**Acceptance Criteria:**
- No unnecessary refreshes
- No user-perceived lag
- Efficient resource usage

**Dependencies:** Task 2.4.4

---

#### Task 5.2.4: Profile and Optimize Hot Paths
- [ ] Profile plugin with large vaults (1000+ items)
- [ ] Identify performance bottlenecks
- [ ] Optimize critical paths
- [ ] Test with various vault sizes
- [ ] Document performance characteristics

**Acceptance Criteria:**
- Plugin performant with large vaults
- No slowdowns during normal use
- Startup time < 1 second

**Dependencies:** All previous tasks

---

### 5.3 Documentation

#### Task 5.3.1: Write README.md
- [ ] Project overview and description
- [ ] Features list
- [ ] Installation instructions
- [ ] Quick start guide
- [ ] Screenshots/GIFs of features
- [ ] Link to detailed documentation
- [ ] Credits and license

**Acceptance Criteria:**
- README is comprehensive
- Easy to understand for new users
- Includes visual examples

**Dependencies:** All features complete

---

#### Task 5.3.2: Create User Guide
- [ ] Getting started tutorial
- [ ] Shop creation walkthrough
- [ ] Item management guide
- [ ] Display and DM panel usage
- [ ] Settings explanation
- [ ] Troubleshooting section
- [ ] FAQ

**Acceptance Criteria:**
- Users can learn all features
- Common issues addressed
- Examples provided

**Dependencies:** Task 5.3.1

---

#### Task 5.3.3: Add Code Documentation
- [ ] Add JSDoc comments to all public methods
- [ ] Document complex algorithms
- [ ] Add inline comments for tricky code
- [ ] Document architecture decisions
- [ ] Create developer guide for contributors

**Acceptance Criteria:**
- Code is well-documented
- Developers can understand codebase
- Contribution guide available

**Dependencies:** All code complete

---

#### Task 5.3.4: Create Demo Materials
- [ ] Record demo video (2-3 minutes)
- [ ] Create animated GIFs for key features
- [ ] Take screenshots for documentation
- [ ] Create sample vault for demos
- [ ] Add to README and release

**Acceptance Criteria:**
- Visual materials showcase plugin
- Easy to understand plugin value
- Professional presentation

**Dependencies:** Task 5.3.1

---

### 5.4 Testing & Bug Fixes

#### Task 5.4.1: Integration Testing
- [ ] Test complete workflow: create shop → display → record purchase
- [ ] Test with multiple shops simultaneously
- [ ] Test pop-out window functionality
- [ ] Test with different Obsidian themes
- [ ] Test on different platforms (Windows/Mac/Linux if possible)

**Acceptance Criteria:**
- All workflows work end-to-end
- No critical bugs found
- Cross-platform compatibility verified

**Dependencies:** All features complete

---

#### Task 5.4.2: Edge Case Testing
- [ ] Test with empty vaults
- [ ] Test with very large vaults (1000+ notes)
- [ ] Test with special characters in names
- [ ] Test with deeply nested folders
- [ ] Test rapid user interactions
- [ ] Test network issues (if applicable)

**Acceptance Criteria:**
- All edge cases handled
- No crashes or data loss
- Graceful error handling

**Dependencies:** Task 5.1.4

---

#### Task 5.4.3: User Acceptance Testing
- [ ] Recruit beta testers
- [ ] Provide test instructions
- [ ] Collect feedback
- [ ] Document issues found
- [ ] Prioritize and fix bugs

**Acceptance Criteria:**
- Beta testers can use plugin successfully
- Major issues identified and fixed
- Positive feedback received

**Dependencies:** Task 5.4.1

---

#### Task 5.4.4: Fix Identified Bugs
- [ ] Review all bug reports
- [ ] Prioritize bugs by severity
- [ ] Fix critical bugs
- [ ] Fix major bugs
- [ ] Document known minor issues for future releases

**Acceptance Criteria:**
- No critical or major bugs remaining
- Plugin stable for release
- Known issues documented

**Dependencies:** Task 5.4.3

---

### 5.5 Release Preparation

#### Task 5.5.1: Prepare Release Files
- [ ] Build final production version
- [ ] Generate `main.js`
- [ ] Generate `styles.css`
- [ ] Create `manifest.json` with correct version
- [ ] Create `versions.json`
- [ ] Add LICENSE file (MIT or similar)

**Acceptance Criteria:**
- All required files generated
- Version numbers correct
- Files tested and working

**Dependencies:** All features complete

---

#### Task 5.5.2: Create Changelog
- [ ] Document all features in v1.0.0
- [ ] Note any known limitations
- [ ] Credit contributors
- [ ] Format according to Keep a Changelog

**Acceptance Criteria:**
- Changelog is complete
- Users understand what's included
- Formatted consistently

**Dependencies:** Task 5.3.1

---

#### Task 5.5.3: Create GitHub Repository
- [ ] Create public repository
- [ ] Add all source files
- [ ] Add documentation
- [ ] Add sample items
- [ ] Configure repository settings
- [ ] Add topics/tags for discoverability

**Acceptance Criteria:**
- Repository is well-organized
- All files present
- Repository is public

**Dependencies:** Task 5.5.1

---

#### Task 5.5.4: Create Release
- [ ] Tag version v1.0.0
- [ ] Create GitHub release
- [ ] Upload `main.js`, `styles.css`, `manifest.json`
- [ ] Include release notes
- [ ] Link to documentation

**Acceptance Criteria:**
- Release is published
- Files downloadable
- Notes are clear

**Dependencies:** Task 5.5.3

---

#### Task 5.5.5: Submit to Obsidian Community Plugins
- [ ] Fork obsidian-releases repository
- [ ] Add plugin to community-plugins.json
- [ ] Create pull request
- [ ] Respond to reviewer feedback
- [ ] Address any required changes

**Acceptance Criteria:**
- Plugin submitted for review
- PR meets all requirements
- Responsive to feedback

**Dependencies:** Task 5.5.4

---

### Phase 5 Deliverables Checklist
- [ ] All core features working and tested
- [ ] No critical bugs
- [ ] Complete documentation (README, user guide, code comments)
- [ ] Demo video/GIFs created
- [ ] Performance optimized
- [ ] Error handling comprehensive
- [ ] GitHub repository created
- [ ] Release v1.0.0 published
- [ ] Submitted to Obsidian community plugins
- [ ] Ready for public use

---

## Post-Release Tasks

### Maintenance
- [ ] Monitor GitHub issues
- [ ] Respond to user questions
- [ ] Triage and fix bugs
- [ ] Release patch versions as needed

### Future Enhancements
- [ ] Review Phase 6-9 roadmap in PLAN.md
- [ ] Gather user feedback for priorities
- [ ] Plan v1.1 release with advanced features

---

## Task Summary Statistics

**Total Tasks by Phase:**
- Phase 1 (Foundation): 35 tasks
- Phase 2 (Display): 29 tasks
- Phase 3 (DM Controls): 19 tasks
- Phase 4 (Templates): 15 tasks
- Phase 5 (Polish): 24 tasks

**Total: 122 tasks**

**Estimated Effort:**
- Phase 1: ~1 week
- Phase 2: ~1 week
- Phase 3: ~1 week
- Phase 4: ~1 week
- Phase 5: ~1 week

**Total: ~5 weeks for v1.0.0 release**

---

## Notes

- Tasks are designed to be granular and actionable
- Each task has clear acceptance criteria
- Dependencies are explicitly noted
- Testing integrated throughout development
- Phased approach allows for incremental progress
- Can pause between phases for review
