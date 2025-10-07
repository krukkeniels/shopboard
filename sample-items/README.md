# Shopboard Sample Items

This directory contains sample item notes to help you get started with the Shopboard plugin.

## Overview

These sample items are designed to work with the Shopboard plugin's shop templates and demonstrate proper item frontmatter structure.

## Categories

### Weapons (8 items)
- **Longsword** - Versatile blade (15 gp)
- **Battleaxe** - Heavy cleaving weapon (10 gp)
- **Greatsword** - Two-handed sword (50 gp)
- **Shortbow** - Ranged weapon (25 gp)
- **Dagger** - Light throwing weapon (2 gp)
- **Warhammer** - Blunt force weapon (15 gp)
- **Rapier** - Finesse weapon (25 gp)
- **Arrows** - Ammunition bundle (1 gp)

### Armor (3 items)
- **Chain Mail** - Medium armor (75 gp)
- **Plate Armor** - Heavy armor (1500 gp)
- **Shield** - Defensive equipment (10 gp)

### Potions (6 items)
- **Potion of Healing** - Restores 2d4+2 HP (50 gp)
- **Potion of Greater Healing** - Restores 4d4+4 HP (150 gp)
- **Antitoxin** - Protection against poison (50 gp)
- **Alchemist's Fire** - Thrown fire damage (50 gp)
- **Potion of Invisibility** - Grants invisibility (500 gp)
- **Oil of Slipperiness** - Movement enhancement (200 gp)

### Magic Items (5 items)
- **Wand of Magic Missiles** - Spellcasting wand (1200 gp)
- **Ring of Protection** - +1 AC and saves (1000 gp)
- **Cloak of Elvenkind** - Stealth enhancement (800 gp)
- **Scroll of Fireball** - One-use spell scroll (250 gp)
- **Sword of Flames** - +1 flaming longsword (2500 gp)

### General Goods (7 items)
- **Rope (50 ft)** - Adventuring essential (1 gp)
- **Rations (1 day)** - Travel food (5 sp)
- **Torch** - Light source (1 cp)
- **Backpack** - Storage container (2 gp)
- **Bedroll** - Sleeping gear (1 gp)
- **Waterskin** - Liquid container (2 sp)
- **Tinderbox** - Fire starter (5 sp)

## How to Use

### Option 1: Copy to Your Vault

1. Copy the `sample-items` folder to your Obsidian vault
2. In Shopboard settings, add the path to this folder (e.g., `sample-items`)
3. Click "Refresh item cache" in the command palette
4. Create a new shop using the "Create new shop" command

### Option 2: Use as Reference

These items serve as templates for creating your own custom items. Each item follows this structure:

```yaml
---
type: item
name: "Item Name"
base_price: 50
rarity: common
description: "Brief description"
---

# Item Name

Detailed description and mechanics go here.
```

## Required Frontmatter Fields

- **type**: Must be `item` for the plugin to recognize it
- **name**: Display name of the item
- **base_price**: Price in the smallest currency unit (e.g., copper pieces for D&D)
- **rarity**: common, uncommon, rare, very rare, legendary (optional but recommended)
- **description**: Short description for shop display (optional)

## Customization

Feel free to:
- Modify these items to fit your campaign
- Add custom fields for tracking additional properties
- Create your own items following this structure
- Organize items into different folder structures

## Tips

1. **Folder Organization**: Group items by category (Weapons, Armor, Potions, etc.) for easier management
2. **Wikilinks**: Reference items in shop inventories using `[[Item Name]]` syntax
3. **Price Modifiers**: Shop-level price modifiers apply automatically to base prices
4. **Rarities**: Use rarity field for color-coding in shop displays (requires theme support)

## Compatibility

These items are based on D&D 5th Edition rules but can be adapted for any fantasy RPG system. Prices are in gold pieces (gp) or fractions thereof.

## Contributing

If you create additional sample items that would benefit the community, consider contributing them to the Shopboard repository!
