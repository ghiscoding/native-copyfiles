export interface CopyFileOptions {
  /** Include files & directories beginning with a dot (.) */
  all?: boolean;

  /** Show what would be copied, but do not actually copy any files */
  dryRun?: boolean;

  /** Throw error if nothing is copied */
  error?: boolean;

  /** Pattern or glob to exclude files (may be passed multiple times in the CLI) */
  exclude?: string | string[];

  /** Flatten the output */
  flat?: boolean;

  /** Follow symbolic link links */
  follow?: boolean;

  /** Show statistics after execution (execution time + file count) */
  stat?: boolean;

  /**
   * Slice a path off the bottom of the paths.
   * Note: when is assigned with `up: true`, it is equivalent to `flat: true`
   */
  up?: boolean | number;

  /** Print files being copied to the console */
  verbose?: boolean;

  /** Callback to run when the execution finished or an error occured */
  callback?: (e?: Error) => void;

  /** Callback to transform the destination filename(s) */
  rename?: (src: string, dest: string) => string;
}
