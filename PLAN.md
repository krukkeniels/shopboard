# Shopboard - Technical Implementation Plan

## Executive Summary

This document outlines the technical implementation plan for Shopboard, an Obsidian community plugin for managing D&D shop inventories. The plugin will enable DMs to create shops, manage inventory, control pricing, and display shop contents to players via a pop-out window.

**Technology Stack**: TypeScript, Obsidian API, YAML frontmatter parsing, CSS
**Estimated Complexity**: Medium (typical community plugin scope)
**Target Users**: D&D Dungeon Masters using Obsidian for campaign management

---

## Technical Architecture Analysis

### 1. Core Architecture Pattern

**Plugin Type**: Obsidian Community Plugin
- Extends `Plugin` class from Obsidian API
- Uses MVC-like pattern: Models (data structures) → Controllers (parsers/handlers) → Views (display/UI)
- Event-driven architecture for file watching and auto-refresh

### 2. Component Architecture

```
ShopboardPlugin (Main)
├── Settings Manager
│   └── ShopboardSettingTab
├── Data Layer
│   ├── Item Parser
│   ├── Shop Parser
│   └── Price Calculator
├── View Layer
│   ├── Shop Display View (ItemView)
│   └── DM Control Panel View (ItemView)
├── Control Layer
│   ├── Purchase Handler
│   ├── File Watcher
│   └── Command Manager
└── Asset Layer
    ├── Template Provider
    └── Theme Manager
```

### 3. Data Flow

```
Shop Note (YAML) → Shop Parser → Data Model → Price Calculator
                                      ↓
                        Shop Display View (Player)
                                      ↓
                        DM Control Panel (DM)
                                      ↓
                        Purchase Handler → Update Shop Note
```

---

## Component Specifications

### 3.1 Main Plugin Class (`main.ts`)

**Responsibilities**:
- Plugin lifecycle management (onload, onunload)
- Register commands, views, ribbon icons
- Initialize settings
- Setup file event listeners

**Key Methods**:
```typescript
class ShopboardPlugin extends Plugin {
  settings: ShopboardSettings;

  async onload(): Promise<void>
  async onunload(): Promise<void>
  async loadSettings(): Promise<void>
  async saveSettings(): Promise<void>

  registerCommands(): void
  registerViews(): void
  registerContextMenu(): void
}
```

**Commands to Register**:
- `shopboard:create-shop` - Create new shop from template
- `shopboard:display-shop` - Open shop in display view
- `shopboard:open-dm-panel` - Open DM control panel
- `shopboard:refresh-items` - Manually refresh item cache

---

### 3.2 Settings Manager (`settings.ts`)

**Data Structure**:
```typescript
interface ShopboardSettings {
  itemFolders: string[];
  currency: CurrencyConfig;
  shopTypes: Record<string, ShopTypeConfig>;
  themeOverride: boolean;
  autoRefresh: boolean;
  version: string; // For future migrations
}

interface CurrencyConfig {
  system: 'dnd' | 'custom';
  denominations: Denomination[];
  display: 'auto' | 'simple';
}

interface Denomination {
  name: string;
  label: string;
  value: number;
}

interface ShopTypeConfig {
  label: string;
  theme: string;
}
```

**Default Settings**:
```typescript
DEFAULT_SETTINGS: ShopboardSettings = {
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
    magic_shop: { label: 'Magic Shop', theme: 'mystical' },
    blacksmith: { label: 'Blacksmith', theme: 'forge' },
    general_store: { label: 'General Store', theme: 'rustic' },
    alchemist: { label: 'Alchemist', theme: 'potion' }
  },
  themeOverride: true,
  autoRefresh: true,
  version: '1.0.0'
}
```

**UI Elements**:
- Text inputs for folder paths (with validation)
- Currency system configuration
- Shop type management (add/edit/remove)
- Toggle switches for theme and auto-refresh

---

### 3.3 Item Parser (`parsers/itemParser.ts`)

**Purpose**: Scan configured folders and parse item notes

