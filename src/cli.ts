#!/usr/bin/env node

import yargs from 'yargs/yargs';

import { copyfiles } from './index.js';
import type { CopyFileOptions } from './interfaces.js';

const cli = yargs(process.argv.slice(2));
const argv = cli
  .command('<inFile> <outDirectory> [option]', 'Copy files from a source to a destination directory')
  .positional('inFile', {
    describe: 'source files',
    type: 'string',
  })
  .positional('outDirectory', {
    describe: 'destination directory',
  })
  .option('all', {
    alias: 'a',
    type: 'boolean',
    description: 'include files & directories begining with a dot (.)',
  })
  .option('dryRun', {
    alias: 'd',
    type: 'boolean',
    description: 'Show what would be copied, but do not actually copy any files',
  })
  .option('error', {
    alias: 'E',
    type: 'boolean',
    description: 'throw error if nothing is copied',
  })
  .option('exclude', {
    alias: 'e',
    type: 'array',
    description: 'pattern or glob to exclude (may be passed multiple times)',
  })
  .option('flat', {
    alias: 'f',
    type: 'boolean',
    description: 'flatten the output',
  })
  .option('follow', {
    alias: 'F',
    type: 'boolean',
    description: 'follow symbolink links',
  })
  .option('stat', {
    alias: 's',
    type: 'boolean',
    description: 'show statistics after execution (execution time + file count)',
  })
  .option('up', {
    alias: 'u',
    type: 'number',
    description: 'slice a path off the bottom of the paths',
  })
  .option('verbose', {
    alias: 'V',
    type: 'boolean',
    description: 'print more information to console',
  })
  .help('help')
  .alias('help', 'h')
  .alias('version', 'v')
  .version('0.1.6')
  .parse();

copyfiles((argv as any)._ as string[], argv as CopyFileOptions, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  } else {
    process.exit(0);
  }
});
