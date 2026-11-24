import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  path.join(root, 'www'),
  path.join(root, 'android/app/src/main/assets/public'),
];

for (const dest of targets) {
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(root, 'index.html'), path.join(dest, 'index.html'));
  fs.cpSync(path.join(root, 'js'), path.join(dest, 'js'), { recursive: true });
}
