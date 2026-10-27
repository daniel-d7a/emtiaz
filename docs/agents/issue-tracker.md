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
