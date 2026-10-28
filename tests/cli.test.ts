import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../src/cli.js';
import type { PickerIo } from '../src/prompt.js';
import { fakeTty } from './fake-tty.js';

// The CLI end to end, in process: argv in, exit code and printed text out.
// Everything below cli.ts has its own tests; these hold the flags, the human
// and --json output, and the exit codes the usage text promises.

const CATALOG = [
  'version: 1',
  'technologies:',
  '  rails:',
  '    name: Ruby on Rails',
  '    requires: [ruby]',
  '  ruby:',
  '    name: Ruby',
  '  laravel:',
  '    name: Laravel',
  '    conflicts_with: [rails]',
  '  vue:',
  '    name: Vue',
  '',
].join('\n');

const UPSTREAM = [
  'version: 1',
  'sources:',
  '  up:',
  '    repo: https://github.com/example/up.git',
  '    ref: a120596f6d7ff9b967a3f5e0331ea911376ee5ef',
  '    license: MIT',
  '    license_url: https://github.com/example/up/blob/main/LICENSE',
  '    copyright: Copyright (c) Example',
  '    copy:',
  '      skills: skills/global',
  '    support:',
  '      agents: .claude/agents',
  '',
].join('\n');

async function tempDir(files: Record<string, string> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'agent-stack-cli-'));
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
  return root;
}

const knowledge = (catalog = CATALOG) =>
  tempDir({
    'catalog.yaml': catalog,
    'upstream.yaml': UPSTREAM,
    'rules/global/style.md': '# Style\n',
    'rules/framework/rails/conventions.md': '# Rails\n',
    'skills/global/shipping/SKILL.md': '# Ship\n',
    'support/up/agents/reviewer.md': '# Reviewer\n',
    'agent-md/guidelines.md': '# Guidelines\n',
  });

let stdout: string[];
let stderr: string[];

