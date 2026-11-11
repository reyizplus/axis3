const fs = require('fs');

// Replace the script createElement with return null in next-themes dist files.
// Both .mjs and .js versions have the same pattern despite different variable names:
// "let p=JSON.stringify(...).slice(1,-1);return t.createElement("script",{...})"
const replacements = [
  // .mjs version
  {
    file: 'node_modules/next-themes/dist/index.mjs',
    from: 'let p=JSON.stringify([s,i,a,e,h,l,u,m]).slice(1,-1);return t.createElement("script",{...w,suppressHydrationWarning:!0,nonce:typeof window=="undefined"?d:"",dangerouslySetInnerHTML:{__html:`(${M.toString()})(${p})`}})',
    to: 'return null',
  },
  // .js version
  {
    file: 'node_modules/next-themes/dist/index.js',
    from: 'let p=JSON.stringify([n,s,d,e,h,u,l,o]).slice(1,-1);return t.createElement("script",{...w,suppressHydrationWarning:!0,nonce:typeof window=="undefined"?m:"",dangerouslySetInnerHTML:{__html:`(${I.toString()})(${p})`}})',
    to: 'return null',
  },
];

let patchedCount = 0;
for (const { file, from, to } of replacements) {
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    process.exit(1);
  }
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(from)) {
    const updated = content.replace(from, to);
    if (updated !== content) {
      fs.writeFileSync(file, updated);
      console.log('Patched:', file);
      patchedCount++;
    } else {
      console.log('Replace failed for:', file);
      process.exit(1);
    }
  } else if (content.includes(to)) {
    console.log('Already patched:', file);
  } else {
    console.error('Could not find expected content in:', file);
    process.exit(1);
  }
}
if (patchedCount === 0) {
  console.log('All files already patched');
}
