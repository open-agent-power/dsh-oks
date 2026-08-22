# dsh-oks Deployment and OKS Case Skill

**Canonical URL**: `https://raw.githubusercontent.com/open-agent-power/dsh-oks/main/SKILL.md`
**Reference install contract**: `https://raw.githubusercontent.com/open-agent-power/open-knowledge-studio/main/SKILL.md`
**Audience**: AI coding agents that can run shell commands and operate a DSH Web profile.

## Purpose

Use this document to install Open Knowledge Studio (OKS), connect it to DSH Web with
`dsh-oks`, and initialize a small, reviewable case that proves the recall loop works.
The agent should complete every safe command and report the exact command and output
for anything that remains owner-gated.

This skill is a deployment contract, not a knowledge-base migration. It does not
create permissions, tenant isolation, command authorization, approval, or audit
policy for DSH.

## Runtime boundaries

1. OKS owns `raw/`, `drafts/`, `wiki/`, and the OKS configuration pointer.
2. DSH owns authentication, host lifecycle, tool authorization, and the browser UI.
3. `dsh-oks` is the integration layer: it calls the local `oks` CLI, reads the
   configured OKS directories, exposes recall/status tools, and renders the OKS UI.
4. A public URL is not consent to send content to a remote extractor. Ask before
   using any remote capability; preserve failed, partial, and skipped states.
5. Never promote a draft automatically. The required path is:

   `source -> raw evidence -> draft -> human review -> wiki -> oks recall -> DSH output`

## Prerequisites

Check these before changing files or installing anything:

```bash
python3 --version       # Python >= 3.12
pipx --version
git --version
oks --version           # must be >= 0.4.1; install if missing or stale
dsh --version
```

On Windows, use `py -m pip install --user pipx` and `py -m pipx ensurepath` if
`pipx` is missing. Use the platform's normal `python`/`py` spelling for the
version check. Do not use bare `pip` when the interpreter reports an externally
managed environment.

## Install or reuse an OKS instance

If the user supplied a directory containing `_meta/`, `wiki/`, and `raw/`, reuse
it. Otherwise choose a user-approved path and initialize it:

```bash
pipx install open-knowledge-studio --force
pipx ensurepath
oks init <knowledge-base-path>
oks config set knowledge_base_path <knowledge-base-path>
oks capability status
```

Run the instance-local skill installer from the OKS root so it can discover
`wiki/`:

```bash
cd <knowledge-base-path>
oks skills-install
```

Run `oks hook install` from the same OKS root if Claude or Qoder is also in scope.
It is optional and is not required for DSH:
the DSH plugin supplies the DSH recall integration. Never install a heavy optional
capability without explaining its download, privacy, and cost trade-offs first.

Verify the instance before touching DSH:

```bash
oks status
oks recall "<target task>" --format json --limit 5
```

An empty new instance may return only bundled profiles. That is expected; ingest
one small local note to prove the loop before diagnosing an empty Wiki as failure.

## Install the DSH plugin reproducibly

Use the upstream repository and pin an exact commit or release tag. Resolve the
commit first and record it in the handoff; do not use an unpinned GitHub URL for a
production installation:

```bash
git ls-remote https://github.com/open-agent-power/dsh-oks.git refs/heads/main
dsh plugin --profile web add github:open-agent-power/dsh-oks#<commit-or-tag>
```

For a source checkout, build both plugin boundaries before installing or packing:

```bash
pnpm install
pnpm run build
pnpm pack
```

The package must contain `lib/index.mjs` for the host and `lib/client.js` for the
browser. A source `src/index.ts` is not a valid Node 24 host entry. If an installed
DSH profile has stale browser assets after an install or upgrade, rebuild the
active DSH/profile bundle using that installation's documented `pnpm run build`,
then restart DSH Web. Do not claim the UI is ready until the browser bundle has
been rebuilt and the new process has loaded the plugin.

## Deployment acceptance

After installation and restart, verify all of the following:

```bash
oks status
oks recall "<target task>" --format json --limit 5
dsh --profile web --dump-config
```

In DSH Web, open **Settings -> OKS -> System settings** and confirm the fields
render. Then confirm the OKS page shows current Wiki/Draft/Raw counts and that
`oks_status` and `oks_recall` return without an integration error. Changing
`knowledge_base_path` to an empty value must clear the OKS pointer, not leave a
stale recall path. Restore the approved path after this check.

If any check fails, report the failing step, command, last output lines, and the
next concrete recovery action. Do not call an HTTP 200 response or a loaded source
file proof of a working integration.

## Case initialization

Choose a small local note or an explicitly approved source and a case slug. Before
adding it, recall the topic to avoid creating a parallel knowledge entry:

```bash
oks recall "<case topic>" --format json --limit 5
oks ingest run <local-file-or-approved-url>
oks recall "<keyword from the source>" --format json --limit 5
```

Record source identity, provider/capability, hash or locator, and any partial or
failed extraction state. Create a draft with the source references and stop for
human review. Only after approval may the owner promote it through the normal OKS
workflow. The agent may then run recall again and save a before/after comparison
for the downstream DSH task.

The case handoff should include:

- case slug and target task;
- OKS root, raw/draft/wiki paths, and exact plugin commit;
- `oks status` and `oks recall` results;
- DSH page/tool verification result;
- before/after output comparison;
- screenshots or recording checklist when UI evidence matters;
- known limitations and owner decisions.

## Recovery

- `oks` missing or older than 0.4.1: `pipx install open-knowledge-studio --force`.
- Existing non-empty OKS directory: `oks init . --force`; this preserves knowledge
  files but refreshes stale skill copies.
- Empty recall on a fresh instance: ingest one small note, then recall a keyword.
- Plugin host load error: verify the installed package resolves to `lib/index.mjs`,
  rebuild from source, reinstall the built package, and restart DSH.
- OKS page absent: rebuild the DSH/profile browser bundle, then restart DSH Web.
- Settings page has no fields: confirm the active DSH profile loaded the current
  browser bundle and inspect the browser console before changing API contracts.
- Optional capability missing: leave it visible as unavailable; install it only
  after owner approval.

## Completion block

Report completion as:

```text
dsh-oks setup complete.
OKS version: <version>
OKS root: <path>
Plugin commit/tag: <exact ref>
Host artifact: <lib/index.mjs verified>
Browser artifact: <lib/client.js verified>
DSH profile: <profile>
Status/recall: <result>
UI/tools: <result>
Case: <slug and review state>
Known limitations: <none or list>
```
