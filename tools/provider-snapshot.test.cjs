const {test} = require('node:test');
const assert = require('node:assert/strict');
const {fingerprint,resolveModelEvidence:resolve} = require('./provider-snapshot.cjs');
const copy = v => JSON.parse(JSON.stringify(v));
const key='engine-x/vendor/model-a', scope='account-x/api', now=Date.parse('2026-11-12T09:00:00Z');
function input(){
  const option={id:'vendor/model-a',label:'A',contextWindow:32000,effort:'high',ordered:[{id:'one'},{id:'two'}]};
  return {key,modelOption:option,engine:{id:'engine-x',driver:'synthetic',options:[option],modelRoutes:{[key]:{providerId:'provider-x',routeScope:scope}},evidence:[],retirementGenerations:{[key]:0}},
    routeScope:scope,evidence:[],decision:null,preference:null,retired:{isRetired:false,retirementGeneration:0},now};
}
function add(a,field,value,patch={}){
  const record={key,providerId:'provider-x',routeScope:scope,field,value,kind:'provider-catalog',status:'observed',confidence:'high',
    sourceRef:`fixtures/${field}-${a.evidence.length}.json#/value`,observedAt:'2026-11-12T08:00:00Z',validUntil:'2026-11-13T08:00:00Z',catalogFingerprint:resolve(a).rawCatalogFingerprint,...patch};
  a.engine.evidence.push(record);a.evidence.push(record);return record;
}
function answer(a,patch={}){
  const r=resolve(a);return {tier:'worker',preferenceRank:null,confirmedBy:'user',confirmedAt:'2026-11-12T08:30:00Z',sourceRef:'fixtures/answer.json',
    modelFingerprint:r.modelFingerprint,catalogFingerprint:r.catalogFingerprint,retirementGeneration:a.retired.retirementGeneration,scope:'model',...patch};
}
test('canonical full SHA sorts object keys by code units and preserves every array order',()=>{
  assert.equal(fingerprint({b:2,a:1}),'43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777');
  assert.equal(fingerprint({b:{z:2,a:1},a:0}),fingerprint({a:0,b:{a:1,z:2}}));
  assert.notEqual(fingerprint([{id:'a'},{id:'b'}]),fingerprint([{id:'b'},{id:'a'}]));
  assert.match(fingerprint({'2':'x','10':'y'}),/^[a-f0-9]{64}$/);
});
test('agreed explicit provider mappings resolve; effort/names and unknown price never supply tier or costs',()=>{
  const a=input();assert.equal(resolve(a).hierarchy.value,'unknown');assert.equal(resolve(a).priceEvidence.value,null);
  add(a,'tier',{nativeTier:'standard',normalized:'worker'});
  add(a,'tier',{nativeTier:'standard',normalized:'worker'},{kind:'provider-doc',sourceRef:'https://provider.invalid/models#tier'});
  const r=resolve(a);assert.equal(r.hierarchy.value,'worker');assert.equal(r.hierarchy.confidence,'high');assert.equal(r.priceEvidence.value,null);
  assert.equal(r.capabilities.toolUse.value,null);assert.equal('allowed' in r,false);
});
test('inferred, low-confidence, aggregator and unknown normalization remain excluded and held',()=>{
  for(const patch of [{status:'inferred'},{confidence:'medium'},{kind:'aggregator'}]){
    const a=input();add(a,'tier',{nativeTier:'positioning',normalized:'premium'},patch);const r=resolve(a);
    assert.equal(r.hierarchy.value,'unknown');assert.equal(r.hierarchy.status,'unverified');assert.equal(r.hierarchy.excluded.length,1);assert.equal(r.decisionState.needsUserChoice,true);
  }
  const a=input();add(a,'tier',{nativeTier:'positioning',normalized:'unknown'});assert.equal(resolve(a).hierarchy.value,'unknown');
});
test('conflicting provider signals retain every source and an applicable owner answer resolves only tier',()=>{
  const a=input();add(a,'tier',{nativeTier:'standard',normalized:'worker'});add(a,'tier',{nativeTier:'top',normalized:'premium'});
  let r=resolve(a);assert.equal(r.hierarchy.value,'unknown');assert.equal(r.hierarchy.sourceRefs.length,2);assert.match(r.hierarchy.reasons.join(),/conflicting/);
  a.decision=answer(a,{tier:'premium'});r=resolve(a);assert.equal(r.hierarchy.value,'premium');assert.equal(r.hierarchy.sourceRefs.length,3);assert.equal(r.priceEvidence.value,null);assert.equal('authorization' in r,false);
});
test('expired, future, wrong provider, wrong account, malformed time and raw binding mismatch are excluded',()=>{
  for(const patch of [{validUntil:'2026-11-12T08:40:00Z'},{observedAt:'2026-11-12T10:00:00Z'},{providerId:'other-provider'},
    {routeScope:'other-account/api'},{observedAt:'not-a-time'},{catalogFingerprint:'0'.repeat(64)}]){
    const a=input();add(a,'tier',{nativeTier:'standard',normalized:'worker'},patch);const r=resolve(a);
    assert.equal(r.hierarchy.value,'unknown');assert.equal(r.hierarchy.excluded.length,1);assert.equal(r.hierarchy.sourceRefs.length,1);
  }
});
test('typed price and capabilities resolve independently; price cannot imply hierarchy',()=>{
  const a=input();add(a,'price',{currency:'USD',unit:'token',input:0.1,output:0.2,basis:'api-equivalent'},{kind:'provider-pricing'});
  add(a,'imageInput',false);add(a,'contextTokens',64000);add(a,'toolUse',true);
  const r=resolve(a);assert.equal(r.hierarchy.value,'unknown');assert.equal(r.priceEvidence.value.cachedInput,null);assert.equal(r.capabilities.imageInput.value,false);assert.equal(r.capabilities.toolUse.value,true);
  assert.equal(r.capabilities.contextTokens.value,64000);
  const bad=input();add(bad,'price',{currency:'USD',unit:'token',input:-1,basis:'account'});assert.throws(()=>resolve(bad));
  const pricingOnly=input();add(pricingOnly,'toolUse',true,{kind:'provider-pricing'});assert.equal(resolve(pricingOnly).capabilities.toolUse.value,null);
});
test('refresh labels, observation time and local capture relocation leave hashes unchanged; nested data does not',()=>{
  const a=input();add(a,'tier',{nativeTier:'standard',normalized:'worker'});const old=resolve(a);
  a.modelOption.label='Renamed';a.modelOption.observedAt='new observation';a.modelOption.path='elsewhere';
  a.evidence[0].observedAt='2026-11-12T08:30:00Z';a.evidence[0].sourceRef='other/capture.json#/tier';
  const refreshed=resolve(a);assert.equal(refreshed.rawCatalogFingerprint,old.rawCatalogFingerprint);assert.equal(refreshed.catalogFingerprint,old.catalogFingerprint);
  a.modelOption.nested={label:'substantive'};assert.notEqual(resolve(a).modelFingerprint,old.modelFingerprint);
});
test('substantive option, ordered array, claim validity, or official URL changes invalidate hashes',()=>{
  const a=input();add(a,'tier',{nativeTier:'standard',normalized:'worker'});const old=resolve(a);
  for(const change of [b=>b.modelOption.contextWindow++,b=>b.modelOption.ordered.reverse(),b=>b.evidence[0].validUntil='2026-11-14T08:00:00Z',b=>b.evidence[0].sourceRef='https://provider.invalid/new#tier']){
    const b=copy(a); // Restore the required target option and evidence aliases after JSON copying.
    b.modelOption=b.engine.options[0];b.evidence=b.engine.evidence;change(b);
    assert.notEqual(resolve(b).modelFingerprint,old.modelFingerprint);
  }
  a.modelOption.contextWindow++;assert.match(JSON.stringify(resolve(a).hierarchy.excluded),/raw catalog binding mismatch/);
});
test('domain model and claim sets are input-order invariant, without mutating caller data',()=>{
  const a=input();add(a,'toolUse',true);add(a,'imageInput',false);
  const other='engine-x/other';a.engine.options.push({id:'other'});a.engine.modelRoutes[other]={providerId:'other-provider',routeScope:'other-account'};a.engine.retirementGenerations[other]=0;
  const before=copy(a),r=resolve(a);assert.deepEqual(a,before);
  const b=copy(a);b.engine.options.reverse();b.engine.evidence.reverse();b.evidence.reverse();
  assert.equal(resolve(b).catalogFingerprint,r.catalogFingerprint);
});
test('model answer survives unrelated catalog changes but comparative answer does not',()=>{
  const a=input();a.decision=answer(a);const old=resolve(a);
  const other='engine-x/other';a.engine.options.push({id:'other'});a.engine.modelRoutes[other]={providerId:'provider-x',routeScope:scope};a.engine.retirementGenerations[other]=0;
  const r=resolve(a);assert.equal(r.modelFingerprint,old.modelFingerprint);assert.notEqual(r.catalogFingerprint,old.catalogFingerprint);assert.equal(r.hierarchy.value,'worker');
  a.decision.scope='catalog';assert.equal(resolve(a).hierarchy.value,'unknown');
});
test('retirement and reappearance cannot revive old model or catalog-scoped answers',()=>{
  const a=input();a.decision=answer(a);a.engine.options=[];a.engine.retirementGenerations[key]=1;a.retired={isRetired:true,retirementGeneration:1};
  assert.equal(resolve(a).hierarchy.value,'unknown');a.engine.options=[a.modelOption];a.retired.isRetired=false;assert.equal(resolve(a).hierarchy.value,'unknown');
  a.decision.retirementGeneration=1;assert.equal(resolve(a).hierarchy.value,'worker');
  const b=input();b.decision=answer(b,{scope:'catalog'});b.engine.retirementGenerations['engine-x/retired-other']=1;assert.equal(resolve(b).hierarchy.value,'unknown');
});
test('invalid owner attestations and catalog preferences do not override evidence',()=>{
  for(const patch of [{confirmedBy:'bot'},{sourceRef:''},{confirmedAt:'2026-11-13T08:00:00Z'},{retirementGeneration:3},{modelFingerprint:'0'.repeat(64)}]){
    const a=input();a.decision=answer(a,patch);assert.equal(resolve(a).hierarchy.value,'unknown');
  }
  const a=input(),r=resolve(a);a.preference={chosen:[key],offered:[key],askedAt:'2026-11-12T08:00:00Z',confirmedBy:'user',sourceRef:'fixtures/choice.json',scope:'catalog',catalogFingerprint:r.catalogFingerprint};
  assert.ok(!resolve(a).decisionState.reasons.includes('catalog preference binding mismatch'));
  a.engine.retirementGenerations['engine-x/tombstone']=1;assert.ok(resolve(a).decisionState.reasons.includes('catalog preference binding mismatch'));
});
test('prototype, traversal, cycles, undefined, nonfinite and credential-bearing data fail validation',()=>{
  for(const value of [JSON.parse('{"__proto__":{}}'),{constructor:1},{v:undefined},{v:Infinity},new Date(),{apiKey:'secret'}])assert.throws(()=>fingerprint(value));
  const cycle={};cycle.self=cycle;assert.throws(()=>fingerprint(cycle));
  const a=input();a.key='engine-x/../escape';assert.throws(()=>resolve(a));
  const b=input();add(b,'tier',{nativeTier:'standard',normalized:'worker'},{sourceRef:'https://user:password@provider.invalid/tier'});assert.throws(()=>resolve(b));
});
test('duplicates, target subset omissions, missing history, missing route and inconsistent options reject',()=>{
  for(const change of [a=>a.engine.options.push(a.modelOption),a=>delete a.engine.retirementGenerations[key],a=>delete a.engine.modelRoutes[key],a=>a.retired.retirementGeneration=1]){
    const a=input();change(a);assert.throws(()=>resolve(a));
  }
  const a=input();add(a,'tier',{nativeTier:'standard',normalized:'worker'});a.evidence=[];assert.throws(()=>resolve(a));
  const b=input();const claim=add(b,'toolUse',true);b.engine.evidence.push(copy(claim));assert.throws(()=>resolve(b));
});
test('passage of time alone preserves claim content hashes while expiry independently holds price',()=>{
  const a=input();add(a,'price',{currency:'USD',unit:'token',input:1,output:2,basis:'account'});a.decision=answer(a);const good=resolve(a);
  a.now=Date.parse('2026-11-14T08:00:00Z');const stale=resolve(a);
  assert.equal(stale.catalogFingerprint,good.catalogFingerprint);assert.equal(stale.hierarchy.value,'worker');assert.equal(stale.priceEvidence.value,null);
});
test('comparative ranks require catalog scope without corrupting a model-scoped tier answer',()=>{
  const a=input();a.decision=answer(a,{preferenceRank:0});let r=resolve(a);
  assert.equal(r.hierarchy.value,'worker');assert.equal(r.decisionState.preferenceRank,null);assert.match(r.decisionState.reasons.join(),/catalog-scoped binding/);
  a.decision.scope='catalog';r=resolve(a);assert.equal(r.decisionState.preferenceRank,0);
});
test('precise claim projection excludes capture paths, observation and binding hashes',()=>{
  const a=input();const e=add(a,'toolUse',true),raw={key,option:{id:'vendor/model-a',contextWindow:32000,effort:'high',ordered:[{id:'one'},{id:'two'}]},providerId:'provider-x',routeScope:scope};
  const claim={key,providerId:'provider-x',routeScope:scope,field:'toolUse',value:true,kind:'provider-catalog',status:'observed',confidence:'high',sourceIdentity:{kind:'provider-catalog',providerId:'provider-x',routeScope:scope,url:null},validUntil:e.validUntil};
  const r=resolve(a);assert.equal(r.modelFingerprint,fingerprint({model:raw,claims:[claim]}));
  assert.equal(r.catalogFingerprint,fingerprint({engine:{id:'engine-x',driver:'synthetic'},models:[{key,modelFingerprint:r.modelFingerprint}],claims:[claim],retirementGenerations:{[key]:0}}));
});
test('conflicting native hierarchy values cannot be hidden by equal normalized tiers',()=>{
  const a=input();add(a,'tier',{nativeTier:'standard',normalized:'worker'});add(a,'tier',{nativeTier:'economy',normalized:'worker'});
  const r=resolve(a);assert.equal(r.hierarchy.value,'unknown');assert.match(r.hierarchy.reasons.join(),/conflicting/);
});

