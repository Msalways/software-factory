#!/usr/bin/env node
// Factory sync: brings a project's bots, rooms and skills up to the current factory version without
// touching what the project's own work produced. Reads Hattera data, never writes it: the plan is
// applied through Hattera's native setup tools (approval card), then `record` verifies and stores it.
//
//   node tools/factory-sync.cjs status [project]
//   node tools/factory-sync.cjs render <lead|builder|verifier> --project <id> --path <dir>   (new projects)
//   node tools/factory-sync.cjs plan   <project> [--section <name>] [--accept-edits]       (exit 4 on conflicts)
//   node tools/factory-sync.cjs record <project> <plan.json> [--actor <name>]
//
// Factory-owned: the marked block in each bot's instructions and room bulletin, and skills whose
// folder is in shared/skills. Project-owned (never changed): everything outside the markers, other
// skills, factory memory records (only the application/factory record is added or updated), DESIGN.md,
// ledgers, evidence, bot MEMORY.md, conversations, branches and worktrees.
// Backward compatible: a bot with no markers (set up before sync existed) keeps its whole old text
// as project notes below the new block; a project with no application/factory record is "legacy".
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {Memory} = require('./factory-memory.cjs');

const REPO = path.resolve(__dirname, '..');
const HOME = () => process.env.FACTORY_HATTERA_HOME || path.join(os.homedir(), '.openmausbot');
const DB = () => process.env.FACTORY_MEMORY_DB || path.join(REPO, 'state', 'memory.sqlite3');
const OUT = () => process.env.FACTORY_SYNC_DIR || path.join(REPO, 'state', 'sync');
const VERSION = () => JSON.parse(fs.readFileSync(path.join(REPO, 'hattera', 'package.json'), 'utf8')).release;
const ROLES = ['lead', 'builder', 'verifier'];
const SOUL_MAX = 24000, BULLETIN_MAX = 12000;
const NOTES = 'Project notes (this project\'s own facts and decisions; kept as written across factory updates):';

const sha = s => crypto.createHash('sha256').update(s.replace(/\r\n/g, '\n').trim()).digest('hex').slice(0, 16);
const bytes = s => Buffer.byteLength(s, 'utf8');
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
const list = v => Array.isArray(v) ? v : (v && (v.bots || v.groups)) || Object.values(v || {});

// ---------- markers
const BEGIN = /<!-- factory:begin([^>]*)-->\n?/, END = /\n?<!-- factory:end -->/;
function split(text) {
  const t = (text || '').replace(/\r\n/g, '\n');
  const b = t.match(BEGIN), e = t.match(END);
  if (!b || !e || e.index < b.index) return {marked: false, before: '', block: null, after: t.trim(), attrs: {}};
  const attrs = Object.fromEntries([...b[1].matchAll(/(\w+)=(\S+)/g)].map(m => [m[1], m[2]]));
  return {marked: true, before: t.slice(0, b.index).trim(), block: t.slice(b.index + b[0].length, e.index).trim(),
    after: t.slice(e.index + e[0].length).trim(), attrs};
}
function join(block, attrs, notes) {
  const head = `<!-- factory:begin ${Object.entries(attrs).map(([k, v]) => `${k}=${v}`).join(' ')} -->`;
  return [head, block.trim(), '<!-- factory:end -->'].join('\n') + (notes && notes.trim() ? `\n\n${notes.trim()}\n` : '\n');
}

