const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Generate SVG icon
const generateSVG = (size, maskable = false) => {
  const padding = maskable ? size * 0.15 : 0;
  const innerSize = size - padding * 2;
  const centerX = size / 2;
  const centerY = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#1a1a2e"/>

  <!-- Somali blue circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${innerSize * 0.38}" fill="#4189DD"/>

  <!-- Q letter -->
  <text x="${centerX}" y="${centerY + innerSize * 0.14}"
        font-family="Arial Black, Arial, sans-serif"
        font-size="${innerSize * 0.45}"
        font-weight="900"
        fill="white"
        text-anchor="middle">Q</text>

  <!-- Small star accent -->
  <circle cx="${centerX + innerSize * 0.2}" cy="${centerY + innerSize * 0.2}" r="${innerSize * 0.055}" fill="#feca57"/>
</svg>`;
};

const iconsDir = path.join(__dirname, '../public/icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  // Sizes needed for PWA
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  // Generate regular icons
  for (const size of sizes) {
    const svg = generateSVG(size, false);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  // Generate maskable icon (with safe zone padding)
  const maskableSvg = generateSVG(512, true);
  await sharp(Buffer.from(maskableSvg))
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  console.log('Generated icon-maskable-512.png');

  // Generate Apple touch icon (180x180)
  const appleSvg = generateSVG(180, false);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate favicon
  const faviconSvg = generateSVG(32, false);
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(path.join(iconsDir, '../favicon.ico'));
  console.log('Generated favicon.ico');

  console.log('\n✓ All icons generated!');
}

generateIcons().catch(console.error);
