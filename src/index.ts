import { createReadStream, createWriteStream, existsSync, globSync, mkdirSync, type ReadStream, statSync, type WriteStream } from 'node:fs';
import { availableParallelism } from 'node:os';
import { basename, dirname, extname, join, normalize, posix, sep } from 'node:path';
import untildify from 'untildify';
import type { CopyFileOptions } from './interfaces.js';

export type * from './interfaces.js';

/** Convert an item to an array if it is not already one */
function arrify<T>(item: T | T[]): T[] {
  return Array.isArray(item) ? item : [item];
}

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

function createSafeOptions(options: CopyFileOptions): CopyFileOptions {
  return Object.assign(Object.create(null) as CopyFileOptions, options);
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
  options = createSafeOptions(options);
  const fileDir = dirname(inFile);
  const fileName = basename(inFile);
  const srcExt = extname(fileName);
  const srcBase = fileName && srcExt ? fileName.slice(0, -srcExt.length) : fileName;
  const upCount = options.up || 0;

  // 1. Single file rename (no glob, dest is not a directory, no *)
  if (isSingleFileRename && !outDir.includes('*')) {
    return callRenameWhenDefined(inFile, outDir, options);
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
  const baseDir = options.flat || upCount === true ? outDir : join(outDir, dealWith(fileDir, upCount));
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
  if (dot) {
    return paths;
  }
  return paths.filter(p => {
    // Remove files/dirs starting with a dot after last slash
    const base = p.split(/[\\/]/).pop();
    return base && !base.startsWith('.');
  });
}

function tryCreatingDir<T>(path: string, defaultReturn: T): string | T {
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
 * Helper to get all matched files from sources, supporting negation and dotfile logic
 */
function getMatchedFiles(
  sources: string[],
  excludeGlobs: string[],
  isSingleFile: boolean,
  isDestFile: boolean,
  options: CopyFileOptions,
): Set<string> {
  const allFilesSet = new Set<string>();
  const filesByPattern = new Map<string, string[]>();
  for (const pattern of sources) {
    const isNegated = typeof pattern === 'string' && pattern.startsWith('!');
    const dirPart = isNegated ? pattern.slice(1) : pattern;
    let files = filesByPattern.get(dirPart);
    if (!files) {
      const adjustedPattern = tryCreatingDir(dirPart, dirPart);
      let entries = globSync(adjustedPattern, { exclude: excludeGlobs, withFileTypes: true });
      if (options.all && adjustedPattern.includes('*') && !adjustedPattern.startsWith('.')) {
        const dotPattern = adjustedPattern.replace(/(\*\.[^/]+$|\*$)/, '.$1');
        if (dotPattern !== adjustedPattern) {
          entries = entries.concat(globSync(dotPattern, { exclude: excludeGlobs, withFileTypes: true }));
        }
      }
      files = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          continue;
        }
        const filePath = join(entry.parentPath, entry.name).replaceAll('\\', '/');
        // Dirents identify regular files without an additional stat; symlinks
        // still need their target checked to preserve directory filtering.
        if (!entry.isSymbolicLink() || !tryCreatingDir(filePath, false)) {
          files.push(filePath);
        }
      }
      filesByPattern.set(dirPart, files);
    }

    // Special case: single file rename to a file path
    if (isSingleFile && isDestFile) {
      for (const f of files) {
        allFilesSet.add(f);
      }
      continue;
    }

    // Use globSync results directly, filter dotfiles if needed
    const finalFiles = options.all ? files : filterDotFiles(files, false);
    if (isNegated) {
      for (const f of finalFiles) {
        allFilesSet.delete(f);
      }
    } else {
      for (const f of finalFiles) {
        allFilesSet.add(f);
      }
    }
  }
  return allFilesSet;
}

/**
 * Copy the files per a glob pattern, the first item(s) can be a 1 or more files to copy
 * while the last item in the array is the output outDirectory directory
 * @param {String[]} paths - includes both source(s) and outDirectory directory
 * @param {CopyFileOptions} options - CLI options
 * @param {(e?: Error) => void} callback - optionally callback that will be executed after copy is finished or when an error occurs
 */
