const {test,beforeEach,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'provider-sources-')),home=path.join(root,'home'),state=path.join(root,'state');process.env.FACTORY_HATTERA_HOME=home;process.env.FACTORY_STATE_DIR=state;
const {readCurrentSources}=require('./factory-route.cjs'),{fingerprint:H}=require('./provider-snapshot.cjs'),defaults=require('./route-defaults.json');
const time=Date.parse('2026-11-12T11:15:00Z'),key='fixture-engine/small',project='fixture-project',sessionId='fixture-session';
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v));};
const read=()=>readCurrentSources({project,sessionId,now:time});const stat=p=>{const s=fs.statSync(p);return {mtimeMs:s.mtimeMs,size:s.size};};
function capture(){const driver=JSON.parse(fs.readFileSync(path.join(home,'config.json'))).instances['fixture-engine'].driverKind;const config={stat:stat(path.join(home,'config.json')),instances:[{id:'fixture-engine',driver,enabled:true}],defaultSelection:{key,effort:null},newBotSelection:null},bots={stat:stat(path.join(home,'bots.json')),bots:[{id:'fixture-bot',section:'Fixture',selection:{key,effort:null},tasks:[]}]};const f=path.join(home,'providers/engine-models/fixture-engine.json'),cat=JSON.parse(fs.readFileSync(f)),native={schema:1,config,bots,catalogs:[{id:'fixture-engine',driver,file:{state:'present',value:stat(f)},catalog:{state:'present',value:{default:cat.default,options:cat.options.map(({label,...o})=>o)}}}]};write(path.join(state,'route-identities.json'),{schema:1,sessionId,capturedAt:'2026-11-12T11:00:00Z',validUntil:'2026-11-12T12:00:00Z',nativeFingerprint:H(native),records:{[key]:{providerId:'fixture-vendor',routeScope:'fixture-account/api',sourceRef:'fixtures/operator.json#/small'}}});return native;}
beforeEach(()=>{fs.rmSync(root,{recursive:true,force:true});fs.mkdirSync(root);write(path.join(home,'config.json'),{instances:{'fixture-engine':{driverKind:'fixture-driver'}},defaultModelSelection:{instanceId:'fixture-engine',model:'small'}});write(path.join(home,'bots.json'),[{id:'fixture-bot',section:'Fixture',modelSelection:{instanceId:'fixture-engine',model:'small'}}]);write(path.join(home,'providers/engine-models/fixture-engine.json'),{default:'small',options:[{id:'small',label:'Small',contextWindow:32000}]});capture();});after(()=>fs.rmSync(root,{recursive:true,force:true}));
test('exact nine preimages, independently current hashes and no authorization from capture',()=>{const s=read();assert.equal(Object.keys(s.preimages).length,9);for(const [k,v] of Object.entries(s.preimages))assert.equal(s.currentFingerprints[k],H(v));assert.deepEqual(s.preimages.policy,{schema:1,project,source:'missing',allowlist:[],snapshot:{maxAgeMinutes:60,catalogStaleHours:24},...defaults,engines:{},models:{},knownExceptions:[]});assert.deepEqual(s.preimages.evidence,{schema:1,source:{state:'missing',value:null}});assert.deepEqual(s.preimages.decisions,{schema:1,project,policySource:'missing',modelDecisions:{},premiumApprovals:{}});assert.deepEqual(s.preimages.history,{schema:1,project,source:{state:'missing',value:null}});assert.deepEqual(s.preimages.limits,{schema:1,source:'missing',events:[]});assert.deepEqual(s.preimages.opencode,{schema:1,project,preference:{state:'missing',value:null},advisory:{status:'ignored-for-project-routing',discovery:{state:'missing',value:null}}});assert.equal(s.inputs.nativeFingerprint,H(s.inputs.nativeBindingPreimage));assert.deepEqual(s.inputs.allowlist,[]);assert.equal(s.revalidate(),true);});
function bytes(dir=root){const out={};for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())Object.assign(out,bytes(p));else out[p]=fs.readFileSync(p).toString('base64');}return out;}
test('reader never writes and keeps complete raw options',()=>{const before=bytes(),s=read();assert.deepEqual(bytes(),before);assert.equal(s.inputs.engines[0].options[0].label,'Small');assert.equal(s.routeScopes[key].routeScope,'fixture-account/api');});
for(const [name,change] of [['missing',()=>fs.unlinkSync(path.join(state,'route-identities.json'))],['expired',c=>c.validUntil='2026-11-12T11:15:00Z'],['future',c=>c.capturedAt='2026-11-12T11:16:00Z'],['wrong session',c=>c.sessionId='other'],['wrong binding',c=>c.nativeFingerprint='0'.repeat(64)],['too long',c=>c.validUntil='2026-11-13T12:00:00Z'],['missing route',c=>c.records={}],['foreign route',c=>c.records['elsewhere/small']=c.records[key]],['extra field',c=>c.extra=true]])test('capture rejects '+name+' without writes',()=>{const f=path.join(state,'route-identities.json'),c=JSON.parse(fs.readFileSync(f));change(c);if(name!=='missing')write(f,c);const before=bytes();assert.throws(read);assert.deepEqual(bytes(),before);});
for(const [name,text] of [['malformed','{'],['duplicate','{"schema":1,"schema":1,"records":[]}'],['escaped duplicate','{"schema":1,"sch\\u0065ma":1}'],['prototype','{"__proto__":{}}']])test('strict optional JSON rejects '+name,()=>{write(path.join(state,'provider-evidence.json'),text);const before=bytes();assert.throws(read);assert.deepEqual(bytes(),before);});
test('required config and bots cannot be absent/corrupt',()=>{write(path.join(home,'bots.json'),'{');assert.throws(read);fs.unlinkSync(path.join(home,'config.json'));assert.throws(read);});
test('JSONL preserves ordered duplicates and expired events; invalid line fails closed',()=>{const e={at:'2026-11-12T10:00:00Z',engine:'fixture-engine',model:null,scope:'engine',signal:'limit',resetAt:'2026-11-12T10:30:00Z',resetHint:null,cooldownHours:null};write(path.join(state,'limit-events.jsonl'),JSON.stringify(e)+'\n'+JSON.stringify(e)+'\n');assert.deepEqual(read().preimages.limits.events,[e,e]);fs.appendFileSync(path.join(state,'limit-events.jsonl'),'{oops');assert.throws(read);});
test('re-stat rejects a changed source and new optional sources',()=>{const s=read();write(path.join(state,'route-policy.json'),{});assert.throws(()=>s.revalidate());});
test('native rewrites invalidate until attestation renewed',()=>{const a=read(),f=path.join(home,'config.json');fs.appendFileSync(f,' ');assert.throws(read);capture();const b=read();assert.notEqual(a.currentFingerprints.config,b.currentFingerprints.config);assert.equal(a.currentFingerprints.bots,b.currentFingerprints.bots);});
test('capture renewal changes config hash only, without granting authorization',()=>{const a=read(),f=path.join(state,'route-identities.json'),c=JSON.parse(fs.readFileSync(f));c.capturedAt='2026-11-12T11:01:00Z';write(f,c);const b=read();for(const k of Object.keys(a.currentFingerprints))assert.equal(a.currentFingerprints[k]===b.currentFingerprints[k],k!=='config');});
test('foreign project decisions never enter selected project hashes',()=>{const f=path.join(state,'route-policy.json');write(f,{projects:{other:{modelDecisions:{}}}});const a=read();write(f,{projects:{other:{modelDecisions:{'foreign/model':{tier:'premium'}}}}});assert.deepEqual(read().currentFingerprints,a.currentFingerprints);});
test('history retains tombstones, never fills missing generations',()=>{const h={schema:1,engines:{'fixture-engine':{lastKeys:[key],retirementGeneration:{[key]:0,'fixture-engine/retired':2}}}};write(path.join(state,'project-catalog-history',project+'.json'),h);const s=read();assert.deepEqual(s.inputs.history,h);assert.equal(s.inputs.engines[0].retirementGenerations['fixture-engine/retired'],2);});
test('session/project traversal rejected; expiry cannot be bypassed by equal hashes',()=>{assert.throws(()=>readCurrentSources({project:'../elsewhere',sessionId,now:time}));assert.throws(()=>readCurrentSources({project,sessionId:'',now:time}));assert.throws(()=>readCurrentSources({project,sessionId,now:Date.parse('2026-11-12T12:00:00Z')}));});
test('revalidation rejects expiry even with unchanged files',()=>{const s=read();assert.throws(()=>s.revalidate(Date.parse('2026-11-12T12:00:00Z')));});
test('stored observations are validated rather than ignored',()=>{for(const v of [{schema:2,records:[]},{schema:1,records:[{key:'foreign/model'}]}]){write(path.join(state,'provider-evidence.json'),v);assert.throws(read);}});
test('empty present optional sources have distinct hashes from missing',()=>{const a=read();write(path.join(state,'provider-evidence.json'),{schema:1,records:[]});write(path.join(state,'limit-events.jsonl'),'');const b=read();assert.notEqual(a.currentFingerprints.evidence,b.currentFingerprints.evidence);assert.notEqual(a.currentFingerprints.limits,b.currentFingerprints.limits);assert.deepEqual(b.preimages.evidence.source.value,{schema:1,records:[]});});
test('policy model tier stays advisory while project allowlist remains exact',()=>{write(path.join(state,'route-policy.json'),{models:{[key]:{tier:'premium',note:'legacy'}},projects:{[project]:{allowlist:[key]}}});const s=read();assert.deepEqual(s.inputs.allowlist,[key]);assert.deepEqual(s.preimages.policy.models,{[key]:{note:'legacy'}});assert.deepEqual(s.inputs.configured,[key]);});
test('encoded traversal identities are rejected before any write',()=>{const f=path.join(state,'route-identities.json'),c=JSON.parse(fs.readFileSync(f));c.records['fixture-engine/%2e%2e/x']=c.records[key];write(f,c);assert.throws(read);});
test('config bots and catalog preimages match independent native projections',()=>{const native=capture(),s=read(),c=JSON.parse(fs.readFileSync(path.join(state,'route-identities.json')));assert.deepEqual(s.preimages.config,{schema:1,native:native.config,sessionId,routeIdentities:{state:'present',value:c}});assert.deepEqual(s.preimages.bots,{schema:1,native:native.bots});const expected=structuredClone(native.catalogs);expected[0].catalog.value.options[0].label='Small';assert.deepEqual(s.preimages.catalogs,{schema:1,engines:expected});});
test('malformed native selections never become a synthetic undefined model',()=>{write(path.join(home,'config.json'),{instances:{'fixture-engine':{driver:'fixture-driver'}},defaultModelSelection:{instanceId:'fixture-engine'}});assert.throws(read);});
test('null/array project collection fails closed',()=>{write(path.join(state,'route-policy.json'),{projects:[]});assert.throws(read);});
test('present JSON null is corruption, never a missing optional source',()=>{for(const name of ['route-policy.json','provider-evidence.json','opencode-discovery.json']){write(path.join(state,name),'null');assert.throws(read,name);fs.unlinkSync(path.join(state,name));}});
for(const [name,lastKeys,generations] of [
 ['foreign engine lastKey',['foreign/ghost'],{[key]:0}],
 ['own engine missing generation',[key,'fixture-engine/missing'],{[key]:0}],
 ['negative generation',[key],{[key]:-1}],
 ['fractional generation',[key],{[key]:0.5}],
 ['duplicate lastKeys',[key,key],{[key]:0}],
 ['foreign generation key',[key],{[key]:0,'foreign/ghost':1}],
])test('history fails closed for '+name+' without writes',()=>{const h={schema:1,engines:{'fixture-engine':{lastKeys,retirementGeneration:generations}}};write(path.join(state,'project-catalog-history',project+'.json'),h);const before=bytes();assert.throws(read,/history|generation|identity/);assert.deepEqual(bytes(),before);});
test('valid complete current and tombstone history is retained without mutation',()=>{const h={schema:1,engines:{'fixture-engine':{lastKeys:[key],retirementGeneration:{[key]:3,'fixture-engine/retired':2},retained:{note:'retain unrelated history metadata'}}}};const f=path.join(state,'project-catalog-history',project+'.json');write(f,h);const before=bytes(),s=read();assert.deepEqual(s.inputs.history,h);assert.deepEqual(s.preimages.history.source.value,h);assert.deepEqual(bytes(),before);assert.equal(s.revalidate(time),true);});
const {spawnSync}=require('node:child_process');
function commandSetup(p=project,driver='fixture-driver'){
  if(driver!=='fixture-driver'){const f=path.join(home,'config.json'),c=JSON.parse(fs.readFileSync(f));c.instances['fixture-engine'].driverKind=driver;write(f,c);capture();}
  const at=Date.now(),f=path.join(state,'route-identities.json'),c=JSON.parse(fs.readFileSync(f));c.capturedAt=new Date(at-1000).toISOString();c.validUntil=new Date(at+30*60000).toISOString();write(f,c);
  write(path.join(state,'project-catalog-history',p+'.json'),{schema:1,engines:{'fixture-engine':{lastKeys:[key],retirementGeneration:{[key]:0}}}});
  const policy=fs.existsSync(path.join(state,'route-policy.json'))?JSON.parse(fs.readFileSync(path.join(state,'route-policy.json'))):{unrelated:{keep:true}};policy.projects??={};policy.projects[p]??={allowlist:[key],marker:'keep-project'};write(path.join(state,'route-policy.json'),policy);
}
function resolution(p=project){const s=readCurrentSources({project:p,sessionId,now:Date.now()}),e=s.inputs.engines[0];return require('./provider-snapshot.cjs').resolveModelEvidence({key,modelOption:e.options[0],engine:e,routeScope:s.routeScopes[key].routeScope,evidence:e.evidence,decision:null,preference:null,retired:{isRetired:false,retirementGeneration:0},now:Date.now()});}
function record(kind='model-decision',p=project){const r=resolution(p);return {schema:1,kind,value:kind==='model-decision'?{key,tier:'worker',preferenceRank:null,confirmedBy:'user',confirmedAt:new Date().toISOString(),sourceRef:'fixtures/user-answer.json',modelFingerprint:r.modelFingerprint,catalogFingerprint:r.catalogFingerprint,retirementGeneration:0,scope:'model'}:kind==='premium-approval'?{slice:'slice-1',keys:[key],profileHash:H({slice:'slice-1'}),approvedBy:'user',approvedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),sourceRef:'fixtures/user-approval.json'}:{chosen:[key],offered:[key],askedAt:new Date().toISOString(),confirmedBy:'user',sourceRef:'fixtures/user-preference.json',catalogFingerprint:r.catalogFingerprint,scope:'catalog'}};}
function evidence(p=project){return {schema:1,records:[{key,providerId:'fixture-vendor',routeScope:'fixture-account/api',field:'toolUse',value:true,kind:'provider-catalog',status:'observed',confidence:'high',sourceRef:'fixtures/capture.json',observedAt:new Date(Date.now()-1000).toISOString(),validUntil:new Date(Date.now()+60000).toISOString(),catalogFingerprint:resolution(p).rawCatalogFingerprint}]};}
function cli(command,envelope,p=project,extraEnv={}){const f=path.join(root,'input.json');write(f,envelope);return spawnSync(process.execPath,[path.join(__dirname,'factory-route.cjs'),command,...(command==='model-record'?[p]:[]),'--file',f],{env:{...process.env,FACTORY_SESSION_ID:sessionId,FACTORY_PROJECT_ID:p,...extraEnv},encoding:'utf8'});}
function stateBytes(){return bytes(state);}
for(const kind of ['model-decision','premium-approval','opencode-preference'])test('spawned model-record round trips '+kind+' preserving owner selections and other fields',()=>{commandSetup(project,kind==='opencode-preference'?'opencodeGo':'fixture-driver');const native=bytes(home),r=cli('model-record',record(kind));assert.equal(r.status,0,r.stderr);const p=JSON.parse(fs.readFileSync(path.join(state,'route-policy.json')));assert.deepEqual(p.unrelated,{keep:true});assert.deepEqual(p.projects[project].allowlist,[key]);assert.equal(p.projects[project].marker,'keep-project');assert.equal(kind==='model-decision'?p.projects[project].modelDecisions[key].tier:kind==='premium-approval'?p.projects[project].premiumApprovals['slice-1'].approvedBy:p.projects[project].opencodePreference.confirmedBy,kind==='model-decision'?'worker':'user');assert.deepEqual(bytes(home),native);assert.ok(!Object.keys(stateBytes()).some(p=>p.endsWith('.lock')||p.endsWith('.tmp')));});
test('spawned evidence-import validates raw binding and replaces only matching identity',()=>{commandSetup();const a=evidence();assert.equal(cli('evidence-import',a).status,0);const b=evidence();b.records[0].sourceRef='fixtures/other.json';assert.equal(cli('evidence-import',b).status,0);a.records[0].value=false;assert.equal(cli('evidence-import',a).status,0);const saved=JSON.parse(fs.readFileSync(path.join(state,'provider-evidence.json')));assert.equal(saved.records.length,2);assert.equal(saved.records.find(r=>r.sourceRef==='fixtures/capture.json').value,false);assert.equal(saved.records.find(r=>r.sourceRef==='fixtures/other.json').value,true);});
for(const [name,change] of [['future',v=>v.value.confirmedAt=new Date(Date.now()+3600000).toISOString()],['stale model hash',v=>v.value.modelFingerprint='0'.repeat(64)],['missing reference',v=>v.value.sourceRef=''],['unknown key',v=>v.value.key='fixture-engine/unknown'],['foreign key',v=>v.value.key='foreign/ghost'],['old generation',v=>v.value.retirementGeneration=2],['unsupported kind',v=>v.kind='other'],['prototype',v=>v.value=JSON.parse('{"__proto__":{}}')],['traversal',v=>v.value.key='fixture-engine/%2e%2e/escape']])test('invalid CLI answer '+name+' exits2 with old bytes preserved',()=>{commandSetup();const a=record();change(a);const before=stateBytes(),r=cli('model-record',a);assert.equal(r.status,2,r.stderr);assert.deepEqual(stateBytes(),before);});
for(const [name,change] of [['wrong account',a=>a.records[0].routeScope='other/account'],['wrong provider',a=>a.records[0].providerId='other'],['resolved instead of raw hash',a=>a.records[0].catalogFingerprint=resolution().catalogFingerprint],['duplicate',a=>a.records.push({...a.records[0]})],['invalid value',a=>a.records[0].value='yes'],['future evidence',a=>a.records[0].observedAt=new Date(Date.now()+3600000).toISOString()]])test('invalid evidence '+name+' exits2 without writes',()=>{commandSetup();const a=evidence();change(a);const before=stateBytes(),r=cli('evidence-import',a);assert.equal(r.status,2,r.stderr);assert.deepEqual(stateBytes(),before);});
test('malformed and duplicate JSON, missing independent session/project, and capture expiry refuse',()=>{commandSetup();for(const raw of ['{','{"schema":1,"schema":1,"records":[]}']){const before=stateBytes();assert.equal(cli('evidence-import',raw).status,2);assert.deepEqual(stateBytes(),before);}for(const env of [{FACTORY_SESSION_ID:''},{FACTORY_PROJECT_ID:''},{FACTORY_SESSION_ID:'other'}]){const a=evidence(),before=stateBytes();assert.equal(cli('evidence-import',a,project,env).status,2);assert.deepEqual(stateBytes(),before);}const a=record(),f=path.join(state,'route-identities.json'),c=JSON.parse(fs.readFileSync(f));c.validUntil=new Date(Date.now()-1).toISOString();write(f,c);const before=stateBytes();assert.equal(cli('model-record',a).status,2);assert.deepEqual(stateBytes(),before);});
test('two projects record independently and no record adds authorization',()=>{commandSetup();commandSetup('second');const a=record(),b=record('model-decision','second');b.value.tier='premium';assert.equal(cli('model-record',a).status,0);assert.equal(cli('model-record',b,'second').status,0);const p=JSON.parse(fs.readFileSync(path.join(state,'route-policy.json')));assert.equal(p.projects[project].modelDecisions[key].tier,'worker');assert.equal(p.projects.second.modelDecisions[key].tier,'premium');p.projects[project].allowlist=[];write(path.join(state,'route-policy.json'),p);const before=stateBytes();assert.equal(cli('model-record',a).status,2);assert.deepEqual(stateBytes(),before);});
test('native/account configuration rewrite invalidates capture and preserves bytes',()=>{commandSetup();const a=record();fs.appendFileSync(path.join(home,'config.json'),' ');const before=stateBytes();assert.equal(cli('model-record',a).status,2);assert.deepEqual(stateBytes(),before);});
test('retirement/reappearance generation invalidates an old answer without reviving it',()=>{commandSetup();const a=record(),f=path.join(state,'project-catalog-history',project+'.json'),h=JSON.parse(fs.readFileSync(f));h.engines['fixture-engine'].retirementGeneration[key]=1;write(f,h);const before=stateBytes();assert.equal(cli('model-record',a).status,2);assert.deepEqual(stateBytes(),before);});
test('retired target never becomes current through imported evidence or answer',()=>{commandSetup();const a=record(),e=evidence(),f=path.join(home,'providers/engine-models/fixture-engine.json');write(f,{default:'small',options:[]});const c=JSON.parse(fs.readFileSync(path.join(state,'route-identities.json')));c.nativeFingerprint=H({...readNativeForEmpty()});write(path.join(state,'route-identities.json'),c);const before=stateBytes();assert.equal(cli('model-record',a).status,2);assert.equal(cli('evidence-import',e).status,2);assert.deepEqual(stateBytes(),before);});
function readNativeForEmpty(){const native=capture();const f=path.join(state,'route-identities.json'),c=JSON.parse(fs.readFileSync(f));c.capturedAt=new Date(Date.now()-1000).toISOString();c.validUntil=new Date(Date.now()+60000).toISOString();write(f,c);return native;}
test('expired premium approval and duplicate or unauthorized approval keys are refused',()=>{commandSetup();for(const change of [v=>v.expiresAt=new Date(Date.now()-100).toISOString(),v=>v.keys.push(key),v=>v.keys=['foreign/model'],v=>v.approvedBy='bot']){const a=record('premium-approval');change(a.value);const before=stateBytes();assert.equal(cli('model-record',a).status,2);assert.deepEqual(stateBytes(),before);}});
test('stale comparative and invalid OpenCode preference are rejected',()=>{commandSetup(project,'opencodeGo');for(const change of [v=>v.catalogFingerprint='0'.repeat(64),v=>v.offered.push('foreign/model'),v=>v.chosen.push(key),v=>v.confirmedBy='bot',v=>v.sourceRef='']){const a=record('opencode-preference');change(a.value);const before=stateBytes();assert.equal(cli('model-record',a).status,2);assert.deepEqual(stateBytes(),before);}});
test('existing per-target lock refuses atomically and is not removed by another writer',()=>{commandSetup();const a=record(),f=path.join(state,'route-policy.json.lock');write(f,'other-writer');const before=stateBytes(),r=cli('model-record',a);assert.equal(r.status,2,r.stderr);assert.deepEqual(stateBytes(),before);});
test('current-source validation does not trust a stale snapshot map',()=>{commandSetup();write(path.join(state,'project-provider-snapshots',project+'.json'),{schema:1,hash:'stale'});const a=record(),beforeSnapshot=fs.readFileSync(path.join(state,'project-provider-snapshots',project+'.json'),'utf8');assert.equal(cli('model-record',a).status,0);assert.equal(fs.readFileSync(path.join(state,'project-provider-snapshots',project+'.json'),'utf8'),beforeSnapshot);});
test('inferred observations remain unknown and do not add authorization',()=>{commandSetup();const a=evidence();a.records[0].field='tier';a.records[0].status='inferred';a.records[0].value={nativeTier:'unproven',normalized:'worker'};assert.equal(cli('evidence-import',a).status,0);assert.equal(resolution().hierarchy.value,'unknown');assert.deepEqual(JSON.parse(fs.readFileSync(path.join(state,'route-policy.json'))).projects[project].allowlist,[key]);});
test('catalog-scoped answer also requires its exact current target model fingerprint',()=>{commandSetup();const a=record();a.value.scope='catalog';a.value.preferenceRank=0;a.value.modelFingerprint='0'.repeat(64);const before=stateBytes();assert.equal(cli('model-record',a).status,2);assert.deepEqual(stateBytes(),before);});

