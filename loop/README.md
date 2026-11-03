# loop/

The ticket door for Normie: the commands a session uses to read and move
Normie's tickets (`npm run clickup -- <command>`) and to check its keys and
repository (`npm run doctor`).

Every file here except this README is copied byte for byte from
[Spirality](https://github.com/mentor24-maker/spirality)'s `main` at commit
`87540a7`, keeping Spirality's layout (`scripts/` beside `lib/`) so no import
changes. The project settings it reads are Normie's own
`spirality.project.json` at the repository root.

Do not edit these files here. A change is made in Spirality first, then
copied in from a newer Spirality version; record the new base commit above
when you do. `npm run test:loop` runs the copied tests.
