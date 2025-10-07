# Shopboard Templates Guide

This guide explains how to use and customize shop templates in the Shopboard plugin.

## Built-in Templates

Shopboard comes with 4 pre-configured shop templates:

### 1. Magic Shop
- **Theme**: Mystical (purple, blue, gold colors)
- **Price Modifier**: +50% (expensive magical goods)
- **Typical Items**: Potions, scrolls, wands, magical weapons and armor
- **Atmosphere**: Arcane and mysterious

### 2. Blacksmith
- **Theme**: Forge (red, orange, iron gray)
- **Price Modifier**: 0% (standard prices)
- **Typical Items**: Weapons, armor, shields, ammunition
- **Atmosphere**: Sturdy and practical

### 3. General Store
- **Theme**: Rustic (brown, tan, warm tones)
- **Price Modifier**: -10% (discounted everyday goods)
- **Typical Items**: Rope, rations, torches, backpacks, waterskins
- **Atmosphere**: Welcoming and practical

### 4. Alchemist
- **Theme**: Potion (green, purple, amber)
- **Price Modifier**: +20% (premium alchemical goods)
- **Typical Items**: Healing potions, antitoxin, alchemist's fire, oils
- **Atmosphere**: Mysterious and scientific

## Using Templates

### Creating a Shop from Template

1. Open the command palette (Ctrl/Cmd + P)
2. Type "Create new shop" and select the command
3. Choose a template from the dropdown
4. Enter a custom shop name
5. (Optional) Specify a folder path
6. Click "Create Shop"

The plugin will:
- Generate a new shop note with proper frontmatter
- Include sample inventory items
- Apply the template's theme and price modifier
- Open the new file for editing

### Template Preview

The template selection modal shows a live preview including:
- Shop type and theme
- Price modifier
- Sample inventory items
- Description

Use this preview to choose the best template for your needs.

## Customizing Templates

### Method 1: Modify Generated Shops

After creating a shop from a template, you can freely customize it:

```yaml
---
type: shop
name: "The Prancing Pony"  # Change the name
shop_type: general_store    # Keep or change the type
price_modifier: -15         # Adjust the price modifier
inventory:
  - item: "[[Ale (mug)]]"   # Add custom items
    quantity: 100
    price_override: null
  - item: "[[Room (night)]]"
    quantity: 5
    price_override: 5        # Set specific prices
---
```

### Method 2: Create Custom Shop Types

You can define custom shop types in the plugin settings:

1. Go to Settings → Shopboard
2. Scroll to "Shop Types"
3. Add a new shop type:
   - **ID**: `tavern` (lowercase, no spaces)
   - **Label**: "Tavern"
   - **Theme**: Choose from existing themes or create custom CSS

Then create shops manually with your custom type:

```yaml
---
type: shop
name: "The Drunken Dragon"
shop_type: tavern
price_modifier: 0
inventory:
  # Your inventory here
---
```

### Method 3: Programmatic Templates (Advanced)

For developers, you can extend the `TemplateProvider` class:

```typescript
// In your plugin code or extension
const customTemplate: ShopTemplate = {
  name: 'Tavern',
  shopType: 'tavern',
  priceModifier: 0,
  description: 'A cozy tavern with food and lodging',
  sampleInventory: [
    { item: '[[Ale (mug)]]', quantity: 50, priceOverride: null },
    { item: '[[Meal (common)]]', quantity: 20, priceOverride: null },
    { item: '[[Room (night)]]', quantity: 5, priceOverride: null }
  ]
};
```

## Template Structure

### Required Fields

```yaml
type: shop              # Must be "shop"
name: "Shop Name"       # Display name
shop_type: magic_shop   # Theme identifier
price_modifier: 50      # Percentage modifier (-100 to +1000)
inventory: []           # Array of items
```

### Inventory Item Structure

```yaml
- item: "[[Item Name]]"     # Wikilink to item note
  quantity: 5               # Stock quantity
  price_override: null      # null or specific price
```

### Optional Fields

You can add custom fields for your own purposes:

```yaml
---
type: shop
name: "Mysterious Shop"
shop_type: magic_shop
price_modifier: 50
shopkeeper: "Gandalf the Merchant"
location: "Waterdeep, Dock Ward"
reputation: 5
inventory:
  # ...
---
```

## Price Modifier Examples

### Discount Shop
```yaml
price_modifier: -20  # 20% discount
```

If an item's base price is 100 gp:
- Calculated price: 100 × (1 - 0.20) = **80 gp**

### Premium Shop
```yaml
price_modifier: 50  # 50% markup
```

If an item's base price is 100 gp:
- Calculated price: 100 × (1 + 0.50) = **150 gp**

### Price Overrides

