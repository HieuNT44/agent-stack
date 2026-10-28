import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArtifactPathError, loadKnowledgeBase, metaFromPath } from '../src/catalog.js';

// What the loader refuses, and says by name. Each of these would otherwise be
// content that is never emitted, or a catalog the resolver cannot trust.

const CATALOG = 'version: 1\ntechnologies:\n  rails:\n    name: Ruby on Rails\n';

async function knowledge(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'agent-stack-kb-'));
  for (const [path, contents] of Object.entries({ 'catalog.yaml': CATALOG, ...files })) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
  return root;
}

describe('catalog.yaml', () => {
  it('names the field that is wrong', async () => {
    const root = await knowledge({ 'catalog.yaml': 'version: 2\ntechnologies: {}\n' });
    await expect(loadKnowledgeBase(root)).rejects.toThrow(/catalog\.yaml: invalid \(version: /);
  });

  it('says <root> when the file is not a mapping at all', async () => {
    const root = await knowledge({ 'catalog.yaml': 'just a sentence\n' });
    await expect(loadKnowledgeBase(root)).rejects.toThrow(/catalog\.yaml: invalid \(<root>: /);
  });

  it('refuses a requirement on a technology it does not list', async () => {
    const root = await knowledge({
      'catalog.yaml': 'version: 1\ntechnologies:\n  rails:\n    name: Rails\n    requires: [ruby]\n',
    });
    await expect(loadKnowledgeBase(root)).rejects.toThrow(
      'catalog.yaml: rails.requires references unknown technology "ruby"',
    );
  });

  it('refuses a technology that conflicts with itself', async () => {
    const root = await knowledge({
      'catalog.yaml': 'version: 1\ntechnologies:\n  rails:\n    name: Rails\n    conflicts_with: [rails]\n',
    });
    await expect(loadKnowledgeBase(root)).rejects.toThrow('catalog.yaml: rails conflicts with itself');
  });
});

describe('upstream.yaml', () => {
  it('names the field that is wrong, or <root>', async () => {
    const wrong = await knowledge({ 'upstream.yaml': 'version: 2\nsources: {}\n' });
    await expect(loadKnowledgeBase(wrong)).rejects.toThrow(/upstream\.yaml: invalid \(version: /);

    const prose = await knowledge({ 'upstream.yaml': 'just a sentence\n' });
    await expect(loadKnowledgeBase(prose)).rejects.toThrow(/upstream\.yaml: invalid \(<root>: /);
  });
});

describe('artifact paths', () => {
  // `rules/global/rails-x.md` and `rules/framework/rails/x.md` both become
  // `.claude/rules/rails-x.md`.
  it('refuses two rules that would land on one file', async () => {
    const root = await knowledge({
      'rules/global/rails-conventions.md': '# A\n',
      'rules/framework/rails/conventions.md': '# B\n',
    });
    await expect(loadKnowledgeBase(root)).rejects.toThrow(
      /duplicate rule id "rails-conventions" \([^)]*\)$/m,
    );
  });

  it('refuses a SKILL.md with no skill directory to name it', () => {
    expect(() => metaFromPath(join('skills', 'SKILL.md'), 'skill')).toThrow(ArtifactPathError);
  });

  it('refuses a content directory that is a file', async () => {
    const root = await knowledge({ rules: 'not a directory\n' });
    await expect(loadKnowledgeBase(root)).rejects.toThrow(/ENOTDIR/);
  });

  // A link is neither a file nor a directory to the loader, so whatever it
  // points at is not copied into every project by accident.
  it('skips a symbolic link', async () => {
    const root = await knowledge({ 'rules/global/style.md': '# Style\n' });
    await symlink(join(root, 'rules/global/style.md'), join(root, 'rules/global/linked.md'));
    const kb = await loadKnowledgeBase(root);
    expect(kb.rules.map((rule) => rule.meta.id)).toEqual(['style']);
  });
});
