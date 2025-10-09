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
	 * @param basePrice - Base price in smallest denomination
	 * @param modifier - Percentage modifier (e.g., -20 for 20% discount, +50 for 50% markup)
	 * @param override - Optional price override (takes precedence)
	 * @returns Final calculated price
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
	 * Format currency for display
	 * @param price - Price in smallest denomination
	 * @returns Formatted currency string
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

		if (this.currencyConfig.display === 'auto') {
			return this.convertToMultipleDenominations(price).formatted;
		} else {
			return this.formatSimple(price);
		}
	}

	/**
	 * Format currency in simple mode (single denomination)
	 * @param price - Price in smallest denomination
	 * @returns Formatted string
	 */
	private formatSimple(price: number): string {
		const denominations = this.currencyConfig.denominations;

		if (denominations.length === 0) {
			return `${price}`;
		}

		// Sort denominations by value (descending)
		const sorted = [...denominations].sort((a, b) => b.value - a.value);

		// Use the highest denomination for display
		const highestDenom = sorted[0];
		const convertedValue = price * highestDenom.value;

		// Format with appropriate decimal places
		if (convertedValue % 1 === 0) {
			return `${convertedValue} ${highestDenom.name}`;
		} else {
			return `${convertedValue.toFixed(2)} ${highestDenom.name}`;
		}
	}

	/**
	 * Convert price to multiple denominations (auto mode)
	 * Example: 156 cp → 1 gp, 5 sp, 6 cp
	 * @param price - Price in smallest denomination
	 * @returns Currency breakdown
	 */
	convertToMultipleDenominations(price: number): CurrencyBreakdown {
		const denominations = this.currencyConfig.denominations;

		if (denominations.length === 0) {
			return {
				denominations: [],
				formatted: `${price}`
			};
		}

		// Sort denominations by value (descending) to process largest first
		const sorted = [...denominations].sort((a, b) => b.value - a.value);

		// Find the smallest denomination value (base unit)
		const smallestValue = sorted[sorted.length - 1].value;

		// Price is already in base units (copper pieces)
		let remainingInBaseUnits = Math.round(price);

		const breakdown: Array<{ name: string; amount: number }> = [];

		// Calculate each denomination
		for (const denom of sorted) {
			const unitsPerDenom = Math.round(denom.value / smallestValue);
			const count = Math.floor(remainingInBaseUnits / unitsPerDenom);

			if (count > 0) {
				breakdown.push({
					name: denom.name,
					amount: count
				});
				remainingInBaseUnits -= count * unitsPerDenom;
			}
		}

		// Format as string
		const formatted = breakdown
			.map(d => `${d.amount} ${d.name}`)
			.join(', ');

		return {
			denominations: breakdown,
			formatted: formatted || '0'
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
