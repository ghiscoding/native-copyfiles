# Change Log 
All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.4](https://github.com/ghiscoding/native-copyfiles/compare/v2.0.3...v2.0.4) (2026-08-22)

### Bug Fixes

* **security:** harden option maps against prototype pollution ([#93](https://github.com/ghiscoding/native-copyfiles/issues/93)) ([70d71ec](https://github.com/ghiscoding/native-copyfiles/commit/70d71ece057dea123789f8f53822d900830213c7))

## [2.0.3](https://github.com/ghiscoding/native-copyfiles/compare/v2.0.2...v2.0.3) (2026-06-03)

### Bug Fixes

* remove duplicate code & add consistent curly braces ([#79](https://github.com/ghiscoding/native-copyfiles/issues/79)) ([22d581f](https://github.com/ghiscoding/native-copyfiles/commit/22d581fea7538b5f668ef15e4808ff63e8ebd20b))

## [2.0.2](https://github.com/ghiscoding/native-copyfiles/compare/v2.0.1...v2.0.2) (2026-06-01)

### Bug Fixes

* **deps:** update all dependencies ([#78](https://github.com/ghiscoding/native-copyfiles/issues/78)) ([0a3366a](https://github.com/ghiscoding/native-copyfiles/commit/0a3366a7697043c3531322e7fb34236004abc7c7))

## [2.0.1](https://github.com/ghiscoding/native-copyfiles/compare/v2.0.0...v2.0.1) (2026-01-27)

### Bug Fixes

* support more complex glob patterns, brace expansion & negation ([#64](https://github.com/ghiscoding/native-copyfiles/issues/64)) ([9f501b0](https://github.com/ghiscoding/native-copyfiles/commit/9f501b0c7e09b0483a6f41dc939a1aac6b70c8ca))

## [2.0.0](https://github.com/ghiscoding/native-copyfiles/compare/v1.3.7...v2.0.0) (2026-01-27)

> [!NOTE]
> Please visit the [v2.0.0](https://github.com/ghiscoding/native-copyfiles/releases/tag/v2.0.0) release for more details about the migration.

### ⚠ BREAKING CHANGES

* **deps:** increase NodeJS engine requirement
* move JS API target destination as 2nd argument (#59)
* drop `tinyglobby` and use native `fs.glob` (#58)

### Features

* drop `tinyglobby` and use native `fs.glob` ([#58](https://github.com/ghiscoding/native-copyfiles/issues/58)) ([6dfb43c](https://github.com/ghiscoding/native-copyfiles/commit/6dfb43c3893cba5a14816218f1c63dc59a06410f))
* move JS API target destination as 2nd argument ([#59](https://github.com/ghiscoding/native-copyfiles/issues/59)) ([f497142](https://github.com/ghiscoding/native-copyfiles/commit/f4971422e25a6af6cbd5ecb761b79b6e11f86f60))

### Bug Fixes

* adjust `/**` patterns to `//` for `fs.globSync` compatibility ([#60](https://github.com/ghiscoding/native-copyfiles/issues/60)) ([e163688](https://github.com/ghiscoding/native-copyfiles/commit/e1636882bef5e712463e785a35a9e5ff056df4fb))

### Miscellaneous Chores

* **deps:** increase NodeJS engine requirement ([e96bdf5](https://github.com/ghiscoding/native-copyfiles/commit/e96bdf5d2d8a48459199457d4844e06548aa3851))

## [1.3.7](https://github.com/ghiscoding/native-copyfiles/compare/v1.3.6...v1.3.7) (2025-11-07)

### Bug Fixes

* copyfiles JS API options argument should be optional, fixes [#49](https://github.com/ghiscoding/native-copyfiles/issues/49) ([#50](https://github.com/ghiscoding/native-copyfiles/issues/50)) ([6dd26ea](https://github.com/ghiscoding/native-copyfiles/commit/6dd26ea48842d7ba8ffe6b5fae32e331f84bbfc8))

## [1.3.6](https://github.com/ghiscoding/native-copyfiles/compare/v1.3.5...v1.3.6) (2025-09-26)

### Bug Fixes

* **deps:** update all dependencies ([#38](https://github.com/ghiscoding/native-copyfiles/issues/38)) ([5946d88](https://github.com/ghiscoding/native-copyfiles/commit/5946d88b606397589b6ac3a69f84e2b02ca14477))
* publish with OIDC ([b227e63](https://github.com/ghiscoding/native-copyfiles/commit/b227e632d10bb4873fd7027a387eeaf3daed4b91))

## [1.3.5](https://github.com/ghiscoding/native-copyfiles/compare/v1.3.4...v1.3.5) (2025-07-14)

### Bug Fixes

* `.git` and `node_modules` should be excluded by default ([#34](https://github.com/ghiscoding/native-copyfiles/issues/34)) ([7f3a4c9](https://github.com/ghiscoding/native-copyfiles/commit/7f3a4c989391eab1341406712ebb8e15f50895c2))

## [1.3.4](https://github.com/ghiscoding/native-copyfiles/compare/v1.3.3...v1.3.4) (2025-07-09)

### Bug Fixes

* **deps:** update `cli-nano` to latest and add CLI examples ([#32](https://github.com/ghiscoding/native-copyfiles/issues/32)) ([03c6023](https://github.com/ghiscoding/native-copyfiles/commit/03c6023f05bf9b48039a8de375d577f4d1f495c7))

## [1.3.3](https://github.com/ghiscoding/native-copyfiles/compare/v1.3.2...v1.3.3) (2025-07-05)

### Bug Fixes

* **deps:** bump all dependencies ([f46c973](https://github.com/ghiscoding/native-copyfiles/commit/f46c973de31e43bb743e9e86f4dd5286017ddce8))
* **deps:** update cli-nano to latest w/better typing & smaller build ([#29](https://github.com/ghiscoding/native-copyfiles/issues/29)) ([489b89e](https://github.com/ghiscoding/native-copyfiles/commit/489b89e006e3522f8d3e9037a313bf9a726517e5))
* use only declaration maps ([#30](https://github.com/ghiscoding/native-copyfiles/issues/30)) ([837fd07](https://github.com/ghiscoding/native-copyfiles/commit/837fd078e375a43812907ea909e75b47bfed91a9))

## [1.3.2](https://github.com/ghiscoding/native-copyfiles/compare/v1.3.1...v1.3.2) (2025-07-02)

### Bug Fixes

* **deps:** upgrade `cli-nano` to new major version ([#26](https://github.com/ghiscoding/native-copyfiles/issues/26)) ([9cf2fa3](https://github.com/ghiscoding/native-copyfiles/commit/9cf2fa361d6899c112d3a0f20dac0c60b6927966))

## [1.3.1](https://github.com/ghiscoding/native-copyfiles/compare/v1.3.0...v1.3.1) (2025-06-28)

### Bug Fixes

* **deps:** update all non-major dependencies ([#24](https://github.com/ghiscoding/native-copyfiles/issues/24)) ([6f888e1](https://github.com/ghiscoding/native-copyfiles/commit/6f888e14b6a0c6f2cd3eac967ae1d9a01e3bb73a))
* ignore test spec files when publishing on npm ([fe1b24f](https://github.com/ghiscoding/native-copyfiles/commit/fe1b24f1d02fe76d45c4ec7fb941d994db5eb1ff))
* strip package fields w/releasing on npm ([2a1cba9](https://github.com/ghiscoding/native-copyfiles/commit/2a1cba90c43e83e5b78fa1d88ded75ea78cc4734))

## [1.3.0](https://github.com/ghiscoding/native-copyfiles/compare/v1.2.1...v1.3.0) (2025-06-26)

### Features

* migrate from `yargs` to `cli-nano` ([#23](https://github.com/ghiscoding/native-copyfiles/issues/23)) ([e012c76](https://github.com/ghiscoding/native-copyfiles/commit/e012c76120f45a267fd7f5efad3cde3ebdd9922b))

# Change Log
All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.2.1](https://github.com/ghiscoding/native-copyfiles/compare/v1.2.0...v1.2.1) (2025-06-07)

### Bug Fixes

* use dufferent release script to remove scripts/devDependencies ([2429167](https://github.com/ghiscoding/native-copyfiles/commit/24291670d644a03e74891472cc9fe571561614e5))

## [1.2.0](https://github.com/ghiscoding/native-copyfiles/compare/v1.1.0...v1.2.0) (2025-06-07)

### Features

* add --dry-run option ([#22](https://github.com/ghiscoding/native-copyfiles/issues/22)) ([df73230](https://github.com/ghiscoding/native-copyfiles/commit/df732302fb2da4d4c8bc3621f955995c0240f5d2))

## [1.1.0](https://github.com/ghiscoding/native-copyfiles/compare/v1.0.0...v1.1.0) (2025-06-06)

### Features

* rename multiple files while copying using wildcard `*` ([#19](https://github.com/ghiscoding/native-copyfiles/issues/19)) ([c7ed58d](https://github.com/ghiscoding/native-copyfiles/commit/c7ed58dc0e5dece116a571dbc8cd3796c5aa9ea8))
* rename single file on copy ([#18](https://github.com/ghiscoding/native-copyfiles/issues/18)) ([02253ee](https://github.com/ghiscoding/native-copyfiles/commit/02253ee23bf0bf3469e3dee0f7e4ece9e7ae283b))

## [1.0.0](https://github.com/ghiscoding/native-copyfiles/compare/0.3.2...v1.0.0) (2025-06-03)

### Features

* migrate from Promises to Streams ([#15](https://github.com/ghiscoding/native-copyfiles/issues/15)) ([b6e3825](https://github.com/ghiscoding/native-copyfiles/commit/b6e38255e91bb8c9355a79de57ea38bf78949989))

### Bug Fixes

* **deps:** update all non-major dependencies ([4292986](https://github.com/ghiscoding/native-copyfiles/commit/4292986d655eb7a192b9b91ac8b6f3ec28ce893f))
* **deps:** update all non-major dependencies ([c7ec704](https://github.com/ghiscoding/native-copyfiles/commit/c7ec70410d0a9572ae842e27047d074a197a5d26))
## [0.3.2](https://github.com/ghiscoding/native-copyfiles/compare/0.3.1...0.3.2) (2025-02-06)

### Bug Fixes

* Improve error message in case of problematic depth ([10e48cf](https://github.com/ghiscoding/native-copyfiles/commit/10e48cf75b7e61f4b3b2d414fdc3aeaf0dec0a14))
## [0.3.1](https://github.com/ghiscoding/native-copyfiles/compare/0.3.0...0.3.1) (2025-02-04)

### Bug Fixes

* calculate folder depth was offset ([8058b10](https://github.com/ghiscoding/native-copyfiles/commit/8058b105eb1e23e25470a78f57690161e92057b3))
## [0.3.0](https://github.com/ghiscoding/native-copyfiles/compare/097ad00704a8c5612024d76d0f7ba232a174d938...0.3.0) (2025-02-04)

### Bug Fixes

* rewrite up option & default to 0 ([097ad00](https://github.com/ghiscoding/native-copyfiles/commit/097ad00704a8c5612024d76d0f7ba232a174d938))
