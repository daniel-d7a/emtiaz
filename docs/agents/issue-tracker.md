# Issue tracker: Local Markdown

This repo has no remote, so work is tracked as markdown in `.scratch/`.

## Conventions

- One effort per directory: `.scratch/<feature-slug>/`
- Spec: `.scratch/<feature-slug>/spec.md`
- Tickets: one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never one combined file
- State: a `Status:` line near the top (`needs-triage`, `ready-for-agent`, `in-progress`, `done`)
- Conversation history appends under `## Comments`

## When a skill says "publish to the issue tracker"

Create the file under `.scratch/<feature-slug>/issues/`, creating directories as needed.

## When a skill says "fetch the relevant ticket"

Read the referenced file. The user will normally pass the path or number.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `open`/`claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
