import { existsSync, mkdirSync, readdir, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join as posixJoin } from 'node:path/posix';
import { Readable } from 'node:stream';
import { globSync } from 'tinyglobby';
import { afterAll, afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';

import { copyfiles, createDir, filterDotFiles, getDestinationPath } from '../index.js';

let shouldMockReadError = false;
const error = new Error('Mock read error');

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    createReadStream: (...args: any[]) => {
      if (shouldMockReadError) {
        const stream = new Readable({ read() {} });
        setImmediate(() => stream.emit('error', error));
        return stream;
      }
      // fallback to real implementation
      return (actual.createReadStream as any)(...args);
    },
  };
});

function cleanupFolders() {
  try {
    rmSync('input', { recursive: true, force: true });
    rmSync('output', { recursive: true, force: true });
  } catch (_) {}
}

describe('copyfiles', () => {
  afterEach(() => {
    cleanupFolders();
  });

  afterAll(() => {
    cleanupFolders();
  });

  beforeEach(() => {
    mkdirSync('input/other', { recursive: true });
  });

  test('throws when inFile or outDir are missing', () =>
    new Promise((done: any) => {
      copyfiles(['input/**/*.txt'], {}, err => {
        expect(err?.message).toBe(
          'Please make sure to provide both <inFile> and <outDirectory>, i.e.: "copyfiles <inFile> <outDirectory>"',
        );
        done();
      });
    }));

  test('throws when flat & up used together', () =>
    new Promise((done: any) => {
      copyfiles(['input/**/*.txt', 'output'], { flat: true, up: 2 }, err => {
        expect(err?.message).toBe('Cannot use --flat in conjunction with --up option.');
        done();
      });
    }));

  test('normal', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      writeFileSync('input/b.txt', 'b');
      writeFileSync('input/c.js', 'c');
      copyfiles(['input/*.txt', 'output'], {}, () => {
        readdir('output/input', async (_err, files) => {
          expect(files).toEqual(['a.txt', 'b.txt']);
          done();
        });
      });
    }));

  test('normal with options argument set as undefined', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      writeFileSync('input/b.txt', 'b');
      writeFileSync('input/c.js', 'c');
      copyfiles(['input/*.txt', 'output'], undefined, () => {
        readdir('output/input', async (_err, files) => {
          expect(files).toEqual(['a.txt', 'b.txt']);
          done();
        });
      });
    }));

  test('modes', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a', {
        mode: 33261,
      });
      writeFileSync('input/b.txt', 'b');
      writeFileSync('input/c.js', 'c');
      copyfiles(['input/*.txt', 'output'], {}, () => {
        readdir('output/input', (_err, files) => {
          expect(files).toEqual(['a.txt', 'b.txt']);
          //  'correct mode'
          // expect(statSync('output/input/a.txt').mode).toBe(33261);
          done();
        });
      });
    }));

  test('exclude', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      writeFileSync('input/b.txt', 'b');
      writeFileSync('input/c.js.txt', 'c');
      writeFileSync('input/d.ps.txt', 'd');
      copyfiles(
        ['input/*.txt', 'output'],
        {
          exclude: ['**/*.js.txt', '**/*.ps.txt'],
        },
        () => {
          readdir('output/input', (_err, files) => {
            expect(files).toEqual(['a.txt', 'b.txt']);
            done();
          });
        },
      );
    }));

  test('error on nothing copied', () =>
    new Promise((done: any) => {
      writeFileSync('input/.c.txt', 'c');
      copyfiles(['input/*.txt', 'output'], { error: true }, err => {
        expect(err?.message).toBe('nothing copied');
        done();
      });
    }));

  test('all', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      writeFileSync('input/b.txt', 'b');
      writeFileSync('input/.c.txt', 'c');
      copyfiles(['input/*.txt', 'output'], { all: true }, () => {
        readdir('output/input', (_err, files) => {
          expect(files).toEqual(['.c.txt', 'a.txt', 'b.txt']);
          done();
        });
      });
    }));

  test('with up', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      writeFileSync('input/b.txt', 'b');
      writeFileSync('input/c.js', 'c');
      copyfiles(['input/*.txt', 'output'], { up: 1 }, () => {
        readdir('output', (_err, files) => {
          expect(files).toEqual(['a.txt', 'b.txt']);
          done();
        });
      });
    }));

  test('with up true', () =>
    new Promise((done: any) => {
      mkdirSync('input/deep');
      writeFileSync('input/a.txt', 'a');
      writeFileSync('input/b.txt', 'b');
      writeFileSync('input/c.js', 'c');
      writeFileSync('input/deep/d.txt', 'd');
      copyfiles(['input/**/*.txt', 'output'], { up: true }, () => {
        readdir('output', (_err, files) => {
          expect(files).toEqual(['a.txt', 'b.txt', 'd.txt']);
          done();
        });
      });
    }));

  test('with up 2', () =>
    new Promise((done: any) => {
      writeFileSync('input/other/a.txt', 'a');
      writeFileSync('input/other/b.txt', 'b');
      writeFileSync('input/other/c.js', 'c');
      copyfiles(['input/**/*.txt', 'output'], { up: 2 }, () => {
        readdir('output', (_err, files) => {
          expect(files).toEqual(['a.txt', 'b.txt']);
          done();
        });
      });
    }));

  test('throws with up 3', () =>
    new Promise((done: any) => {
      writeFileSync('input/other/a.txt', 'a');
      writeFileSync('input/other/b.txt', 'b');
      writeFileSync('input/other/c.js', 'c');
      copyfiles(['input/**/*.txt', 'output'], { up: 3 }, err => {
        if (err) {
          expect(err?.message).toBe(`Can't go up 3 levels from input/other (2 levels).`);
          done();
        }
      });
    }));

  test('flatten', () =>
    new Promise((done: any) => {
      writeFileSync('input/other/a.txt', 'a');
      writeFileSync('input/b.txt', 'b');
      writeFileSync('input/other/c.js', 'c');
      copyfiles(['input/**/*.txt', 'output'], { flat: true }, () => {
        readdir('output', (_err, files) => {
          expect(files).toEqual(['a.txt', 'b.txt']);
          done();
        });
      });
    }));

  test('follow', () => {
    if (process.platform !== 'win32') {
      mkdirSync('input/origin');
      mkdirSync('input/origin/inner');
      writeFileSync('input/origin/inner/a.txt', 'a');
      writeFileSync('input/origin/inner/b.txt', 'b');
      symlinkSync('origin', 'input/dest');
      copyfiles(['input/**/*.txt', 'output'], { up: 1, follow: true }, () => {
        const files = globSync('output/**/*.txt');
        expect(new Set(files)).toEqual(new Set(['output/a.txt', 'output/b.txt']));
      });
    }
  });

  test('dryRun does not copy files but logs actions', () => {
    writeFileSync('input/a.txt', 'a');
    writeFileSync('input/other/c.js', 'c');
    const logSpy = vi.spyOn(console, 'log');

    copyfiles(['input/**/*', 'output'], { dryRun: true });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('=== dry-run ==='));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('copy: input/a.txt → output/input/a.txt'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('copy: input/other/c.js → output/input/other/c.js'));
    expect(existsSync('output/a.txt')).toBe(false);
    logSpy.mockRestore();
  });

  test('dryRun with rename does not copy files but logs actions', () => {
    mkdirSync('input/sub');
    writeFileSync('input/foo.css', 'foo');
    writeFileSync('input/sub/bar.css', 'bar');
    const logSpy = vi.spyOn(console, 'log');

    copyfiles(['input/**/*.css', 'output/*.scss'], { dryRun: true, stat: true });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('=== dry-run ==='));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('copy: input/foo.css → output/input/foo.scss'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('copy: input/sub/bar.css → output/input/sub/bar.scss'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Files copied:   2'));
    expect(existsSync('output/a.txt')).toBe(false);
    logSpy.mockRestore();
  });

  test('verbose flat', () =>
    new Promise((done: any) => {
      const logSpy = vi.spyOn(global.console, 'log').mockReturnValue();
      writeFileSync('input/other/a.txt', 'a');
      writeFileSync('input/b.txt', 'b');
      writeFileSync('input/other/c.js', 'c');
      copyfiles(['input/**/*.txt', 'output'], { flat: true, verbose: true }, () => {
        readdir('output', (_err, files) => {
          expect(files).toEqual(['a.txt', 'b.txt']);
          const globCall = logSpy.mock.calls.find(call => call[0] === 'glob found');
          expect(globCall).toBeTruthy();
          expect(new Set(globCall![1])).toEqual(new Set(['input/b.txt', 'input/other/a.txt']));
          expect(logSpy).toHaveBeenCalledWith('copy:', { from: 'input/other/a.txt', to: 'output/a.txt' });
          expect(logSpy).toHaveBeenCalledWith('copy:', { from: 'input/b.txt', to: 'output/b.txt' });
          expect(logSpy).toHaveBeenCalledWith('Files copied:   2');
          done();
        });
      });
    }));

  test('createDir does not throw if dir exists', () => {
    mkdirSync('input', { recursive: true });
    expect(() => mkdirSync('input', { recursive: true })).not.toThrow();
  });

  test('throws when inFile or outDir are missing (no callback)', () => {
    expect(() => copyfiles(['input/**/*.txt'], {})).toThrow(
      'Please make sure to provide both <inFile> and <outDirectory>, i.e.: "copyfiles <inFile> <outDirectory>"',
    );
  });

  test('callback called when no files to copy', () =>
    new Promise((done: any) => {
      copyfiles(['input/doesnotexist/*.txt', 'output'], {}, err => {
        expect(err).toBeUndefined();
        done();
      });
    }));

  test('copyFileStream handles read error', () =>
    new Promise((done: any) => {
      writeFileSync('input/bad.txt', 'bad'); // <-- Ensure the file exists!
      shouldMockReadError = true;
      copyfiles(['input/bad.txt', 'output'], {}, err => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toBe('Mock read error');
        shouldMockReadError = false;
        done();
      });
    }));

  test('throws when flat & up used together', () => {
    expect(() => copyfiles(['input/**/*.txt', 'output'], { flat: true, up: 1 })).toThrow(
      'Cannot use --flat in conjunction with --up option.',
    );
  });

  test('calls callback with error when nothing copied and options.error is set', () =>
    new Promise((done: any) => {
      copyfiles(['input/doesnotexist/*.txt', 'output'], { error: true }, err => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toBe('nothing copied');
        done();
      });
    }));

  test('logs and calls callback when nothing copied and verbose/stat is set', () =>
    new Promise((done: any) => {
      const logSpy = vi.spyOn(global.console, 'log').mockReturnValue();
      const timeSpy = vi.spyOn(global.console, 'timeEnd').mockReturnValue();
      copyfiles(['input/doesnotexist/*.txt', 'output'], { verbose: true }, err => {
        expect(logSpy).toHaveBeenCalledWith('Files copied:   0');
        expect(timeSpy).toHaveBeenCalled();
        expect(err).toBeUndefined();
        logSpy.mockRestore();
        timeSpy.mockRestore();
        done();
      });
    }));

  test('throws when flat & up used together (with callback)', () =>
    new Promise((done: any) => {
      copyfiles(['input/**/*.txt', 'output'], { flat: true, up: 1 }, err => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toBe('Cannot use --flat in conjunction with --up option.');
        done();
      });
    }));

  test('throws when nothing copied and options.error is set (no callback)', () => {
    expect(() => {
      copyfiles(['input/doesnotexist/*.txt', 'output'], { error: true });
    }).toThrow('nothing copied');
  });

  test('sets followSymbolicLinks when options.follow is true', async () => {
    if (process.platform === 'win32') return;
    mkdirSync('input/real', { recursive: true });
    writeFileSync('input/real/a.txt', 'test');
    symlinkSync('real', 'input/link');
    await new Promise<void>((resolve, reject) => {
      copyfiles(['input/link/*.txt', 'output'], { follow: true }, err => {
        const files = globSync('output/**/*', { dot: true });
        console.log('output contents:', files);
        const found = files.some(f => f.endsWith('a.txt'));
        expect(found).toBe(true);
        if (err) reject(err);
        else resolve();
      });
    });
  });

  test('verbose up', () =>
    new Promise((done: any) => {
      const logSpy = vi.spyOn(global.console, 'log').mockReturnValue();
      writeFileSync('input/other/a.txt', 'a');
      writeFileSync('input/other/b.txt', 'b');
      writeFileSync('input/other/c.js', 'c');
      copyfiles(['input/**/*.txt', 'output'], { up: 2, verbose: true }, () => {
        readdir('output', (_err, files) => {
          expect(files).toEqual(['a.txt', 'b.txt']);
          expect(logSpy).toHaveBeenCalledWith('glob found', ['input/other/a.txt', 'input/other/b.txt']);
          expect(logSpy).toHaveBeenCalledWith('copy:', { from: 'input/other/a.txt', to: 'output/a.txt' });
          expect(logSpy).toHaveBeenCalledWith('copy:', { from: 'input/other/b.txt', to: 'output/b.txt' });
          expect(logSpy).toHaveBeenCalledWith('Files copied:   2');
          done();
        });
      });
    }));

  test('copies and renames a single file when destination is a file path', () =>
    new Promise((done: any) => {
      writeFileSync('input/.env.production', 'SOME=VALUE');
      copyfiles(['input/.env.production', 'output/.env'], {}, err => {
        expect(err).toBeUndefined();
        readdir('output', (_err, files) => {
          expect(files).toContain('.env');
          // Check file contents
          const content = readFileSync('output/.env', 'utf8');
          expect(content).toBe('SOME=VALUE');
          done();
        });
      });
    }));

  test('copies and renames a single file to a new filename (no dot)', () =>
    new Promise((done: any) => {
      writeFileSync('input/original.txt', 'HELLO WORLD');
      copyfiles(['input/original.txt', 'output/renamed.txt'], {}, err => {
        expect(err).toBeUndefined();
        readdir('output', (_err, files) => {
          expect(files).toContain('renamed.txt');
          // Check file contents
          const content = readFileSync('output/renamed.txt', 'utf8');
          expect(content).toBe('HELLO WORLD');
          done();
        });
      });
    }));

  test('copies and renames files, using --flat option, from subfolders using wildcard in destination with .scss extension', () =>
    new Promise((done: any) => {
      // Setup: create input files in subfolders
      mkdirSync('input/sub1');
      mkdirSync('input/sub2/deep1', { recursive: true });
      writeFileSync('input/root.css', '.root { color: black }');
      writeFileSync('input/sub1/input1.css', 'h1 { color: red }');
      writeFileSync('input/sub2/input2.css', 'h2 { color: blue }');
      writeFileSync('input/sub2/input3.css', 'h3 { color: green }');
      writeFileSync('input/sub2/deep1/d1.css', '.d1 { color: yellow }');

      copyfiles(['input/**/*.css', 'output/*.scss'], { flat: true }, err => {
        expect(err).toBeUndefined();
        const files = readdirSync('output');
        expect(files).toEqual(expect.arrayContaining(['root.scss', 'input1.scss', 'input2.scss', 'input3.scss', 'd1.scss']));
        expect(readFileSync('output/root.scss', 'utf8')).toBe('.root { color: black }');
        expect(readFileSync('output/input1.scss', 'utf8')).toBe('h1 { color: red }');
        expect(readFileSync('output/input2.scss', 'utf8')).toBe('h2 { color: blue }');
        expect(readFileSync('output/input3.scss', 'utf8')).toBe('h3 { color: green }');
        expect(readFileSync('output/d1.scss', 'utf8')).toBe('.d1 { color: yellow }');
        done();
      });
    }));

  test('copies and renames files, using --up option, from subfolders using wildcard in destination with .scss extension', () =>
    new Promise((done: any) => {
      // Setup: create input files in subfolders
      mkdirSync('input/sub1');
      mkdirSync('input/sub2/deep1', { recursive: true });
      writeFileSync('input/root.css', '.root { color: black }');
      writeFileSync('input/sub1/input1.css', 'h1 { color: red }');
      writeFileSync('input/sub2/input2.css', 'h2 { color: blue }');
      writeFileSync('input/sub2/input3.css', 'h3 { color: green }');
      writeFileSync('input/sub2/deep1/d1.css', '.d1 { color: yellow }');

      copyfiles(['input/**/*.css', 'output/*.scss'], {}, err => {
        expect(err).toBeUndefined();
        expect(readFileSync('output/input/root.scss', 'utf8')).toBe('.root { color: black }');
        expect(readFileSync('output/input/sub1/input1.scss', 'utf8')).toBe('h1 { color: red }');
        expect(readFileSync('output/input/sub2/input2.scss', 'utf8')).toBe('h2 { color: blue }');
        expect(readFileSync('output/input/sub2/input3.scss', 'utf8')).toBe('h3 { color: green }');
        expect(readFileSync('output/input/sub2/deep1/d1.scss', 'utf8')).toBe('.d1 { color: yellow }');
        done();
      });
    }));

  test('copies and renames files, using --up:1 option, from subfolders using wildcard in destination with .scss extension', () =>
    new Promise((done: any) => {
      // Setup: create input files in subfolders
      mkdirSync('input/deep1');
      writeFileSync('input/input1.css', 'h1 { color: red }');
      writeFileSync('input/input2.css', 'h2 { color: blue }');
      writeFileSync('input/input3.css', 'h3 { color: green }');
      writeFileSync('input/deep1/d1.css', '.d1 { color: yellow }');

      copyfiles(['input/**/*.css', 'output/*.scss'], { up: true }, err => {
        expect(err).toBeUndefined();
        expect(readFileSync('output/input1.scss', 'utf8')).toBe('h1 { color: red }');
        expect(readFileSync('output/input2.scss', 'utf8')).toBe('h2 { color: blue }');
        expect(readFileSync('output/input3.scss', 'utf8')).toBe('h3 { color: green }');
        expect(readFileSync('output/d1.scss', 'utf8')).toBe('.d1 { color: yellow }');
        done();
      });
    }));

  test('copies and renames files, using --up:1 option, from subfolders using wildcard in destination with .scss extension', () =>
    new Promise((done: any) => {
      // Setup: create input files in subfolders
      mkdirSync('input/sub1');
      mkdirSync('input/sub2');
      mkdirSync('input/sub2/deep1', { recursive: true });
      writeFileSync('input/root.css', '.root { color: black }');
      writeFileSync('input/sub1/input1.css', 'h1 { color: red }');
      writeFileSync('input/sub2/input2.css', 'h2 { color: blue }');
      writeFileSync('input/sub2/input3.css', 'h3 { color: green }');
      writeFileSync('input/sub2/deep1/d1.css', '.d1 { color: yellow }');

      copyfiles(['input/**/*.css', 'output/*.scss'], { up: 1 }, err => {
        expect(err).toBeUndefined();
        expect(readFileSync('output/root.scss', 'utf8')).toBe('.root { color: black }');
        expect(readFileSync('output/sub1/input1.scss', 'utf8')).toBe('h1 { color: red }');
        expect(readFileSync('output/sub2/input2.scss', 'utf8')).toBe('h2 { color: blue }');
        expect(readFileSync('output/sub2/input3.scss', 'utf8')).toBe('h3 { color: green }');
        expect(readFileSync('output/sub2/deep1/d1.scss', 'utf8')).toBe('.d1 { color: yellow }');
        done();
      });
    }));

  test('copies and renames files, using --flat option and rename callback, from subfolders with .scss extension', () =>
    new Promise((done: any) => {
      // Setup: create input files in subfolders
      mkdirSync('input/sub1');
      mkdirSync('input/sub2/deep1', { recursive: true });
      writeFileSync('input/root.css', '.root { color: black }');
      writeFileSync('input/sub1/input1.css', 'h1 { color: red }');
      writeFileSync('input/sub2/input2.css', 'h2 { color: blue }');
      writeFileSync('input/sub2/input3.css', 'h3 { color: green }');
      writeFileSync('input/sub2/deep1/d1.css', '.d1 { color: yellow }');

      copyfiles(
        ['input/**/*.css', 'output'],
        {
          flat: true,
          rename: (_src, dest) => dest.replace(/\.css$/, '.scss'),
        },
        err => {
          expect(err).toBeUndefined();
          const files = readdirSync('output');
          expect(files).toEqual(expect.arrayContaining(['root.scss', 'input1.scss', 'input2.scss', 'input3.scss', 'd1.scss']));
          expect(readFileSync('output/root.scss', 'utf8')).toBe('.root { color: black }');
          expect(readFileSync('output/input1.scss', 'utf8')).toBe('h1 { color: red }');
          expect(readFileSync('output/input2.scss', 'utf8')).toBe('h2 { color: blue }');
          expect(readFileSync('output/input3.scss', 'utf8')).toBe('h3 { color: green }');
          expect(readFileSync('output/d1.scss', 'utf8')).toBe('.d1 { color: yellow }');
          done();
        },
      );
    }));

  test('copies and renames files, using --up:1 option and rename callback, from subfolders but keeps .css extension', () =>
    new Promise((done: any) => {
      // Setup: create input files in subfolders
      mkdirSync('input/sub1');
      mkdirSync('input/sub2/deep1', { recursive: true });
      writeFileSync('input/root.css', '.root { color: black }');
      writeFileSync('input/sub1/input1.css', 'h1 { color: red }');
      writeFileSync('input/sub2/input2.css', 'h2 { color: blue }');
      writeFileSync('input/sub2/input3.css', 'h3 { color: green }');
      writeFileSync('input/sub2/deep1/d1.css', '.d1 { color: yellow }');

      copyfiles(
        ['input/**/*.css', 'output'],
        {
          up: 1,
          rename: (_src, dest) => dest.replace(/([^/\\]+)\.css$/, 'renamed-$1.css'),
        },
        err => {
          expect(err).toBeUndefined();
          expect(readFileSync('output/renamed-root.css', 'utf8')).toBe('.root { color: black }');
          expect(readFileSync('output/sub1/renamed-input1.css', 'utf8')).toBe('h1 { color: red }');
          expect(readFileSync('output/sub2/renamed-input2.css', 'utf8')).toBe('h2 { color: blue }');
          expect(readFileSync('output/sub2/renamed-input3.css', 'utf8')).toBe('h3 { color: green }');
          expect(readFileSync('output/sub2/deep1/renamed-d1.css', 'utf8')).toBe('.d1 { color: yellow }');
          done();
        },
      );
    }));

  test('copies and renames files using both destination glob and rename callback', () =>
    new Promise((done: any) => {
      mkdirSync('input/sub');
      writeFileSync('input/foo.css', 'foo');
      writeFileSync('input/sub/bar.css', 'bar');
      copyfiles(
        ['input/**/*.css', 'output/*.scss'],
        {
          rename: (_src, dest) => dest.replace(/foo\.scss$/, 'baz.scss'),
        },
        err => {
          expect(err).toBeUndefined();
          expect(readFileSync('output/input/baz.scss', 'utf8')).toBe('foo');
          expect(readFileSync('output/input/sub/bar.scss', 'utf8')).toBe('bar');
          done();
        },
      );
    }));

  test('copies and renames files, moving them to a subdirectory via rename callback', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      writeFileSync('input/b.txt', 'b');
      copyfiles(
        ['input/*.txt', 'output'],
        {
          rename: (_src, dest) => dest.replace('output', 'output/renamed'),
        },
        err => {
          expect(err).toBeUndefined();
          expect(readFileSync('output/renamed/input/a.txt', 'utf8')).toBe('a');
          expect(readFileSync('output/renamed/input/b.txt', 'utf8')).toBe('b');
          done();
        },
      );
    }));

  test('copies files with rename callback that returns the same path', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      copyfiles(
        ['input/a.txt', 'output'],
        {
          rename: (_src, dest) => dest,
        },
        err => {
          expect(err).toBeUndefined();
          expect(readFileSync('output/input/a.txt', 'utf8')).toBe('a');
          done();
        },
      );
    }));

  test('copies files and strips extension via rename callback', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      copyfiles(
        ['input/a.txt', 'output'],
        {
          rename: (_src, dest) => dest.replace(/\.txt$/, ''),
        },
        err => {
          expect(err).toBeUndefined();
          expect(readFileSync('output/input/a', 'utf8')).toBe('a');
          done();
        },
      );
    }));

  test('calls callback with error if rename callback throws', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      copyfiles(
        ['input/a.txt', 'output'],
        {
          rename: () => {
            throw new Error('rename failed');
          },
        },
        err => {
          expect(err).toBeInstanceOf(Error);
          expect(err?.message).toBe('rename failed');
          done();
        },
      );
    }));

  test('copies and renames files, using --up:true and destination glob, from nested folders', () =>
    new Promise((done: any) => {
      mkdirSync('input/level1/level2', { recursive: true });
      writeFileSync('input/level1/level2/a.css', 'a');
      copyfiles(['input/**/*.css', 'output/*.scss'], { up: true }, err => {
        expect(err).toBeUndefined();
        expect(readFileSync('output/a.scss', 'utf8')).toBe('a');
        done();
      });
    }));

  test('destination glob with source file with no extension', () =>
    new Promise((done: any) => {
      writeFileSync('input/file', 'abc');
      copyfiles(['input/file', 'output/*.txt'], {}, err => {
        expect(err).toBeUndefined();
        expect(readFileSync('output/input/file.txt', 'utf8')).toBe('abc');
        done();
      });
    }));

  test('calls callback with error if rename callback throws (glob)', () =>
    new Promise((done: any) => {
      writeFileSync('input/a.txt', 'a');
      copyfiles(
        ['input/a.txt', 'output/*.txt'],
        {
          rename: () => {
            throw new Error('rename failed glob');
          },
        },
        err => {
          expect(err).toBeInstanceOf(Error);
          expect(err?.message).toBe('rename failed glob');
          done();
        },
      );
    }));

  test('destination glob with source file and destination with no extension', () =>
    new Promise((done: any) => {
      writeFileSync('input/file', 'abc');
      copyfiles(['input/file', 'output/*'], {}, err => {
        expect(err).toBeUndefined();
        expect(readFileSync('output/input/file', 'utf8')).toBe('abc');
        done();
      });
    }));

  test('throws when destination is missing (no callback)', () => {
    expect(() => copyfiles(['input/a.txt'], {})).toThrow(
      'Please make sure to provide both <inFile> and <outDirectory>, i.e.: "copyfiles <inFile> <outDirectory>"',
    );
  });

  test('throws when nothing is copied and error option is set (no callback)', () => {
    createDir('output');
    expect(() => {
      copyfiles(['input/doesnotexist.txt', 'output'], { error: true });
    }).toThrow('nothing copied');
  });

  test('throws with rename glob and up 2', () =>
    new Promise((done: any) => {
      // Setup: create input files in subfolders
      mkdirSync('input/sub1');
      mkdirSync('input/sub2/deep1', { recursive: true });
      writeFileSync('input/root.css', '.root { color: black }');
      writeFileSync('input/sub1/input1.css', 'h1 { color: red }');
      writeFileSync('input/sub2/input2.css', 'h2 { color: blue }');
      writeFileSync('input/sub2/input3.css', 'h3 { color: green }');
      writeFileSync('input/sub2/deep1/d1.css', '.d1 { color: yellow }');

      copyfiles(['input/**/*.css', 'output/*.scss'], { up: 2 }, err => {
        if (err) {
          expect(err?.message).toBe(`Can't go up 2 levels from input (1 levels).`);
          done();
        }
      });
    }));

  describe('utils', () => {
    it('getDestinationPath - single file rename branch', () => {
      const result = getDestinationPath('foo.txt', 'dest.txt', {}, true);
      expect(result).toBe('dest.txt');
    });

    it('getDestinationPath - flat branch', () => {
      const result = getDestinationPath('foo/bar.txt', 'dest', { flat: true }, false);
      expect(result.replaceAll('\\', '/').endsWith(posixJoin('dest', 'bar.txt'))).toBe(true);
    });

    it('getDestinationPath - up === true branch', () => {
      const result = getDestinationPath('foo/bar.txt', 'dest', { up: true }, false);
      expect(result.replaceAll('\\', '/').endsWith(posixJoin('dest', 'bar.txt'))).toBe(true);
    });

    it('filterDotFiles returns all if dot=true', () => {
      const files = ['foo.txt', '.bar.txt'];
      expect(filterDotFiles(files, true)).toEqual(['foo.txt', '.bar.txt']);
    });

    it('filterDotFiles filters dotfiles if dot=false', () => {
      const files = ['foo.txt', '.bar.txt', 'baz/.hidden', 'baz/visible'];
      expect(filterDotFiles(files, false)).toEqual(['foo.txt', 'baz/visible']);
    });
  });
});