**Data Models**:
```typescript
interface ItemData {
  path: string;
  name: string;
  basePrice: number;
  rarity?: string;
  description?: string;
  metadata: Record<string, any>; // Additional frontmatter fields
}

interface ItemCache {
  items: Map<string, ItemData>;
  lastUpdated: number;
}
```

**Key Methods**:
```typescript
class ItemParser {
  private cache: ItemCache;

  async scanItemFolders(folders: string[]): Promise<ItemData[]>
  async parseItemNote(file: TFile): Promise<ItemData | null>
  getItemByName(name: string): ItemData | null
  getItemByPath(path: string): ItemData | null
  invalidateCache(): void
}
```

**Parsing Logic**:
1. Use `vault.getMarkdownFiles()` to get all files
2. Filter by configured folders
3. Parse frontmatter using `app.metadataCache.getFileCache()`
4. Validate `type: item` exists
5. Extract required fields (name, base_price)
6. Cache results in memory for performance

**Error Handling**:
- Missing required fields → Skip item with console warning
- Invalid YAML → Skip item with error log
- Broken wikilinks → Handle gracefully

---

### 3.4 Shop Parser (`parsers/shopParser.ts`)

**Purpose**: Parse shop notes and resolve item references

**Data Models**:
```typescript
interface ShopData {
  path: string;
  name: string;
  shopType: string;
  priceModifier: number;
  inventory: ShopInventoryItem[];
  metadata: Record<string, any>;
}

interface ShopInventoryItem {
  itemRef: string; // Wikilink text
  itemData: ItemData | null; // Resolved item
  quantity: number;
  priceOverride: number | null;
  calculatedPrice: number; // After modifiers
}
```

**Key Methods**:
```typescript
class ShopParser {
  constructor(private itemParser: ItemParser) {}

  async parseShopNote(file: TFile): Promise<ShopData | null>
  resolveInventory(inventory: any[], modifier: number): ShopInventoryItem[]
  validateShopData(frontmatter: any): boolean
}
```

**Parsing Logic**:
1. Extract frontmatter from shop note
2. Validate `type: shop` exists
3. Parse inventory array
4. Resolve wikilinks to actual items using ItemParser
5. Calculate prices with modifiers
6. Return structured ShopData

---

### 3.5 Price Calculator (`utils/priceCalculator.ts`)

**Purpose**: Apply modifiers and format currency

**Key Methods**:
```typescript
class PriceCalculator {
  constructor(private currencyConfig: CurrencyConfig) {}

  calculatePrice(basePrice: number, modifier: number, override?: number): number
  formatCurrency(price: number): string
  convertToMultipleDenominations(price: number): CurrencyBreakdown
}

interface CurrencyBreakdown {
  denominations: Array<{ name: string; amount: number }>;
  formatted: string;
}
```

**Calculation Logic**:
```typescript
// If override exists, use it directly
if (override !== null) return override;

// Otherwise apply percentage modifier
const modifier_multiplier = 1 + (modifier / 100);
return Math.round(basePrice * modifier_multiplier);
```

**Currency Formatting**:
- `auto` mode: Convert 156 cp → 1 gp, 5 sp, 6 cp
- `simple` mode: Display in smallest denomination → "156 cp" or "1.56 gp"

---

### 3.6 Shop Display View (`views/shopDisplayView.ts`)

**Purpose**: Player-facing shop display (pop-out capable)

**Implementation**:
```typescript
export class ShopDisplayView extends ItemView {
  private shopData: ShopData | null;
  private refreshInterval: number | null;

  getViewType(): string { return 'shopboard-display'; }
  getDisplayText(): string { return 'Shop Display'; }
  getIcon(): string { return 'shopping-bag'; }

  async onOpen(): Promise<void>
  async onClose(): Promise<void>

  setShop(shopData: ShopData): void
  render(): void
  setupAutoRefresh(): void
}
```

