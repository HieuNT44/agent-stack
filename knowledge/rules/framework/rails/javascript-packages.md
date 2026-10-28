---
paths:
  - "config/importmap.rb"
  - "package.json"
  - "app/javascript/**/*.js"
  - "Procfile.dev"
---

# JavaScript Packages

A project loads JavaScript one way: importmap (`config/importmap.rb` exists) or a
bundler through jsbundling-rails (`package.json` with a `build` script). Never both, and
never a second bundler beside the first.

- Before adding a package, check that Stimulus, Turbo or a few lines in `app/javascript/lib/`
  cannot do the job. A package is a dependency every developer updates and audits.
- One package per job across the app (one date library, one chart library).

## importmap

- Add a package with `bin/importmap pin <package>`: it downloads the file into
  `vendor/javascript/` and pins it in `config/importmap.rb`. Never load it from a CDN at
  runtime.
- Never edit a file in `vendor/javascript/`; `bin/importmap pin` again to change it.
- Check with `bin/importmap audit` and `bin/importmap outdated`; update with
  `bin/importmap update`.
- Your own directories are pinned with `pin_all_from` (`app/javascript/controllers`,
  `app/javascript/lib`).

## jsbundling

- Add a package with the project's package manager (`bun add`, `yarn add`, `npm install`)
  and commit the lockfile with `package.json`.
- `app/assets/builds/` is build output: never edit or commit it. `bin/dev` runs the
  watcher.
- New Stimulus controllers are registered by `bin/rails stimulus:manifest:update`, which
  rewrites `app/javascript/controllers/index.js`; never edit that file by hand.
- Check with the package manager's audit (`npm audit` or its equivalent).
