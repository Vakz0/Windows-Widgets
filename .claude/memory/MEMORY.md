# Project memory

Persistent notes for agents and humans working on Lattice.

| File | Use |
| --- | --- |
| [LEARNINGS.md](LEARNINGS.md) | Dated insights, corrections, “do this next time” |
| [BLOCKERS.md](BLOCKERS.md) | Open blockers; clear or date when resolved |

**Rules**

- Append only with `YYYY-MM-DD` and a short factual note.
- Prefer promoting a recurring learning into `CLAUDE.md`, `.claude/rules/`, or `docs/*/decisions.md`.
- Do not store secrets, tokens, or personal machine paths with credentials.
- Claude Code auto memory (per machine under `~/.claude/projects/…/memory/`) is enabled via `.claude/settings.json`; this folder is the **shared, versioned** counterpart.
