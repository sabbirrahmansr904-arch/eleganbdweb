import fs from 'fs';
import sharp from 'sharp';

// SVG representation of the official Elegan BD logo provided by the user
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="1200" height="1200">
  <rect width="600" height="600" fill="#000000"/>
  <g transform="skewX(-16)">
    <!-- Top Bar -->
    <rect x="250" y="160" width="180" height="64" fill="#FFFFFF" />
    <!-- Middle Bar (protrudes to the left) -->
    <rect x="180" y="268" width="180" height="64" fill="#FFFFFF" />
    <!-- Bottom Bar -->
    <rect x="222" y="376" width="180" height="64" fill="#FFFFFF" />
  </g>
</svg>`;

// Open Graph (og:image) banner - 1200x630 landscape canvas for social share previews
const ogSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#000000"/>
  <!-- Centered Logo Mark -->
  <g transform="translate(450, 110) scale(0.8)">
    <g transform="skewX(-16)">
      <!-- Top Bar -->
      <rect x="250" y="120" width="180" height="64" fill="#FFFFFF" />
      <!-- Middle Bar -->
      <rect x="180" y="228" width="180" height="64" fill="#FFFFFF" />
      <!-- Bottom Bar -->
      <rect x="222" y="336" width="180" height="64" fill="#FFFFFF" />
    </g>
  </g>
  <text x="600" y="470" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" fill="#FFFFFF" text-anchor="middle" letter-spacing="6">ELEGAN BD</text>
  <text x="600" y="520" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="20" fill="#D97706" text-anchor="middle" letter-spacing="8">PREMIUM CLOTHING BRAND</text>
</svg>`;

async function main() {
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }
  if (!fs.existsSync('src/assets')) {
    fs.mkdirSync('src/assets', { recursive: true });
  }

  // Write SVG files
  fs.writeFileSync('public/logo.svg', svgContent);
  fs.writeFileSync('public/favicon.svg', svgContent);
  fs.writeFileSync('src/assets/logo.svg', svgContent);

  const svgBuffer = Buffer.from(svgContent);
  const ogSvgBuffer = Buffer.from(ogSvgContent);

  // Generate PNG logo
  await sharp(svgBuffer)
    .resize(1200, 1200)
    .png()
    .toFile('public/logo.png');

  await sharp(svgBuffer)
    .resize(1200, 1200)
    .png()
    .toFile('src/assets/logo.png');

  // Generate JPG logo
  await sharp(svgBuffer)
    .resize(1200, 1200)
    .jpeg({ quality: 95 })
    .toFile('public/logo.jpg');

  // Generate Favicon PNGs
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile('public/favicon-32x32.png');

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/android-chrome-192x192.png');

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/android-chrome-512x512.png');

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  // Generate Open Graph Share Images
  await sharp(ogSvgBuffer)
    .resize(1200, 630)
    .png()
    .toFile('public/og-image.png');

  await sharp(ogSvgBuffer)
    .resize(1200, 630)
    .jpeg({ quality: 95 })
    .toFile('public/og-image.jpg');

  console.log('All official logo images and OG share previews created successfully!');
}

main().catch(err => {
  console.error('Error generating logos:', err);
  process.exit(1);
});