**UI Structure**:
```html
<div class="shopboard-display" data-shop-type="{shopType}">
  <div class="shop-header">
    <h1 class="shop-name">{name}</h1>
    <div class="shop-type">{shopType}</div>
  </div>

  <div class="shop-inventory">
    <div class="inventory-item" data-rarity="{rarity}">
      <div class="item-name">{name}</div>
      <div class="item-description">{description}</div>
      <div class="item-price">{formattedPrice}</div>
      <div class="item-quantity">Stock: {quantity}</div>
    </div>
  </div>
</div>
```

**Styling Approach**:
- CSS classes for shop types (`.shop-type-magic`, `.shop-type-blacksmith`)
- Fantasy-themed decorative borders and fonts
- Responsive grid layout for items
- Theme-aware CSS variables with override option

**Auto-Refresh**:
- Listen to `vault.on('modify', file => ...)` event
- Check if modified file is current shop
- Re-parse and re-render on change
- Debounce to avoid excessive refreshes (500ms)

---

### 3.7 DM Control Panel View (`views/dmControlView.ts`)

**Purpose**: Sidebar panel for DM to record purchases

**Implementation**:
```typescript
export class DMControlView extends ItemView {
  private currentShop: ShopData | null;

  getViewType(): string { return 'shopboard-dm-control'; }
  getDisplayText(): string { return 'Shop Control'; }
  getIcon(): string { return 'clipboard-list'; }

  async onOpen(): Promise<void>
  async onClose(): Promise<void>

  syncWithDisplay(shopData: ShopData): void
  render(): void
  handlePurchase(itemIndex: number, quantity: number): Promise<void>
}
```

**UI Structure**:
```html
<div class="shopboard-dm-control">
  <div class="control-header">
    <h3>Current Shop</h3>
    <div class="shop-name">{name}</div>
  </div>

  <div class="inventory-controls">
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
  </div>
</div>
```

**Interaction Flow**:
1. User enters quantity to sell
2. Click "Record Sale" button
3. Validate quantity ≤ stock
4. Call PurchaseHandler to update shop note
5. Re-sync display after update

---

### 3.8 Purchase Handler (`handlers/purchaseHandler.ts`)

**Purpose**: Update shop note frontmatter when purchases are recorded

**Key Methods**:
```typescript
class PurchaseHandler {
  async recordPurchase(
    shopFile: TFile,
    itemIndex: number,
    quantitySold: number
  ): Promise<void>

  async updateShopInventory(
    shopFile: TFile,
    inventory: ShopInventoryItem[]
  ): Promise<void>

  private async updateFrontmatter(
    file: TFile,
    updates: Record<string, any>
  ): Promise<void>
}
```

**Update Logic**:
1. Read current shop note content
2. Parse frontmatter
3. Update inventory quantity (subtract sold amount)
4. Serialize back to YAML
5. Write updated content using `vault.modify()`
6. Trigger refresh event

**Frontmatter Update Strategy**:
- Use `gray-matter` library or Obsidian's metadata API
- Preserve formatting and comments where possible
- Handle edge cases (quantity becomes 0, negative values)

---

### 3.9 File Watcher (`utils/fileWatcher.ts`)

**Purpose**: Monitor shop note changes for auto-refresh

**Implementation**:
```typescript
class FileWatcher {
  private watchedFiles: Set<string>;

  constructor(private vault: Vault) {
    this.setupListeners();
  }

  watchFile(path: string, callback: () => void): void
  unwatchFile(path: string): void

  private setupListeners(): void {
    this.vault.on('modify', this.handleFileModify.bind(this));
  }

  private handleFileModify(file: TAbstractFile): void
}
```

**Debouncing**:
- Use debounce utility (lodash or custom) to avoid rapid refreshes
- Wait 500ms after last change before triggering refresh

---

### 3.10 Template Provider (`utils/templateProvider.ts`)

**Purpose**: Provide built-in shop templates

**Template Structure**:
```typescript
interface ShopTemplate {
  name: string;
  shopType: string;
  priceModifier: number;
  sampleInventory: Array<{
    item: string;
    quantity: number;
  }>;
}

const BUILT_IN_TEMPLATES: ShopTemplate[] = [
  {
    name: 'Magic Shop',
    shopType: 'magic_shop',
    priceModifier: 50,
    sampleInventory: []
  },
  // ... more templates
];
```

