// The query language of <QuerySearch>: typed qualifiers such as `state:open`, `@name` for a
// person, quoted or plain words for the title, and AND, OR and parentheses in a grouped
// expression. The app gives the keys and their values, so the parser holds no domain data.
// why: docs/components.md#query-search

/** One value that a key accepts, as the suggestion menu shows it. */
export type QueryValue = { value: string; label: string; hint?: string };

/** A key that a query can name, such as `state` or `assignee`. */
export type QueryKey = {
  key: string;
  label: string;
  /** One line under the key's name in the suggestion menu. */
  hint?: string;
  /** Other names for the key, such as `is` for `state`. */
  aliases?: readonly string[];
  /** The values that the key accepts. */
  values: readonly QueryValue[];
  /** `person`: `@name` names this key, and a value also matches by name or first name. */
  kind?: 'person';
  /** A person key's first suggestion, such as Me. `@` does not offer it. */
  self?: QueryValue;
};

/** A parsed condition. A grouped expression is one node with its operator. */
export type QueryNode =
  | { type: 'and' | 'or'; items: QueryNode[] }
  | { type: 'field'; key: string; values: string[] }
  | { type: 'text'; text: string };

/** One chip: its query text, its words for a person, and its condition. */
export type QueryTerm = { raw: string; label: string; node: QueryNode };

/** The parser's words for a query that it cannot read. The field shows them under itself. */
export class QueryError extends Error {}

const list = (words: readonly string[]) => words.length < 3 ? words.join(' or ')
  : `${words.slice(0, -1).join(', ')}, or ${words[words.length - 1]}`;
const lower = (text: string) => text.toLowerCase();
const OPERATOR = /^(AND|OR)$/i;

/** The key that a name or an alias names. */
export const findQueryKey = (keys: readonly QueryKey[], name: string) =>
  keys.find(k => lower(k.key) === lower(name) || k.aliases?.some(a => lower(a) === lower(name)));

const person = (key: QueryKey, text: string) => {
  const needle = lower(text).replace(/^@/, '');
  if (key.self && (needle === lower(key.self.value))) return key.self;
  return key.values.find(v => lower(v.value) === needle || lower(v.label) === needle || lower(v.label.split(' ')[0]) === needle);
};

/**
 * Reads a query into chips. Plain terms become one chip each. A query with AND, OR or a
 * parenthesis stays one chip, so removing a chip never leaves a broken operator.
 * Throws a QueryError with words a person can act on.
 */
export function parseQuery(text: string, keys: readonly QueryKey[]): QueryTerm[] {
  if ((text.match(/"/g) || []).length % 2) throw new QueryError('Close the quoted title or person name.');
  const tokens = text.match(/\(|\)|[^\s():]+:\s*(?:"[^"]*"|[^\s()]+)|"[^"]*"|[^\s()]+/g) || [];
  const people = keys.find(k => k.kind === 'person');
  const keyList = () => list(keys.map(k => `${k.key}:`));
  let at = 0;
  const atom = (): QueryTerm => {
    const raw = tokens[at++];
    if (!raw || raw === ')' || OPERATOR.test(raw)) throw new QueryError('Complete the condition after the operator.');
    if (raw === '(') {
      const inner = or();
      if (tokens[at++] !== ')') throw new QueryError('Close the group with a closing parenthesis.');
      return { ...inner, raw: `(${inner.raw})`, label: `(${inner.label})` };
    }
    const match = raw.match(/^([\w-]+):\s*(.*)$/);
    if (match || (raw.startsWith('@') && people)) {
      const key = match ? findQueryKey(keys, match[1]) : people;
      if (!key) throw new QueryError(`Unknown filter “${match![1]}”. Use ${keyList()}.`);
      const value = (match?.[2] ?? raw).replace(/^"|"$/g, '');
      if (!value) throw new QueryError(`Add a value after ${key.key}:.`);
      if (key.kind === 'person') {
        const found = person(key, value);
        if (!found) throw new QueryError('No person matches this name. Type @ to choose a person.');
        return { raw: `${key.key}:${found.value}`, label: found.label, node: { type: 'field', key: key.key, values: [found.value] } };
      }
      const values = lower(value).split(',').map(v => key.values.find(k => lower(k.value) === v));
      if (values.some(v => !v)) throw new QueryError(`Use ${list(key.values.map(v => v.value))} after ${key.key}:.`);
      const found = values as QueryValue[];
      return { raw: `${key.key}:${found.map(v => v.value).join(',')}`, label: found.map(v => v.label).join(' or '),
        node: { type: 'field', key: key.key, values: found.map(v => v.value) } };
    }
    if (raw.includes(':')) throw new QueryError(`Use ${keyList()} before a value.`);
    const words = raw.replace(/^"|"$/g, '');
    return { raw, label: words, node: { type: 'text', text: words } };
  };
  const join = (type: 'and' | 'or', terms: QueryTerm[]): QueryTerm => terms.length === 1 ? terms[0] : ({
    raw: terms.map(t => t.raw).join(` ${type.toUpperCase()} `),
    label: terms.map(t => t.label).join(` ${type} `),
    node: { type, items: terms.map(t => t.node) },
  });
  const and = (): QueryTerm => {
    const terms = [atom()];
    while (at < tokens.length && tokens[at] !== ')' && !/^OR$/i.test(tokens[at])) {
      if (/^AND$/i.test(tokens[at])) at++;
      terms.push(atom());
    }
    return join('and', terms);
  };
  const or = (): QueryTerm => {
    const terms = [and()];
    while (/^OR$/i.test(tokens[at] ?? '')) { at++; terms.push(and()); }
    return join('or', terms);
  };
  if (!tokens.length) return [];
  if (tokens.some(t => t === '(' || OPERATOR.test(t))) {
    const result = or();
    if (at !== tokens.length) throw new QueryError('Remove the extra closing parenthesis.');
    return [result];
  }
  const terms: QueryTerm[] = [];
  while (at < tokens.length) terms.push(atom());
  return terms;
}

/** The chips and the text in the field. */
export type QueryState = { chips: string[]; draft: string };

/**
 * The conditions of a whole query: every chip, and the field's text when it reads. A draft
 * that does not read yet filters nothing, so the list does not empty while a person types.
 */
export function readQuery({ chips, draft }: QueryState, keys: readonly QueryKey[]): { nodes: QueryNode[]; error: string } {
  const nodes = chips.flatMap(chip => { try { return parseQuery(chip, keys).map(t => t.node); } catch { return []; } });
  try {
    return { nodes: [...nodes, ...parseQuery(draft, keys).map(t => t.node)], error: '' };
  } catch (error) {
    return { nodes, error: (error as Error).message };
  }
}

/**
 * Does a record meet a condition? `field` answers one key and value for the record, and
 * `text` answers the title words. Every node of a list must match.
 */
export function matchQuery(node: QueryNode | readonly QueryNode[], field: (key: string, value: string) => boolean, text: (words: string) => boolean): boolean {
  if (Array.isArray(node)) return node.every(n => matchQuery(n, field, text));
  const one = node as QueryNode;
  switch (one.type) {
    case 'and': return one.items.every(n => matchQuery(n, field, text));
    case 'or': return one.items.some(n => matchQuery(n, field, text));
    case 'field': return one.values.some(v => field(one.key, v));
    default: return text(one.text);
  }
}
