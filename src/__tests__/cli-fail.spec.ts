import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('copyfiles', () => {
  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  test('CLI entry failure (no valid process.argv)', () =>
    new Promise((done: any) => {
      const errorSpy = vi.spyOn(global.console, 'error').mockReturnValue();
      const exitSpy = vi.spyOn(process, 'exit');

      vi.spyOn(process, 'argv', 'get').mockReturnValue(['node.exe', 'native-copyfiles/dist/cli.js', 'input1']);

      import('../cli.js')
        .then((cli: any) => {
          cli();
        })
        .catch(_ => {
          // expect(err.message).toBe('Missing required positional argument: inFile');
          // expect(exitSpy).toHaveBeenCalledWith(1);
          // Please make sure to provide both <inFile> and <outDirectory>, i.e.: "copyfiles <inFile> <outDirectory>"
          expect(errorSpy).toHaveBeenCalledWith(
            new Error('Missing required positional argument, i.e.: "copyfiles <inFile> <outDirectory>"'),
          );
          expect(exitSpy).toHaveBeenCalledWith(1);
          process.exitCode = undefined;
          done();
          process.exit(0);
        });
    }));
});
