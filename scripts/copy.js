#!/usr/bin/env node

const { copy } = require('fs-extra');
const { resolve } = require('path');
const { tail } = require('ramda');

const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'src');
const DIST = resolve(ROOT, 'dist');

const path = (...segments) => [
  resolve(...segments),
  resolve(DIST, ...tail(segments))
];

const SQL = ['tables', 'columns', 'belongsTo', 'has']
  .map(name => path(SRC, 'provider', 'postgresql', 'discovery', `${name}.sql`));

const PATHS = [
  path(SRC, 'bin', 'hypergres.js'),
  path(SRC, 'config', 'template.yaml'),
  path(SRC, 'config', 'v1.json'),
  path(ROOT, 'README.md'),
  ...SQL
];

(async () => {
  for (const [src, dest] of PATHS) {
    console.log(`Copying '${src}' to '${dest}'`);
    await copy(src, dest);
  }
})();