beforeEach(() => {
  stdout = [];
  stderr = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Not a terminal, so no checklist: what a script or a slash command sees. */
const pipe = { input: { isTTY: false }, output: { isTTY: false } } as unknown as PickerIo;

async function cli(argv: string[], io: PickerIo = pipe) {
  const code = await main(argv, io);
  return { code, out: stdout.join(''), err: stderr.join('') };
}

const json = (out: string) => JSON.parse(out) as Record<string, any>;

describe('flags', () => {
  it('prints the usage for help, and when no command is given', async () => {
    for (const argv of [['-h'], ['--help'], []]) {
      stdout = [];
      const { code, out } = await cli(argv);
      expect(code).toBe(0);
      expect(out).toMatch(/^agent-stack \d+\.\d+\.\d+ - generate/);
    }
  });

  it('prints the version', async () => {
    const { code, out } = await cli(['--version']);
    expect(code).toBe(0);
    expect(out).toMatch(/^\d+\.\d+\.\d+\n$/);
  });

  it('exits 64 with the usage on a flag it does not know, a missing value or a stray word', async () => {
    for (const [argv, message] of [
      [['--nope'], 'Unknown flag: --nope'],
      [['generate', '--out'], '--out needs a value'],
      [['generate', '--framework', '--json'], '--framework needs a value'],
      [['generate', 'extra'], 'Unexpected argument: extra'],
      [['frobnicate', '--knowledge', '/nonexistent'], 'Knowledge base not found'],
    ] as const) {
      stderr = [];
      const { code, err } = await cli([...argv]);
      expect(err).toContain(message);
      if (message.startsWith('Knowledge')) {
        expect(code).toBe(1);
      } else {
        expect(code).toBe(64);
        expect(err).toContain('Usage:');
      }
    }
  });

  it('exits 64 on a command it does not know', async () => {
    const kb = await knowledge();
    const { code, err } = await cli(['frobnicate', '--knowledge', kb]);
    expect(code).toBe(64);
    expect(err).toContain('Unknown command: frobnicate');
  });

  it('reads --knowledge relative to the working directory', async () => {
    const kb = await knowledge();
    const { code, out } = await cli(['catalog', '--json', '--knowledge', relative(process.cwd(), kb)]);
    expect(code).toBe(0);
    expect(json(out).technologies.map((tech: { id: string }) => tech.id)).toContain('rails');
  });
});

describe('an unknown framework', () => {
  it('exits 65 and lists what the catalog has, with the near miss', async () => {
    const kb = await knowledge();
    const { code, err } = await cli(['resolve', '--framework', 'rials', '--knowledge', kb]);
    expect(code).toBe(65);
    expect(err).toContain('The catalog has 4 frameworks:');
    expect(err).toContain('Ruby on Rails');
  });

  it('says "framework" for one, and says so when there are none', async () => {
    const one = await knowledge('version: 1\ntechnologies:\n  rails:\n    name: Ruby on Rails\n');
    expect((await cli(['resolve', '--framework', 'x', '--knowledge', one])).err).toContain(
      'The catalog has 1 framework:',
    );

    stderr = [];
    const none = await tempDir({ 'catalog.yaml': 'version: 1\ntechnologies: {}\n' });
    const { code, err } = await cli(['resolve', '--framework', 'x', '--knowledge', none]);
    expect(code).toBe(65);
    expect(err).toContain('The catalog has no frameworks.');
  });
});

describe('catalog', () => {
  it('counts each framework with the global layer, and names the imported source', async () => {
    const kb = await knowledge();
    const { code, out } = await cli(['catalog', '--knowledge', kb]);
    expect(code).toBe(0);
    expect(out).toContain('Frameworks (4)');
    expect(out).toContain('1 rule(s), 1 skill(s), 0 command(s) and 1 AGENTS.md template(s)');
    expect(out).toContain('Imported: up 1 artifact(s) and 1 support file(s)');
  });

  it('lists a framework\'s own artifacts under --json', async () => {
    const kb = await knowledge();
    const { out } = await cli(['catalog', '--json', '--knowledge', kb]);
    const rails = json(out).technologies.find((tech: { id: string }) => tech.id === 'rails');
    expect(rails.own.rules).toBe(1);
    expect(rails.counts.rules).toBe(2);
    expect(rails.artifacts).toEqual(['rails-conventions']);
  });
});

describe('resolve', () => {
  it('names a dependency and what required it', async () => {
    const kb = await knowledge();
    const { code, out } = await cli(['resolve', '--framework', 'rails', '--knowledge', kb]);
    expect(code).toBe(0);
    expect(out).toContain('  ruby (required by rails)');
    expect(out).toContain('Selected 2 rule(s), 1 skill(s), 0 command(s), 1 support file(s) and 1 AGENTS.md template(s)');
  });

  it('exits 2 on a conflict and prints the flag that waives it', async () => {
    const kb = await knowledge();
    const { code, out } = await cli([
      'resolve', '--framework', 'rails', '--framework', 'laravel', '--knowledge', kb,
    ]);
    expect(code).toBe(2);
    expect(out).toMatch(/ERROR .*declared incompatible \[--accept-conflict laravel\+rails\]/);
  });

  it('downgrades an accepted conflict to a warning, under --json too', async () => {
    const kb = await knowledge();
    const { code, out } = await cli([
      'resolve', '--framework', 'rails', '--framework', 'laravel',
      '--accept-conflict', 'laravel+rails', '--json', '--knowledge', kb,
    ]);
    expect(code).toBe(0);
    const { report, selection } = json(out);
    expect(report.findings.some((f: { severity: string }) => f.severity === 'warning')).toBe(true);
    expect(selection.skipped).toEqual([]);
  });

  it('prints an error without a waiver when there is nothing to waive', async () => {
    const kb = await knowledge();
    const { code, out } = await cli(['resolve', '--knowledge', kb]);
    expect(code).toBe(2);
    expect(out).toMatch(/ERROR {3}(?!.*--accept-conflict)/);
  });
});

describe('generate', () => {
  it('previews by default and says how to apply it', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    const { code, out: text } = await cli(['generate', '--framework', 'rails', '--knowledge', kb, '--out', out]);
    expect(code).toBe(0);
    expect(text).toContain('Would write');
    expect(text).toContain('Nothing written. Re-run with --write to apply.');
    await expect(readFile(join(out, '.claude/rules/style.md'))).rejects.toThrow();
  });

  it('writes with --write, then removes what a narrower run no longer needs', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    expect((await cli(['generate', '--framework', 'rails', '--write', '--knowledge', kb, '--out', out])).code).toBe(0);
    expect(await readFile(join(out, '.claude/rules/rails-conventions.md'), 'utf8')).toBe('# Rails\n');

    stdout = [];
    const { out: text } = await cli(['generate', '--framework', 'vue', '--write', '--knowledge', kb, '--out', out]);
    expect(text).toContain('Removed stale output:\n  .claude/rules/rails-conventions.md');
    expect(text).toContain('Left AGENTS.md as it is');

    stdout = [];
    const preview = await cli(['generate', '--framework', 'rails', '--knowledge', kb, '--out', out]);
    expect(preview.out).not.toContain('Would remove');
  });

  it('says what a preview would remove', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    await cli(['generate', '--framework', 'rails', '--write', '--knowledge', kb, '--out', out]);
    stdout = [];
    const { out: text } = await cli(['generate', '--framework', 'vue', '--knowledge', kb, '--out', out]);
    expect(text).toContain('Would remove stale output:');
  });

  it('writes nothing and exits 2 when validation fails, under --json too', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    const { code, out: text } = await cli([
      'generate', '--framework', 'rails', '--framework', 'laravel', '--write', '--json',
      '--knowledge', kb, '--out', out,
    ]);
    expect(code).toBe(2);
    expect(json(text).emit.dryRun).toBe(true);
    await expect(readFile(join(out, '.claude/rules/style.md'))).rejects.toThrow();
  });

  it('leaves a file the project has unless --overwrite says otherwise', async () => {
    const kb = await knowledge();
    const out = await tempDir({ '.claude/rules/style.md': '# ours\n' });

    const kept = json((await cli(['generate', '--framework', 'rails', '--write', '--json', '--knowledge', kb, '--out', out])).out);
    expect(kept.kept.map((entry: { path: string }) => entry.path)).toEqual(['.claude/rules/style.md']);
    expect(await readFile(join(out, '.claude/rules/style.md'), 'utf8')).toBe('# ours\n');

    stdout = [];
    const taken = json((await cli([
      'generate', '--framework', 'rails', '--write', '--json', '--overwrite', '--knowledge', kb, '--out', out,
    ])).out);
    expect(taken.kept).toEqual([]);
    expect(await readFile(join(out, '.claude/rules/style.md'), 'utf8')).toBe('# Style\n');
  });
});

