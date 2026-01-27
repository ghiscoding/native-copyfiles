import { createReadStream, createWriteStream, existsSync, globSync, mkdirSync, type PathLike, statSync } from 'node:fs';
import { basename, dirname, extname, join, normalize, posix, sep } from 'node:path';
import untildify from 'untildify';
import type { CopyFileOptions } from './interfaces.js';

export type * from './interfaces.js';

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
 * Converts a path from any platform to posix
 * @param {String} pathStr - the path to convert
 * @returns {String} - the converted posix path
 */
export function convertToPosix(pathStr: string) {
  return pathStr.replaceAll(sep, posix.sep);
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
export function getDestinationPath(inFile: string, outDir: string, options: CopyFileOptions, isSingleFileRename = false): string {
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

/** Show statistics when `verbose` and/or `stat` are enabled */
function displayStatWhenEnabled(options: CopyFileOptions, count: number) {
  if (options.verbose || options.stat) {
    console.log(`Files copied:   ${count}`);
    console.timeEnd('Execution time');
  }
}

/**
 * Helper to filter dotfiles if needed (dot: true)
 * @param paths - array of file/folder paths
 * @param dot - if true, include dotfiles/folders; otherwise, filter them out
 */
export function filterDotFiles(paths: string[], dot: boolean): string[] {
  if (dot) return paths;
  return paths.filter(p => {
    // Remove files/dirs starting with a dot after last slash
    const base = p.split(/[\\/]/).pop();
    return base && !base.startsWith('.');
  });
}

function tryCreatingDir(path: PathLike, defaultReturn: any) {
  try {
    if (statSync(path).isDirectory()) {
      return `${path}/**`;
    }
  } catch {
    // fall through
  }
  return defaultReturn;
}

/**
 * Copy the files per a glob pattern, the first item(s) can be a 1 or more files to copy
 * while the last item in the array is the output outDirectory directory
 * @param {String[]} paths - includes both source(s) and outDirectory directory
 * @param {CopyFileOptions} options - CLI options
 * @param {(e?: Error) => void} callback - optionally callback that will be executed after copy is finished or when an error occurs
 */
export function copyfiles(sources: string | string[], outPath: string, options: CopyFileOptions = {}, callback?: (e?: Error) => void) {
  const cb = callback || options.callback;
  sources = Array.isArray(sources) ? sources : [sources];

  if (options.verbose || options.stat) {
    console.time('Execution time');
  }

  let errorMsg = '';
  if (sources.length < 1 || !outPath) {
    errorMsg = 'Please make sure to provide both <inFile> and <outDirectory>, i.e.: "copyfiles <inFile> <outDirectory>"';
  } else if (options.flat && options.up) {
    errorMsg = 'Cannot use --flat in conjunction with --up option.';
  }
  if (errorMsg) {
    throwOrCallback(new Error(errorMsg), cb);
    return;
  }

  // find file source(s) and destination directory
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
    } /* v8 ignore next */ catch {
      isDestFile = true;
    }
  }

  // create destination directory if not exists
  if (!isDestFile) {
    createDir(dirname(outPath));
  }

  // Set default excludeGlobs only if not provided by user
  let excludeGlobs: string[];
  if (Array.isArray(options.exclude) && options.exclude.length > 0) {
    excludeGlobs = options.exclude;
  } else {
    excludeGlobs = ['**/.git/**', '**/node_modules/**'];
  }

  // Use a Set for deduplication from the start
  const allFilesSet = new Set<string>();
  for (const pattern of sources) {
    let adjustedPattern = tryCreatingDir(pattern, pattern);
    // fs.globSync treats /** differently, so adjust to /**/*
    adjustedPattern = adjustedPattern.replace(/\*\*$/, '**/*');
    let files = globSync(adjustedPattern, { exclude: excludeGlobs });
    // If options.all is set and pattern does not start with a dot, also search for dot-prefixed files
    if (options.all && pattern.includes('*') && !pattern.startsWith('.')) {
      // e.g. '*.txt' => '.*.txt', '**/*.txt' => '**/.*.txt'
      const dotPattern = pattern.replace(/(\*\.[^/]+$|\*$)/, '.$1').replace(/\*\*$/, '**/*');
      if (dotPattern !== pattern) {
        files = files.concat(globSync(dotPattern, { exclude: excludeGlobs }));
      }
    }
    // Normalize all file paths to POSIX style (forward slashes)
    files = files.map(f => f.replaceAll('\\', '/'));
    // Remove directories manually (since nodir is not supported)
    files = files.filter(f => !tryCreatingDir(f, false));
    // Add to Set for deduplication
    for (const f of files) {
      allFilesSet.add(f);
    }
  }

  if (options.verbose) {
    console.log('glob found', Array.from(allFilesSet));
  }

  if (options.error && allFilesSet.size < 1) {
    const err = new Error('nothing copied');
    if (typeof cb === 'function') cb(err);
    else throw err;
    return;
  }

  let completed = 0;
  let hasError = false;

  if (allFilesSet.size === 0) {
    if (options.verbose || options.stat) {
      console.log(`Files copied:   0`);
      console.timeEnd('Execution time');
    }
    if (typeof cb === 'function') cb();
    return;
  }

  if (options.dryRun) {
    const head = '=== dry-run ===';
    console.log(head);
    for (const inFile of allFilesSet) {
      const dest = getDestinationPath(inFile, outPath, options, isSingleFile && isDestFile);
      console.log(`copy: ${convertToPosix(inFile)} → ${convertToPosix(dest)}`);
    }
    displayStatWhenEnabled(options, allFilesSet.size);
    console.log(head);

    if (typeof cb === 'function') cb();
    return;
  }

  for (const inFile of allFilesSet) {
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
        if (completed === allFilesSet.size) {
          displayStatWhenEnabled(options, allFilesSet.size);
          if (typeof cb === 'function') cb();
        }
      },
      isSingleFile && isDestFile, // pass as single rename mode
    );
  }
}

/**
 * Copy a single file from a source to a destination directory using streams
 * @param {String} inFile
 * @param {String} outDir
 * @param {CopyFileOptions} options
 * @param {(e?: Error) => void} cb
 * @param {Boolean} isSingleFileRename - whether the operation is a single file rename (no glob, dest is not a directory, no *)
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