**Key Methods**:
```typescript
class TemplateProvider {
  getTemplates(): ShopTemplate[]
  createShopFromTemplate(template: ShopTemplate, vault: Vault): Promise<TFile>
  generateShopContent(template: ShopTemplate): string
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Setup plugin skeleton and data layer

**Tasks**:
1. Initialize Obsidian plugin project structure
   - Setup TypeScript configuration
   - Configure build system (esbuild)
   - Create manifest.json
2. Implement Settings Manager
   - Create ShopboardSettings interface
   - Implement ShopboardSettingTab
   - Add default settings
3. Implement Item Parser
   - Create ItemData interface
   - Implement folder scanning
   - Add frontmatter parsing
   - Build in-memory cache
4. Implement Shop Parser
   - Create ShopData interface
   - Parse shop frontmatter
   - Resolve item references
5. Implement Price Calculator
   - Modifier calculation logic
   - Currency formatting
   - Multi-denomination conversion

**Deliverables**:
- Plugin loads in Obsidian
- Settings tab accessible
- Item scanning works
- Shop parsing functional
- Price calculations correct

**Testing**:
- Unit tests for parsers
- Manual testing with sample notes

---

### Phase 2: Display System (Week 2)
**Goal**: Implement shop display view for players

**Tasks**:
1. Create Shop Display View
   - Extend ItemView
   - Register custom view type
   - Implement render logic
2. Design Fantasy Theme CSS
   - Create base theme styles
   - Implement shop-type specific themes
   - Add decorative elements
   - Ensure responsive layout
3. Implement Auto-Refresh
   - Setup file watcher
   - Connect to display view
   - Add debouncing
4. Add Command for Display
   - Register "Display in Shop Window" command
   - Add context menu integration
   - Enable pop-out functionality

**Deliverables**:
- Shop display view opens in new pane
- Fantasy theme applied
- Display updates on shop note changes
- Can be popped out to second window

**Testing**:
- Visual testing with various shops
- Test auto-refresh behavior
- Verify pop-out functionality

---

### Phase 3: DM Control Panel (Week 3)
**Goal**: Implement DM-facing control interface

**Tasks**:
1. Create DM Control View
   - Extend ItemView with right leaf placement
   - Implement inventory list UI
   - Add purchase input controls
2. Implement Purchase Handler
   - Frontmatter update logic
   - Inventory quantity modification
   - File write operations
3. Connect Control Panel to Display
   - Sync current shop state
   - Update both views on changes
4. Add Ribbon Icon
   - Register icon for quick access
   - Toggle control panel visibility

**Deliverables**:
- DM control panel opens in sidebar
- Purchase recording works
- Shop notes update correctly
- Display reflects changes immediately

**Testing**:
- Test purchase recording
- Verify quantity updates
- Test edge cases (0 stock, over-purchase)

---

### Phase 4: Template System (Week 4)
**Goal**: Add shop creation helpers

**Tasks**:
1. Implement Template Provider
   - Create built-in templates
   - Add template selection modal
2. Add Shop Creation Command
   - "Create new shop" command
   - Template selection UI
   - Generate shop note with frontmatter
3. Add Sample Item Notes
   - Create example items for documentation
   - Add to plugin release

**Deliverables**:
- Shop creation wizard works
- Templates generate correct frontmatter
- Sample items included

**Testing**:
- Create shops from each template
- Verify generated frontmatter

---

### Phase 5: Polish & Documentation (Week 5)
**Goal**: Finalize plugin for release

**Tasks**:
1. Error Handling & Validation
   - Add user-friendly error messages
   - Validate settings input
   - Handle missing items gracefully
2. Performance Optimization
   - Optimize item cache
   - Minimize re-renders
   - Profile and optimize hot paths
3. Documentation
   - Write README.md
   - Create user guide
   - Add inline code comments
   - Create demo video/GIF
4. Testing & Bug Fixes
   - Integration testing
   - User acceptance testing
   - Fix identified bugs

**Deliverables**:
- Stable, tested plugin
- Complete documentation
- Ready for community plugin submission

---

## Technical Dependencies

### Required Libraries

1. **Obsidian API** (included)
   - `obsidian` module for plugin base classes
   - Version: Latest (from Obsidian)

2. **YAML Parsing**
   - Option A: Use Obsidian's built-in `app.metadataCache.getFileCache()`
   - Option B: `gray-matter` for manual parsing
   - **Recommendation**: Use Obsidian's built-in API first

3. **TypeScript**
   - Version: 4.7+
   - For type safety and modern features

4. **Build Tool**
   - `esbuild` for fast bundling
   - Configuration in `build.js`

5. **Optional Utilities**
   - `lodash.debounce` for debouncing (or custom implementation)

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^16.11.6",
    "typescript": "^4.7.4",
    "esbuild": "^0.17.3",
    "obsidian": "latest"
  }
}
```

