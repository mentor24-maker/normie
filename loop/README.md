# loop/

The ticket door for Normie: the commands a session uses to read and move
Normie's tickets (`npm run clickup -- <command>`) and to check its keys and
repository (`npm run doctor`).

Every file here except this README is copied byte for byte from
[Spirality](https://github.com/mentor24-maker/spirality)'s `main` at commit
`c9bd141`, keeping Spirality's layout (`scripts/` beside `lib/`) so no import
changes. The project settings it reads are Normie's own
`spirality.project.json` at the repository root.

Do not edit these files here. A change is made in Spirality first, then
copied in from a newer Spirality version; record the new base commit above
when you do. `npm run test:loop` runs the copied tests.

## The runner scripts

The loop jobs on the Mini are run by six more files copied from Spirality's
`main` at commit `d44be1b`. They live in the repository's own `scripts/`, not
here, because each one finds the product's folder from where it sits:

- `scripts/install_loop_runner.sh` installs, removes and reports the jobs
- `scripts/loop_runner.sh` runs one lane: pull a clean `main`, one Claude pass, sleep
- `scripts/run_relay.sh` runs one relay pass
- `scripts/run_with_time_limit.sh` and `scripts/lib/launchd_reload.sh`, their helpers
- `scripts/project_config.mjs` reads one value from `spirality.project.json`

Five are byte for byte. `scripts/project_config.mjs` differs in one line: it
imports `../loop/lib/projectConfig.mjs` instead of `../lib/projectConfig.mjs`.
The same rule holds: change them in Spirality, copy them in, and record the
new base commit here.