Individual items can have fixed prices that ignore the shop modifier:

```yaml
inventory:
  - item: "[[Legendary Sword]]"
    quantity: 1
    price_override: 5000  # Always 5000 gp, regardless of modifier
```

## Custom Themes

### Creating Custom CSS Themes

1. Create a CSS snippet in your vault (`.obsidian/snippets/`)
2. Define styles for your custom shop type:

```css
/* Custom Tavern Theme */
.shop-type-tavern {
  --shop-primary-color: #8B4513;
  --shop-secondary-color: #DEB887;
  --shop-accent-color: #FFD700;
}

.shop-type-tavern .shop-header {
  background: linear-gradient(135deg,
    var(--shop-primary-color),
    var(--shop-secondary-color));
  border: 3px solid var(--shop-accent-color);
}

.shop-type-tavern .inventory-item {
  border-left-color: var(--shop-accent-color);
}
```

3. Enable the CSS snippet in Obsidian settings
4. Your custom theme will apply to shops with `shop_type: tavern`

### Theme CSS Variables

Available CSS variables for customization:

- `--shop-primary-color`: Main theme color
- `--shop-secondary-color`: Secondary theme color
- `--shop-accent-color`: Accent/highlight color
- `--shop-background`: Background color
- `--shop-text-color`: Text color
- `--shop-border-color`: Border color

## Best Practices

### 1. Consistent Naming

Use consistent naming for shop types:
- **Good**: `magic_shop`, `weapon_shop`, `potion_shop`
- **Avoid**: `MagicShop`, `magic-shop`, `Magic Shop`

### 2. Reasonable Price Modifiers

Keep price modifiers in a reasonable range:
- **Typical**: -30% to +100%
- **Extreme**: -50% to +200%
- **Unrealistic**: Below -90% or above +500%

### 3. Sample Inventory

Include 3-8 sample items in templates:
- Too few: Doesn't showcase the shop type
- Too many: Overwhelming to customize

### 4. Descriptive Names

Give shops descriptive names:
- **Good**: "Elara's Enchanted Emporium", "The Rusty Anvil"
- **Avoid**: "Shop 1", "Test", "asdf"

## Troubleshooting

### Template Not Appearing

**Problem**: Custom template doesn't show in selection modal

**Solutions**:
- Ensure template is properly registered in plugin settings
- Check that shop_type matches between template and settings
- Reload the plugin

### Theme Not Applying

**Problem**: Custom theme CSS not applying to shop

**Solutions**:
- Check CSS snippet is enabled in Obsidian settings
- Verify shop_type exactly matches CSS class selector
- Clear cache and reload (Ctrl/Cmd + R)
- Check browser console for CSS errors

### Items Not Resolving

**Problem**: Items show as "missing" in shop display

**Solutions**:
- Ensure item folders are configured in plugin settings
- Verify item notes have `type: item` in frontmatter
- Check wikilink format: `[[Item Name]]` not `[Item Name]`
- Run "Refresh item cache" command

## Examples

### Example 1: Budget Weapon Shop

```yaml
---
type: shop
name: "Bob's Bargain Blades"
shop_type: blacksmith
price_modifier: -25
inventory:
  - item: "[[Dagger]]"
    quantity: 20
    price_override: null
  - item: "[[Shortsword]]"
    quantity: 10
    price_override: null
  - item: "[[Longsword]]"
    quantity: 5
    price_override: null
---
```

### Example 2: Exclusive Magic Shop

```yaml
---
type: shop
name: "Arcanum Infinitum"
shop_type: magic_shop
price_modifier: 100
inventory:
  - item: "[[Ring of Protection]]"
    quantity: 1
    price_override: 2000
  - item: "[[Wand of Magic Missiles]]"
    quantity: 2
    price_override: null
  - item: "[[Scroll of Fireball]]"
    quantity: 5
    price_override: null
---
```

### Example 3: Traveling Merchant

```yaml
---
type: shop
name: "Wandering Merchant's Wares"
shop_type: general_store
price_modifier: 10
location: "Currently in Neverwinter"
availability: "Changes weekly"
inventory:
  - item: "[[Rope (50 ft)]]"
    quantity: 3
    price_override: null
  - item: "[[Potion of Healing]]"
    quantity: 8
    price_override: null
  - item: "[[Rations (1 day)]]"
    quantity: 50
    price_override: null
---
```

## Additional Resources

- **Item Creation Guide**: See sample-items/README.md
- **Plugin Settings**: Customize currency, folders, and shop types
- **Theme Gallery**: Browse community-created themes (coming soon)
- **Support**: Report issues on GitHub

---

**Next Steps**: Try creating your first shop with a template, then customize it to fit your campaign's needs!
