import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const raw = fs.readFileSync('/vercel/share/v0-project/.work/original.md', 'utf8');

// Extract HTML between <!DOCTYPE html> and </html>
const start = raw.indexOf('<!DOCTYPE html>');
const end = raw.indexOf('</html>');
if (start === -1 || end === -1) throw new Error('HTML markers not found');
let html = raw.slice(start, end + '</html>'.length);

// Prepare output dir for images
const imgDir = '/vercel/share/v0-project/assets/trabaja';
fs.mkdirSync(imgDir, { recursive: true });

// Semantic names in order of first appearance
const names = [
  'logo-impact',       // nav logo
  'hero-trabaja',      // hero
  'logo-impact',       // company logo (dup expected)
  'historia-tomas',    // story
  'royal-lion',        // proof
  'convencion-1',      // gallery 1
  'convencion-2',      // gallery 2
];

const hashToFile = new Map();
let idx = 0;
const report = [];

html = html.replace(/data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)/g, (m, type, b64) => {
  const buf = Buffer.from(b64, 'base64');
  const hash = crypto.createHash('md5').update(buf).digest('hex');
  const ext = type === 'png' ? 'png' : 'jpg';
  const baseName = names[idx] || `img-${idx}`;
  idx++;
  if (hashToFile.has(hash)) {
    const existing = hashToFile.get(hash);
    report.push(`dup -> ${existing} (${buf.length} bytes)`);
    return existing;
  }
  const fileName = `${baseName}.${ext}`;
  const filePath = path.join(imgDir, fileName);
  fs.writeFileSync(filePath, buf);
  const rel = `assets/trabaja/${fileName}`;
  hashToFile.set(hash, rel);
  report.push(`${rel} (${buf.length} bytes)`);
  return rel;
});

fs.writeFileSync('/vercel/share/v0-project/trabaja-conmigo.html', html, 'utf8');
console.log('Images extracted:');
console.log(report.join('\n'));
console.log('\nHTML length:', html.length);
