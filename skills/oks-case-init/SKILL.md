# oks-case-init

Read the repository-root `SKILL.md` first. It is the canonical cloud deployment
contract; this file is the narrower case workflow used after dsh-oks is running.

Use this skill to initialize a reproducible OKS case study from a source artifact and a target agent task.

## Goal

Turn a source such as a video, article, repo note, or conversation into a demonstrable OKS value loop:

```text
source -> raw evidence -> draft -> human review -> wiki -> recall -> agent output -> comparison evidence
```

## Inputs

- `source`: URL or local file path.
- `case_name`: short slug, for example `kimi-k3-to-ki3`.
- `target_task`: the downstream task that should benefit from recall.
- `acceptance`: what must be visible in the final demo.

## Procedure

1. Recall the topic before ingesting it, so an existing Wiki entry can be enriched,
   superseded, confirmed, or challenged instead of duplicated.
2. Capture source metadata and raw material. Preserve fidelity; do not summarize directly into wiki.
3. Create or identify a draft under `drafts/` with source references, byte/hash or locator metadata, and provider chain.
4. Stop for human review before promotion.
5. After approval, promote into `wiki/` using the normal OKS path.
6. Run `oks recall` against the target task.
7. Produce the downstream answer using the recalled lesson.
8. Save a comparison note showing how the answer changed after recall.

## Output structure

Create a case folder or document with:

- source summary;
- raw/draft/wiki paths;
- recall query and result summary;
- downstream output;
- before/after comparison;
- screenshots or recording checklist;
- known limitations.

## Guardrails

- Never auto-promote drafts to wiki.
- Mark ASR/OCR-derived evidence with its confidence and provider.
- Keep remote processing `ask`-by-default and local-source processing `deny`-by-default
  unless the owner explicitly chooses a provider/capability.
- Preserve `partial`, `failed`, and `skipped` extraction states; never render them as success.
- Do not claim runtime Web integration worked unless the GUI or API evidence was captured after the current plugin code was loaded.
- Keep external publication and PR actions gated by explicit owner authorization.
