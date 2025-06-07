[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-fcc72b.svg?logo=vitest)](https://vitest.dev/)
[![codecov](https://codecov.io/gh/ghiscoding/native-copyfiles/branch/main/graph/badge.svg)](https://codecov.io/gh/ghiscoding/native-copyfiles)
[![npm](https://img.shields.io/npm/v/native-copyfiles.svg)](https://www.npmjs.com/package/native-copyfiles)
[![npm](https://img.shields.io/npm/dy/native-copyfiles)](https://www.npmjs.com/package/native-copyfiles)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/native-copyfiles?color=success&label=gzip)](https://bundlephobia.com/result?p=native-copyfiles)

## native-copyfiles

Copy files easily via JavaScript or the CLI, it uses [tinyglobby](https://www.npmjs.com/package/tinyglobby) internally for glob patterns and [yargs](https://www.npmjs.com/package/yargs) for the CLI.

The library is very similar from the outside to the [copyfiles](https://www.npmjs.com/package/copyfiles) package, however its internal is quite different, it uses more native NodeJS code and less dependencies (3 instead of 7). The package options are the same (except for `--soft` which is not implemented), some new options were also added in this project here (see below).

> Note: there is 1 noticeable difference with `copyfiles`, any options must be provided as a suffix after the source/target directories command (the original project had them as prefix).<br>
> This mean calling: `copyfiles source target [options]` instead of `copyfiles [options] source target`

### Install

```bash
npm install native-copyfiles -D
```

### Command Line

```bash
  Usage: copyfiles inFile [more files ...] outDirectory [options]

  Options:
    -u, --up       slice a path off the bottom of the paths                     [number]
    -a, --all      include files & directories begining with a dot (.)          [boolean]
    -d, --dry-run  show what would be copied, without actually copying anything [boolean]
    -f, --flat     flatten the output                                           [boolean]
    -e, --exclude  pattern or glob to exclude (may be passed multiple times)    [string|string[]]
    -E, --error    throw error if nothing is copied                             [boolean]
    -V, --verbose  print more information to console                            [boolean]
    -F, --follow   follow symbolic links                                        [boolean]
    -s, --stat     show statistics after execution (time + file count)          [boolean]
    -v, --version  show version number                                          [boolean]
    -h, --help     show help                                                    [boolean]
```

> [!NOTE]
> Options **must** be provided after the command directories as suffix (the original project had them as prefix)

copy some files, give it a bunch of arguments, (which can include globs), the last one
is the out directory (which it will create if necessary).  Note: on Windows globs must be **double quoted**, everybody else can quote however they please.

```bash
copyfiles foo foobar foo/bar/*.js out
```

you now have a directory called out, with the files `"foo"` and `"foobar"` in it, it also has a directory named `"foo"` with a directory named
`"bar"` in it that has all the files from `"foo/bar"` that match the glob.

If all the files are in a folder that you don't want in the path out path, ex:

```bash
copyfiles something/*.js out
```

which would put all the js files in `"out/something"`, you can use the `--up` (or `-u`) option

```bash
copyfiles something/*.js out -u 1
```

which would put all the js files in `out`

you can also just do `-f` which will flatten all the output into one directory, so with files `"./foo/a.txt"` and `"./foo/bar/b.txt"`

```bash
copyfiles ./foo/*.txt ./foo/bar/*.txt out -f
```

will put `"a.txt"` and `"b.txt"` into out

if your terminal doesn't support globstars then you can quote them

```bash
copyfiles ./foo/**/*.txt out -f
```

does not work by default on a Mac

but

```bash
copyfiles "./foo/**/*.txt" out -f
```

does.

You could quote globstars as a part of input:
```bash
copyfiles some.json "./some_folder/*.json" ./dist/ && echo 'JSON files copied.'
```

You can use the `-e` option to exclude some files from the pattern, so to exclude all files ending in `".test.js"` you could do

```bash
copyfiles "**/*.test.js" -f ./foo/**/*.js out -e
```

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

copyfiles([paths], opt, callback);
```

The first argument is an array of paths whose last element is assumed the destination path.
The second argument (`opt`) being the options argument 
and finally the third and last argument is a callback function which is executed after after all files copied

```js
{
    verbose: bool,      // print more information to console
    up: number,         // slice a path off the bottom of the paths
    exclude: string,    // exclude pattern
    all: bool,	        // include dot files
    dryRun: bool,       // show what would be copied, without actually copying anything
    follow: bool,       // follow symlinked directories when expanding ** patterns
    error: bool         // raise errors if no files copied
    stat: bool          // show statistics after execution (time + file count)
    rename: (src, dest) => string;  // callback to transform the destination filename(s)
}
```