---

## File Structure

```
shopboard/
├── src/
│   ├── main.ts                    # Main plugin class
│   ├── settings.ts                # Settings manager
│   ├── parsers/
│   │   ├── itemParser.ts          # Item note parser
│   │   └── shopParser.ts          # Shop note parser
│   ├── views/
│   │   ├── shopDisplayView.ts     # Player display view
│   │   └── dmControlView.ts       # DM control panel
│   ├── handlers/
│   │   └── purchaseHandler.ts     # Purchase recording
│   ├── utils/
│   │   ├── priceCalculator.ts     # Price calculations
│   │   ├── fileWatcher.ts         # File monitoring
│   │   └── templateProvider.ts    # Shop templates
│   └── types/
│       └── index.ts               # TypeScript interfaces
├── styles/
│   ├── main.css                   # Core plugin styles
│   ├── display.css                # Shop display styles
│   ├── themes/
│   │   ├── magic-shop.css
│   │   ├── blacksmith.css
│   │   ├── general-store.css
│   │   └── alchemist.css
│   └── dm-control.css             # DM panel styles
├── manifest.json                  # Plugin manifest
├── versions.json                  # Version history
├── package.json                   # NPM dependencies
├── tsconfig.json                  # TypeScript config
├── build.js                       # Build script
└── README.md                      # Documentation
```

---

## Risk Analysis & Mitigation

### Risk 1: Frontmatter Corruption
**Probability**: Medium
**Impact**: High (data loss)

**Mitigation**:
- Backup note before modification
- Validate YAML after parsing
- Use Obsidian's API when possible (more robust)
- Add recovery mechanism for malformed data

### Risk 2: Performance with Large Vaults
**Probability**: Medium
**Impact**: Medium (slow loading)

**Mitigation**:
- Implement efficient caching strategy
- Lazy-load items only from configured folders
- Index items on startup, update incrementally
- Add performance metrics/logging

### Risk 3: Wikilink Resolution Failures
**Probability**: High
**Impact**: Low (missing items)

**Mitigation**:
- Handle null/undefined item data gracefully
- Display warning in DM panel for unresolved items
- Provide helpful error messages
- Support both [[Item Name]] and [[Folder/Item Name]] formats

### Risk 4: Theme Compatibility
**Probability**: Medium
**Impact**: Medium (poor display)

**Mitigation**:
- Use CSS variables for theme-aware styling
- Test with popular community themes
- Provide theme override option in settings
- Use semantic class names

### Risk 5: Concurrent Edit Conflicts
**Probability**: Low
**Impact**: Medium (lost updates)

**Mitigation**:
- Use atomic file operations
- Detect file changes before writing
- Show warning if shop modified externally
- Consider optimistic locking

---

## Testing Strategy

### Unit Tests
**Coverage**: Core logic components

**Test Cases**:
- Price calculation with various modifiers
- Currency formatting (auto/simple modes)
- Item parsing with valid/invalid data
- Shop parsing with missing items
- Inventory quantity updates

**Tools**: Jest or similar (if applicable)

### Integration Tests
**Coverage**: Component interactions

