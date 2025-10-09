# Item Template Guide

This guide explains how to create item notes that work with the Shopboard plugin.

## Quick Start

Create a new markdown file with the following frontmatter structure:

```markdown
---
type: item
name: "Potion of Healing"
base_price: 50
rarity: common
description: "A magical potion that restores health"
image_url: ""
---

# Potion of Healing

A standard healing potion that glows with a soft red light.

## Effects
- Restores 2d4+2 hit points
- Takes one action to drink

## Description
This crimson liquid pulses with healing energy when held up to the light.
```

## Frontmatter Fields

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `type` | string | Must be `"item"` | `item` |
| `name` | string | Display name of the item | `"Longsword"` |
| `base_price` | number | Base price in **copper pieces** | `5000` (= 50gp) |

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `rarity` | string | Item rarity (common, uncommon, rare, very rare, legendary) | `"uncommon"` |
| `description` | string | Short description of the item | `"A finely crafted blade"` |
| `image_url` | string | URL or path to item image | `"https://example.com/sword.png"` |
| `staple_for_shops` | array or string | Shop types where this item is always available | `["alchemist", "general_store"]` |

**Note:** Any additional frontmatter fields will be preserved in the `metadata` object and can be used for custom purposes.

## Price System

Prices are stored in **copper pieces** (the smallest denomination). Use this conversion:

- **1 Copper Piece (cp)** = 1
- **1 Silver Piece (sp)** = 10 cp
- **1 Gold Piece (gp)** = 100 cp
- **1 Platinum Piece (pp)** = 1000 cp

### Price Examples

```yaml
# 50 copper
base_price: 50

# 5 silver (50 copper)
base_price: 50

# 25 gold (2500 copper)
base_price: 2500

# 10 platinum (10,000 copper)
base_price: 10000
```

## Rarity Levels

The plugin recognizes these D&D 5e rarity levels (in order):

1. **common** - Everyday items, readily available
2. **uncommon** - Less common, some magical properties
3. **rare** - Difficult to find, significant magical properties
4. **very rare** - Extremely rare, powerful magical properties
5. **legendary** - Unique or near-unique items

Rarity affects:
- **Shop Builder**: Can filter items by rarity range
- **Stock Quantities**: Rarer items get lower stock counts when randomly generated
  - Common: 3-15 stock
  - Uncommon: 2-8 stock
  - Rare: 1-5 stock
  - Very Rare: 1-3 stock
  - Legendary: 1-2 stock

## Staple Items

Mark items as **staple items** for specific shop types to ensure they're always available in those shops.

### What are Staple Items?

Staple items are essential products that a shop always keeps in stock, like health potions in an alchemist's shop or basic weapons in a blacksmith.

### How It Works

Use the `staple_for_shops` frontmatter field with shop type identifiers:

```yaml
---
type: item
name: "Potion of Healing"
base_price: 5000
rarity: common
staple_for_shops: ["alchemist", "general_store"]
---
```

### Benefits

- **Shop Generation**: When "Include Staple Items" is checked, these items are added first
- **Restocking**: Staple items are:
  - Never removed (never sold out)
  - Have 50% less chance of quantity reduction
  - Automatically re-added if missing during restock

### Shop Type Values

Use these identifiers (from your settings):
- `alchemist` - Alchemy & potion shops
- `blacksmith` - Weapon & armor forges
- `general_store` - General goods
- `magic_shop` - Magic item vendors
- Or any custom shop types you've configured

### Examples

**Single shop type:**
```yaml
staple_for_shops: "blacksmith"
```

**Multiple shop types:**
```yaml
staple_for_shops: ["alchemist", "general_store", "magic_shop"]
```

## Complete Examples

### Example 1: Basic Weapon

```markdown
---
type: item
name: "Longsword"
base_price: 1500
rarity: common
description: "A versatile martial weapon"
---

# Longsword

A well-balanced sword with a long blade.

**Damage:** 1d8 slashing (1d10 versatile)
**Weight:** 3 lb
**Properties:** Versatile
```

### Example 2: Magic Item

```markdown
---
type: item
name: "Ring of Protection"
base_price: 350000
rarity: rare
description: "A magical ring that wards off harm"
image_url: "attachments/ring-of-protection.png"
attunement: true
item_type: ring
---

# Ring of Protection

This elegant silver ring is inscribed with protective runes.

## Properties
- **Attunement Required:** Yes
- **Bonus:** +1 to AC and saving throws

## Description
While wearing this ring, you gain a +1 bonus to Armor Class and saving throws.
```

### Example 3: Consumable

```markdown
---
type: item
name: "Potion of Greater Healing"
base_price: 15000
rarity: uncommon
description: "Restores a significant amount of health"
consumable: true
uses: 1
---

# Potion of Greater Healing

A vibrant red potion that glows with magical energy.

**Healing:** 4d4+4 hit points
**Action:** Drink (1 action) or administer to another (1 action)

This potion's magic is more potent than a standard healing potion.
```

### Example 4: Custom Metadata

