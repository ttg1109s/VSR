import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('PlayingPage owns its stylesheet import without a null-rendering wrapper component', () => {
  const page = read('../src/pages/playing/PlayingPage.jsx');
  assert.match(page, /import\s+['"]\.\.\/\.\.\/features\/playing\/playing-page\.css['"]/);
  assert.doesNotMatch(page, /PlayingPageStyles/);
  assert.equal(fs.existsSync(new URL('../src/features/playing/PlayingPageStyles.jsx', import.meta.url)), false);
});
