# Changelog

## [2.0.0](https://github.com/hemjs/gather/compare/1.3.1...2.0.0) (2026-11-04)

### ⚠ BREAKING CHANGES

* a class or instance without register() and async providers now
  throw; errors are GatherError subclasses, and a provider's own error is
  wrapped in ProviderFailedError (original as cause); ConfigProvider is narrower.
* ConfigProvider rejects arrays, Promises, Maps, Sets, async
  functions, functions with parameters, and classes that need constructor
  arguments or have no register method.
* nested objects merge at every depth instead of one level deep.
* providers must produce plain objects. A Promise passed as a
  provider, or a class instance returned by one, now throws instead of being
  skipped or merged.
* published as an ES module only; requires Node.js 22.12 or later.

### Features

* merge nested config objects recursively ([14d9fe9](https://github.com/hemjs/gather/commit/14d9fe9586b17e7cd7938cb25820a2313c6427e2))
* migrate to esm and exports map ([1a4d693](https://github.com/hemjs/gather/commit/1a4d693e1bc3b5e3068c5466f0cd97570a39a22e))
* narrow ConfigProvider to the providers Gather accepts ([4da1a92](https://github.com/hemjs/gather/commit/4da1a92d6434c03081bd9f29d9c728b1611ad8cd))

### Bug Fixes

* construct transpiled and proxied module classes ([825e78b](https://github.com/hemjs/gather/commit/825e78b9a9792983d24a82cb9a713cf61e7342e4))
* detect classes written without a space before the body ([674257f](https://github.com/hemjs/gather/commit/674257feb40f9c0fb83fa4fabaceb09eb745d7ef))
* name the provider in errors it throws ([7eec791](https://github.com/hemjs/gather/commit/7eec7916b53c859125514fe4c409d71495336b26))
* reject arrays, promises and non-object config with positioned errors ([5b5a5dc](https://github.com/hemjs/gather/commit/5b5a5dc170b4e222e50fde92402400532e604535))
* reject promises passed directly as providers ([60f1244](https://github.com/hemjs/gather/commit/60f12447d6daba6e5da803e54b3b60c2ed932db3))
* replace mismatched values instead of concatenating or spreading them ([cf7923b](https://github.com/hemjs/gather/commit/cf7923b7470604118136b24d1241833e0f4ec79f))
* report holes in the provider list instead of skipping them ([d624d21](https://github.com/hemjs/gather/commit/d624d210b07579119e129e3c1ff59eb622162d9a))
* skip __proto__ keys when merging ([88ae417](https://github.com/hemjs/gather/commit/88ae4170cedcb17de2fe8b1e58d11ea40e4e84fb))

### Code Refactoring

* rewrite gather with plain helpers and typed errors ([89edbf4](https://github.com/hemjs/gather/commit/89edbf4c394f25844f85051668b89b7602d887f7))
