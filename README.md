[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-fcc72b.svg?logo=vitest)](https://vitest.dev/)
[![codecov](https://codecov.io/gh/ghiscoding/native-copyfiles/branch/main/graph/badge.svg)](https://codecov.io/gh/ghiscoding/native-copyfiles)
<a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/native-copyfiles.svg" alt="Node" /></a>

[![npm](https://img.shields.io/npm/v/native-copyfiles.svg)](https://www.npmjs.com/package/native-copyfiles)
[![npm](https://img.shields.io/npm/dy/native-copyfiles)](https://www.npmjs.com/package/native-copyfiles)
[![npm bundle size](https://deno.bundlejs.com/badge?q=native-copyfiles)](https://bundlejs.com/?q=native-copyfiles)

## native-copyfiles

Copy files easily via JavaScript or the CLI and cross-platform usage using [cli-nano](https://www.npmjs.com/package/cli-nano) dependency for the CLI.

The library is very similar to the [copyfiles](https://www.npmjs.com/package/copyfiles) package, at least from the outside; however it is quite different internally. It uses native NodeJS as much as possible and so as a lot less dependencies (just 2 instead of 7), which makes this package a lot smaller compared to the original `copyfiles` project (1.8kB instead of 27.6kB gzip). The options are nearly the same (except for `--soft`, which is not implemented), there's also some new options that were added in this project (mainly the rename and dry-run features, see below).

> **Note**: there is 1 noticeable difference with `copyfiles` package, all the CLI options must be provided as suffix and after the source/target directories command (the original `copyfiles` project has them as prefix).<br>
> This mean calling: `copyfiles source target [options]` instead of `copyfiles [options] source target`
> The JS API is also different since the destination is the 2nd function argument instead of the first argument.

> [!NOTE]
> This project now requires Node.JS >= 22.17.0 so that we can use the native `fs.glob` and decrease the projet size. If you can't update your Node.JS just yet, then just stick with `native-copyfiles: ^1.3.7` until you can. The version 2.0 bumped Node requirement and changed the JS API arguments (see below).

### Advanced Glob Pattern Support

`native-copyfiles` supports advanced glob patterns, including:

- **Brace expansion**: e.g. `src/*.{js,ts}`
- **Negation**: e.g. `['src/**/*.js', '!src/**/*.test.js']`
- **Extended wildcards**: e.g. `**/*.js`, `*bar?.js`
- **Dotfiles**: Use `-a`/`--all` to include files starting with a dot

This makes it easier to match complex sets of files for copying, similar to Bash or advanced glob libraries.

### Install

```bash
npm install native-copyfiles -D
```

### Command Line

```
  Usage: copyfiles <inFile..> <outDirectory> [options]

Positionals:
  inFile              Source file(s)                                            [string|string[]]
  outDirectory        Destination directory                                     [string]

  Options:
    -u, --up       slice a path off the bottom of the paths                     [number]
    -a, --all      include files & directories begining with a dot (.)          [boolean]
    -d, --dry-run  show what would be copied, without actually copying anything [boolean]
    -f, --flat     flatten the output                                           [boolean]
    -e, --exclude  pattern or glob to exclude (may be passed multiple times)    [string|string[]]
    -E, --error    throw error if nothing is copied                             [boolean]
    -V, --verbose  print more information to console                            [boolean]
    -F, --follow   follow symbolic links                                        [boolean]
    -s, --stat     show statistics after execution (time + files/folders count) [boolean]
    -v, --version  show version number                                          [boolean]
    -h, --help     show help                                                    [boolean]
```

> [!NOTE]
> Options **must** be provided after the command directories as suffix (the original project references them as prefix)

Copy some files, give it a bunch of arguments (which can include advanced globs), the last argument being the "out" directory (which will be created when necessary). Note: on Windows globs must be **double quoted**, everybody else can quote however they please.

```bash
copyfiles foo foobar foo/bar/*.js out
```

you now have a directory called `"out"`, with the files `"foo"` and `"foobar"` in it, it also has a directory named `"foo"` with a directory named
`"bar"` in it that has all the files from `"foo/bar"` that match the glob.


#### Examples of advanced glob usage

**Brace expansion:**
```bash
copyfiles "src/*.{js,ts}" out
```

**Negation:**
```bash
copyfiles "src/**/*.js" out -e "**/*.test.js"
```

**Dotfiles:**
```bash
copyfiles -a ".*.env" out
```

If all the files are in a folder that you don't want in the path out path, ex:

```bash
copyfiles something/*.js out
```

which would put all the JS files in `"out/something"`, you can use the `--up` (or `-u`) option

```bash
copyfiles something/*.js out -u 1
```

which would put all the JS files in `out`

you can also just do `-f` which will flatten all the output into one directory, so in the end we'll have files `"./foo/a.txt"` and `"./foo/bar/b.txt"`

```bash
copyfiles ./foo/*.txt ./foo/bar/*.txt out -f
```

will put `"a.txt"` and `"b.txt"` into out

if your terminal doesn't support globstars then you can quote them

```bash
copyfiles ./foo/**/*.txt out -f
```

however this does not work by default on a Mac, but the following does:

```bash
copyfiles "./foo/**/*.txt" out -f
```

You could quote globstars as a part of input:
```bash
copyfiles some.json "./some_folder/*.json" "./dist/" && echo 'JSON files copied.'
```

You can use the `-e` option to exclude some files from the pattern, and if we want to exclude all files ending in `".test.js"` you could do

```bash
copyfiles "**/*.test.js" -f "./foo/**/*.js" out -e
```

> [!NOTE]
> By default the `.git/` and `node_modules/` directories will be excluded (when using globs). If you provide your own `--exclude` option, it will override the defaults and only use your patterns.

Other options include

- `-a` or `--all` which includes files that start with a dot.
- `-F` or `--follow` which follows symbolic links

### Copy and Rename a Single File

You can copy and rename a single file by specifying the source file and the destination filename (not just a directory). For example, to copy `input/.env_publish` to `output/.env`:

```bash
copyfiles input/.env_publish output/.env
```

This will copy and rename the file in one step.
You can use this for any filename, not just files starting with a dot:

```bash
copyfiles input/original.txt output/renamed.txt
```

If the destination path is a directory, the file will be copied into that directory as usual. If the destination path is a filename, the file will be copied and renamed.

---

### Rename Multiple Files During Copy

#### 1. Rename Using Wildcard (`*`)

You can use a wildcard (`*`) in the destination to rename files dynamically. For example, to copy all `.css` files and change their extension to `.scss`:

```bash
copyfiles "input/**/*.css" "output/*.scss"
```

This will copy:

- `input/foo.css` → `output/foo.scss`
- `input/bar/baz.css` → `output/bar/baz.scss`

The `*` in the destination is replaced with the base filename from the source.
You can combine this with `--flat` or `--up` to control the output structure.

#### 2. Rename Using a Callback (JavaScript API)

For advanced renaming, you can use the `rename` callback option in the API.
This function receives the source and destination path and should return the new destination path of each file being processed.

**Example: Change extension to `.scss` using a callback**

```js
import { copyfiles } from 'native-copyfiles';

copyfiles(['input/**/*.css', 'output'], {
  flat: true,
  rename: (src, dest) => dest.replace(/\.css$/, '.scss')
}, (err) => {
  // All files like input/foo.css → output/foo.scss
});
```

**Example: Prefix all filenames with `renamed-` but keep the extension**

```js
copyfiles(['input/**/*.css', 'output'], {
  up: 1,
  rename: (src, dest) => dest.replace(/([^/\\]+)\.css$/, 'renamed-$1.css')
}, (err) => {
  // input/foo.css → output/renamed-foo.css
  // input/bar/baz.css → output/bar/renamed-baz.css
});
```

The `rename` callback gives you full control over the output filename and path.

> **Tip:**
> You can use either the wildcard approach or the `rename` callback, or even combine them for advanced scenarios!

> [!NOTE]
> If you use both a destination wildcard approach (e.g. `output/*.ext`) and a `rename` callback, the wildcard change is applied first and then the `rename` callback is executed last on the computed destination path. This allows you to combine both features for advanced renaming scenarios.

---

### JavaScript API

```js
import { copyfiles } from 'native-copyfiles';

copyfiles(sources, destination, opt, callback);
```

1. first argument is a string or an array of source paths
2. second argument is the destination path
3. third argument (`opt`) is the "options" argument
4. and finally the last argument is a callback function that will be executed after the copy process

```js
{
    verbose: boolean;     // print more information to console
    up: number;           // slice a path off the bottom of the paths
    exclude: string;      // exclude pattern
    all: boolean;         // include dot files
    dryRun: boolean;      // show what would be copied, without actually copying anything
    follow: boolean;      // follow symlinked directories when expanding ** patterns
    error: boolean;       // raise errors if no files copied
    stat: boolean;        // show statistics after execution (time + files or folders count)
    rename: (src, dest) => string;  // callback to transform the destination filename(s)
}
```

> [!WARNING]
> Version 2.0 changed the JS API and moved the destination as the 2nd argument (which is different compared to v1.0 which previously had its destination inside the 1st argument array as the last element which was super confusing).
