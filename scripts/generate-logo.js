import fs from 'fs';

// Create precision SVG logo matching the user's uploaded image exactly
// Black background, 3 slanted white horizontal bars forming stylized "E"
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="1200" height="1200">
  <rect width="600" height="600" fill="#000000"/>
  <!-- Group with skewX transformation to slant parallel vertical edges -->
  <g transform="skewX(-16)">
    <!-- Top Bar -->
    <rect x="250" y="160" width="180" height="64" fill="#FFFFFF" />
    <!-- Middle Bar (shifted left) -->
    <rect x="180" y="268" width="180" height="64" fill="#FFFFFF" />
    <!-- Bottom Bar (shifted right) -->
    <rect x="222" y="376" width="180" height="64" fill="#FFFFFF" />
  </g>
</svg>`;

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

fs.writeFileSync('public/logo.svg', svgContent);
fs.writeFileSync('public/favicon.svg', svgContent);
console.log('SVG files created successfully in public/');
