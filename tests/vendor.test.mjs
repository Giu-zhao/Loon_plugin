import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function sha256(relativePath) {
  const contents = await readFile(path.join(root, relativePath));
  return createHash('sha256').update(contents).digest('hex');
}

test('pinned Maasea vendor sources and provenance are present', async () => {
  await access(path.join(root, 'vendor/maasea/LICENSE'));

  const upstream = await readFile(path.join(root, 'vendor/maasea/UPSTREAM.md'), 'utf8');
  assert.match(upstream, /65075cdb388fc5e3094afd7e7314c67b243f3525/);
  assert.match(upstream, /e5d66ffc39b71e499c6e9b24ef13d44598f2c86f/);

  assert.equal(
    await sha256('YouTubeUltimateAppRequest.js'),
    '3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26',
  );
  assert.equal(
    await sha256('YouTubeUltimateAppOnesie.js'),
    'f98483d5f5017514f82502253c0db5ce2d4ffb7839887aa2cadc22666f5a7f12',
  );
});
