// Local memory storage; no inference, automatic event capture, or background process.
const {DatabaseSync} = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const kinds = ['application','feature','slice','decision','execution','lesson','evidence'];
class Memory {
  constructor(file) {
    fs.mkdirSync(path.dirname(path.resolve(file)), {recursive:true});
    this.db = new DatabaseSync(file);
    this.db.exec(`PRAGMA busy_timeout=15000; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, source TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records(project TEXT REFERENCES projects(id),kind TEXT,id TEXT,
        version INTEGER NOT NULL,body TEXT NOT NULL,actor TEXT NOT NULL,updated TEXT NOT NULL,
        PRIMARY KEY(project,kind,id));
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,project TEXT,
        kind TEXT,id TEXT,version INTEGER,body TEXT,actor TEXT,updated TEXT);`);
  }
  close() { this.db.close(); }
  register(id,source) {
    if (!id.trim() || !path.isAbsolute(source) || !fs.statSync(source).isDirectory())
      throw Error('ID and existing absolute source directory required');
    source = fs.realpathSync(source);
    this.db.prepare('INSERT INTO projects VALUES (?,?)').run(id,source);
    return {id,source};
  }
  projects() { return this.db.prepare('SELECT * FROM projects ORDER BY id').all(); }
  put(project,kind,id,body,expected,actor) {
    if (!kinds.includes(kind) || !id.trim() || !actor.trim() ||
        !Number.isSafeInteger(expected) || expected<0 || !body || Array.isArray(body) ||
        typeof body.summary!=='string' || !body.summary.trim())
      throw Error('Valid kind, ID, actor, expected version and object with summary required');
    const encoded=JSON.stringify(body), updated=new Date().toISOString();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.db.prepare('SELECT 1 FROM projects WHERE id=?').get(project)) throw Error('Unknown project');
      const old=this.db.prepare('SELECT version FROM records WHERE project=? AND kind=? AND id=?').get(project,kind,id);
      const current=old?.version ?? 0;
      if (current!==expected) throw Error(`Version conflict: expected ${expected}, current ${current}; reload and reconcile`);
      const args=[project,kind,id,current+1,encoded,actor,updated];
      this.db.prepare(`INSERT INTO records VALUES (?,?,?,?,?,?,?) ON CONFLICT(project,kind,id)
        DO UPDATE SET version=excluded.version,body=excluded.body,actor=excluded.actor,updated=excluded.updated`).run(...args);
      this.db.prepare('INSERT INTO events(project,kind,id,version,body,actor,updated) VALUES (?,?,?,?,?,?,?)').run(...args);
      this.db.exec('COMMIT');
      return {project,kind,id,version:current+1};
    } catch(e) { this.db.exec('ROLLBACK'); throw e; }
  }
  get(project,kind,id) {
    const row=this.db.prepare('SELECT * FROM records WHERE project=? AND kind=? AND id=?').get(project,kind,id);
    if (!row) throw Error('Record not found');
    return {...row,body:JSON.parse(row.body)};
  }
  events(project,after=0,limit=50) {
    if (!Number.isSafeInteger(after) || after<0 || !Number.isSafeInteger(limit) || limit<1 || limit>1000)
      throw Error('after must be nonnegative; limit must be 1..1000');
    return this.db.prepare('SELECT * FROM events WHERE project=? AND seq>? ORDER BY seq LIMIT ?')
      .all(project,after,limit).map(r=>({...r,body:JSON.parse(r.body)}));
  }
  context(project,feature,revision) {
    const app=this.db.prepare('SELECT * FROM projects WHERE id=?').get(project);
    if (!app) throw Error('Unknown project');
    const rows=this.db.prepare('SELECT * FROM records WHERE project=? ORDER BY kind,id').all(project)
      .map(r=>({...r,body:JSON.parse(r.body)}))
      .filter(r=>!feature || r.kind==='application' || (r.kind==='feature' && r.id===feature) || r.body.feature_id===feature)
      .map(r=>({...r,revision_match: !revision || !r.body.revision ? 'unknown' : r.body.revision===revision ? 'match':'stale'}));
    return {project:app,records:rows,warning:'Stored observations, not live status. Reconcile sources and local changes.'};
  }
  backup(file) {
    if (fs.existsSync(file)) throw Error('Backup destination already exists');
    this.db.prepare('VACUUM INTO ?').run(path.resolve(file));
    return {backup:path.resolve(file)};
  }
}
function main(args) {
  let file=path.resolve(__dirname,'../state/memory.sqlite3');
  if (args[0]==='--db') { file=args[1]; args=args.slice(2); }
  const [command,...a]=args;
  if (!command || command==='help') {
    console.log('node factory-memory.cjs [--db PATH] init|projects|register PROJECT ABS_PATH|put PROJECT KIND ID JSON_FILE EXPECTED_VERSION ACTOR|get PROJECT KIND ID|context PROJECT [FEATURE] [REVISION]|events PROJECT [AFTER] [LIMIT]|backup NEW_FILE');
    return;
  }
  const m=new Memory(file);
  try {
    let result;
    switch(command) {
      case 'init': result={database:path.resolve(file),initialized:true}; break;
      case 'projects': result=m.projects(); break;
      case 'register': result=m.register(...a); break;
      case 'put': result=m.put(a[0],a[1],a[2],JSON.parse(fs.readFileSync(a[3],'utf8').replace(/^\uFEFF/,'')),Number(a[4]),a[5]); break;
      case 'get': result=m.get(...a); break;
      case 'context': result=m.context(...a); break;
      case 'events': result=m.events(a[0],Number(a[1]??0),Number(a[2]??50)); break;
      case 'backup': result=m.backup(a[0]); break;
      default: throw Error('Unknown command; use help');
    }
    console.log(JSON.stringify(result,null,2));
  } finally { m.close(); }
}
module.exports={Memory};
if (require.main===module) {
  try { main(process.argv.slice(2)); }
  catch(e) { console.error(JSON.stringify({error:e.message})); process.exitCode=1; }
}