describe('the checklist', () => {
  /** Run generate on a fake terminal, pressing `keys` once the checklist is drawn. */
  async function picked(out: string, kb: string, keys: string) {
    const { io, written, type } = fakeTty();
    const running = cli(['generate', '--framework', 'rails', '--write', '--knowledge', kb, '--out', out], io);
    await vi.waitFor(() => expect(written.length).toBeGreaterThan(0));
    type(keys);
    return running;
  }

  it('cancels on q, writing nothing, with exit 130', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    const { code, out: text } = await picked(out, kb, 'q');
    expect(code).toBe(130);
    expect(text).toContain('Cancelled. Nothing was written.');
    await expect(readFile(join(out, '.claude/rules/style.md'))).rejects.toThrow();
  });

  it('keeps an unticked file of the project\'s, and lists the rest it was told to leave out', async () => {
    const kb = await knowledge();
    const out = await tempDir({ '.claude/rules/style.md': '# ours\n' });
    // Untick everything, then confirm.
    const { out: text } = await picked(out, kb, 'n\r');

    expect(text).toContain('Left out at your request:');
    expect(text).toContain('  rails-conventions (.claude/rules/rails-conventions.md)');
    // The AGENTS.md template has no path to show.
    expect(text).toMatch(/\n {2}guidelines\n/);
    expect(await readFile(join(out, '.claude/rules/style.md'), 'utf8')).toBe('# ours\n');
  });

  it('is skipped by --yes, which takes the defaults', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    const { io, written } = fakeTty();
    const { code } = await cli(
      ['generate', '--framework', 'rails', '--write', '--yes', '--knowledge', kb, '--out', out],
      io,
    );
    expect(code).toBe(0);
    expect(written).toEqual([]);
    expect(await readFile(join(out, '.claude/agents/reviewer.md'), 'utf8')).toBe('# Reviewer\n');
  });

  it('writes what was approved', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    const { code } = await picked(out, kb, '\r');
    expect(code).toBe(0);
    expect(await readFile(join(out, '.claude/rules/style.md'), 'utf8')).toBe('# Style\n');
  });
});