export function copyfiles(sources: string | string[], outPath: string, options: CopyFileOptions = {}, callback?: (e?: Error) => void) {
  // Treat options as data rather than inheriting behavior from Object.prototype.
  // This also safely preserves an own "__proto__" key if options came from JSON.
  options = createSafeOptions(options);
  const cb = callback || options.callback;
  sources = arrify(sources);
  const concurrency = options.concurrency === undefined ? Math.min(32, availableParallelism()) : options.concurrency;

  if (options.verbose || options.stat) {
    console.time('Execution time');
  }

  let errorMsg = '';
  if (sources.length < 1 || !outPath) {
    errorMsg = 'Please make sure to provide both <inFile> and <outDirectory>, i.e.: "copyfiles <inFile> <outDirectory>"';
  } else if (options.flat && options.up) {
    errorMsg = 'Cannot use --flat in conjunction with --up option.';
  } else if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    errorMsg = 'Concurrency must be a positive safe integer.';
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
  const exclude = options.exclude === undefined ? [] : arrify(options.exclude);
  const excludeGlobs = exclude.length > 0 ? exclude : ['**/.git/**', '**/node_modules/**'];

  // Use a Set for deduplication from the start
  const allFilesSet = getMatchedFiles(sources, excludeGlobs, isSingleFile, isDestFile, options);

  if (options.verbose) {
    console.log('glob found', Array.from(allFilesSet));
  }

  if (options.error && allFilesSet.size < 1) {
    const err = new Error('nothing copied');
    if (typeof cb === 'function') {
      cb(err);
    } else {
      throw err;
    }
    return;
  }

  if (allFilesSet.size === 0) {
    if (options.verbose || options.stat) {
      console.log(`Files copied:   0`);
      console.timeEnd('Execution time');
    }
    if (typeof cb === 'function') {
      cb();
    }
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

    if (typeof cb === 'function') {
      cb();
    }
    return;
  }

  const files = allFilesSet.values();
  const createdDirs = new Set<string>();
  const activeStreams = new Set<ReadStream | WriteStream>();
  let nextFile = files.next();
  let active = 0;
  let firstError: Error | undefined;
  let finished = false;

  const pump = () => {
    while (!firstError && active < concurrency && !nextFile.done) {
      const inFile = nextFile.value;
      nextFile = files.next();
      active++;
      copyFileStream(
        inFile,
        outPath,
        options,
        err => {
          active--;
          if (err && !firstError) {
            firstError = err;
            for (const stream of activeStreams) {
              stream.destroy();
            }
          }
          pump();
        },
        isSingleFile && isDestFile,
        createdDirs,
        activeStreams,
      );
    }
    // Wait for every active stream to close before reporting an error.
    if (active === 0 && !finished) {
      finished = true;
      if (!firstError) {
        displayStatWhenEnabled(options, allFilesSet.size);
      }
      if (typeof cb === 'function') {
        cb(firstError);
      }
    }
  };
  pump();
}

/**
 * Copy a single file from a source to a destination directory using streams
 * @param {String} inFile
 * @param {String} outDir
 * @param {CopyFileOptions} options
 * @param {(e?: Error) => void} cb
 * @param {Boolean} isSingleFileRename - whether the operation is a single file rename (no glob, dest is not a directory, no *)
 */
function copyFileStream(
  inFile: string,
  outDir: string,
  options: CopyFileOptions,
  cb: (e?: Error) => void,
  isSingleFileRename: boolean,
  createdDirs: Set<string>,
  activeStreams: Set<ReadStream | WriteStream>,
) {
  let dest: string;
  try {
    dest = getDestinationPath(inFile, outDir, options, isSingleFileRename);
    const destDir = dirname(dest);
    if (!createdDirs.has(destDir)) {
      createDir(destDir);
      createdDirs.add(destDir);
    }
  } catch (err) {
    cb(err as Error);
    return;
  }

  if (options.verbose) {
    console.log('copy:', { from: convertToPosix(inFile), to: convertToPosix(dest) });
  }

  const readStream = createReadStream(inFile);
  const writeStream = createWriteStream(dest);
  activeStreams.add(readStream);
  activeStreams.add(writeStream);
  let error: Error | undefined;
  let remaining = 2;
  const fail = (err: Error) => {
    error ??= err;
    readStream.destroy();
    writeStream.destroy();
  };
  const close = (stream: ReadStream | WriteStream) => {
    activeStreams.delete(stream);
    if (--remaining === 0) {
      cb(error);
    }
  };
  readStream.once('error', fail);
  writeStream.once('error', fail);
  readStream.once('close', () => {
    if (!readStream.readableEnded && !error) {
      fail(new Error(`Read stream closed before copying ${inFile}`));
    }
    close(readStream);
  });
  writeStream.once('close', () => {
    if (!writeStream.writableFinished && !error) {
      fail(new Error(`Write stream closed before copying ${inFile}`));
    }
    close(writeStream);
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
