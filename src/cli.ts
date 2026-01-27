#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'cli-nano';

import { copyfiles } from './index.js';

function readPackage() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(__dirname, '../package.json');
  const pkg = readFileSync(pkgPath, 'utf8');
  return JSON.parse(pkg);
}

function handleError(err?: Error) {
  if (err) {
    console.error(err);
    process.exit(1);
  } else {
    process.exit(0);
  }
}

try {
  const config = {
    command: {
      name: 'copyfiles',
      describe: 'Copy files from a source to a destination directory',
      examples: [
        { cmd: '$0 something/*.js out', describe: `if all the files are in a folder that you don't want in the path out path` },
        {
          cmd: '$0 something/*.js out -u 1',
          describe: 'which would put all the js files in `"out/something"`, you can use the `--up` (or `-u`) option',
        },
      ],
      positionals: [
        {
          name: 'inFile',
          describe: 'Source file(s)',
          type: 'string',
          variadic: true,
          required: true,
        },
        {
          name: 'outDirectory',
          describe: 'Destination directory',
          required: true,
          type: 'string',
        },
      ],
    },
    options: {
      all: {
        alias: 'a',
        type: 'boolean',
        describe: 'Include files & directories begining with a dot (.)',
      },
      dryRun: {
        alias: 'd',
        type: 'boolean',
        describe: 'Show what would be copied, but do not actually copy any files',
      },
      error: {
        alias: 'E',
        type: 'boolean',
        describe: 'Throw error if nothing is copied',
      },
      exclude: {
        alias: 'e',
        type: 'array',
        describe: 'Pattern or glob to exclude (may be passed multiple times)',
      },
      flat: {
        alias: 'f',
        type: 'boolean',
        describe: 'Flatten the output',
      },
      follow: {
        alias: 'F',
        type: 'boolean',
        describe: 'Follow symbolink links',
      },
      stat: {
        alias: 's',
        type: 'boolean',
        describe: 'Show statistics after execution (execution time + file count)',
      },
      up: {
        alias: 'u',
        type: 'number',
        describe: 'Slice a path off the bottom of the paths',
      },
      verbose: {
        alias: 'V',
        type: 'boolean',
        describe: 'Print more information to console',
      },
    },
    version: readPackage().version,
  } as const;

  const results = parseArgs(config);
  copyfiles(results.inFile, results.outDirectory, results, err => handleError(err));
} catch (err) {
  handleError(err as Error);
}
