import { readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/**
 * Content copied into knowledge/ from another repository.
 *
 * The files are committed here, so nothing is fetched at generate time. This
 * record exists to say where they came from, to carry the licence obligations
 * into the generated output, and to tell `npm run sync` what to copy.
 */
/** Where agent-stack's own output lands, so a support file cannot claim it. */
const RESERVED = ['.claude/rules', '.claude/skills', '.claude/commands', '.claude/agent-stack-manifest.json'];

/**
 * A support target: a directory under `.claude/` that no other type writes to.
 * It is where the imported files already look for it, so nothing imported has
 * to be edited to find it.
 */
const supportTarget = z
  .string()
  .refine(
    (target) =>
      target.startsWith('.claude/') &&
      posix.normalize(target) === target &&
      !target.split('/').includes('..'),
    'a support target is a plain path under .claude/',
  )
  .refine(
    (target) => !RESERVED.some((path) => target === path || target.startsWith(`${path}/`)),
    'a support target cannot land where rules, skills, commands or the manifest are written',
  );

export const upstreamSourceSchema = z.object({
  repo: z.string().url().startsWith('https://'),
  /** Full 40-character commit SHA. A branch or tag is rejected: the copy must be traceable. */
  ref: z.string().regex(/^[0-9a-f]{40}$/, 'ref must be a full 40-character commit SHA'),
  license: z.string().min(1),
  /** Where the licence can be read. Travels into every generated file's origin comment. */
  license_url: z.string().url(),
  copyright: z.string().min(1),
  /** Upstream path -> path under knowledge/. The targets mark which artifacts are imported. */
  copy: z.record(z.string().min(1), z.string().min(1)),
  /**
   * Upstream path -> where it lands in a generated project. For files the
   * imported skills and commands reach outside their own directory: personas a
   * command spawns, references a skill links to. Synced to
   * `knowledge/support/<source>/<upstream path>`, and emitted only while
   * something from this source is.
   */
  support: z.record(z.string().min(1), supportTarget).default({}),
});

export type UpstreamSource = z.infer<typeof upstreamSourceSchema>;

export const upstreamFileSchema = z.object({
  version: z.literal(1),
  sources: z.record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), upstreamSourceSchema),
});

export interface ImportedSource {
  name: string;
  repo: string;
  ref: string;
  license: string;
  licenseUrl: string;
  copyright: string;
  /** Paths under knowledge/ that hold this source's files. */
  paths: string[];
  /** Each support path: where it sits under knowledge/, and where it lands. */
  support: { dir: string; target: string }[];
}

/** Where a source's support path is kept under knowledge/. `npm run sync` writes it there. */
export function supportDir(source: string, from: string): string {
  return posix.join('support', source, from);
}

export async function loadUpstream(root: string): Promise<ImportedSource[]> {
  const raw = await readFile(join(root, 'upstream.yaml'), 'utf8').catch(() => undefined);
  if (raw === undefined) return [];

  const parsed = upstreamFileSchema.safeParse(parseYaml(raw));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new Error(`upstream.yaml: invalid (${issues})`);
  }

  const sources: ImportedSource[] = [];
  for (const [name, source] of Object.entries(parsed.data.sources)) {
    const support = Object.entries(source.support).map(([from, target]) => ({
      dir: supportDir(name, from),
      target,
    }));
    sources.push({
      name,
      repo: source.repo,
      ref: source.ref,
      license: source.license,
      licenseUrl: source.license_url,
      copyright: source.copyright,
      paths: [...Object.values(source.copy), ...support.map((entry) => entry.dir)],
      support,
    });
  }
  return sources;
}
