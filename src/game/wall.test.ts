import { describe, expect, it } from 'vitest';

// The wall between money and rules. The rules engine must never learn what a
// player owns, so nothing bought can change what a nation is able to do. This
// test fails if any file under src/game reaches outside it.

const files = import.meta.glob('./**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('the wall between money and rules', () => {
  it('keeps the rules free of commerce, backend, screens, art and browser code', () => {
    const forbidden = [/from\s+['"](\.\.\/)+(commerce|backend|ui|art)\b/, /from\s+['"]@supabase/, /from\s+['"]react/, /\bentitlement/i, /\blocalStorage\b/, /\bwindow\./, /\bdocument\./, /\bDate\.now\(/];
    const offenders: string[] = [];
    for (const [path, source] of Object.entries(files)) {
      if (path.endsWith('.test.ts')) continue;
      for (const rule of forbidden) if (rule.test(source)) offenders.push(`${path} matches ${rule}`);
    }
    expect(Object.keys(files).length).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });
});