// ---------- templates
function render(role, vars) {
  const f = path.join(REPO, 'hattera', 'project', `${role}.md`);
  if (!fs.existsSync(f)) throw Error(`no template for role ${role}`);
  let t = fs.readFileSync(f, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n').trim();
  for (const [k, v] of Object.entries(vars)) t = t.split(`{{${k}}}`).join(String(v).replace(/\\/g, '/'));
  const left = t.match(/\{\{\w+\}\}/); if (left) throw Error(`template ${role} has unfilled ${left[0]}`);
  return t;
}
function roomBlock(vars) {
  return `Software Factory ${vars.VERSION}: this room follows ${vars.FACTORY_ROOT.replace(/\\/g, '/')}/shared/standards/gates-and-handoffs.md ` +
    '(default-fail gates, done-contract and evidence.json per slice, independent verification, merge queue, worktree cleanup after merge). ' +
    'The project Lead owns slicing, routing and integration. Project-specific scope and authorizations follow below.';
}
function changes(fromVersion) {
  const f = path.join(REPO, 'CHANGELOG.md'); if (!fs.existsSync(f)) return [];
  const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
  return fs.readFileSync(f, 'utf8').split(/^## /m).slice(1).map(s => ({version: s.split(/\s/)[0], text: s.trim()}))
    .filter(e => /^\d+\.\d+\.\d+$/.test(e.version) && (!fromVersion || cmp(e.version, fromVersion) > 0));
}

// ---------- reads (Hattera + factory memory)
function hattera() {
  const h = HOME();
  const bots = list(readJson(path.join(h, 'bots.json')));
  const rooms = fs.existsSync(path.join(h, 'groups.json')) ? list(readJson(path.join(h, 'groups.json'))) : [];
  const skillFile = (botId, name) => path.join(h, 'workspaces', botId, 'skills', name, 'SKILL.md');
  const skills = botId => { const d = path.join(h, 'workspaces', botId, 'skills'); return fs.existsSync(d) ? fs.readdirSync(d).filter(n => fs.existsSync(skillFile(botId, n))) : []; };
  return {bots, rooms, skills, skillFile};
}
function memRead(project) {
  const m = new Memory(DB());
  try {
    const p = m.projects().find(x => x.id === project);
    if (!p) throw Error(`project ${project} is not registered in factory memory`);
    const get = id => { try { return m.get(project, 'application', id); } catch { return null; } };
    return {project: p, factory: get('factory'), setup: get('native-setup')};
  } finally { m.close(); }
}
function resolveBots(project, h, mem, section) {
  const byId = id => h.bots.find(b => b.id === id);
  const out = {}, how = {};
  for (const role of ROLES) {
    const id = mem.factory?.body?.bots?.[role] || mem.setup?.body?.[`${role}_id`];
    if (id && byId(id)) { out[role] = byId(id); how[role] = mem.factory?.body?.bots?.[role] ? 'factory record' : 'native-setup record'; }
  }
  const sec = section || mem.setup?.body?.team || Object.values(out)[0]?.section;
  for (const role of ROLES) if (!out[role] && sec) {
    const m = h.bots.filter(b => b.section === sec && new RegExp(role, 'i').test(`${b.name} ${b.title || ''}`));
    if (m.length === 1) { out[role] = m[0]; how[role] = `section "${sec}" by name`; }
  }
  return {bots: out, how, section: sec};
}

// ---------- plan
function plan(project, opts = {}) {
  const h = hattera(), mem = memRead(project), version = VERSION();
  const {bots, how, section} = resolveBots(project, h, mem, opts.section);
  const rec = mem.factory?.body || null;
  const vars = {PROJECT: project, PROJECT_PATH: mem.project.source, FACTORY_ROOT: REPO, VERSION: version};
  const res = {project, section, factoryVersion: version, recordedVersion: rec?.factory_version || null,
    legacy: !rec, changelog: changes(rec?.factory_version), bots: [], rooms: [], skills: [], conflicts: [], memory: null};
  for (const role of ROLES) {
    const bot = bots[role];
    if (!bot) { res.conflicts.push(`no ${role} bot found for ${project}${section ? ` in section "${section}"` : ''}`); continue; }
    const cur = split(bot.soul || '');
    const block = render(role, vars);
    const item = {role, botId: bot.id, name: bot.name, resolvedBy: how[role], before: {marked: cur.marked, bytes: bytes(bot.soul || ''), hash: sha(bot.soul || '')}};
    let notes;
    if (!cur.marked) { notes = cur.after ? `${NOTES}\n${cur.after}` : ''; item.action = 'adopt'; item.note = 'set up before sync: whole old text kept as project notes'; }
    else {
      notes = [cur.before, cur.after].filter(Boolean).join('\n\n');
      const recorded = rec?.blocks?.[bot.id];
      if (recorded && recorded !== sha(cur.block) && !opts.acceptEdits) {
        res.conflicts.push(`${bot.name}: the factory block was edited by hand since the last sync (re-run with --accept-edits to replace it; the edits are in the plan)`);
        item.handEditedBlock = cur.block;
      }
      item.action = sha(cur.block) === sha(block) && cur.attrs.version === version ? 'up-to-date' : 'update';
    }
    item.soul = join(block, {role, version}, notes);
    item.blockHash = sha(block);
    item.after = {bytes: bytes(item.soul)};
    if (item.after.bytes > SOUL_MAX) res.conflicts.push(`${bot.name}: new instructions are ${item.after.bytes} bytes (limit ${SOUL_MAX})`);
    res.bots.push(item);
  }
  // rooms of the project section
  for (const r of h.rooms.filter(r => section && r.section === section)) {
    const cur = split(r.bulletin || ''), block = roomBlock(vars);
    const notes = cur.marked ? [cur.before, cur.after].filter(Boolean).join('\n\n') : (r.bulletin || '').trim();
    const recorded = rec?.bulletins?.[r.id];
    if (cur.marked && recorded && recorded !== sha(cur.block) && !opts.acceptEdits) res.conflicts.push(`room ${r.name}: factory block edited by hand since the last sync`);
    const bulletin = join(block, {version}, notes).trim();
    const action = !cur.marked ? 'adopt' : sha(cur.block) === sha(block) && cur.attrs.version === version ? 'up-to-date' : 'update';
    if (bytes(bulletin) > BULLETIN_MAX) res.conflicts.push(`room ${r.name}: bulletin would be ${bytes(bulletin)} bytes (limit ${BULLETIN_MAX})`);
    res.rooms.push({roomId: r.id, name: r.name, action, bulletin, blockHash: sha(block)});
  }
  // skills: factory-owned names only
  const factorySkills = fs.readdirSync(path.join(REPO, 'shared', 'skills')).filter(n => fs.existsSync(path.join(REPO, 'shared', 'skills', n, 'SKILL.md')));
  for (const item of res.bots) {
    const have = h.skills(item.botId);
    for (const name of factorySkills) {
      const want = fs.readFileSync(path.join(REPO, 'shared', 'skills', name, 'SKILL.md'), 'utf8').replace(/^﻿/, '');
      const action = !have.includes(name) ? 'install' : sha(fs.readFileSync(h.skillFile(item.botId, name), 'utf8').replace(/^﻿/, '')) === sha(want) ? 'up-to-date' : 'update';
      res.skills.push({botId: item.botId, bot: item.name, skill: name, action, source: path.join(REPO, 'shared', 'skills', name)});
    }
    res.skills.push(...have.filter(n => !factorySkills.includes(n)).map(n => ({botId: item.botId, bot: item.name, skill: n, action: 'keep (project-owned)'})));
  }
  res.memory = {record: 'application/factory', expectedVersion: mem.factory?.version || 0,
    body: {summary: `Factory ${version} applied to ${project}`, factory_version: version, previous_version: rec?.factory_version || 'legacy',
      bots: Object.fromEntries(res.bots.map(b => [b.role, b.botId])), blocks: Object.fromEntries(res.bots.map(b => [b.botId, b.blockHash])),
      bulletins: Object.fromEntries(res.rooms.map(r => [r.roomId, r.blockHash])),
      skills: [...new Set(res.skills.filter(s => !s.action.startsWith('keep')).map(s => s.skill))]}};
  return res;
}

function writePlan(res) {
  const dir = path.join(OUT(), res.project, res.factoryVersion); fs.mkdirSync(dir, {recursive: true});
  for (const b of res.bots) fs.writeFileSync(path.join(dir, `${b.role}.SOUL.md`), b.soul);
  for (const r of res.rooms) fs.writeFileSync(path.join(dir, `room-${r.roomId.slice(0, 8)}.bulletin.md`), r.bulletin + '\n');
  const file = path.join(dir, 'plan.json'); fs.writeFileSync(file, JSON.stringify(res, null, 2)); return file;
}

// ---------- record (after the plan was applied through Hattera)
function record(project, planFile, actor = 'factory-sync') {
  const p = readJson(planFile), h = hattera(), problems = [];
  if (p.project !== project) throw Error(`plan is for ${p.project}, not ${project}`);
  for (const b of p.bots) {
    const live = h.bots.find(x => x.id === b.botId);
    const cur = split(live?.soul || '');
    if (!cur.marked || sha(cur.block) !== b.blockHash) problems.push(`${b.name}: live instructions do not contain the planned factory block yet`);
  }
  for (const r of p.rooms) {
    const live = h.rooms.find(x => x.id === r.roomId), cur = split(live?.bulletin || '');
    if (!cur.marked || sha(cur.block) !== r.blockHash) problems.push(`room ${r.name}: bulletin not applied yet`);
  }
  for (const s of p.skills.filter(s => s.action === 'install' || s.action === 'update')) {
    const f = h.skillFile(s.botId, s.skill), want = path.join(s.source, 'SKILL.md');
    if (!fs.existsSync(f) || sha(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) !== sha(fs.readFileSync(want, 'utf8').replace(/^﻿/, ''))) problems.push(`${s.bot}: skill ${s.skill} not installed at the planned version`);
  }
  if (problems.length) return {recorded: false, problems};
  const backupDir = path.join(path.dirname(DB()), 'backups'); fs.mkdirSync(backupDir, {recursive: true});
  const m = new Memory(DB());
  try {
    const backup = m.backup(path.join(backupDir, `memory-before-sync-${project}-${Date.now()}.sqlite3`)).backup;
    const body = {...p.memory.body, applied_at: new Date().toISOString()};
    const r = m.put(project, 'application', 'factory', body, p.memory.expectedVersion, actor);
    return {recorded: true, version: r.version, backup};
  } finally { m.close(); }
}

function status(project) {
  const m = new Memory(DB()), version = VERSION();
  try {
    return m.projects().filter(p => !project || p.id === project).map(p => {
      let rec = null; try { rec = m.get(p.id, 'application', 'factory').body; } catch {}
      return {project: p.id, source: p.source, factoryVersion: rec?.factory_version || 'legacy (never synced)', current: version,
        upToDate: rec?.factory_version === version, lastApplied: rec?.applied_at || null};
    });
  } finally { m.close(); }
}

module.exports = {split, join, render, plan, record, status, sha, changes};

if (require.main === module) {
  const [cmd, a1, a2] = process.argv.slice(2), args = process.argv.slice(2);
  const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  try {
    if (cmd === 'status') console.log(JSON.stringify(status(a1 && !a1.startsWith('--') ? a1 : undefined), null, 2));
    else if (cmd === 'render') {
      const root = REPO; console.log(join(render(a1, {PROJECT: val('--project'), PROJECT_PATH: val('--path'), FACTORY_ROOT: root, VERSION: VERSION()}), {role: a1, version: VERSION()}, ''));
    } else if (cmd === 'plan') {
      const res = plan(a1, {section: val('--section'), acceptEdits: args.includes('--accept-edits')});
      const file = writePlan(res);
      console.log(`Factory sync plan for ${res.project}: ${res.recordedVersion || 'legacy'} -> ${res.factoryVersion} (section "${res.section}")`);
      for (const b of res.bots) console.log(`  bot   ${b.name.padEnd(18)} ${b.action.padEnd(10)} ${b.before.bytes}B -> ${b.after.bytes}B  [${b.resolvedBy}]${b.note ? `  ${b.note}` : ''}`);
      for (const r of res.rooms) console.log(`  room  ${r.name.padEnd(28)} ${r.action}`);
      for (const s of res.skills) console.log(`  skill ${s.bot.padEnd(18)} ${s.skill.padEnd(28)} ${s.action}`);
      console.log(`  memory: add/update application/factory (expected version ${res.memory.expectedVersion}); no other record is changed`);
      if (res.changelog.length) console.log(`  changes since ${res.recordedVersion || 'legacy'}: ${res.changelog.map(c => c.version).join(', ')}`);
      for (const c of res.conflicts) console.log(`  CONFLICT ${c}`);
      console.log(`  plan: ${file}`);
      process.exit(res.conflicts.length ? 4 : 0);
    } else if (cmd === 'record') {
      const r = record(a1, a2, val('--actor')); console.log(JSON.stringify(r, null, 2)); process.exit(r.recorded ? 0 : 5);
    } else { console.error('usage: factory-sync.cjs status [project] | render <role> --project <id> --path <dir> | plan <project> [--section S] [--accept-edits] | record <project> <plan.json> [--actor name]'); process.exit(2); }
  } catch (e) { console.error(`error: ${e.message}`); process.exit(1); }
}
