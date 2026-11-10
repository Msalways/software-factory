const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {spawn}=require('node:child_process');
const {Memory}=require('./factory-memory.cjs');
function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'factory-memory-'));
  const handles=[];
  const open=f=>{const m=new Memory(f);handles.push(m);return m;};
  t.after(()=>{
    for(const m of handles.reverse()) m.close();
    if(path.dirname(path.resolve(dir))!==path.resolve(os.tmpdir()) || !path.basename(dir).startsWith('factory-memory-'))
      throw Error('Unsafe test cleanup path');
    fs.rmSync(dir,{recursive:true,force:true});
  });
  const file=path.join(dir,'memory.sqlite3'),m=open(file);
  m.register('app',dir); return {dir,file,m,open};
}
test('fresh process resumes stored feature; scoped context and revision freshness',t=>{
  const {m,file}=fixture(t);
  m.put('app','application','overview',{summary:'Architecture'},0,'Atlas');
  m.put('app','feature','f1',{summary:'Checkout',revision:'abc'},0,'Atlas');
  m.put('app','slice','s1',{summary:'Blocked on API',feature_id:'f1',revision:'old',next_action:'Confirm contract'},0,'Forge');
  m.put('app','feature','f2',{summary:'Unrelated'},0,'Atlas');
  const run=spawnSync(process.execPath,[path.join(__dirname,'factory-memory.cjs'),'--db',file,'context','app','f1','abc'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const rows=JSON.parse(run.stdout).records;
  assert.equal(rows.length,3);
  assert.equal(rows.find(r=>r.id==='s1').revision_match,'stale');
  assert.equal(rows.find(r=>r.id==='f1').revision_match,'match');
  assert.equal(rows.find(r=>r.id==='s1').body.next_action,'Confirm contract');
});
test('stale session cannot overwrite newer state or add phantom history',t=>{
  const {m,file,open}=fixture(t),other=open(file);
  m.put('app','feature','f',{summary:'Planned'},0,'Atlas');
  other.put('app','feature','f',{summary:'Running'},1,'Forge');
  assert.throws(()=>m.put('app','feature','f',{summary:'Stale'},1,'Atlas'),/Version conflict/);
  assert.equal(m.get('app','feature','f').body.summary,'Running');
  assert.deepEqual(m.events('app').map(r=>r.version),[1,2]);
});
test('failed history write rolls back state atomically',t=>{
  const {m}=fixture(t);
  m.db.exec("CREATE TRIGGER fail_event BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'injected failure'); END;");
  assert.throws(()=>m.put('app','feature','f',{summary:'Never committed'},0,'Atlas'),/injected failure/);
  assert.throws(()=>m.get('app','feature','f'),/not found/);
  assert.equal(m.events('app').length,0);
});
test('project isolation and consistent backup restore',t=>{
  const {m,dir,open}=fixture(t);
  m.register('other',dir);
  m.put('app','feature','f',{summary:'First'},0,'Atlas');
  m.put('other','feature','f',{summary:'Second'},0,'Atlas');
  assert.equal(m.context('app').records.length,1);
  assert.equal(m.events('app').length,1);
  const target=path.join(dir,'backup.sqlite3');m.backup(target);
  const restored=open(target);
  assert.equal(restored.get('other','feature','f').body.summary,'Second');
  assert.throws(()=>m.backup(target),/already exists/);
});
test('two writer processes competing for one version yield one commit',async t=>{
  const {m,file,dir}=fixture(t);
  m.put('app','feature','f',{summary:'Planned'},0,'Atlas');
  const payload=path.join(dir,'payload.json');fs.writeFileSync(payload,JSON.stringify({summary:'Updated'}));
  function writer(actor) {
    return new Promise((resolve,reject)=>{
      const p=spawn(process.execPath,[path.join(__dirname,'factory-memory.cjs'),'--db',file,'put','app','feature','f',payload,'1',actor]);
      let err='';p.stderr.on('data',b=>err+=b);p.on('error',reject);
      p.on('close',code=>resolve({code,err}));
    });
  }
  const result=await Promise.all([writer('session-a'),writer('session-b')]);
  assert.deepEqual(result.map(r=>r.code).sort(),[0,1]);
  assert.match(result.find(r=>r.code===1).err,/Version conflict/);
  assert.equal(m.get('app','feature','f').version,2);
  assert.equal(m.events('app').length,2);
});
