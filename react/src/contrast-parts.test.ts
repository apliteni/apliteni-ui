// Guards the part entry points of the React contrast gate. The check reads the entry files, so it
// sees the parts that exist to run, not the split the walk plans. It cannot see a part the runner
// skips by filter. Both rejection tests below prove it fails on a missing and a duplicate part.
import { describe, it, expect } from 'vitest';
import { CONTRAST_PARTS, partProblems } from './contrast-parts';

const sources = import.meta.glob<string>(['./contrast.test.tsx', './contrast-[0-9]*.test.tsx'], {
  query: '?raw', import: 'default', eager: true,
});
const real = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k.replace('./', ''), v]));

describe('contrast: part entry points', () => {
  it('every part has one entry point and each runs a distinct part', () => {
    expect(partProblems(real)).toEqual([]);
    expect(Object.keys(real).length).toBe(CONTRAST_PARTS);
  });

  it('rejects a missing part', () => {
    const { ['contrast-8.test.tsx']: _gone, ...rest } = real;
    expect(partProblems(rest)).toEqual(expect.arrayContaining([
      'part entry point contrast-8.test.tsx is missing', 'no entry point runs part 7']));
  });

  it('rejects a duplicate part', () => {
    const dup = { ...real, 'contrast-8.test.tsx': real['contrast-3.test.tsx'] };
    expect(partProblems(dup)).toEqual(expect.arrayContaining([
      'part 2 runs in more than one file: contrast-3.test.tsx, contrast-8.test.tsx', 'no entry point runs part 7']));
  });
});
