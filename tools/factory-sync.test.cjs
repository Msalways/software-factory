// Tests for factory-sync: legacy adoption, marked update, conflict on hand edits, record verification.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fsync-'));
process.env.FACTORY_HATTERA_HOME = path.join(tmp, 'home');
process.env.FACTORY_MEMORY_DB = path.join(tmp, 'mem', 'memory.sqlite3');
process.env.FACTORY_SYNC_DIR = path.join(tmp, 'sync');
const sync = require('./factory-sync.cjs');
const {Memory} = require('./factory-memory.cjs');

const home = process.env.FACTORY_HATTERA_HOME;
const LEGACY = 'You are Demo Lead. Project facts: the app is at C:/demo. Decided 2026-11-01: ship weekly.';
function writeBots(b) { fs.writeFileSync(path.join(home, 'bots.json'), JSON.stringify(b)); }
function bots() { return JSON.parse(fs.readFileSync(path.join(home, 'bots.json'), 'utf8')); }
function setup() {
  fs.rmSync(home, {recursive: true, force: true});
  const own = path.join(home, 'workspaces', 'b1', 'skills', 'own-skill');
  fs.mkdirSync(own, {recursive: true});
  fs.writeFileSync(path.join(own, 'SKILL.md'), '---\nname: own-skill\ndescription: x\n---\n');
  writeBots([
    {id: 'b1', name: 'Demo Lead', section: 'Demo', soul: LEGACY},
    {id: 'b2', name: 'Demo Builder', section: 'Demo', soul: 'You build Demo.'},
    {id: 'b3', name: 'Demo Verifier', section: 'Demo', soul: 'You verify Demo.'},
  ]);
  fs.writeFileSync(path.join(home, 'groups.json'), JSON.stringify([{id: 'r1', name: 'Demo / Overview', section: 'Demo', bulletin: 'Project demo. Parallel work authorized.'}]));
}
// What Hattera's native tools do once the user approves the plan.
function applyPlan(p) {
  writeBots(bots().map(b => { const x = p.bots.find(i => i.botId === b.id); return x ? {...b, soul: x.soul} : b; }));
  const rooms = JSON.parse(fs.readFileSync(path.join(home, 'groups.json'), 'utf8'));
  fs.writeFileSync(path.join(home, 'groups.json'), JSON.stringify(rooms.map(r => { const x = p.rooms.find(i => i.roomId === r.id); return x ? {...r, bulletin: x.bulletin} : r; })));
  for (const s of p.skills.filter(s => s.action === 'install' || s.action === 'update')) {
    const d = path.join(home, 'workspaces', s.botId, 'skills', s.skill); fs.mkdirSync(d, {recursive: true});
    fs.copyFileSync(path.join(s.source, 'SKILL.md'), path.join(d, 'SKILL.md'));
  }
}

const m = new Memory(process.env.FACTORY_MEMORY_DB);
const src = path.join(tmp, 'demo-src'); fs.mkdirSync(src); m.register('demo', src);
m.put('demo', 'application', 'native-setup', {summary: 'setup', team: 'Demo', lead_id: 'b1', builder_id: 'b2', verifier_id: 'b3'}, 0, 't');
m.put('demo', 'feature', 'f1', {summary: 'project work'}, 0, 't');
m.close();

test('legacy project: adopts old instructions verbatim as project notes', () => {
  setup();
  assert.equal(sync.status('demo')[0].factoryVersion, 'legacy (never synced)');
  const p = sync.plan('demo');
  assert.deepEqual(p.conflicts, []);
  assert.equal(p.legacy, true);
  const lead = p.bots.find(b => b.role === 'lead');
  assert.equal(lead.action, 'adopt');
  assert.equal(lead.resolvedBy, 'native-setup record');
  assert.ok(lead.soul.startsWith('<!-- factory:begin role=lead'));
  assert.ok(lead.soul.includes(LEGACY), 'old text kept verbatim');
  assert.ok(lead.soul.includes(src.split(path.sep).join('/')));
  assert.ok(p.rooms[0].bulletin.endsWith('Project demo. Parallel work authorized.'));
  assert.ok(p.skills.some(s => s.skill === 'own-skill' && s.action.startsWith('keep')));
  assert.ok(p.skills.some(s => s.skill === 'factory-design-to-delivery' && s.action === 'install'));
});

test('record refuses until applied, then writes only application/factory', () => {
  setup();
  const p = sync.plan('demo');
  const f = path.join(tmp, 'plan.json'); fs.writeFileSync(f, JSON.stringify(p));
  const r0 = sync.record('demo', f);
  assert.equal(r0.recorded, false); assert.ok(r0.problems.length >= 3);
  applyPlan(p);
  const r1 = sync.record('demo', f);
  assert.equal(r1.recorded, true); assert.ok(fs.existsSync(r1.backup));
  const mm = new Memory(process.env.FACTORY_MEMORY_DB);
  try {
    assert.equal(mm.get('demo', 'feature', 'f1').version, 1, 'project records untouched');
    assert.equal(mm.get('demo', 'application', 'native-setup').version, 1);
    assert.equal(mm.get('demo', 'application', 'factory').body.previous_version, 'legacy');
  } finally { mm.close(); }
  assert.equal(sync.status('demo')[0].upToDate, true);
});

test('second sync: up to date, notes kept once, hand edits are a conflict', () => {
  const p = sync.plan('demo');
  assert.deepEqual(p.conflicts, []);
  assert.ok(p.bots.every(b => b.action === 'up-to-date'));
  const lead = p.bots.find(b => b.role === 'lead');
  assert.equal(lead.soul.split(LEGACY).length, 2, 'notes not duplicated');
  assert.equal(lead.resolvedBy, 'factory record');
  writeBots(bots().map(b => b.id === 'b2' ? {...b, soul: b.soul.replace('<!-- factory:end -->', 'Extra hand rule.\n<!-- factory:end -->')} : b));
  const q = sync.plan('demo');
  assert.ok(q.conflicts.some(c => c.includes('Demo Builder')));
  assert.ok(q.bots.find(b => b.role === 'builder').handEditedBlock.includes('Extra hand rule.'));
  assert.deepEqual(sync.plan('demo', {acceptEdits: true}).conflicts, []);
});

test('notes the project adds after the block survive an update', () => {
  writeBots(bots().map(b => b.id === 'b3' ? {...b, soul: b.soul + '\nNew project fact: staging is at demo-stg.'} : b));
  const v = sync.plan('demo').bots.find(b => b.role === 'verifier');
  assert.ok(v.soul.includes('New project fact: staging is at demo-stg.'));
  assert.ok(v.soul.includes('You verify Demo.'));
});

test('mentor release plans role and room updates without changing live fixtures', () => {
  setup();
  const before = JSON.stringify(bots());
  const p = sync.plan('demo');
  assert.equal(p.factoryVersion, '1.2.0');
  assert.ok(p.bots.find(b => b.role === 'lead').soul.includes('slice-brief.md'));
  assert.ok(p.bots.find(b => b.role === 'builder').soul.includes('same check failed twice'));
  assert.ok(p.rooms[0].bulletin.includes('status, decisions and blockers only'));
  assert.equal(JSON.stringify(bots()), before, 'plan must not apply settings');
  assert.ok(fs.readFileSync(path.join(__dirname,'../shared/templates/slice-brief.md'),'utf8').includes('Stuck protocol'));
});
