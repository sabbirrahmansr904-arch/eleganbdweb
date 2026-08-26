const fs = require('fs');
const p = 'src/lib/utils.ts';
let code = fs.readFileSync(p, 'utf8');
code = code.replace(
  /if \(currency === 'BDT'\) \{\n    return `৳\$\{new Intl\.NumberFormat\('en-BD', \{\n      minimumFractionDigits: 0,\n      maximumFractionDigits: 0,\n    \}\)\.format\(displayPrice\)\}`;/g,
  `if (currency === 'BDT') {\n    const isNegative = displayPrice < 0;\n    const absValue = Math.abs(displayPrice);\n    return \`\${isNegative ? '-' : ''}৳\${new Intl.NumberFormat('en-IN', {\n      minimumFractionDigits: 0,\n      maximumFractionDigits: 0,\n    }).format(absValue)}\`;`
);
fs.writeFileSync(p, code);