describe('check', () => {
  it('exits 2 when nothing was generated and no framework is named', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    const { code, err } = await cli(['check', '--knowledge', kb, '--out', out]);
    expect(code).toBe(2);
    expect(err).toContain('No agent-stack manifest in');
  });

  it('takes the stack from the last run, and is up to date right after it', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    await cli(['generate', '--framework', 'rails', '--write', '--knowledge', kb, '--out', out]);

    stdout = [];
    const human = await cli(['check', '--knowledge', kb, '--out', out]);
    expect(human.code).toBe(0);
    expect(human.out).toContain('is up to date with the knowledge base.');
    // The dependency follows from the input again; it is not recorded as input.
    expect(human.out).toContain('  ruby (required by rails)');

    stdout = [];
    const machine = await cli(['check', '--json', '--knowledge', kb, '--out', out]);
    expect(machine.code).toBe(0);
    expect(json(machine.out).upToDate).toBe(true);
  });

  it('exits 3 and names each change when the project is behind', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    await cli(['generate', '--framework', 'rails', '--write', '--knowledge', kb, '--out', out]);
    await writeFile(join(kb, 'rules/global/style.md'), '# Style, revised\n', 'utf8');

    stdout = [];
    const human = await cli(['check', '--knowledge', kb, '--out', out]);
    expect(human.code).toBe(3);
    expect(human.out).toContain('  update .claude/rules/style.md');
    expect(human.out).toContain(`To apply: agent-stack generate --framework rails --out ${out} --write`);

    stdout = [];
    const machine = await cli(['check', '--json', '--framework', 'rails', '--knowledge', kb, '--out', out]);
    expect(machine.code).toBe(3);
    expect(json(machine.out).changes).toEqual([
      { path: '.claude/agent-stack-manifest.json', change: 'update' },
      { path: '.claude/rules/style.md', change: 'update' },
    ]);
  });

  it('leaves --out out of the hint when the project is the working directory', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    vi.spyOn(process, 'cwd').mockReturnValue(out);
    const { out: text } = await cli(['check', '--framework', 'rails', '--knowledge', kb]);
    expect(text).toContain('To apply: agent-stack generate --framework rails --write');
  });

  it('exits 2 on a conflict, in either output', async () => {
    const [kb, out] = [await knowledge(), await tempDir()];
    const flags = ['--framework', 'rails', '--framework', 'laravel', '--knowledge', kb, '--out', out];

    const human = await cli(['check', ...flags]);
    expect(human.code).toBe(2);
    expect(human.out).toContain('ERROR');

    stdout = [];
    const machine = await cli(['check', '--json', ...flags]);
    expect(machine.code).toBe(2);
    expect(json(machine.out).report.ok).toBe(false);
  });
});
