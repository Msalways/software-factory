#!/usr/bin/env node
// Builds the Hattera package (openmaus.package v2) for this factory: four bots (Lead/Chief, Designer,
// Builder, Verifier), their standing instructions, and the factory skills. The bots' instructions point
// at this checkout, so build the package on the machine that will use it.
// Usage:
//   node tools/build-hattera-package.cjs [--root <factory root>] [--out <file>] [--hattera <Hattera source dir>]
//   --root     factory root written into the instructions (default: this repository's folder)
//   --out      output file (default: dist/software-factory.openmaus.json)
//   --hattera  validate with Hattera's own parser (shared/package-format.ts; needs Node 22.6+ type stripping)
//   --souls    also write rendered SOUL.md files to dist/souls/ (to update bots that already exist)
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'hattera', 'package.json'), 'utf8'));

function render(text, root) { return text.replace(/\{\{FACTORY_ROOT\}\}/g, root.replace(/\\/g, '/')); }

function skillEntries() {
  const dir = path.join(REPO, 'shared', 'skills');
  return fs.readdirSync(dir).filter(n => fs.existsSync(path.join(dir, n, 'SKILL.md'))).map(name => {
    const instructions = fs.readFileSync(path.join(dir, name, 'SKILL.md'), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
    const fm = instructions.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) throw Error(`${name}/SKILL.md has no frontmatter`);
    const desc = (fm[1].match(/^description:\s*(.+)$/m) || [])[1];
    if (!desc) throw Error(`${name}/SKILL.md has no description`);
    return {name, description: desc.trim(), source: `${manifest.repository}/shared/skills/${name}`, instructions};
  });
}

function build(root) {
  const skills = skillEntries();
  const agents = manifest.agents.map(a => ({
    key: a.key, name: a.name, title: a.title, description: a.description,
    soul: render(fs.readFileSync(path.join(REPO, 'hattera', 'agents', `${a.key}.md`), 'utf8'), root),
    appearance: a.appearance, approval: 'ask', skills: a.skills,
  }));
  return {
    format: 'openmaus.package', version: 2,
    package: {
      id: manifest.id, release: manifest.release, name: manifest.name, tagline: manifest.tagline,
      summary: manifest.summary, notes: manifest.notes, category: manifest.category,
      author: manifest.author, license: manifest.license, tags: manifest.tags, outcomes: manifest.outcomes,
      setupMinutes: manifest.setupMinutes, requirements: manifest.requirements,
      team: {name: manifest.team.name, brief: render(manifest.team.brief, root), leader: manifest.team.leader},
      agents,
      skills: {version: 1, entries: skills},
    },
  };
}

async function validate(doc, hattera) {
  const mod = await import(require('node:url').pathToFileURL(path.join(hattera, 'shared', 'package-format.ts')).href);
  const parsed = mod.parsePackageDocument(doc, {trust: 'file'});
  return {agents: parsed.package.agents.length, skills: parsed.package.skills?.entries.length ?? 0,
    secrets: mod.packageSecretFindings(parsed), warnings: mod.packageScanFindings(parsed)};
}

module.exports = {build, render};

if (require.main === module) (async () => {
  const args = process.argv.slice(2), val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const root = path.resolve(val('--root') || REPO);
  const out = path.resolve(val('--out') || path.join(REPO, 'dist', 'software-factory.openmaus.json'));
  const doc = build(root);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
  console.log(`wrote ${out}\n  factory root: ${root}\n  agents: ${doc.package.agents.map(a => a.name).join(', ')}\n  skills: ${doc.package.skills.entries.map(s => s.name).join(', ')}`);
  if (args.includes('--souls')) {
    const dir = path.join(path.dirname(out), 'souls'); fs.mkdirSync(dir, {recursive: true});
    for (const a of doc.package.agents) fs.writeFileSync(path.join(dir, `${a.key}.SOUL.md`), a.soul);
    console.log(`  souls: ${dir}`);
  }
  const hattera = val('--hattera');
  if (hattera) {
    try { const v = await validate(doc, path.resolve(hattera)); console.log(`  Hattera parser: OK (${v.agents} agents, ${v.skills} skills, ${v.secrets.length} secret findings, ${v.warnings.length} scan warnings)`); for (const w of v.warnings) console.log(`    warning ${w.part}: ${w.warning}`); }
    catch (e) { console.error(`  Hattera parser: FAILED\n${e.message}`); process.exit(1); }
  }
})();
