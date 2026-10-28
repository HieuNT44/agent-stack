import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadKnowledgeBase } from '../src/catalog.js';
import { artifactTargets, compose, MANIFEST_PATH } from '../src/composer.js';
import { emit, finalManifest, inspectTargets, planEmit } from '../src/emit.js';
import { resolveStack } from '../src/resolver.js';
import { techStackInputSchema } from '../src/schema.js';
import { selectArtifacts } from '../src/selector.js';

// The edges of what is on disk: a manifest that cannot be read, one written
// before a field existed, a link inside a generated directory, a source that
// went missing. Each one decides whether a file is agent-stack's to touch.

async function dir(files: Record<string, string> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'agent-stack-emit-'));
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
  return root;
}

async function composeFrom(files: Record<string, string>) {
  const kbRoot = await dir({
    'catalog.yaml': 'version: 1\ntechnologies:\n  rails:\n    name: Ruby on Rails\n',
    ...files,
  });
  const kb = await loadKnowledgeBase(kbRoot);
  const stack = resolveStack(kb.catalog, techStackInputSchema.parse({ framework: ['rails'] }));
  const selection = selectArtifacts(kb, stack);
  return { kbRoot, selection, composed: compose(stack, selection, 'test', kb.imported) };
}

const BASE = {
  'rules/global/style.md': '# Style\n',
  'skills/global/shipping/SKILL.md': '# Ship\n',
};

describe('the previous manifest', () => {
  // Unreadable is the same as absent: nothing is owned, so nothing is replaced.
  it('owns nothing when it is not JSON', async () => {
    const { selection } = await composeFrom(BASE);
    const out = await dir({ [MANIFEST_PATH]: '{ not json', '.claude/rules/style.md': '# ours\n' });

    const targets = await inspectTargets(out, artifactTargets(selection));
    expect(targets.find((t) => t.id === 'style')?.state).toBe('exists');
  });

  it('still removes stale output when written before commands and extras were recorded', async () => {
    const { composed } = await composeFrom(BASE);
    const out = await dir();
    await emit(out, composed, { dryRun: false });
    const { commands: _c, extras: _e, support: _s, ...old } = JSON.parse(
      await readFile(join(out, MANIFEST_PATH), 'utf8'),
    );
    await writeFile(
      join(out, MANIFEST_PATH),
      JSON.stringify({ ...old, rules: [...old.rules, { id: 'gone', path: '.claude/rules/gone.md' }] }),
      'utf8',
    );

    expect((await planEmit(out, composed)).remove).toEqual(['.claude/rules/gone.md']);
  });
});

describe('a generated skill directory', () => {
  // A link is not a file the project wrote there, so it does not make the
  // directory the project's.
  it('is not counted as edited because a link appeared in it', async () => {
    const { composed, selection } = await composeFrom(BASE);
    const out = await dir();
    await emit(out, composed, { dryRun: false });
    await symlink(join(out, '.claude/rules/style.md'), join(out, '.claude/skills/shipping/linked.md'));

    const targets = await inspectTargets(out, artifactTargets(selection));
    expect(targets.find((t) => t.id === 'shipping')?.state).toBe('owned');
  });
});

describe('planning without an AGENTS.md template', () => {
  it('neither writes AGENTS.md nor reports it left alone', async () => {
    const { composed } = await composeFrom(BASE);
    const out = await dir();
    const plan = await planEmit(out, composed);
    expect(plan.write).not.toContain('AGENTS.md');
    expect(plan.leftAlone).toEqual([]);

    await emit(out, composed, { dryRun: false });
    await expect(readFile(join(out, 'AGENTS.md'))).rejects.toThrow();
  });
});

describe('a knowledge file that went missing after composing', () => {
  it('gets no checksum in the manifest', async () => {
    const { kbRoot, composed } = await composeFrom(BASE);
    await rm(join(kbRoot, 'rules/global/style.md'));

    const { checksums } = await finalManifest(composed);
    expect(Object.keys(checksums ?? {})).toEqual(['.claude/skills/shipping/SKILL.md']);
  });

  // EEXIST is the one failure seeding AGENTS.md swallows: the project has one.
  it('fails the run when it is the AGENTS.md template', async () => {
    const { kbRoot, composed } = await composeFrom({ ...BASE, 'agent-md/guidelines.md': '# G\n' });
    await rm(join(kbRoot, 'agent-md/guidelines.md'));

    await expect(emit(await dir(), composed, { dryRun: false })).rejects.toThrow(/ENOENT/);
  });
});