```markdown
---
type: item
name: "Dwarven Smithing Hammer"
base_price: 5000
rarity: uncommon
description: "A masterwork tool for smithing"
tool_type: artisan
proficiency_required: "Smith's tools"
crafting_bonus: 2
weight: 5
materials: ["steel", "oak"]
---

# Dwarven Smithing Hammer

An expertly crafted hammer bearing dwarven runes.

## Crafting Bonus
When used for smithing, this tool grants a +2 bonus to ability checks.

## History
Forged in the mountain halls of Ironpeak, this hammer has shaped countless legendary weapons.
```

### Example 5: Staple Item

```markdown
---
type: item
name: "Potion of Healing"
base_price: 5000
rarity: common
description: "Restores 2d4+2 hit points"
staple_for_shops: ["alchemist", "general_store"]
---

# Potion of Healing

A standard healing potion found in almost every shop.

**Healing:** 2d4+2 hit points
**Action:** Drink (1 action)

This crimson liquid is a staple in adventurers' kits and is reliably stocked by alchemists and general stores.
```

### Example 6: Blacksmith Staple

```markdown
---
type: item
name: "Longsword"
base_price: 1500
rarity: common
description: "A versatile martial weapon"
staple_for_shops: "blacksmith"
---

# Longsword

Every blacksmith keeps a selection of longswords in stock.

**Damage:** 1d8 slashing (1d10 versatile)
**Weight:** 3 lb
**Properties:** Versatile
```

## Folder Organization

Configure which folders contain items in **Settings → Shopboard → Item Folders**.

### Recommended Structure

```
vault/
├── Items/
│   ├── Weapons/
│   │   ├── Longsword.md
│   │   ├── Shortsword.md
│   │   └── Battleaxe.md
│   ├── Armor/
│   │   ├── Chain Mail.md
│   │   └── Leather Armor.md
│   ├── Potions/
│   │   ├── Potion of Healing.md
│   │   └── Potion of Greater Healing.md
│   └── Magic Items/
│       ├── Ring of Protection.md
│       └── Wand of Magic Missiles.md
```

## Using Items in Shops

Once created, items can be referenced in shop inventories using wikilinks:

```yaml
inventory:
  - item: "[[Longsword]]"
    quantity: 3
    price_override: null
  - item: "[[Items/Potions/Potion of Healing]]"
    quantity: 10
    price_override: 75  # Override: 75cp instead of base price
```

### Shop Builder Integration

The **Build Custom Shop** feature uses your items to generate random inventories:

1. **Size**: Choose small/medium/large/huge (affects item count)
2. **Budget**: Set max total inventory value (0 = unlimited)
3. **Rarity Filter**: Only include items within min/max rarity
4. **Price Modifier**: Apply shop-wide markup or discount
5. **Include Staple Items**: Toggle to add items marked for this shop type first

Example: Create a "Small Magic Shop" with 5-10 items, only uncommon-to-rare, 500gp budget.

**With Staple Items Enabled:**
- Staple items for the selected shop type are added first
- Remaining slots are filled with random items
- Staple items respect rarity and budget constraints

## Best Practices

### 1. **Use Descriptive Names**
```yaml
name: "Potion of Greater Healing"  # Good
name: "pghealing"                   # Bad
```

### 2. **Set Realistic Prices**
Base prices on D&D 5e guidelines or your campaign economy.

### 3. **Always Include Rarity**
Even for common items - helps with filtering and shop generation.

### 4. **Use Images Sparingly**
Images enhance the shop display but aren't required. Use for special/magic items.

### 5. **Consistent Folder Structure**
Keep similar items together for easier management.

### 6. **Refresh Cache After Changes**
After adding/editing items, use **Ribbon Menu → Refresh Item Cache** to update the plugin's cache.

## Troubleshooting

### Item Not Appearing in Shops

1. **Check the folder path** - Is the item in a configured item folder?
2. **Verify frontmatter** - Required fields: `type: item`, `name`, `base_price`
3. **Refresh cache** - Ribbon Menu → Refresh Item Cache
4. **Check console** - Look for parsing errors in Developer Console (Ctrl+Shift+I)

### Item Shows as "Not Found"

- Item file may have been moved or deleted
- Check wikilink syntax in shop inventory: `[[Item Name]]`
- Item name in frontmatter must match wikilink reference

### Price Not Displaying Correctly

- Ensure `base_price` is a number (not a string)
- Remember: prices are in copper pieces
  - 1 gold = 100 copper
  - 50 gold = 5000 copper

## Advanced: Custom Metadata

You can add any custom fields to item frontmatter:

```yaml
---
type: item
name: "Ancient Grimoire"
base_price: 100000
rarity: very rare
# Custom fields
spell_school: evocation
spell_level: 5
pages: 237
condition: worn
historical_significance: high
previous_owner: "Archmage Thalindra"
---
```

Custom metadata is preserved and accessible but not used by the plugin's core features. Great for:
- Campaign-specific properties
- Integration with other plugins
- Rich item descriptions
- Custom sorting/filtering

## Questions?

- **GitHub Issues**: [Report bugs or request features](https://github.com/anthropics/claude-code/issues)
- **Settings**: Configure item folders, currency, and shop types
- **Sample Items**: Check the `sample-items/` folder for more examples

---

**Happy worldbuilding! 🎲**
