const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const {check} = require('./factory-gates.cjs');

function repo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gates-'));
  const g = (...a) => { const r = spawnSync('git', a, {cwd: d, encoding: 'utf8'}); if (r.status) throw Error(r.stderr); return r.stdout.trim(); };
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'core.autocrlf', 'false');
  fs.mkdirSync(path.join(d, 'src')); fs.writeFileSync(path.join(d, 'src/a.js'), 'a\n');
  g('add', '.'); g('commit', '-qm', 'base');
  const base = g('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(d, 'src/a.js'), 'a2\n'); fs.writeFileSync(path.join(d, 'src/b.js'), 'b\n');
  g('add', '.'); g('commit', '-qm', 'slice');
  return {d, base, head: g('rev-parse', 'HEAD'), g};
}
const write = (d, ev) => { const p = path.join(d, 'evidence.json'); fs.writeFileSync(p, JSON.stringify(ev)); return p; };

test('all gates pass on honest evidence with --run', () => {
  const {d, base, head} = repo();
  const p = write(d, {baseline: base, revision: head, expectedSurface: ['src/'], changedFiles: ['src/a.js', 'src/b.js'],
    checks: [{command: 'node -e "process.exit(0)"', exitCode: 0}]});
  const r = check(d, p, {run: true});
  assert.equal(r.pass, true, r.findings.join('\n'));
});

test('without --run tests_pass is not-run, so overall fails', () => {
  const {d, base, head} = repo();
  const p = write(d, {baseline: base, revision: head, changedFiles: ['src/a.js', 'src/b.js'], checks: [{command: 'x', exitCode: 0}]});
  const r = check(d, p, {});
  assert.equal(r.gates.tests_pass, 'not-run');
  assert.equal(r.pass, false);
});

test('detects unclaimed and phantom files, and surface violations', () => {
  const {d, base, head} = repo();
  const p = write(d, {baseline: base, revision: head, expectedSurface: ['src/a.js'], changedFiles: ['src/a.js', 'src/c.js'],
    checks: [{command: 'node -e "0"', exitCode: 0}]});
  const r = check(d, p, {run: true});
  assert.equal(r.gates.diff_matches_claims, 'fail');
  const f = r.findings.join('\n');
  assert.match(f, /changed but not claimed: src\/b\.js/);
  assert.match(f, /claimed but not changed: src\/c\.js/);
  assert.match(f, /outside expected surface without explanation: src\/b\.js/);
});

test('dirty tree, wrong revision and failing command fail their gates', () => {
  const {d, base} = repo();
  fs.writeFileSync(path.join(d, 'src/a.js'), 'dirty\n');
  const p = write(d, {baseline: base, revision: base, changedFiles: ['src/a.js', 'src/b.js'],
    checks: [{command: 'node -e "process.exit(3)"', exitCode: 0}]});
  const r = check(d, p, {run: true});
  assert.equal(r.gates.artifacts_exist, 'fail');
  assert.equal(r.gates.tests_pass, 'fail');
  const f = r.findings.join('\n');
  assert.match(f, /not clean/); assert.match(f, /is not HEAD/); assert.match(f, /claimed exit 0, actual 3/);
});

test('missing screenshot fails artifacts_exist', () => {
  const {d, base, head} = repo();
  const p = write(d, {baseline: base, revision: head, changedFiles: ['src/a.js', 'src/b.js'],
    screenshots: [{path: 'shots/x.png'}], checks: [{command: 'node -e "0"', exitCode: 0}]});
  const r = check(d, p, {run: true});
  assert.match(r.findings.join('\n'), /screenshot missing/);
});


