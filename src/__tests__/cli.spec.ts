import { readdir, rmSync, writeFileSync } from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createDir } from '../index';

async function cleanupFolders() {
  try {
    rmSync('input2', { recursive: true, force: true });
    rmSync('output2', { recursive: true, force: true });
  } catch (e) { }
}

describe('copyfiles', () => {
  afterEach(async () => {
    vi.clearAllMocks();
    cleanupFolders();
    process.exitCode = undefined;
  });

  afterAll(() => cleanupFolders());

  beforeEach(() => {
    createDir('input2/other');
  });

  test('CLI exclude', () => new Promise((done: any) => {
    writeFileSync('input2/a.txt', 'a');
    writeFileSync('input2/b.txt', 'b');
    writeFileSync('input2/c.js.txt', 'c');
    writeFileSync('input2/d.ps.txt', 'd');

    vi.spyOn(process, 'argv', 'get').mockReturnValue([
      'node.exe',
      'native-copyfiles/dist/cli.js',
      'input2',
      'output2',
      '--exclude',
      '**/*.js.txt',
      '**/*.ps.txt'
    ]);

    // Mock process.exit so it doesn't kill the test runner
    // @ts-ignore
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      // Do nothing
    });

    import('../cli')
      .then(() => {
        // Wait a tick to ensure file writes are complete
        setTimeout(() => {
          readdir('output2/input2', (err, files) => {
            expect(files).toEqual(['a.txt', 'b.txt']);
            exitSpy.mockRestore();
            done();
          });
        }, 100); // 100ms delay to allow async file writes
      })
      .catch(e => {
        setTimeout(() => {
          readdir('output2/input2', (err, files) => {
            expect(files).toEqual(['a.txt', 'b.txt']);
            exitSpy.mockRestore();
            done();
          });
        }, 100);
      });
  }))
})