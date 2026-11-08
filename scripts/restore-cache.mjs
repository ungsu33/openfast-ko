import fs from 'node:fs/promises';
await fs.mkdir('.cache/original',{recursive:true});
// Published assets are byte-identical to the snapshot; restore original HTML separately.
await fs.cp('docs','.cache/original',{recursive:true,filter:src=>!src.endsWith('.html')});
await fs.cp('upstream/html','.cache/original',{recursive:true});
await fs.copyFile('upstream/search-index.json','.cache/search-original.json');
await fs.copyFile('translations/source-catalog.json','.cache/catalog.json');
console.log('Restored original snapshot cache from tracked files.');
