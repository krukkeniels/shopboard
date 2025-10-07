# Changelog

All notable changes to the Shopboard plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added

#### Core Features
- **Shop Management System**
  - Create shops as Obsidian notes with YAML frontmatter
  - Support for multiple shop types (Magic Shop, Blacksmith, General Store, Alchemist)
  - Reference items from existing item notes in vault
  - Customizable price modifiers per shop (percentage-based)
  - Inventory quantity tracking

- **Item System**
  - Item parser with folder scanning
  - In-memory cache for O(1) item lookups
  - Support for item metadata (name, base price, rarity, description)
  - Cache size limit of 10,000 items for optimal performance
  - Wikilink support for item references

- **Player Display View**
  - Fantasy-themed display for players
  - Pop-out capable for second monitor/screen
  - Four distinct visual themes (mystical, forge, rustic, potion)
  - Auto-refresh when shop notes are saved
  - View-only interface with no player interaction
  - Graceful handling of missing items with warnings

- **DM Control Panel**
  - Sidebar panel for DMs
  - Purchase recording with quantity inputs
  - Automatic inventory updates to vault files
  - Real-time stock level tracking
  - Instant synchronization with player display
  - Input validation for purchase quantities

- **Price Calculator**
  - Global price modifier application
  - Per-item price override support
  - Configurable currency system (D&D GP/SP/CP)
  - Auto-convert to multiple denominations
  - Simple single-denomination display mode
  - Edge case handling for negative and invalid prices

- **Shop Creation Tools**
  - Built-in shop templates (4 types)
  - Template selection modal with previews
  - Shop creation wizard
  - Sample inventory generation

- **Commands**
  - Display shop in new pane
  - Open DM Control Panel
  - Create new shop
  - Refresh item cache

#### User Interface
- Context menu integration for shop notes
- Ribbon icon for quick DM panel access
- Settings tab with configuration options
- Empty state displays
- Error state handling
- User-friendly error messages with Notices

#### Settings
- Item folder configuration
- Currency system selection (D&D or custom)
- Currency display mode (auto or simple)
- Fantasy theme override toggle
- Auto-refresh toggle
- Shop type management

#### Performance Optimizations
- Item cache with 10,000 item limit
- Performance metrics logging (scan time tracking)
- Efficient O(1) lookups via Map structure
- Debounced auto-refresh (500ms delay)
- Optimized folder scanning

#### Error Handling & Validation
- Comprehensive input validation for all settings
- Boundary checks for prices and quantities
- Graceful handling of missing items
- YAML frontmatter validation
- Clear console warnings for debugging
- User-facing error messages via Notices

#### Developer Features
- TypeScript with strict type checking
- ESBuild for fast compilation
- Modular architecture with separation of concerns
- Comprehensive inline documentation
- Development watch mode

### Technical Details

#### Architecture
- MVC-like pattern implementation
- Event-driven file watching system
- Parser-based frontmatter handling
- View-based display rendering

#### Dependencies
- Obsidian API (latest)
- TypeScript 4.7+
- esbuild 0.17+
- No external runtime dependencies

### Documentation
- Comprehensive README with quick start guide
- Troubleshooting section
- Development guide
- MIT License
- Complete JSDoc comments

### Known Limitations
- Maximum 10,000 items in cache
- Requires Obsidian 0.15.0 or higher
- Auto-refresh limited to 500ms debounce

---

## Future Roadmap

### Planned for v1.1
- Shopkeeper personality/description display
- Category-based inventory filtering
- Enhanced template customization

### Planned for v1.2
- Random shop generator
- Procedural inventory generation
- Stock replenishment automation

### Planned for v1.3
- Multi-currency support with conversion rates
- Transaction history logging
- Export/import shop data

### Planned for v2.0
- Bartering/haggling system
- Bulk discount pricing
- NPC reputation modifiers
- Advanced transaction management

---

## Version History

- **1.0.0** - Initial release with core features

---

[1.0.0]: https://github.com/yourusername/shopboard/releases/tag/v1.0.0
