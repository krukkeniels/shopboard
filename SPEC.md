# Shopboard - Obsidian Plugin Specification

## Overview
An Obsidian community plugin for managing and displaying shop inventories during D&D sessions. The plugin allows easy creation of shops with customizable pricing and presents them in a pop-out window for display on a large screen/second monitor for players.

## Requirements (Based on User Input)

### Core Features

1. **Plugin Integration**
   - Native Obsidian community plugin (TypeScript)
   - Plugin settings tab for configuration
   - Right-click context menu on shop notes: "Display in Shop Window"
   - Command palette integration
   - Docked sidebar panel for DM controls

2. **Shop Management**
   - Create shops as individual Obsidian notes
   - Define shop inventory using frontmatter
   - Reference items from existing item notes in specified folders
   - Support different shop types with unique templates/styling (magic shop, blacksmith, general store, etc.)
   - Built-in shop templates with user customization support

3. **Pricing Control**
   - Global price modifier per shop (e.g., -20% for discount, +50% for expensive shop)
   - Support percentage-based adjustments
   - Easily editable via frontmatter
   - Configurable currency system in plugin settings (default: D&D GP/SP/CP)

4. **Display System**
   - Shop display opens in new Obsidian pane/leaf
   - Can be popped out to second monitor/window for players
   - Fantasy-themed design with decorative borders and styled fonts
   - Theme-aware styling (adapts to Obsidian theme) with override option
   - View-only interface (no player interaction)
   - Auto-refresh when shop note is saved

5. **DM Control Panel**
   - Docked sidebar panel (like file explorer)
   - Record purchases with quantity inputs
   - Automatic inventory updates to vault files
   - View current shop status and stock levels

6. **Stock Management**
   - Track item quantities in shop frontmatter
   - DM records purchases via control panel
   - System automatically updates shop note quantities

7. **Item Management**
   - Items stored in folders specified in plugin settings
   - Plugin scans configured folders for notes with `type: item` frontmatter
   - Items can be organized across multiple folders (e.g., "Weapons/", "Potions/", "Magic Items/")

8. **Item Availability**
   - All items in shop inventory are always available (no conditional logic)

## Data Structure

### Shop Note Example (Frontmatter)
```yaml
---
type: shop
name: "Mystical Emporium"
shop_type: magic_shop  # Options: magic_shop, blacksmith, general_store, alchemist, etc.
price_modifier: 0  # Percentage: -20 for 20% discount, +50 for 50% markup
inventory:
  - item: "[[Potion of Healing]]"
    quantity: 5
    price_override: null  # Optional: override specific item price
  - item: "[[Sword of Flames]]"
    quantity: 1
    price_override: 2500
---
```

### Item Note Example (Frontmatter)
```yaml
---
type: item
name: "Potion of Healing"
base_price: 50
rarity: common
description: "Restores 2d4+2 hit points"
---
```

## Technical Considerations

### Implementation
**Chosen Approach**: Obsidian Community Plugin (TypeScript)

**Architecture Components**:
1. **Main Plugin Class**: Registers commands, views, and event handlers
2. **Settings Manager**: Plugin settings tab for configuration
3. **Item Parser**: Scans configured folders for item notes
4. **Shop Parser**: Parses shop notes with inventory and pricing
5. **Shop Display View**: Custom ItemView for shop display (pop-out capable)
6. **DM Control View**: Sidebar panel (extends ItemView with right leaf placement)
7. **Price Calculator**: Applies modifiers and formats currency
8. **Purchase Handler**: Updates shop note frontmatter quantities
9. **File Watcher**: Monitors shop note changes for auto-refresh
10. **Template Provider**: Built-in shop templates with user override

**Key Technologies**:
- TypeScript
- Obsidian API
- YAML frontmatter parsing (gray-matter or built-in)
- CSS for fantasy theming
- Obsidian's file event system

### Display Requirements
- Fantasy-themed CSS with theme-aware variables
- Pop-out capable for second monitor
- View-only interface for players
- Real-time price calculation with shop modifiers
- Auto-refresh on shop note save
- Shop type-specific styling (magic shop, blacksmith, etc.)
- Responsive layout for various screen sizes

## User Workflow

1. **Initial Setup**
   - Install Shopboard plugin from Community Plugins (or load locally)
   - Configure plugin settings:
     - Specify item folders (e.g., "Items/Weapons", "Items/Potions", "Magic Items")
     - Set currency system (default D&D GP/SP/CP)
     - Configure shop types and themes
   - Create item notes in configured folders with `type: item` frontmatter

2. **Shop Creation**
   - Use command palette: "Shopboard: Create new shop" (select shop type)
   - OR manually create shop note with frontmatter
   - Set shop name, type, and price modifier
   - Add items to inventory list (use [[wikilinks]] to item notes)
   - Define quantities and optional price overrides

3. **During Session - Display**
   - Right-click on shop note → "Display in Shop Window"
   - Shop opens in new pane
   - Drag pane to pop out to second monitor/window for players
   - Display auto-refreshes when you save shop note

4. **During Session - DM Controls**
   - Open DM Control Panel from ribbon icon or command palette
   - Panel shows currently displayed shop
   - Record purchases: select item, enter quantity sold
   - Shop note quantities automatically update
   - Changes reflect immediately in display window

5. **Customization** (Optional)
   - Override built-in shop templates in vault
   - Customize CSS themes via CSS snippets
   - Adjust currency display format in settings

## Plugin Settings Structure

Settings accessible via: Settings → Community Plugins → Shopboard

```typescript
interface ShopboardSettings {
  // Item Folders
  itemFolders: string[];  // e.g., ["Items/Weapons", "Items/Potions", "Magic Items"]

  // Currency Configuration
  currency: {
    system: string;  // "dnd", "custom"
    denominations: Array<{
      name: string;    // "gp", "sp", "cp"
      label: string;   // "Gold", "Silver", "Copper"
      value: number;   // 1, 0.1, 0.01
    }>;
    display: "auto" | "simple";  // auto = convert to multiple denominations
  };

  // Shop Types
  shopTypes: {
    [key: string]: {
      label: string;  // "Magic Shop"
      theme: string;  // "mystical", "forge", "rustic", "potion"
    }
  };

  // Display Options
  themeOverride: boolean;  // true = use fantasy theme, false = adapt to vault theme
  autoRefresh: boolean;    // true by default
}
```

## Future Enhancements (Optional)
- Shopkeeper personality/description in display
- Category-based inventory filtering
- Random shop generator command
- Multi-currency support with conversion rates
- Shop inventory import/export
- Integration with other D&D plugins
- Advanced price calculation (bulk discounts, bartering)
- Session history log of purchases
