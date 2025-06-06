import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, normalize, posix, sep } from 'node:path';
import untildify from 'untildify';
import { type GlobOptions, globSync } from 'tinyglobby';

import type { CopyFileOptions } from './interfaces.js';

/**
 * Check if a directory exists, if not then create it
 * @param {String} dir - directory to create
 */
export function createDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Helper to throw or callback with error
 */
function throwOrCallback(err: Error, cb?: (e?: Error) => void) {
  if (typeof cb === 'function') {
    cb(err);
  } else {
    throw err;
  }
}

function callRenameWhenDefined(inFile: string, dest: string, options: CopyFileOptions): string {
  if (typeof options.rename === 'function') {
    return options.rename(inFile, dest);
  }
  return dest;
}

/**
 * Calculate the destination path for a given input file and options.
 */
function getDestinationPath(inFile: string, outDir: string, options: CopyFileOptions, isSingleFileRename = false): string {
  const fileDir = dirname(inFile);
  const fileName = basename(inFile);
  const srcExt = extname(fileName);
  const srcBase = fileName && srcExt ? fileName.slice(0, -srcExt.length) : fileName;
  const upCount = options.up || 0;

  // 1. Single file rename (no glob, dest is not a directory, no *)
  if (isSingleFileRename && !outDir.includes('*')) {
    const dest = outDir;
    return callRenameWhenDefined(inFile, dest, options);
  }

  // 2. Wildcard pattern in destination
  if (outDir.includes('*')) {
    // Replace * with base name (without extension)
    const destFileName = outDir.replace('*', srcBase);
    // If the pattern after replacement has no extension, add the extension from the pattern or the source
    let finalDestFileName = destFileName;
    if (!extname(destFileName)) {
      finalDestFileName += extname(outDir) || srcExt;
    }

    const baseOutDir = outDir.replace(/[*][^\\/]*$/, '');
    let dest: string;
    if (options.flat || upCount === true) {
      dest = join(baseOutDir, basename(finalDestFileName));
    } else if (upCount) {
      const upPath = dealWith(fileDir, upCount);
      dest = join(baseOutDir, upPath, basename(finalDestFileName));
    } else {
      dest = join(baseOutDir, fileDir, basename(finalDestFileName));
    }
    return callRenameWhenDefined(inFile, dest, options);
  }

  // 3. Flat or up logic (no wildcard)
  let baseDir: string;
  if (options.flat || upCount === true) {
    baseDir = outDir;
  } else {
    baseDir = join(outDir, dealWith(fileDir, upCount));
  }
  const dest = join(baseDir, fileName);

  return callRenameWhenDefined(inFile, dest, options);
}

/**
 * Copy the files per a glob pattern, the first item(s) can be a 1 or more files to copy
 * while the last item in the array is the output outDirectory directory
 * @param {String[]} paths - includes both source(s) and outDirectory directory
 * @param {CopyFileOptions} options - CLI options
 * @param {(e?: Error) => void} callback - optionally callback that will be executed after copy is finished or when an error occurs
 */
