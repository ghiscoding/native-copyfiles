import {
  createReadStream,
  createWriteStream,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, relative } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { copyfiles } from '../index.js';
import type { CopyFileOptions } from '../interfaces.js';

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    createReadStream: vi.fn(actual.createReadStream),
    createWriteStream: vi.fn(actual.createWriteStream),
    existsSync: vi.fn(actual.existsSync),
    globSync: vi.fn(actual.globSync),
    statSync: vi.fn(actual.statSync),
  };
});

vi.mock('node:os', async importOriginal => ({
  ...(await importOriginal<typeof import('node:os')>()),
  availableParallelism: vi.fn(),
}));

describe('copy resource management', () => {
  let root: string;
  let input: string;
  let output: string;

  beforeEach(async () => {
    vi.mocked(availableParallelism).mockReturnValue(12);
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
    vi.mocked(createReadStream).mockImplementation(actual.createReadStream);
    vi.mocked(createWriteStream).mockImplementation(actual.createWriteStream);
    mkdirSync('tmp', { recursive: true });
    root = mkdtempSync(join(process.cwd(), 'tmp', 'native-copyfiles-test-'));
    input = join(root, 'input');
    output = join(root, 'output');
    mkdirSync(input);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  const copy = (sources: string | string[], destination: string, options: CopyFileOptions = {}) =>
    new Promise<void>((resolve, reject) => {
      copyfiles(sources, destination, options, err => (err ? reject(err) : resolve()));
    });

  function assertStreamsClosed() {
    for (const stream of [
      ...vi.mocked(createReadStream).mock.results.map(result => result.value),
      ...vi.mocked(createWriteStream).mock.results.map(result => result.value),
    ]) {
      expect(stream.destroyed).toBe(true);
      expect(stream.closed).toBe(true);
    }
  }

  async function assertConcurrency(limit: number, options: CopyFileOptions = {}) {
    for (let i = 0; i < 160; i++) {
      writeFileSync(join(input, `${i}.txt`), `contents-${i}`);
    }
    const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
    let active = 0;
    let peak = 0;
    vi.mocked(createReadStream).mockImplementation((...args) => {
      const stream = actual.createReadStream(...args);
      active++;
      peak = Math.max(peak, active);
      stream.once('close', () => active--);
      return stream;
    });

    options.flat = true;
    await copy(`${input}/*.txt`, output, options);

    expect(peak).toBe(limit);
    expect(active).toBe(0);
    expect(readdirSync(output)).toHaveLength(160);
    for (let i = 0; i < 160; i++) {
      expect(readFileSync(join(output, `${i}.txt`), 'utf8')).toBe(`contents-${i}`);
    }
    assertStreamsClosed();
  }

  test.each([1, 12, 64])('uses available parallelism %i with a maximum default of 32', async parallelism => {
    vi.mocked(availableParallelism).mockReturnValue(parallelism);
    await assertConcurrency(Math.min(32, parallelism));
  });

  test.each([1, 3, 48])('honors an explicit concurrency of %i', async concurrency => {
    vi.mocked(availableParallelism).mockReturnValue(1);
    await assertConcurrency(concurrency, { concurrency });
    expect(availableParallelism).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid concurrency %s before accessing files',
    async concurrency => {
      const options = { concurrency };
      expect(() => copyfiles(`${input}/*.txt`, output, options)).toThrow('Concurrency must be a positive safe integer.');
      await expect(copy(`${input}/*.txt`, output, options)).rejects.toThrow('Concurrency must be a positive safe integer.');
      expect(globSync).not.toHaveBeenCalled();
      expect(createReadStream).not.toHaveBeenCalled();
    },
  );

  test('ignores an inherited concurrency option', async () => {
    vi.mocked(availableParallelism).mockReturnValue(3);
    await assertConcurrency(3, Object.create({ concurrency: 1 }));
  });

  test('closes both streams after repeated write failures', async () => {
    writeFileSync(join(input, 'large.txt'), Buffer.alloc(1024 * 1024));
    mkdirSync(join(output, 'large.txt'), { recursive: true });

    for (let i = 0; i < 10; i++) {
      await expect(copy(join(input, 'large.txt'), output, { flat: true })).rejects.toBeInstanceOf(Error);
      assertStreamsClosed();
    }
  });

  test('stops queued copies, aborts active streams and reports the original read error once', async () => {
    for (let i = 0; i < 96; i++) {
      writeFileSync(join(input, `${i}.txt`), Buffer.alloc(1024 * 1024));
    }
    const error = new Error('read failed');
    vi.mocked(createReadStream).mockImplementationOnce(() => {
      const stream = new Readable({ read() {} });
      setImmediate(() => stream.destroy(error));
      return stream as ReturnType<typeof createReadStream>;
    });
    const rename = vi.fn((_src: string, dest: string) => dest);
    const callback = vi.fn();
    await new Promise<void>(resolve => {
      copyfiles(`${input}/*.txt`, output, { flat: true, rename }, err => {
        callback(err);
        resolve();
      });
    });
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(callback).toHaveBeenCalledExactlyOnceWith(error);
    expect(rename.mock.calls.length).toBeLessThanOrEqual(12);
    assertStreamsClosed();
  });

  test.each(['read', 'write'])('reports premature %s closure and closes the other stream', async side => {
    writeFileSync(join(input, 'file.txt'), Buffer.alloc(1024 * 1024));
    if (side === 'read') {
      vi.mocked(createReadStream).mockImplementationOnce(
        () =>
          new Readable({
            read() {
              this.destroy();
            },
          }) as ReturnType<typeof createReadStream>,
      );
    } else {
      vi.mocked(createWriteStream).mockImplementationOnce(
        () =>
          new Writable({
            write(_chunk, _encoding, callback) {
              this.destroy();
              callback();
            },
          }) as ReturnType<typeof createWriteStream>,
      );
    }

    await expect(copy(join(input, 'file.txt'), output, { flat: true })).rejects.toThrow('closed before copying');

    assertStreamsClosed();
  });

  test('does not start queued copies after a synchronous rename error', async () => {
    for (let i = 0; i < 64; i++) {
      writeFileSync(join(input, `${i}.txt`), 'contents');
    }
    const error = new Error('rename failed');
    const rename = vi.fn(() => {
      throw error;
    });

    await expect(copy(`${input}/*.txt`, output, { rename })).rejects.toBe(error);

    expect(rename).toHaveBeenCalledTimes(1);
    expect(createReadStream).not.toHaveBeenCalled();
  });

  test('waits for active streams when a later worker encounters a synchronous error', async () => {
    const sources = Array.from({ length: 64 }, (_, i) => join(input, `${i}.txt`));
    for (const source of sources) {
      writeFileSync(source, Buffer.alloc(8192));
    }
    const error = new Error('second rename failed');
    let renamed = 0;
    const rename = vi.fn((_src: string, dest: string) => {
      if (++renamed === 2) {
        throw error;
      }
      return dest;
    });
    const callback = vi.fn();
    await new Promise<void>(resolve => {
      copyfiles(sources, output, { flat: true, concurrency: 3, rename }, err => {
        callback(err);
        resolve();
      });
    });
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(callback).toHaveBeenCalledExactlyOnceWith(error);
    expect(rename).toHaveBeenCalledTimes(2);
    expect(createReadStream).toHaveBeenCalledTimes(1);
    assertStreamsClosed();
  });

  test('reports per-file directory creation failures through the callback', async () => {
    writeFileSync(join(input, 'file.txt'), 'contents');
    mkdirSync(output);
    writeFileSync(join(output, 'blocked'), 'not a directory');

    await expect(
      copy(join(input, 'file.txt'), output, { rename: () => join(output, 'blocked', 'nested', 'file.txt') }),
    ).rejects.toBeInstanceOf(Error);

    expect(createReadStream).not.toHaveBeenCalled();
  });

  test('applies string exclusions', async () => {
    writeFileSync(join(input, 'keep.txt'), 'keep');
    writeFileSync(join(input, 'skip.txt'), 'skip');

    await copy(`${input}/*.txt`, output, { flat: true, exclude: '**/skip.txt' });

    expect(readdirSync(output)).toEqual(['keep.txt']);
  });

  test('retains default exclusions for an empty exclusion array', async () => {
    mkdirSync(join(input, 'node_modules'));
    writeFileSync(join(input, 'keep.txt'), 'keep');
    writeFileSync(join(input, 'node_modules', 'skip.txt'), 'skip');

    await copy(`${input}/**/*.txt`, output, { flat: true, exclude: [] });

    expect(readdirSync(output)).toEqual(['keep.txt']);
  });

  test('caches discovery but preserves ordered negation and re-inclusion', async () => {
    writeFileSync(join(input, 'keep.txt'), 'keep');
    writeFileSync(join(input, 'skip.txt'), 'skip');
    const pattern = `${input}/*.txt`;

    await copy([pattern, `!${pattern}`, pattern, `!${input}/skip.txt`], output, { flat: true });

    expect(readdirSync(output)).toEqual(['keep.txt']);
    expect(globSync).toHaveBeenCalledTimes(2);
    // Only source-pattern checks need stat calls, not each matching file.
    expect(statSync).toHaveBeenCalledTimes(2);
  });

  test('checks a shared destination directory once per operation', async () => {
    for (let i = 0; i < 80; i++) {
      writeFileSync(join(input, `${i}.txt`), 'contents');
    }

    await copy(`${input}/*.txt`, output, { flat: true });
    await copy(`${input}/*.txt`, output, { flat: true });

    expect(vi.mocked(existsSync).mock.calls.filter(([path]) => path === output)).toHaveLength(2);
  });

  test('retains relative paths and symlinked-file copying while filtering linked directories', async () => {
    if (process.platform === 'win32') {
      return;
    }
    writeFileSync(join(input, 'file.txt'), 'contents');
    mkdirSync(join(input, 'dir.txt'));
    symlinkSync('file.txt', join(input, 'link.txt'));
    symlinkSync('dir.txt', join(input, 'dir-link.txt'));
    const source = relative(process.cwd(), input).replaceAll('\\', '/');
    const renamedSources: string[] = [];

    await copy(`${source}/*.txt`, output, {
      flat: true,
      rename: (src, dest) => {
        renamedSources.push(src);
        return dest;
      },
    });

    expect(readdirSync(output).sort()).toEqual(['file.txt', 'link.txt']);
    expect(readFileSync(join(output, 'link.txt'), 'utf8')).toBe('contents');
    expect(renamedSources.sort()).toEqual([`${source}/file.txt`, `${source}/link.txt`].sort());
  });
});