**Test Scenarios**:
- Create shop → Display shop → Record purchase → Verify update
- Modify shop externally → Verify auto-refresh
- Change settings → Verify impact on display
- Pop-out window → Verify functionality

### Manual Testing Checklist

**Settings**:
- [ ] Configure item folders (single/multiple)
- [ ] Change currency system
- [ ] Add/edit shop types
- [ ] Toggle theme override
- [ ] Toggle auto-refresh

**Shop Creation**:
- [ ] Create shop from template
- [ ] Create shop manually
- [ ] Add items to inventory
- [ ] Set price modifiers
- [ ] Override specific item prices

**Display**:
- [ ] Open shop in display view
- [ ] Pop out to second window
- [ ] Verify fantasy theme rendering
- [ ] Test with different shop types
- [ ] Verify auto-refresh on save

**DM Controls**:
- [ ] Open DM control panel
- [ ] Record purchases (various quantities)
- [ ] Verify shop note updates
- [ ] Test with 0 stock
- [ ] Test with invalid quantities

**Edge Cases**:
- [ ] Missing item references
- [ ] Malformed frontmatter
- [ ] Empty inventory
- [ ] Very large inventories (100+ items)
- [ ] Special characters in names
- [ ] Negative modifiers
- [ ] Price overrides

---

## Performance Considerations

### Optimization Targets

1. **Item Cache**
   - Cache parsed items in memory
   - Update incrementally (not full rescan)
   - Invalidate on folder changes
   - Target: < 100ms for 1000 items

2. **Display Rendering**
   - Use efficient DOM updates
   - Avoid full re-renders when possible
   - Batch updates
   - Target: < 50ms render time

3. **Auto-Refresh**
   - Debounce file changes (500ms)
   - Only refresh if shop is displayed
   - Skip refresh if content unchanged
   - Target: No user-perceived lag

4. **File Operations**
   - Minimize file reads/writes
   - Use Obsidian's caching when available
   - Batch updates if multiple purchases
   - Target: < 200ms per update

### Memory Management
- Limit cache size (e.g., max 10,000 items)
- Clear display view data on close
- Unregister event listeners on unload

---

## Deployment & Release

### Pre-Release Checklist
- [ ] All core features implemented
- [ ] Manual testing completed
- [ ] Documentation written
- [ ] Demo materials prepared
- [ ] Code reviewed and cleaned
- [ ] Version numbers updated
- [ ] Changelog prepared

### Community Plugin Submission
1. Create GitHub repository
2. Add required files:
   - `manifest.json`
   - `versions.json`
   - `LICENSE`
   - `README.md`
3. Create release with `main.js` and `styles.css`
4. Submit to Obsidian community plugins
5. Respond to review feedback

### Version Strategy
- Initial release: `v1.0.0`
- Follow semantic versioning
- Maintain `versions.json` for updates
- Test updates with beta users first

---

## Future Enhancement Roadmap

### Phase 6: Advanced Features (v1.1)
- Shopkeeper personality/description display
- Category-based inventory filtering
- Multi-shop comparison view
- Bulk purchase recording

### Phase 7: Content Generation (v1.2)
- Random shop generator command
- Procedural inventory generation
- Price variation algorithms
- Stock replenishment automation

### Phase 8: Integration (v1.3)
- Integration with Dataview plugin
- Export/import shop data
- API for other plugins
- Session history logging

### Phase 9: Advanced Commerce (v2.0)
- Bartering/haggling system
- Bulk discount pricing
- NPC reputation modifiers
- Transaction history

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building the Shopboard plugin. The phased approach allows for incremental development and testing, ensuring a stable and feature-complete release.

**Key Success Factors**:
1. Robust frontmatter parsing and updating
2. Reliable auto-refresh mechanism
3. Intuitive DM control interface
4. Beautiful, theme-aware display
5. Comprehensive documentation

**Timeline**: 5 weeks for v1.0 release
**Complexity**: Medium (within typical plugin scope)
**Risk Level**: Low (well-defined requirements, proven architecture pattern)

The modular architecture ensures maintainability and extensibility for future enhancements while keeping the initial implementation focused and achievable.
