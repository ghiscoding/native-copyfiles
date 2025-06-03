[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-fcc72b.svg?logo=vitest)](https://vitest.dev/)
[![codecov](https://codecov.io/gh/ghiscoding/native-copyfiles/branch/main/graph/badge.svg)](https://codecov.io/gh/ghiscoding/native-copyfiles)
[![npm](https://img.shields.io/npm/v/native-copyfiles.svg)](https://www.npmjs.com/package/native-copyfiles)
[![npm](https://img.shields.io/npm/dy/native-copyfiles)](https://www.npmjs.com/package/native-copyfiles)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/native-copyfiles?color=success&label=gzip)](https://bundlephobia.com/result?p=native-copyfiles)

## Copyfiles
#### native-copyfiles

Copy files easily via JavaScript or the CLI, it uses [tinyglobby](https://www.npmjs.com/package/tinyglobby) internally for glob patterns and [yargs](https://www.npmjs.com/package/yargs) for the CLI.

The library is similar to the [copyfiles](https://www.npmjs.com/package/copyfiles) package, it is however written with more native NodeJS APIs and less dependencies. The package options are exactly the same (except for `--soft` which is not implemented).

> There is 1 major difference though, any options must be provided after the command as a suffix (the original project had them as prefix)

### Install

```bash
npm install native-copyfiles -g
```

### Command Line

```bash
  Usage: copyfiles inFile [more files ...] outDirectory [options]

  Options:
    -u, --up       slice a path off the bottom of the paths                  [number]
    -a, --all      include files & directories begining with a dot (.)       [boolean]
    -f, --flat     flatten the output                                        [boolean]
    -e, --exclude  pattern or glob to exclude (may be passed multiple times) [string|string[]]
    -E, --error    throw error if nothing is copied                          [boolean]
    -V, --verbose  print more information to console                         [boolean]
    -F, --follow   follow symbolic links                                     [boolean]
    -v, --version  Show version number                                       [boolean]
    -h, --help     Show help                                                 [boolean]
```

> Note: as opposed to the original [copyfiles](https://www.npmjs.com/package/copyfiles) project, any options **must** be provided as a suffix.

copy some files, give it a bunch of arguments, (which can include globs), the last one
is the out directory (which it will create if necessary).  Note: on windows globs must be **double quoted**, everybody else can quote however they please.

```bash
copyfiles foo foobar foo/bar/*.js out
```

you now have a directory called out, with the files foo and foobar in it, it also has a directory named foo with a directory named
bar in it that has all the files from foo/bar that match the glob.

If all the files are in a folder that you don't want in the path out path, ex:

```bash
copyfiles something/*.js out
```

which would put all the js files in `out/something`, you can use the `--up` (or `-u`) option

```bash
copyfiles something/*.js out -u 1
```

which would put all the js files in `out`

you can also just do `-f` which will flatten all the output into one directory, so with files "./foo/a.txt" and "./foo/bar/b.txt"

```bash
copyfiles ./foo/*.txt ./foo/bar/*.txt out -f
```

will put "a.txt" and "b.txt" into out

if your terminal doesn't support globstars then you can quote them

```bash
copyfiles ./foo/**/*.txt out -f
```

does not work by default on a mac

but

```bash
copyfiles "./foo/**/*.txt" out -f
```

does.

You could quote globstars as a part of input:
```bash
copyfiles some.json "./some_folder/*.json" ./dist/ && echo 'JSON files copied.'
```

You can use the `-e` option to exclude some files from the pattern, so to exclude all files ending in ".test.js" you could do

```bash
copyfiles "**/*.test.js" -f ./foo/**/*.js out -e
```

Other options include

- `-a` or `--all` which includes files that start with a dot.
- `-F` or `--follow` which follows symbolic links

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
	verbose: bool,    // enable debug messages
	up: number,       // -u value
	exclude: string,  // exclude pattern
	all: bool,	  // include dot files
	follow: bool,	  // Follow symlinked directories when expanding ** patterns
	error: bool       // raise errors if no files copied
}
```