export function copyfiles(paths: string[], options: CopyFileOptions, callback?: (e?: Error) => void) {
  const cb = callback || options.callback;

  if (options.verbose || options.stat) {
    console.time('Execution time');
  }

  if (paths.length < 2) {
    throwOrCallback(
      new Error('Please make sure to provide both <inFile> and <outDirectory>, i.e.: "copyfiles <inFile> <outDirectory>"'),
      cb,
    );
    return;
  }

  if (options.flat && options.up) {
    throwOrCallback(new Error('Cannot use --flat in conjunction with --up option.'), cb);
    return;
  }

  // find file source(s) and destination directory
  const sources = paths.slice(0, -1);
  let outPath = paths.pop() as string;
  outPath = outPath.startsWith('~') ? untildify(outPath) : outPath;

  // Detect single file rename (no glob, dest is not a directory, no *)
  const isSingleFile = sources.length === 1 && !sources[0].includes('*');
  let isDestFile = false;
  if (isSingleFile) {
    try {
      // If the output path doesn't exist, treat as file if it has an extension or ends with a dotfile
      if (!existsSync(outPath)) {
        isDestFile = !!extname(outPath) || basename(outPath).startsWith('.');
      } else {
        const stat = statSync(outPath);
        isDestFile = !stat.isDirectory();
      }
      /* v8 ignore next 3 */
    } catch {
      isDestFile = true;
    }
  }

  if (!isDestFile) {
    // create destination directory if not exists
    createDir(dirname(outPath));
  }

  const globOptions: GlobOptions = {};
  if (Array.isArray(options.exclude) && options.exclude.length > 0) {
    globOptions.ignore = options.exclude;
  }
  if (options.all) {
    globOptions.dot = true;
  }
  if (options.follow) {
    globOptions.followSymbolicLinks = true;
  }

  // find all files by using our source glob pattern(s)
  const allFiles = globSync(sources, globOptions);
  if (options.verbose) {
    console.log('glob found', allFiles);
  }

  if (options.error && allFiles.length < 1) {
    const err = new Error('nothing copied');
    if (typeof cb === 'function') cb(err);
    else throw err;
    return;
  }

  let completed = 0;
  let hasError = false;

  if (allFiles.length === 0) {
    if (options.verbose || options.stat) {
      console.log(`Files copied:   0`);
      console.timeEnd('Execution time');
    }
    if (typeof cb === 'function') cb();
    return;
  }

  allFiles.forEach(inFile => {
    copyFileStream(
      inFile,
      outPath,
      options,
      err => {
        if (hasError) return;
        if (err) {
          hasError = true;
          if (typeof cb === 'function') cb(err);
          return;
        }
        completed++;
        if (completed === allFiles.length) {
          if (options.verbose || options.stat) {
            console.log(`Files copied:   ${allFiles.length}`);
            console.timeEnd('Execution time');
          }
          if (typeof cb === 'function') cb();
        }
      },
      isSingleFile && isDestFile, // pass as single rename mode
    );
  });
}

/**
 * Copy a single file from a source to a destination directory using streams
 * @param {String} inFile
 * @param {String} outDir
 * @param {CopyFileOptions} options
 * @param {(e?: Error) => void} cb
 */
function copyFileStream(inFile: string, outDir: string, options: CopyFileOptions, cb: (e?: Error) => void, isSingleFileRename = false) {
  outDir = outDir.startsWith('~') ? untildify(outDir) : outDir;
  let dest: string;
  try {
    dest = getDestinationPath(inFile, outDir, options, isSingleFileRename);
  } catch (err) {
    cb(err as Error);
    return;
  }

  createDir(dirname(dest));

  if (options.verbose) {
    console.log('copy:', { from: convertToPosix(inFile), to: convertToPosix(dest) });
  }

  const readStream = createReadStream(inFile);
  const writeStream = createWriteStream(dest);

  let called = false;
  function onceCallback(err?: Error) {
    if (!called) {
      called = true;
      cb(err);
    }
  }

  readStream.on('error', onceCallback);
  writeStream.on('error', onceCallback);
  writeStream.on('close', () => {
    // Only execute callback if not already called by an error
    if (!called) {
      onceCallback();
    }
  });

  readStream.pipe(writeStream);

  function convertToPosix(pathStr: string) {
    return pathStr.replaceAll(sep, posix.sep);
  }
}

function depth(str: string) {
  return normalize(str).split(sep).length;
}

function dealWith(inPath: string, up: number) {
  if (!up) {
    return inPath;
  }
  if (depth(inPath) < up) {
    throw new Error(`Can't go up ${up} levels from ${inPath} (${depth(inPath)} levels).`);
  }
  return join(...normalize(inPath).split(sep).slice(up));
}
