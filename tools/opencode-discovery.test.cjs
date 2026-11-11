const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const D = require('./opencode-discovery.cjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-discovery-'));
process.env.FACTORY_STATE_DIR = dir; process.env.FACTORY_HATTERA_HOME = dir;
const R = require('./factory-route.cjs');
const models = [{id:'synthetic/works',cost:{input:0,output:0}}, {id:'synthetic/fails',priceReported:'free'},
  {id:'synthetic/metered',cost:{input:1,output:1}}, {id:'synthetic/free-name-only'}];
const fixture = path.join(dir,'fake.cjs');
fs.writeFileSync(fixture, `const a=process.argv.slice(2); if(a[0]==='models')console.log(${JSON.stringify(JSON.stringify(models))});
else if(a.includes('synthetic/works'))console.log(JSON.stringify({type:'text',part:{text:'OK'}})); else process.exit(1);`);
let record;
test('discovery uses fixture binary, parses prices and confirms only actual free responses', () => {
  const calls=[];
  record=D.discover(R.P.discovery,{binary:'fake',args:['models'],run:(b,a,t)=>{calls.push(a);return cp.spawnSync(process.execPath,[fixture,...a],{encoding:'utf8',timeout:t});}});
  assert.equal(record.models.length,4); assert.equal(calls.length,3);
  assert.equal(record.models[0].responded,true); assert.equal(record.models[1].responded,false);
  assert.match(record.models[2].reason,/paid/); assert.match(record.models[3].reason,/unknown/);
  assert.deepEqual(D.parse('opaque/first\n{\n"cost":{"input":0,"output":0}\n}\nopaque/second'),[{id:'opaque/first',price:'free'},{id:'opaque/second',price:'unknown'}]);
});
test('preference asks initially, on retirement, new options and stale discovery; reuses valid choice', () => {
  const pref={chosen:['synthetic/works'],offered:['synthetic/works'],askedAt:new Date().toISOString()};
  assert.equal(D.preference(record,{}).needsUserChoice,true);
  assert.equal(D.preference(record,{opencodePreference:pref}).needsUserChoice,false);
  assert.equal(D.preference({...record,models:[]},{opencodePreference:pref}).needsUserChoice,true);
  assert.equal(D.preference({...record,models:[...record.models,{id:'arbitrary/new',price:'free',responded:true}]},{opencodePreference:pref}).needsUserChoice,true);
  assert.equal(D.preference({...record,observedAt:'2000-01-01'},{opencodePreference:pref}).needsUserChoice,true);
});
test('route excludes OpenCode until preference; chosen discovered identity still requires authorization', () => {
  fs.writeFileSync(R.P.config,JSON.stringify({instances:{account:{driverKind:'opencodeGo'}}}));
  fs.writeFileSync(R.P.bots,JSON.stringify([{modelSelection:{instanceId:'account',model:'synthetic/works'}}]));
  const snapshot={engines:[{id:'account',driver:'opencodeGo',defaultModel:'synthetic/works',models:[{id:'synthetic/works',inCatalog:true}]}]};
  const policy={workKindTiers:{implement:'worker'},models:{'account/synthetic/works':{tier:'worker'}}};
  fs.writeFileSync(R.P.policy,JSON.stringify(policy));
  let r=R.route({complexity:'low',workKind:'implement'},{snapshot});
  assert.equal(r.choice,null);assert.equal(r.needsUserChoice,true);
  policy.opencodePreference={chosen:['synthetic/works'],offered:['synthetic/works'],askedAt:new Date().toISOString()};
  fs.writeFileSync(R.P.policy,JSON.stringify(policy));
  r=R.route({complexity:'low',workKind:'implement'},{snapshot});
  assert.equal(r.choice.model,'synthetic/works');assert.equal(r.needsUserChoice,false);
  fs.writeFileSync(R.P.bots,'[]');
  assert.equal(R.route({complexity:'low',workKind:'implement'},{snapshot}).choice,null);
});
test('preference CLI records current offered options and rejects failed candidates', () => {
  const command=(ids)=>cp.spawnSync(process.execPath,[path.join(__dirname,'factory-route.cjs'),'opencode-prefer','--models',ids],{env:process.env,encoding:'utf8'});
  assert.equal(command('synthetic/fails').status,2);
  const r=command('synthetic/works');assert.equal(r.status,0,r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).offered,['synthetic/works']);
});

for (const declaredTier of ['premium', null]) test(`OpenCode choice never assigns worker tier when policy tier is ${declaredTier}`, () => {
  fs.writeFileSync(R.P.bots,JSON.stringify([{modelSelection:{instanceId:'account',model:'synthetic/works'}}]));
  const policy={workKindTiers:{implement:'worker'},opencodePreference:{chosen:['synthetic/works'],offered:['synthetic/works'],askedAt:new Date().toISOString()},
    ...(declaredTier ? {models:{'account/synthetic/works':{tier:declaredTier}}} : {})};
  fs.writeFileSync(R.P.policy,JSON.stringify(policy));
  const snapshot={engines:[{id:'account',driver:'opencodeGo',defaultModel:'synthetic/works',models:[{id:'synthetic/works',inCatalog:true}]}]};
  const r=R.route({complexity:'low',workKind:'implement'},{snapshot});
  assert.equal(r.choice.model,'synthetic/works','legacy fallback may still select the authorized choice');
  assert.equal(r.needsUserChoice,false); assert.equal(r.fallback,true);
  assert.match(r.fallbackReason,/tier worker.*work kind implement/);
  assert.equal(r.tierExclusions[0].policyTier,declaredTier);
  assert.match(r.tierExclusions[0].reason,declaredTier ? /policy tier premium is outside tier worker/ : /no policy tier declared/);
  const saved=JSON.parse(fs.readFileSync(r.file,'utf8'));
  assert.equal(saved.planned.fallback,true); assert.deepEqual(saved.tierExclusions,r.tierExclusions);
});
