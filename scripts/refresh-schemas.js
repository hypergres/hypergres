#!/usr/bin/env node

const { resolve } = require('path');
const { writeJson } = require('fs-extra');
const tjs = require('typescript-json-schema');

const SRC = resolve(__dirname, '..', 'src');

const SCHEMAS = [
  ['config/v1', 'V1']
];

const COMPILER_OPTIONS = {
  ignoreErrors: true
};

(async () => {
  for (const [path, name] of SCHEMAS) {
    const src = resolve(SRC, `${path}.ts`);
    const dest = resolve(SRC, `${path}.json`);

    console.log(`Refreshing JSON schema '${dest}' using '${name}' in '${src}'`);

    const program = tjs.getProgramFromFiles([src]);

    const options = {
      ignoreErrors: true,
      required: true,
      out: dest
    };

    const schema = tjs.generateSchema(program, name, options);
    await writeJson(dest, schema);
  };
})();
