import { CurrencyConfig, CurrencyBreakdown } from '../types';

/**
 * Price calculator for applying modifiers and formatting currency
 */
export class PriceCalculator {
	private currencyConfig: CurrencyConfig;

	constructor(currencyConfig: CurrencyConfig) {
		this.currencyConfig = currencyConfig;
	}

	/**
	 * Calculate final price with modifiers
	 * @param basePrice - Base price in base currency denomination
	 * @param modifier - Percentage modifier (e.g., -20 for 20% discount, +50 for 50% markup)
	 * @param override - Optional price override (takes precedence)
	 * @returns Final calculated price in base currency
	 */
	calculatePrice(basePrice: number, modifier: number, override?: number): number {
		// If override exists, use it directly
		if (override !== null && override !== undefined) {
			return Math.max(0, Math.round(override));
		}

		// Validate base price
		if (basePrice < 0) {
			console.warn(`Negative base price detected: ${basePrice}. Using 0 instead.`);
			return 0;
		}

		// Apply percentage modifier: basePrice * (1 + modifier / 100)
		const multiplier = 1 + (modifier / 100);
		const calculatedPrice = Math.round(basePrice * multiplier);

		// Ensure non-negative result
		return Math.max(0, calculatedPrice);
	}

	/**
	 * Convert amount from one currency denomination to another
	 * @param amount - Amount to convert
	 * @param fromCurrency - Source currency denomination name (e.g., 'cp')
	 * @param toCurrency - Target currency denomination name (e.g., 'gp')
	 * @returns Converted amount
	 */
	convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
		// If same currency, no conversion needed
		if (fromCurrency === toCurrency) {
			return amount;
		}

		// Find denominations
		const fromDenom = this.currencyConfig.denominations.find(d => d.name === fromCurrency);
		const toDenom = this.currencyConfig.denominations.find(d => d.name === toCurrency);

		if (!fromDenom) {
			console.warn(`Currency denomination not found: ${fromCurrency}. Using amount as-is.`);
			return amount;
		}

		if (!toDenom) {
			console.warn(`Currency denomination not found: ${toCurrency}. Using amount as-is.`);
			return amount;
		}

		// Convert: amount * (fromValue / toValue)
		// Example: 100 cp (value 0.01) to gp (value 1) = 100 * (0.01 / 1) = 1 gp
		return amount * (fromDenom.value / toDenom.value);
	}

	/**
	 * Format currency for display
	 * @param price - Price in base currency denomination
	 * @returns Formatted currency string in display currency
	 */
	formatCurrency(price: number): string {
		// Handle edge cases
		if (price < 0) {
			console.warn(`Negative price detected: ${price}. Displaying as 0.`);
			price = 0;
		}

		if (!Number.isFinite(price)) {
			console.warn(`Invalid price detected: ${price}. Displaying as 0.`);
			price = 0;
		}

		// Convert from base currency to display currency
		const displayPrice = this.convertCurrency(
			price,
			this.currencyConfig.baseCurrency,
			this.currencyConfig.displayCurrency
		);

		// Check if rounding is enabled
		if (this.currencyConfig.roundForPlayers) {
			// Only round if display value >= 1
			if (displayPrice >= 1) {
				const roundedPrice = Math.ceil(displayPrice);
				return `${roundedPrice} ${this.currencyConfig.displayCurrency}`;
			}
		}

		// Default behavior for prices < 1 or when rounding is disabled
		if (this.currencyConfig.display === 'auto') {
			return this.convertToMultipleDenominations(price).formatted;
		} else {
			return this.formatSimple(displayPrice);
		}
	}

	/**
	 * Format currency in simple mode (single denomination)
	 * @param displayPrice - Price already converted to display currency
	 * @returns Formatted string
	 */
	private formatSimple(displayPrice: number): string {
		// Format with appropriate decimal places
		if (displayPrice % 1 === 0) {
			return `${displayPrice} ${this.currencyConfig.displayCurrency}`;
		} else {
			return `${displayPrice.toFixed(2)} ${this.currencyConfig.displayCurrency}`;
		}
	}

	/**
	 * Convert price to multiple denominations (auto mode)
	 * Example: 156 cp → 1 gp, 5 sp, 6 cp
	 * @param price - Price in base currency denomination
	 * @returns Currency breakdown
	 */
	convertToMultipleDenominations(price: number): CurrencyBreakdown {
		const denominations = this.currencyConfig.denominations;

		if (denominations.length === 0) {
			return {
				denominations: [],
				formatted: `${price} ${this.currencyConfig.baseCurrency}`
			};
		}

		// Sort denominations by value (descending) to process largest first
		const sorted = [...denominations].sort((a, b) => b.value - a.value);

		// Find the smallest denomination value to use as base unit for calculation
		const smallestDenom = sorted[sorted.length - 1];
		const smallestValue = smallestDenom.value;

		// Convert price from baseCurrency to smallest denomination
		const baseDenom = denominations.find(d => d.name === this.currencyConfig.baseCurrency);
		if (!baseDenom) {
			console.warn(`Base currency ${this.currencyConfig.baseCurrency} not found in denominations`);
			return {
				denominations: [],
				formatted: `${price} ${this.currencyConfig.baseCurrency}`
			};
		}

		// Convert to smallest units
		let remainingInSmallestUnits = Math.round(price * (baseDenom.value / smallestValue));

		const breakdown: Array<{ name: string; amount: number }> = [];

		// Calculate each denomination
		for (const denom of sorted) {
			const unitsPerDenom = Math.round(denom.value / smallestValue);
			const count = Math.floor(remainingInSmallestUnits / unitsPerDenom);

			if (count > 0) {
				breakdown.push({
					name: denom.name,
					amount: count
				});
				remainingInSmallestUnits -= count * unitsPerDenom;
			}
		}

		// Format as string
		const formatted = breakdown
			.map(d => `${d.amount} ${d.name}`)
			.join(', ');

		return {
			denominations: breakdown,
			formatted: formatted || `0 ${smallestDenom.name}`
		};
	}

	/**
	 * Update currency configuration
	 * @param currencyConfig - New currency configuration
	 */
	updateConfig(currencyConfig: CurrencyConfig): void {
		this.currencyConfig = currencyConfig;
	}
}
