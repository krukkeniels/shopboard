/**
 * Generate background images for each shop type using OpenAI DALL-E
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Shop type configurations with detailed prompts
const SHOP_BACKGROUNDS = [
	{
		type: 'magic_shop',
		filename: 'magic-shop-bg.png',
		prompt: 'Interior of a mystical magic shop, fantasy RPG setting. Shelves lined with glowing magical artifacts, spell books, and enchanted items. Floating candles casting purple and blue ethereal light. Crystal ball on wooden counter. Arcane symbols glowing on dark wooden walls. Mysterious atmosphere with magical particles floating in the air. Velvet curtains, ornate shelves. Wide angle interior view, no people, professional game background art, highly detailed, digital painting style.'
	},
	{
		type: 'blacksmith',
		filename: 'blacksmith-bg.png',
		prompt: 'Interior of a medieval blacksmith forge, fantasy RPG setting. Hot forge with glowing orange embers and flames. Anvil in foreground with hammers and tools. Weapons and armor displayed on stone walls. Smoke rising from the furnace. Warm orange and red glow illuminating the dark workshop. Rough stone walls, wooden beams, iron tools hanging. Wide angle interior view, no people, professional game background art, highly detailed, digital painting style.'
	},
	{
		type: 'general_store',
		filename: 'general-store-bg.png',
		prompt: 'Interior of a cozy medieval general store, fantasy RPG setting. Wooden shelves stocked with supplies, barrels and sacks of goods. Rope coils hanging from ceiling beams. Merchant counter with brass scales. Warm lantern light creating inviting atmosphere. Natural wood tones, practical storage. Various wares displayed on wooden tables and shelves. Wide angle interior view, no people, professional game background art, highly detailed, digital painting style.'
	},
	{
		type: 'alchemist',
		filename: 'alchemist-bg.png',
		prompt: 'Interior of a mysterious alchemist laboratory, fantasy RPG setting. Bubbling potions in colorful glass vials and flasks. Green and purple mystical glowing liquids. Herbs and ingredients hanging to dry from ceiling. Glass apparatus and beakers on cluttered worktables. Ancient books with alchemical formulas. Steam and mysterious vapor rising. Wide angle interior view, no people, professional game background art, highly detailed, digital painting style.'
	}
];

async function downloadImage(url, filepath) {
	return new Promise((resolve, reject) => {
		https.get(url, (response) => {
			if (response.statusCode !== 200) {
				reject(new Error(`Failed to download: ${response.statusCode}`));
				return;
			}

			const fileStream = fs.createWriteStream(filepath);
			response.pipe(fileStream);

			fileStream.on('finish', () => {
				fileStream.close();
				resolve();
			});

			fileStream.on('error', (err) => {
				fs.unlink(filepath, () => {});
				reject(err);
			});
		}).on('error', reject);
	});
}

async function generateBackgrounds() {
	// Get API key from environment or prompt
	const apiKey = process.env.OPENAI_API_KEY || process.argv[2];

	if (!apiKey) {
		console.error('❌ Error: OpenAI API key not provided');
		console.log('\nUsage:');
		console.log('  node generate-backgrounds.js YOUR_API_KEY');
		console.log('  OR');
		console.log('  OPENAI_API_KEY=your_key node generate-backgrounds.js');
		process.exit(1);
	}

	const openai = new OpenAI({ apiKey });

	// Create assets directory if it doesn't exist
	const assetsDir = path.join(__dirname, 'assets', 'backgrounds');
	if (!fs.existsSync(assetsDir)) {
		fs.mkdirSync(assetsDir, { recursive: true });
	}

	console.log('🎨 Starting background generation...\n');

	for (const shop of SHOP_BACKGROUNDS) {
		try {
			console.log(`🔮 Generating ${shop.type} background...`);

			const response = await openai.images.generate({
				model: 'dall-e-3',
				prompt: shop.prompt,
				n: 1,
				size: '1792x1024', // Landscape format for backgrounds
				quality: 'standard',
				response_format: 'url'
			});

			const imageUrl = response.data[0]?.url;
			if (!imageUrl) {
				throw new Error('No image URL returned');
			}

			// Download and save the image
			const filepath = path.join(assetsDir, shop.filename);
			await downloadImage(imageUrl, filepath);

			console.log(`✅ Saved: ${filepath}\n`);

		} catch (error) {
			console.error(`❌ Error generating ${shop.type}:`, error.message);

			if (error.message.includes('billing')) {
				console.error('\n💡 Tip: Check your OpenAI billing status at https://platform.openai.com/account/billing');
			}
			process.exit(1);
		}
	}

	console.log('🎉 All backgrounds generated successfully!');
	console.log(`📁 Images saved to: ${assetsDir}`);
}

// Run the generator
generateBackgrounds().catch(error => {
	console.error('Fatal error:', error);
	process.exit(1);
});
