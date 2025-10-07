# Shopboard

An Obsidian plugin for managing and displaying shop inventories during D&D sessions. Create shops with customizable pricing and display them in a pop-out window for your players on a second monitor.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### 🏪 Shop Management
- Create shops as individual Obsidian notes with YAML frontmatter
- Support for different shop types (Magic Shop, Blacksmith, General Store, Alchemist)
- Reference items from existing item notes in your vault
- Customizable price modifiers per shop (discounts or markups)
- Track inventory quantities

### 🎨 Player Display
- Beautiful fantasy-themed display for players
- Pop-out capable for second monitor/screen
- Four distinct visual themes for different shop types
- Auto-refresh when shop notes are saved
- View-only interface (no player interaction)

### 🎲 DM Control Panel
- Convenient sidebar panel for DMs
- Record purchases with simple quantity inputs
- Automatic inventory updates to vault files
- Real-time stock level tracking
- Instant sync with player display

### 💰 Flexible Pricing
- Global price modifier per shop (percentage-based)
- Optional per-item price overrides
- Configurable currency system (default: D&D GP/SP/CP)
- Auto-convert to multiple denominations or display as single denomination

### 📝 Shop Creation Tools
- Built-in shop templates for quick creation
- Template selection modal with previews
- Sample items included
- Easy-to-use creation wizard

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Shopboard"
4. Click Install, then Enable

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/yourusername/shopboard/releases)
2. Extract `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/shopboard/` directory
3. Reload Obsidian
4. Enable the plugin in Community Plugins settings

## Quick Start

### 1. Configure Item Folders

1. Open Settings → Community Plugins → Shopboard
2. Set item folders (e.g., `Items, Weapons, Potions`)
3. These folders will be scanned for item notes

### 2. Create Item Notes

Create item notes in your configured folders with the following frontmatter:

```yaml
---
type: item
name: "Potion of Healing"
base_price: 50
rarity: common
description: "Restores 2d4+2 hit points"
---
```

**Required fields:**
- `type: item` - Identifies this as an item note
- `name` - Item name
- `base_price` - Base price in smallest denomination (copper pieces)

**Optional fields:**
- `rarity` - Item rarity (affects visual styling)
- `description` - Item description for players

### 3. Create a Shop Note

#### Using the Creation Wizard (Recommended)

1. Open command palette (Ctrl/Cmd + P)
2. Run "Shopboard: Create new shop"
3. Select a shop template
4. Enter shop name and location
5. Click Create

#### Manually

Create a shop note with the following frontmatter:

```yaml
---
type: shop
name: "Mystical Emporium"
shop_type: magic_shop
price_modifier: 50
inventory:
  - item: "[[Potion of Healing]]"
    quantity: 5
    price_override: null
  - item: "[[Sword of Flames]]"
    quantity: 1
    price_override: 2500
---
```

**Shop Fields:**
- `type: shop` - Identifies this as a shop note
- `name` - Shop name displayed to players
- `shop_type` - Shop type (`magic_shop`, `blacksmith`, `general_store`, `alchemist`)
- `price_modifier` - Percentage modifier (e.g., `50` for +50% markup, `-20` for 20% discount)
- `inventory` - Array of inventory items

**Inventory Item Fields:**
- `item` - Wikilink to item note (e.g., `[[Potion of Healing]]`)
- `quantity` - Number in stock
- `price_override` - Optional price override (null to use calculated price)

### 4. Display the Shop

**Method 1: Context Menu**
1. Right-click on the shop note in file explorer
2. Select "Display in Shop Window"

**Method 2: Command Palette**
1. Open the shop note
2. Open command palette (Ctrl/Cmd + P)
3. Run "Shopboard: Display shop in new pane"

**Method 3: Drag to Second Monitor**
1. Display the shop using Method 1 or 2
2. Drag the pane tab to create a pop-out window
3. Move window to second monitor for players

### 5. Record Purchases (DM)

1. Click the ribbon icon (clipboard) or run "Open DM Control Panel"
2. The DM panel appears in the right sidebar
3. For each purchase:
   - Enter quantity sold
   - Click "Record Sale"
4. Shop note is automatically updated
5. Player display refreshes instantly

## Shop Types & Themes

### Magic Shop (mystical)
- Mystical purple and blue color scheme
- Glowing arcane effects
- Perfect for spell scrolls, potions, and magical items

