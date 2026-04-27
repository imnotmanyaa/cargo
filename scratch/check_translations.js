
import fs from 'fs';

const filePath = '/Users/daurenurzakanov/projects/cargo/src/contexts/LanguageContext.tsx';
const content = fs.readFileSync(filePath, 'utf-8');

function getKeys(lang) {
  // Find the block for the language
  const startMarker = `${lang}: {`;
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return [];
  
  let braceCount = 1;
  let i = startIndex + startMarker.length;
  let block = '';
  
  while (braceCount > 0 && i < content.length) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') braceCount--;
    if (braceCount > 0) block += content[i];
    i++;
  }
  
  const keys = [];
  const lines = block.split('\n');
  lines.forEach(line => {
    const keyMatch = line.match(/^\s*([a-zA-Z0-9]+):/);
    if (keyMatch) {
      keys.push(keyMatch[1]);
    }
  });
  return keys;
}

const ruKeys = getKeys('ru');
const enKeys = getKeys('en');
const kkKeys = getKeys('kk');

console.log(`RU keys: ${ruKeys.length}`);
console.log(`EN keys: ${enKeys.length}`);
console.log(`KK keys: ${kkKeys.length}`);

const missingInEn = ruKeys.filter(k => !enKeys.includes(k));
const missingInKk = ruKeys.filter(k => !kkKeys.includes(k));

if (missingInEn.length > 0) console.log('Missing in EN:', missingInEn);
if (missingInKk.length > 0) console.log('Missing in KK:', missingInKk);

// Check for duplicates
function findDuplicates(keys) {
  return keys.filter((item, index) => keys.indexOf(item) !== index);
}

const ruDups = findDuplicates(ruKeys);
const enDups = findDuplicates(enKeys);
const kkDups = findDuplicates(kkKeys);

if (ruDups.length > 0) console.log('Duplicates in RU:', ruDups);
if (enDups.length > 0) console.log('Duplicates in EN:', enDups);
if (kkDups.length > 0) console.log('Duplicates in KK:', kkDups);
