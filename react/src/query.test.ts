import { describe, expect, it } from 'vitest';
import { findQueryKey, matchQuery, parseQuery, readQuery, type QueryKey } from './query';

// Fabricated keys: a state key with an alias, and a person key with Me.
const KEYS: QueryKey[] = [
  { key: 'state', label: 'State', aliases: ['is'], values: [{ value: 'open', label: 'Open' }, { value: 'done', label: 'Done' }] },
  { key: 'assignee', label: 'Assignee', kind: 'person', self: { value: 'me', label: 'Me' },
    values: [{ value: 'p1', label: 'Ada Lovelace' }, { value: 'p2', label: 'Mara Lindqvist' }] },
];
const raw = (text: string) => parseQuery(text, KEYS).map(t => t.raw);

describe('parseQuery', () => {
  it('makes one chip of each plain term, and reads an alias as its key', () => {
    expect(raw('is:open report')).toEqual(['state:open', 'report']);
    expect(parseQuery('state:open,done', KEYS)[0].label).toBe('Open or Done');
    expect(findQueryKey(KEYS, 'IS')?.key).toBe('state');
  });
  it('reads @name and a typed person by full name, first name or Me', () => {
    expect(raw('@mara')).toEqual(['assignee:p2']);
    expect(raw('assignee:"Ada Lovelace"')).toEqual(['assignee:p1']);
    expect(parseQuery('assignee:me', KEYS)[0].label).toBe('Me');
  });
  it('keeps a grouped expression as one chip', () => {
    const [term, ...rest] = parseQuery('(state:open OR state:done) AND @ada', KEYS);
    expect(rest).toEqual([]);
    expect(term.raw).toBe('(state:open OR state:done) AND assignee:p1');
    expect(term.node.type).toBe('and');
  });
  it('says what to change in words a person can act on', () => {
    expect(() => parseQuery('priority:high', KEYS)).toThrow('Unknown filter “priority”. Use state: or assignee:.');
    expect(() => parseQuery('state:zzz', KEYS)).toThrow('Use open or done after state:.');
    expect(() => parseQuery('(state:open OR)', KEYS)).toThrow('Complete the condition after the operator.');
    expect(() => parseQuery('(state:open', KEYS)).toThrow('Close the group with a closing parenthesis.');
    expect(() => parseQuery('"open', KEYS)).toThrow('Close the quoted title or person name.');
    expect(() => parseQuery('@zz', KEYS)).toThrow('No person matches this name.');
  });
});

describe('readQuery and matchQuery', () => {
  const task = { state: 'open', who: 'p1', title: 'Send the report' };
  const field = (key: string, value: string) => key === 'state' ? task.state === value : task.who === (value === 'me' ? 'p1' : value);
  const text = (words: string) => task.title.toLowerCase().includes(words.toLowerCase());
  it('matches every chip and an OR group', () => {
    expect(matchQuery(readQuery({ chips: ['state:open', 'assignee:me'], draft: 'report' }, KEYS).nodes, field, text)).toBe(true);
    expect(matchQuery(readQuery({ chips: ['(state:done OR assignee:p1)'], draft: '' }, KEYS).nodes, field, text)).toBe(true);
    expect(matchQuery(readQuery({ chips: ['state:done'], draft: '' }, KEYS).nodes, field, text)).toBe(false);
  });
  it('filters nothing by a draft that does not read yet, and returns its error', () => {
    const read = readQuery({ chips: ['state:open'], draft: '(state:' }, KEYS);
    expect(read.nodes).toHaveLength(1);
    expect(read.error).not.toBe('');
  });
});
