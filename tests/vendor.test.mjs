import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function sha256(relativePath) {
  const contents = await readFile(path.join(root, relativePath));
  return createHash('sha256').update(contents).digest('hex');
}

async function regularFiles(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await regularFiles(relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
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

  const manifestPath = 'vendor/maasea/SHA256SUMS';
  assert.equal(
    await sha256(manifestPath),
    '071f27a7d0f56c9fc7241f1bb871a15843815d5b01089630a6cbb26b0991fe46',
  );
  const manifest = (await readFile(path.join(root, manifestPath), 'utf8'))
    .trimEnd()
    .split('\n')
    .map((line) => {
      const match = /^(?<hash>[0-9a-f]{64})  (?<file>.+)$/.exec(line);
      assert.ok(match, `invalid SHA256SUMS line: ${line}`);
      return [match.groups.file, match.groups.hash];
    });
  const expectedFiles = [...await regularFiles('src/app'), 'vendor/maasea/LICENSE'].sort();
  assert.deepEqual(manifest.map(([file]) => file).sort(), expectedFiles);
  for (const [file, expectedHash] of manifest) {
    assert.equal(await sha256(file), expectedHash, `integrity mismatch: ${file}`);
  }
});
