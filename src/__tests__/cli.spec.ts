import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createDir } from '../index.js';

async function cleanupFolders() {
  try {
    rmSync('input2', { recursive: true, force: true });
    rmSync('output2', { recursive: true, force: true });
  } catch (_) {}
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

  test(
    'CLI exclude',
    () =>
      new Promise((done: any) => {
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
          '**/*.ps.txt',
        ]);

        // Mock process.exit so it doesn't kill the test runner
        // @ts-ignore
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
          if (code && code !== 0) {
            exitSpy.mockRestore();
            done(new Error(`process.exit called with code ${code}`));
          }
          // Do nothing for code 0
        });

        import('../cli.js')
          .then(() => {
            // Wait until output2/input2 exists, then check files
            const start = Date.now();
            const check = () => {
              if (!existsSync('output2/input2')) {
                if (Date.now() - start > 55) {
                  exitSpy.mockRestore();
                  return done(new Error('Timeout: output2/input2 was not created'));
                }
                setTimeout(check, 50);
                return;
              }
              try {
                setTimeout(() => {
                  const files = readdirSync('output2/input2');
                  expect(files).toEqual(['a.txt', 'b.txt']);
                  exitSpy.mockRestore();
                  done();
                }, 50);
              } catch (e) {
                exitSpy.mockRestore();
                done(e);
              }
            };
            check();
          })
          .catch(e => {
            exitSpy.mockRestore();
            done(e);
          });
      }),
    300,
  );
});