// Synthetic image/metadata fixtures: no claim that these are rendered product UI.
const hash = b => require('node:crypto').createHash('sha256').update(b).digest('hex');
function uiFixture() {
  const r=repo(),out=fs.mkdtempSync(path.join(os.tmpdir(),'ui-evidence-'));
  const req={schema:'factory-ui-requirements/1',specVersion:'1',states:[{id:'default',description:'Ready'},{id:'error',description:'Failure'}],viewports:[{id:'small',width:1,height:1},{id:'large',width:2,height:1}]};
  const spec=()=> '# Synthetic spec\n<!-- factory-ui-requirements:start -->\n'+String.fromCharCode(96).repeat(3)+'json\n'+JSON.stringify(req)+'\n'+String.fromCharCode(96).repeat(3)+'\n<!-- factory-ui-requirements:end -->\n';
  const specPath=path.join(out,'spec.md');fs.writeFileSync(specPath,spec());
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  const shots=[];for(const state of req.states)for(const port of req.viewports){const file=path.join(out,state.id+'-'+port.id+'.png');fs.writeFileSync(file,bytes);shots.push({state:state.id,viewport:port.id,path:file,revision:r.head,sha256:hash(bytes),pixelWidth:port.width,pixelHeight:port.height});}
  const report=path.join(out,'review.md');fs.writeFileSync(report,'Synthetic independent review attestation');
  const ev={baseline:r.base,revision:r.head,changedFiles:['src/a.js','src/b.js'],checks:[{command:'node -e "process.exit(0)"',exitCode:0}],specVersion:'1',screenshots:shots,ui:{specPath,specSha256:hash(spec()),capture:{status:'available'},review:{result:'clean',revision:r.head,reviewer:'independent-fixture',path:report}}};
  const bind=()=>{const triples=shots.map(s=>[s.state,s.viewport,s.sha256.toLowerCase()]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:a[1]<b[1]?-1:a[1]>b[1]?1:0);ev.ui.review.screenshotSetSha256=hash(JSON.stringify(triples));};bind();
  return {...r,out,req,spec,ev,bind,run(){return check(r.d,write(out,ev),{run:true,requireScreenshots:true});}};
}
test('UI full four-cell matrix clean; existing gates still enforce revision, dirt and commands',()=>{const f=uiFixture();let r=f.run();assert.equal(r.pass,true,JSON.stringify(r));assert.equal(r.uiEvidence.status,'clean');assert.equal(r.uiEvidence.required.length,4);assert.deepEqual(r.uiEvidence.missing,[]);f.ev.checks[0].command='node -e "process.exit(3)"';assert.equal(f.run().gates.tests_pass,'fail');fs.writeFileSync(path.join(f.d,'src/a.js'),'dirty');assert.equal(f.run().gates.artifacts_exist,'fail');f.ev.revision=f.base;assert.equal(f.run().uiEvidence.status,'incomplete');});
const cases=[
 ['unknown cell',f=>f.ev.screenshots[0].state='absent','incomplete'],
 ['empty report',f=>fs.writeFileSync(f.ev.ui.review.path,''),'incomplete'],
 ['invalid capture',f=>f.ev.ui.capture.status='maybe','incomplete'],
 ['unclosed block',f=>{const t=f.spec().replace('<!-- factory-ui-requirements:end -->','');fs.writeFileSync(f.ev.ui.specPath,t);f.ev.ui.specSha256=hash(t);},'incomplete'],
 ['missing cell',f=>f.ev.screenshots.pop(),'incomplete'],
 ['duplicate cell',f=>f.ev.screenshots.push({...f.ev.screenshots[0]}),'incomplete'],
 ['physical alias',f=>{const a=f.ev.screenshots[0].path,b=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'ui-alias-')),'linked');fs.symlinkSync(f.out,b,'junction');f.ev.screenshots[1].path=path.join(b,path.basename(a));},'incomplete'],
 ['hardlink alias',f=>{const b=path.join(f.out,'hardlink.png');fs.linkSync(f.ev.screenshots[0].path,b);f.ev.screenshots[1].path=b;},'incomplete'],
 ['wrong revision',f=>f.ev.screenshots[0].revision=f.base,'incomplete'],
 ['wrong hash',f=>f.ev.screenshots[0].sha256='0'.repeat(64),'incomplete'],
 ['missing image',f=>fs.unlinkSync(f.ev.screenshots[0].path),'incomplete'],
 ['empty image',f=>fs.writeFileSync(f.ev.screenshots[0].path,''),'incomplete'],
 ['nonimage',f=>fs.writeFileSync(f.ev.screenshots[0].path,'hello'),'incomplete'],
 ['missing block',f=>{fs.writeFileSync(f.ev.ui.specPath,'no matrix');f.ev.ui.specSha256=hash('no matrix');},'incomplete'],
 ['duplicate block',f=>{const s=f.spec()+f.spec();fs.writeFileSync(f.ev.ui.specPath,s);f.ev.ui.specSha256=hash(s);},'incomplete'],
 ['malformed JSON',f=>{const s=f.spec().replace('"schema"','broken');fs.writeFileSync(f.ev.ui.specPath,s);f.ev.ui.specSha256=hash(s);},'incomplete'],
 ['empty states',f=>f.req.states=[],'incomplete'],
 ['duplicate IDs',f=>f.req.states.push(f.req.states[0]),'incomplete'],
 ['wrong version',f=>f.ev.specVersion='2','incomplete'],
 ['substantive spec change',f=>fs.appendFileSync(f.ev.ui.specPath,'changed'),'incomplete'],
 ['unavailable no captures no review',f=>{f.ev.ui.capture={status:'unavailable',reason:'No renderer mounted'};f.ev.screenshots=[];delete f.ev.ui.review;},'unrendered'],
 ['unavailable partial',f=>{f.ev.ui.capture={status:'unavailable',reason:'Renderer lost'};f.ev.screenshots.pop();},'incomplete'],
 ['unavailable without reason',f=>{f.ev.ui.capture={status:'unavailable'};f.ev.screenshots=[];},'incomplete'],
 ['absent review',f=>delete f.ev.ui.review,'incomplete'],
 ['stale review',f=>f.ev.ui.review.revision=f.base,'incomplete'],
 ['open review',f=>f.ev.ui.review.result='open','open'],
 ['malformed screenshots',f=>f.ev.screenshots={},'incomplete'],
 ['null screenshot',f=>f.ev.screenshots=[null],'incomplete'],
 ['malformed review',f=>f.ev.ui.review=[],'incomplete'],
 ['wrong declared geometry',f=>f.ev.screenshots[0].pixelWidth=99,'incomplete'],
 ['replacement invalidates review',f=>{const s=f.ev.screenshots[0];fs.appendFileSync(s.path,'new bytes');s.sha256=hash(fs.readFileSync(s.path));},'incomplete'],
];
for(const [name,change,status] of cases)test('UI '+name,()=>{const f=uiFixture();change(f);if(['empty states','duplicate IDs'].includes(name)){fs.writeFileSync(f.ev.ui.specPath,f.spec());f.ev.ui.specSha256=hash(f.spec());}const r=f.run();assert.equal(r.uiEvidence.status,status,JSON.stringify(r));assert.equal(r.gates.ui_coverage,'fail');assert.equal(r.pass,false);if(name==='missing cell')assert.deepEqual(r.uiEvidence.missing,[{state:'error',viewport:'large'}]);assert.ok(r.uiEvidence.reasons.length);});
test('UI normalized BOM/CRLF and declared DPR/fullPage are supported',()=>{const f=uiFixture();f.req.viewports[0].deviceScaleFactor=2;const text=f.spec();f.ev.ui.specSha256=hash(text);fs.writeFileSync(f.ev.ui.specPath,'\uFEFF'+text.replace(/\n/g,'\r\n'));for(const s of f.ev.screenshots.filter(s=>s.viewport==='small')){s.pixelWidth=2;s.pixelHeight=4;s.fullPage=true;}assert.equal(f.run().uiEvidence.status,'clean');fs.writeFileSync(f.ev.ui.specPath,Buffer.from([255,254,255]));assert.equal(f.run().uiEvidence.status,'incomplete');});
test('UI metadata without flag is advisory, legacy nonUI remains permitted, legacy UI fails',()=>{const f=uiFixture();const file=write(f.out,f.ev),r=check(f.d,file,{run:true});assert.equal(r.pass,true);assert.ok(r.findings.some(x=>x.includes('UI_EVIDENCE_NOT_ENFORCED')));delete f.ev.ui;assert.equal(f.run().uiEvidence.status,'incomplete');assert.equal(check(f.d,write(f.out,f.ev),{run:true}).pass,true);});
test('UI CLI plain and JSON exits preserve 0/1/2 contract',()=>{const f=uiFixture(),cli=path.join(__dirname,'factory-gates.cjs');const args=['check',f.d,write(f.out,f.ev),'--run','--ui'];let r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/UI EVIDENCE: clean/);f.ev.ui.review.result='open';write(f.out,f.ev);r=spawnSync(process.execPath,[cli,...args,'--json'],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stdout).uiEvidence.status,'open');assert.equal(spawnSync(process.execPath,[cli,'wrong']).status,2);});
