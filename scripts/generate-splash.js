const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Generate splash screen SVG
const generateSplashSVG = (width, height) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const logoSize = Math.min(width, height) * 0.25;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <!-- Logo circle -->
  <circle cx="${centerX}" cy="${centerY - logoSize * 0.2}" r="${logoSize * 0.45}" fill="#4189DD"/>

  <!-- Q letter -->
  <text x="${centerX}" y="${centerY + logoSize * 0.05}"
        font-family="Arial Black, Arial, sans-serif"
        font-size="${logoSize * 0.5}"
        font-weight="900"
        fill="white"
        text-anchor="middle">Q</text>

  <!-- Star accent -->
  <circle cx="${centerX + logoSize * 0.25}" cy="${centerY + logoSize * 0.05}" r="${logoSize * 0.06}" fill="#feca57"/>

  <!-- App name -->
  <text x="${centerX}" y="${centerY + logoSize * 0.7}"
        font-family="Arial, sans-serif"
        font-size="${logoSize * 0.18}"
        font-weight="600"
        fill="white"
        text-anchor="middle">LEARING</text>

  <!-- Tagline -->
  <text x="${centerX}" y="${centerY + logoSize * 0.95}"
        font-family="Arial, sans-serif"
        font-size="${logoSize * 0.1}"
        fill="rgba(255,255,255,0.6)"
        text-anchor="middle">Preschool Chaos</text>
</svg>`;
};

const splashDir = path.join(__dirname, '../public/splash');

// Ensure directory exists
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

async function generateSplashScreens() {
  // Common iOS splash screen sizes
  const sizes = [
    { width: 1170, height: 2532, name: 'splash-1170x2532' }, // iPhone 12/13/14
    { width: 1284, height: 2778, name: 'splash-1284x2778' }, // iPhone 12/13/14 Pro Max
    { width: 1125, height: 2436, name: 'splash-1125x2436' }, // iPhone X/XS/11 Pro
    { width: 1242, height: 2688, name: 'splash-1242x2688' }, // iPhone XS Max/11 Pro Max
    { width: 828, height: 1792, name: 'splash-828x1792' },   // iPhone XR/11
    { width: 750, height: 1334, name: 'splash-750x1334' },   // iPhone 8/SE
    { width: 2048, height: 2732, name: 'splash-2048x2732' }, // iPad Pro 12.9
  ];

  for (const { width, height, name } of sizes) {
    const svg = generateSplashSVG(width, height);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(splashDir, `${name}.png`));
    console.log(`Generated ${name}.png`);
  }

  console.log('\n✓ All splash screens generated!');
}

generateSplashScreens().catch(console.error);
