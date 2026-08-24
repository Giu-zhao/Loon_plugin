import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

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
    } else {
      throw new Error(`non-regular vendored entry: ${relativePath}`);
    }
  }
  return files;
}

test('vendor traversal rejects symlinks and special entries', async () => {
  const temporary = await mkdtemp(path.join(root, '.vendor-test-'));
  try {
    await writeFile(path.join(temporary, 'regular.txt'), 'safe');
    await symlink(path.join(temporary, 'regular.txt'), path.join(temporary, 'link.txt'));
    await assert.rejects(
      regularFiles(path.relative(root, temporary)),
      /non-regular vendored entry/,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

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

test('generated API bundle has a stable banner and no build timestamp', async () => {
  const bundle = await readFile(path.join(root, 'YouTubeUltimateAPI.js'), 'utf8');
  assert.match(bundle, /^\/\* YouTube Ultimate API 2\.0\.0 \*\//);
  assert.doesNotMatch(bundle, /Build:\s*\d{4}|toLocaleString/);
});

test('root package and lock pin the approved build dependency versions', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const packageLock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  assert.equal(packageJson.version, '2.0.0');
  assert.equal(packageJson.dependencies['@bufbuild/protobuf'], '1.7.2');
  assert.equal(packageJson.devDependencies.esbuild, '0.16.17');
  assert.equal(packageJson.devDependencies.typescript, '4.9.4');
  assert.equal(packageLock.packages['node_modules/@bufbuild/protobuf'].version, '1.7.2');
  assert.equal(packageLock.packages['node_modules/esbuild'].version, '0.16.17');
  assert.equal(packageLock.packages['node_modules/typescript'].version, '4.9.4');
});

test('third-party notices publish protobuf version and applicable license terms', async () => {
  const notices = await readFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  assert.match(notices, /@bufbuild\/protobuf`? 1\.7\.2/);
  assert.match(notices, /Apache License 2\.0/);
  assert.match(notices, /Copyright 2008 Google Inc\./);
  assert.match(notices, /Redistribution and use in source and binary forms/);
  assert.match(notices, /Neither the name of Google Inc\. nor the names of its contributors/);
  assert.match(notices, /THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"/);
});

test('two clean bundle builds are byte-for-byte identical', async () => {
  await execFileAsync(process.execPath, ['scripts/build-app.mjs'], { cwd: root });
  const first = await sha256('YouTubeUltimateAPI.js');
  await execFileAsync(process.execPath, ['scripts/build-app.mjs'], { cwd: root });
  assert.equal(await sha256('YouTubeUltimateAPI.js'), first);
});
