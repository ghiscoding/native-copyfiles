import { mkdirSync, readdir, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { globSync } from 'tinyglobby';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { copyfiles, createDir } from '../index';

let shouldMockReadError = false;
const error = new Error('Mock read error');

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    createReadStream: (...args: any[]) => {
      if (shouldMockReadError) {
        const { Readable } = require('node:stream');
        const stream = new Readable({ read() { } });
        setImmediate(() => stream.emit('error', error));
        return stream;
      }
      // fallback to real implementation
      return (actual.createReadStream as any)(...args);
    }
  };
});

async function cleanupFolders() {
  try {
    rmSync('input', { recursive: true, force: true });
    rmSync('output', { recursive: true, force: true });
  } catch (e) { }
}

describe('copyfiles', () => {
  afterEach(async () => {
    await cleanupFolders();
  });

  afterAll(async () => {
    await cleanupFolders();
  });

  beforeEach(() => {
    createDir('input/other');
  });

  test('throws when inFile or outDir are missing', () => new Promise((done: any) => {
    copyfiles(['input/**/*.txt'], {}, (err) => {
      expect(err?.message).toBe('Please make sure to provide both <inFile> and <outDirectory>, i.e.: "copyfiles <inFile> <outDirectory>"');
      done();
    });
  }));

  test('throws when flat & up used together', () => new Promise((done: any) => {
    copyfiles(['input/**/*.txt', 'output'], { flat: true, up: 2 }, (err) => {
      expect(err?.message).toBe('Cannot use --flat in conjunction with --up option.');
      done();
    });
  }));

  test('normal', () => new Promise((done: any) => {
    writeFileSync('input/a.txt', 'a');
    writeFileSync('input/b.txt', 'b');
    writeFileSync('input/c.js', 'c');
    copyfiles(['input/*.txt', 'output'], {}, (err) => {
      readdir('output/input', async (err, files) => {
        expect(files).toEqual(['a.txt', 'b.txt']);
        done();
      });
    });
  }));

  test('modes', () => new Promise((done: any) => {
    writeFileSync('input/a.txt', 'a', {
      mode: 33261
    });
    writeFileSync('input/b.txt', 'b');
    writeFileSync('input/c.js', 'c');
    copyfiles(['input/*.txt', 'output'], {}, (err) => {
      readdir('output/input', (err, files) => {
        expect(files).toEqual(['a.txt', 'b.txt']);
        //  'correct mode'
        // expect(statSync('output/input/a.txt').mode).toBe(33261);
        done();
      });
    });
  }));

  test('exclude', () => new Promise((done: any) => {
    writeFileSync('input/a.txt', 'a');
    writeFileSync('input/b.txt', 'b');
    writeFileSync('input/c.js.txt', 'c');
    writeFileSync('input/d.ps.txt', 'd');
    copyfiles(['input/*.txt', 'output'], {
      exclude: ['**/*.js.txt', '**/*.ps.txt']
    }, (err) => {
      readdir('output/input', (err, files) => {
        expect(files).toEqual(['a.txt', 'b.txt']);
        done();
      });
    });
  }));

  test('error on nothing copied', () => new Promise((done: any) => {
    writeFileSync('input/.c.txt', 'c');
    copyfiles(['input/*.txt', 'output'], { error: true }, (err) => {
      expect(err?.message).toBe('nothing copied');
      done();
    });
  }));

  test('all', () => new Promise((done: any) => {
    writeFileSync('input/a.txt', 'a');
    writeFileSync('input/b.txt', 'b');
    writeFileSync('input/.c.txt', 'c');
    copyfiles(['input/*.txt', 'output'], { all: true }, (err) => {
      readdir('output/input', (err, files) => {
        expect(files).toEqual(['.c.txt', 'a.txt', 'b.txt']);
        done();
      });
    });
  }));

  test('with up', () => new Promise((done: any) => {
    writeFileSync('input/a.txt', 'a');
    writeFileSync('input/b.txt', 'b');
    writeFileSync('input/c.js', 'c');
    copyfiles(['input/*.txt', 'output'], { up: 1 }, (err) => {
      readdir('output', (err, files) => {
        expect(files).toEqual(['a.txt', 'b.txt']);
        done();
      });
    });
  }));

  test('with up true', () => new Promise((done: any) => {
    writeFileSync('input/a.txt', 'a');
    writeFileSync('input/b.txt', 'b');
    writeFileSync('input/c.js', 'c');
    copyfiles(['input/*.txt', 'output'], { up: true }, (err) => {
      readdir('output', (err, files) => {
        expect(files).toEqual(['a.txt', 'b.txt']);
        done();
      });
    });
  }));

  test('with up 2', () => new Promise((done: any) => {
    writeFileSync('input/other/a.txt', 'a');
    writeFileSync('input/other/b.txt', 'b');
    writeFileSync('input/other/c.js', 'c');
    copyfiles(['input/**/*.txt', 'output'], { up: 2 }, (err) => {
      readdir('output', (err, files) => {
        expect(files).toEqual(['a.txt', 'b.txt']);
        done();
      });
    });
  }));

  test('throws with up 3', () => new Promise((done: any) => {
    writeFileSync('input/other/a.txt', 'a');
    writeFileSync('input/other/b.txt', 'b');
    writeFileSync('input/other/c.js', 'c');
    copyfiles(['input/**/*.txt', 'output'], { up: 3 }, (err) => {
      if (err) {
        expect(err?.message).toBe(`Can't go up 3 levels from input/other (2 levels).`);
        done();
      }
    });
  }));

  test('flatten', () => new Promise((done: any) => {
    writeFileSync('input/other/a.txt', 'a');
    writeFileSync('input/b.txt', 'b');
    writeFileSync('input/other/c.js', 'c');
    copyfiles(['input/**/*.txt', 'output'], { flat: true }, (err) => {
      readdir('output', (err, files) => {
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
      copyfiles(['input/**/*.txt', 'output'], { up: 1, follow: true }, (err) => {
        const files = globSync('output/**/*.txt');
        expect(new Set(files)).toEqual(new Set(['output/a.txt', 'output/b.txt']));
      });
    }
  });

  test('verbose flat', () => new Promise((done: any) => {
    const logSpy = vi.spyOn(global.console, 'log').mockReturnValue();
    writeFileSync('input/other/a.txt', 'a');
    writeFileSync('input/b.txt', 'b');
    writeFileSync('input/other/c.js', 'c');
    copyfiles(['input/**/*.txt', 'output'], { flat: true, verbose: true }, (err) => {
      readdir('output', (err, files) => {
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
    createDir('input');
    expect(() => createDir('input')).not.toThrow();
  });

  test('throws when inFile or outDir are missing (no callback)', () => {
    expect(() => copyfiles(['input/**/*.txt'], {})).toThrow(
      'Please make sure to provide both <inFile> and <outDirectory>, i.e.: "copyfiles <inFile> <outDirectory>"'
    );
  });

  test('callback called when no files to copy', () => new Promise((done: any) => {
    copyfiles(['input/doesnotexist/*.txt', 'output'], {}, (err) => {
      expect(err).toBeUndefined();
      done();
    });
  }));

  test('copyFileStream handles read error', () => new Promise((done: any) => {
    writeFileSync('input/bad.txt', 'bad'); // <-- Ensure the file exists!
    shouldMockReadError = true;
    copyfiles(['input/bad.txt', 'output'], {}, (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err?.message).toBe('Mock read error');
      shouldMockReadError = false;
      done();
    });
  }));

  test('throws when flat & up used together', () => {
    expect(() => copyfiles(['input/**/*.txt', 'output'], { flat: true, up: 1 })).toThrow(
      'Cannot use --flat in conjunction with --up option.'
    );
  });

  test('calls callback with error when nothing copied and options.error is set', () => new Promise((done: any) => {
    copyfiles(['input/doesnotexist/*.txt', 'output'], { error: true }, (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err?.message).toBe('nothing copied');
      done();
    });
  }));

  test('logs and calls callback when nothing copied and verbose/stat is set', () => new Promise((done: any) => {
    const logSpy = vi.spyOn(global.console, 'log').mockReturnValue();
    const timeSpy = vi.spyOn(global.console, 'timeEnd').mockReturnValue();
    copyfiles(['input/doesnotexist/*.txt', 'output'], { verbose: true }, (err) => {
      expect(logSpy).toHaveBeenCalledWith('Files copied:   0');
      expect(timeSpy).toHaveBeenCalled();
      expect(err).toBeUndefined();
      logSpy.mockRestore();
      timeSpy.mockRestore();
      done();
    });
  }));

  test('throws when flat & up used together (with callback)', () => new Promise((done: any) => {
    copyfiles(['input/**/*.txt', 'output'], { flat: true, up: 1 }, (err) => {
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
      copyfiles(['input/link/*.txt', 'output'], { follow: true }, (err) => {
        const files = globSync('output/**/*', { dot: true });
        console.log('output contents:', files);
        const found = files.some(f => f.endsWith('a.txt'));
        expect(found).toBe(true);
        if (err) reject(err);
        else resolve();
      });
    });
  });

  test('verbose up', () => new Promise((done: any) => {
    const logSpy = vi.spyOn(global.console, 'log').mockReturnValue();
    writeFileSync('input/other/a.txt', 'a');
    writeFileSync('input/other/b.txt', 'b');
    writeFileSync('input/other/c.js', 'c');
    copyfiles(['input/**/*.txt', 'output'], { up: 2, verbose: true }, (err) => {
      readdir('output', (err, files) => {
        expect(files).toEqual(['a.txt', 'b.txt']);
        expect(logSpy).toHaveBeenCalledWith('glob found', ['input/other/a.txt', 'input/other/b.txt']);
        expect(logSpy).toHaveBeenCalledWith('copy:', { from: 'input/other/a.txt', to: 'output/a.txt' });
        expect(logSpy).toHaveBeenCalledWith('copy:', { from: 'input/other/b.txt', to: 'output/b.txt' });
        expect(logSpy).toHaveBeenCalledWith('Files copied:   2');
        done();
      });
    });
  }));

  test('copies and renames a single file when destination is a file path', () => new Promise((done: any) => {
    writeFileSync('input/.env.production', 'SOME=VALUE');
    copyfiles(['input/.env.production', 'output/.env'], {}, (err) => {
      expect(err).toBeUndefined();
      readdir('output', (err, files) => {
        expect(files).toContain('.env');
        // Check file contents
        const { readFileSync } = require('node:fs');
        const content = readFileSync('output/.env', 'utf8');
        expect(content).toBe('SOME=VALUE');
        done();
      });
    });
  }));

  test('copies and renames a single file to a new filename (no dot)', () => new Promise((done: any) => {
    writeFileSync('input/original.txt', 'HELLO WORLD');
    copyfiles(['input/original.txt', 'output/renamed.txt'], {}, (err) => {
      expect(err).toBeUndefined();
      readdir('output', (err, files) => {
        expect(files).toContain('renamed.txt');
        // Check file contents
        const { readFileSync } = require('node:fs');
        const content = readFileSync('output/renamed.txt', 'utf8');
        expect(content).toBe('HELLO WORLD');
        done();
      });
    });
  }));
});