// Markdown is the only source of guideline prose; specimens stay executable.
export async function loadGuideline(name, assetUrl) {
  // Vitest rewrites asset URLs even in Node; read the source there, without HTTP.
  let text;
  if (import.meta.url.startsWith('file:')) {
    const [{ readFile }, { URL: FileURL }] = await Promise.all([
      import(/* @vite-ignore */ 'node:fs/promises'),
      import(/* @vite-ignore */ 'node:url'),
    ]);
    text = await readFile(new FileURL(`../../guidelines/${name}`, import.meta.url), 'utf8');
  } else {
    const response = await fetch(assetUrl);
    if (!response.ok) throw new Error(`Cannot load guideline: ${response.status}`);
    text = await response.text();
  }
  return parseGuideline(text);
}

export function parseGuideline(text) {
  const [header, ...blocks] = text.trim().split(/\n## /);
  const [title, ...intro] = header.replace(/^# /, '').split('\n');
  const rules = blocks.map((block) => {
    const [imperative, ...lines] = block.split('\n');
    const rule = { imperative };
    for (const line of lines.filter((line) => line.trim())) {
      const id = /^<!-- rule: ([\w-]+) -->$/.exec(line);
      if (id) { rule.id = id[1]; continue; }
      const field = /^\*\*(Rule|Why|Except|Do|Don't|Gap #\d+):\*\* (.+)$/.exec(line);
      if (!field) throw new Error(`Unsupported guideline line: ${line}`);
      if (field[1].startsWith('Gap #')) rule.unmet = { issue: Number(field[1].slice(5)), note: field[2] };
      else rule[{ Rule: 'instruction', Why: 'why', Except: 'except', Do: 'doCaption', "Don't": 'dontCaption' }[field[1]]] = field[2];
    }
    if (!rule.id) throw new Error(`Missing rule id: ${imperative}`);
    return rule;
  });
  return { title, blurb: intro.join('\n').trim(), rules };
}

export function withSpecimens(rules, specimens) {
  if (rules.length !== specimens.length || rules.some((r, i) => r.id !== specimens[i].id)) {
    throw new Error('Markdown rules and specimen ids must match in order');
  }
  return rules.map((rule, i) => ({ ...specimens[i], ...rule }));
}