// ---------- allowlist / snapshot (S2)
process.env.FACTORY_SESSION_ID=sessionId;
const {takeSnapshot,loadSnapshot}=require('./factory-route.cjs');
function runCli(args,extraEnv={}){return spawnSync(process.execPath,[path.join(__dirname,'factory-route.cjs'),...args],{env:{...process.env,FACTORY_SESSION_ID:sessionId,FACTORY_PROJECT_ID:project,...extraEnv},encoding:'utf8'});}
function refreshCapture(){capture();const f=path.join(state,'route-identities.json'),c=JSON.parse(fs.readFileSync(f)),at=Date.now();c.capturedAt=new Date(at-1000).toISOString();c.validUntil=new Date(at+30*60000).toISOString();write(f,c);}
// Guards file-mtime-vs-Date.now() source-observation checks from filesystem timestamp granularity/rounding
// when a write is immediately followed by an in-process takeSnapshot call.
function sleepPastMtimeGranularity(){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);}

test('allowlist add rejects malformed ids, stores confirmedBy/source metadata, and round trips through show/remove',()=>{
  const bad=runCli(['allowlist',project,'--add','not-a-valid-id','--source','fixtures/op.json']);assert.equal(bad.status,2);
  const r1=runCli(['allowlist',project,'--add',key,'--source','fixtures/op.json']);assert.equal(r1.status,0,r1.stderr);
  const list=JSON.parse(r1.stdout);assert.equal(list.length,1);assert.equal(list[0].id,key);assert.equal(list[0].confirmedBy,'user');assert.equal(list[0].source,'fixtures/op.json');assert.ok(Number.isFinite(Date.parse(list[0].confirmedAt)));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(state,'route-policy.json'))).projects[project].allowlist,list);
  assert.deepEqual(JSON.parse(runCli(['allowlist',project,'--show']).stdout),list);
  assert.deepEqual(JSON.parse(runCli(['allowlist',project,'--remove',key]).stdout),[]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(state,'route-policy.json'))).projects[project].allowlist,[]);
});
test('allowlist add never assigns a tier, warns for an unconfigured id, and stores shell-metacharacter metadata literally without executing it',()=>{
  const weird='; touch pwned #';
  const r=runCli(['allowlist',project,'--add','fixture-engine/other','--source',weird,'--confirmed-by',weird]);assert.equal(r.status,0,r.stderr);
  assert.match(r.stderr,/not a configured model selection/);
  const list=JSON.parse(r.stdout);assert.equal(list[0].source,weird);assert.equal(list[0].confirmedBy,weird);assert.equal(list[0].tier,undefined);
  assert.equal(fs.existsSync(path.join(root,'pwned')),false);
});
test('snapshot writes a schema-2 file atomically and matches loadSnapshot for an allowlisted configured model',()=>{
  commandSetup();const r=runCli(['snapshot',project,'--json']);assert.equal(r.status,0,r.stderr);
  const snap=JSON.parse(r.stdout);assert.equal(snap.schema,2);assert.equal(snap.project,project);assert.ok(snap.hash);assert.deepEqual(snap.allowed,[key]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(state,'project-provider-snapshots',project+'.json'))),snap);
  assert.ok(!Object.keys(stateBytes()).some(p=>p.endsWith('.tmp')||p.endsWith('.lock')));
  assert.deepEqual(loadSnapshot(project),snap);
});
test('snapshot with no allowlist refuses every model and warns on stderr',()=>{
  commandSetup();const raw=JSON.parse(fs.readFileSync(path.join(state,'route-policy.json')));raw.projects[project].allowlist=[];write(path.join(state,'route-policy.json'),raw);
  const r=runCli(['snapshot',project,'--json']);assert.equal(r.status,0,r.stderr);assert.match(r.stderr,/no allowlist/);
  const snap=JSON.parse(r.stdout);assert.deepEqual(snap.allowed,[]);
  const m=snap.models.find(m=>m.key===key);assert.equal(m.authorization.status,'refused');assert.ok(m.authorization.reasons.length>0);
});
test('a configured allowlisted model with no tier evidence surfaces a structured held question, never a fabricated tier',()=>{
  commandSetup();const snap=takeSnapshot(project);const m=snap.models.find(m=>m.key===key);
  assert.equal(m.hierarchy.value,'unknown');assert.equal(m.decisionState.needsUserChoice,true);
  assert.ok(m.decisionState.options.some(o=>o.action==='defer'));
  assert.ok(m.decisionState.options.some(o=>o.action==='record-tier'&&o.value==='worker'));
  assert.ok(m.decisionState.options.some(o=>o.action==='record-tier'&&o.value==='premium'));
});
test('team-setup capture states: absent without a capture, inconsistent for an unconfigured identity, used when cross-checked, and expired past maxAgeMinutes',()=>{
  commandSetup();sleepPastMtimeGranularity();
  assert.equal(takeSnapshot(project).sources.teamSetup.status,'absent');
  const consistent=JSON.stringify({instances:[{instanceId:'fixture-engine',ready:true,models:{options:[{id:'small'}]}}]});
  assert.equal(takeSnapshot(project,{teamSetupText:consistent,teamSetupPath:'stdin'}).sources.teamSetup.status,'used');
  const inconsistent=JSON.stringify({instances:[{instanceId:'fixture-engine',ready:true,models:{options:[{id:'ghost'}]}}]});
  assert.equal(takeSnapshot(project,{teamSetupText:inconsistent,teamSetupPath:'stdin'}).sources.teamSetup.status,'inconsistent');
  const past=new Date(Date.now()-3600000).toISOString();
  assert.equal(takeSnapshot(project,{teamSetupText:consistent,teamSetupPath:'stdin',capturedAt:past}).sources.teamSetup.status,'expired');
});
test('snapshot --team-setup - reads the capture from stdin and cross-checks it',()=>{
  commandSetup();const text=JSON.stringify({instances:[{instanceId:'fixture-engine',ready:true,models:{options:[{id:'small'}]}}]});
  const r=spawnSync(process.execPath,[path.join(__dirname,'factory-route.cjs'),'snapshot',project,'--team-setup','-','--json'],{input:text,env:{...process.env,FACTORY_SESSION_ID:sessionId,FACTORY_PROJECT_ID:project},encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).sources.teamSetup.status,'used');
});
test('snapshot --captured-at in the future is rejected, both at the CLI layer and inside takeSnapshot, without writing a snapshot file',()=>{
  commandSetup();
  assert.equal(runCli(['snapshot',project,'--team-setup','-','--captured-at','not-a-date']).status,2);
  const text=JSON.stringify({instances:[{instanceId:'fixture-engine',ready:true,models:{options:[{id:'small'}]}}]});
  const file=path.join(root,'team-setup.json');write(file,text);const future=new Date(Date.now()+3600000).toISOString();
  const before=stateBytes();const r=runCli(['snapshot',project,'--team-setup',file,'--captured-at',future]);
  assert.equal(r.status,2,r.stderr);assert.match(r.stderr,/invalid\/future/);assert.deepEqual(stateBytes(),before);
  assert.throws(()=>takeSnapshot(project,{teamSetupText:text,teamSetupPath:'stdin',capturedAt:future}),/invalid\/future/);
});
test('snapshot --evidence rejects invalid evidence atomically, without writing a snapshot or partial evidence state',()=>{
  commandSetup();const bad=evidence();bad.records[0].value='yes';const file=path.join(root,'evidence.json');write(file,bad);
  const before=stateBytes();const r=runCli(['snapshot',project,'--evidence',file]);
  assert.equal(r.status,2,r.stderr);assert.deepEqual(stateBytes(),before);
  assert.equal(fs.existsSync(path.join(state,'project-provider-snapshots',project+'.json')),false);
});
test('snapshot held exit8 for missing route-identities.json, without writing a snapshot file',()=>{
  commandSetup();fs.unlinkSync(path.join(state,'route-identities.json'));
  const before=stateBytes();const r=runCli(['snapshot',project,'--json']);
  assert.equal(r.status,8,r.stderr);assert.deepEqual(stateBytes(),before);
  assert.equal(fs.existsSync(path.join(state,'project-provider-snapshots',project+'.json')),false);
});
test('snapshot held exit8 for a stale/expired attestation, without writing a snapshot file',()=>{
  commandSetup();const f=path.join(state,'route-identities.json'),c=JSON.parse(fs.readFileSync(f));
  c.validUntil=new Date(Date.now()-1000).toISOString();write(f,c);
  const before=stateBytes();const r=runCli(['snapshot',project,'--json']);
  assert.equal(r.status,8,r.stderr);assert.deepEqual(stateBytes(),before);
});
test('snapshot held exit8 for a wrong-session or wrong-native-binding attestation, without writing a snapshot file',()=>{
  commandSetup();
  const beforeSession=stateBytes(),rSession=runCli(['snapshot',project,'--json'],{FACTORY_SESSION_ID:'other'});
  assert.equal(rSession.status,8,rSession.stderr);assert.deepEqual(stateBytes(),beforeSession);
  const f=path.join(state,'route-identities.json'),c=JSON.parse(fs.readFileSync(f));
  c.nativeFingerprint='0'.repeat(64);write(f,c);
  const beforeBinding=stateBytes(),rBinding=runCli(['snapshot',project,'--json']);
  assert.equal(rBinding.status,8,rBinding.stderr);assert.deepEqual(stateBytes(),beforeBinding);
});
test('snapshot still exits2 for genuinely malformed input, unaffected by the identity-hold exit8 path',()=>{
  commandSetup();
  assert.equal(runCli(['snapshot',project,'--captured-at','not-a-date']).status,2);
  assert.equal(runCli(['snapshot','not valid id']).status,2);
});
test('same catalog content refresh does not change the catalog fingerprint; a substantive capability change does',()=>{
  commandSetup();sleepPastMtimeGranularity();const a=takeSnapshot(project),engineA=a.engines.find(e=>e.id==='fixture-engine');
  write(path.join(home,'providers/engine-models/fixture-engine.json'),{default:'small',options:[{id:'small',label:'Small',contextWindow:32000}]});refreshCapture();sleepPastMtimeGranularity();
  const b=takeSnapshot(project),engineB=b.engines.find(e=>e.id==='fixture-engine');
  assert.equal(engineA.catalogFingerprint,engineB.catalogFingerprint);assert.equal(engineA.rawCatalogFingerprint,engineB.rawCatalogFingerprint);
  write(path.join(home,'providers/engine-models/fixture-engine.json'),{default:'small',options:[{id:'small',label:'Small',contextWindow:64000}]});refreshCapture();sleepPastMtimeGranularity();
  const c=takeSnapshot(project),engineC=c.engines.find(e=>e.id==='fixture-engine');
  assert.notEqual(engineA.catalogFingerprint,engineC.catalogFingerprint);
});