function completePreferenceInput(){
  const a=input();
  a.engine.retirementGenerations['engine-x/retired']=1;
  a.engine.modelRoutes['engine-x/retired']={providerId:'provider-x',routeScope:scope};
  add(a,'tier',{nativeTier:'standard',normalized:'worker'});
  add(a,'price',{currency:'USD',unit:'token',input:1,output:2,basis:'account'});
  add(a,'toolUse',true);add(a,'imageInput',false);add(a,'contextTokens',32000);
  const r=resolve(a);assert.equal(r.decisionState.needsUserChoice,false,'all other evidence must be resolved so it cannot mask preference failure');
  a.preference={chosen:[key],offered:[key],askedAt:'2026-11-12T08:30:00Z',confirmedBy:'user',sourceRef:'fixtures/project-preference.json',catalogFingerprint:r.catalogFingerprint,scope:'catalog'};
  return a;
}
for(const [name,chosen,offered] of [
  ['foreign-only',['foreign/absent'],['foreign/absent']],
  ['same-engine absent',['engine-x/missing'],['engine-x/missing']],
  ['retired-only',['engine-x/retired'],['engine-x/retired']],
  ['mixed foreign offered',[key],[key,'foreign/absent']],
  ['mixed foreign chosen',[key,'foreign/absent'],[key,'foreign/absent']],
  ['mixed retired offered',[key],[key,'engine-x/retired']],
  ['mixed absent chosen',[key,'engine-x/missing'],[key,'engine-x/missing']],
])test(`catalog-bound preference invalidates ${name} without silently filtering`,()=>{
  const a=completePreferenceInput();a.preference.chosen=chosen;a.preference.offered=offered;
  const before=copy(a),r=resolve(a);assert.deepEqual(a,before);
  assert.equal(r.decisionState.needsUserChoice,true);
  assert.match(r.decisionState.reasons.join(),/preference key not in bound current engine catalog/);
  assert.equal(r.decisionState.excludedAnswers[0].sourceRef,a.preference.sourceRef);
  assert.match(r.decisionState.excludedAnswers[0].reasons.join(),/not in bound current engine catalog/);
  assert.equal(r.hierarchy.value,'worker');assert.equal('allowed' in r,false);
});
test('valid current-catalog preference remains resolved while duplicate/not-offered choices remain invalid',()=>{
  const a=completePreferenceInput(),r=resolve(a);
  assert.equal(r.decisionState.needsUserChoice,false);assert.deepEqual(r.decisionState.reasons,[]);assert.deepEqual(r.decisionState.excludedAnswers,[]);
  for(const [chosen,offered,reason] of [
    [[key,key],[key],/duplicate preference keys/],[[key],[key,key],/duplicate preference keys/],[[key],[],/chosen key not offered/],
  ]){const b=copy(a);b.preference.chosen=chosen;b.preference.offered=offered;const invalid=resolve(b);assert.equal(invalid.decisionState.needsUserChoice,true);assert.match(invalid.decisionState.reasons.join(),reason);}
});
