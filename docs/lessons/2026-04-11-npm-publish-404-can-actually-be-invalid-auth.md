---
area: release, npm, publish
summary: An npm publish `E404` for a new unscoped package name can still be caused by an invalid auth token, so verify auth before concluding the package name is unavailable.
files:
  - package.json
  - /Users/longluong/.npmrc
---

# npm Publish 404 Can Actually Be Invalid Auth

## What happened

Publishing `clisbot@0.1.7` to npm returned:

- `npm error code E404`
- `PUT https://registry.npmjs.org/clisbot - Not found`

At first glance that looked like an unscoped package-name ownership or availability problem after moving from `@muxbot/muxbot` to `clisbot`.

The actual cause was different:

- `npm view clisbot` returned `404`, which suggested the name was still available
- `npm whoami` returned `401 Unauthorized`
- `npm profile get email` said the authentication token was invalid

So the npm token in `~/.npmrc` was stale, and the publish error was misleading.

## Why this was confusing

- the old scoped package `@muxbot/muxbot` already existed, so a namespace transition was a plausible explanation
- npm publish surfaced `E404`, which sounds like a missing package or ownership problem
- the package name really was absent from the registry, so name availability and auth failure looked mixed together

## What to do next time

- before diagnosing npm publish as a package-name problem, run:
  - `npm whoami`
  - `npm profile get email`
  - `npm view <package-name>`
- treat `npm whoami` or `npm profile` `401` as the primary blocker even if `npm publish` reports `E404`
- only reason about package-name availability after auth is known-good
- if the token is stale, refresh `~/.npmrc` or re-run `npm login` before trying to publish again