### Blacksmith (forge)
- Warm reds, oranges, and iron grays
- Forge-themed decorative elements
- Ideal for weapons, armor, and metalwork

### General Store (rustic)
- Earthy browns and warm tones
- Rustic wooden aesthetic
- Great for general goods, supplies, and provisions

### Alchemist (potion)
- Vibrant greens, purples, and amber
- Bubbling potion effects
- Best for potions, ingredients, and alchemical supplies

## Configuration

### Settings Overview

Access settings via: Settings → Community Plugins → Shopboard

- **Item Folders** - Comma-separated folders to scan for items
- **Currency System** - D&D (Gold/Silver/Copper) or Custom
- **Currency Display** - Auto (multiple denominations) or Simple (single)
- **Fantasy Theme Override** - Use fantasy themes or adapt to vault theme
- **Auto-Refresh** - Automatically refresh display when shop notes are saved

### Currency Modes

**Auto Mode (Recommended)**
- Converts prices to multiple denominations
- Example: 156 cp → 1 gp, 5 sp, 6 cp
- More realistic for D&D games

**Simple Mode**
- Displays in single denomination
- Example: 156 cp or 1.56 gp
- Cleaner for quick reference

## Commands

Access via Command Palette (Ctrl/Cmd + P):

- **Display shop in new pane** - Open current shop note in player display
- **Open DM Control Panel** - Toggle DM control sidebar
- **Create new shop** - Open shop creation wizard
- **Refresh item cache** - Manually refresh item database

## Wikilink Formats

The plugin supports various wikilink formats for item references:

```yaml
- item: "[[Potion of Healing]]"          # Basic format
- item: "[[Items/Potion of Healing]]"     # With folder path
- item: "[[Potion of Healing|Potion]]"    # With display alias
```

## Tips & Best Practices

### Organization
- Create separate folders for different item categories (Weapons, Potions, etc.)
- Use consistent naming conventions for items
- Tag items with rarity for better visual organization

### Pricing
- Set base prices in copper pieces for consistency
- Use shop modifiers for location-based pricing (expensive city vs. rural shop)
- Override specific item prices for special deals or rare items

### Performance
- The plugin caches up to 10,000 items for optimal performance
- Item cache is automatically refreshed when folders change
- Manual refresh available if needed

### Display
- Use the fantasy theme override for immersive gameplay
- Pop out the display to a second monitor for players
- Let auto-refresh handle changes - no need to manually update

## Troubleshooting

### Items Not Showing in Shop
- Ensure item notes have `type: item` in frontmatter
- Check that item folders are configured in settings
- Verify wikilinks match exact item names
- Run "Refresh item cache" command

### Shop Won't Display
- Confirm shop note has `type: shop` in frontmatter
- Check for YAML syntax errors in frontmatter
- Ensure all required fields are present

### Prices Showing as 0
- Verify items have `base_price` field
- Check that price is a number, not a string
- Ensure price modifier is a valid number

### Purchase Recording Fails
- Check that quantities are valid integers
- Ensure sufficient stock is available
- Verify shop note is not open in edit mode elsewhere

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/yourusername/shopboard.git
cd shopboard

# Install dependencies
npm install

# Build plugin
npm run build

# Watch for changes (development)
npm run dev
```

### Project Structure

```
shopboard/
├── src/
│   ├── main.ts                 # Main plugin class
│   ├── settings.ts             # Settings manager
│   ├── parsers/                # Item and shop parsers
│   ├── views/                  # Display and control views
│   ├── handlers/               # Purchase handler
│   ├── utils/                  # Utilities (price calculator, templates)
│   └── types/                  # TypeScript interfaces
├── styles/                     # CSS themes
└── manifest.json               # Plugin manifest
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/shopboard/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/shopboard/discussions)

## Roadmap

Future enhancements planned:
- Shopkeeper personality/description display
- Random shop generator
- Category-based inventory filtering
- Multi-currency support with conversion rates
- Bartering/haggling system
- Transaction history logging

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

Developed by [Your Name]

Built with:
- [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- [TypeScript](https://www.typescriptlang.org/)
- [esbuild](https://esbuild.github.io/)

## Changelog

### 1.0.0 (Initial Release)
- Shop creation and management
- Player display with fantasy themes
- DM control panel
- Purchase recording
- Auto-refresh functionality
- Template system
- Four shop types with unique themes

---

**Happy Shopping! 🛒✨**
