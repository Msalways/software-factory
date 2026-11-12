const {createHash} = require('node:crypto');
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
const fields = ['tier', 'price', 'imageInput', 'contextTokens', 'toolUse'];
const nonempty = v => typeof v === 'string' && v.trim().length > 0;
const hashString = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
function requireThat(ok, message) { if (!ok) throw Error(message); }

function canonical(value, seen = new Set()) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') { requireThat(Number.isFinite(value), 'nonfinite JSON number'); return JSON.stringify(value); }
  requireThat(value && typeof value === 'object' && !seen.has(value), 'expected acyclic JSON data');
  requireThat(Array.isArray(value) || [Object.prototype, null].includes(Object.getPrototypeOf(value)), 'non-JSON prototype');
  requireThat(Reflect.ownKeys(value).every(k => typeof k === 'string'), 'non-JSON property');
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    requireThat(Object.keys(value).length === value.length, 'sparse or decorated array');
    requireThat(Object.keys(value).every(k => 'value' in Object.getOwnPropertyDescriptor(value, k)), 'array accessor rejected');
    result = '[' + Array.from(value, v => canonical(v, seen)).join(',') + ']';
  } else {
    requireThat(Object.getOwnPropertyNames(value).length === Object.keys(value).length, 'nonenumerable JSON property');
    result = '{' + Object.keys(value).sort().map(k => {
      requireThat(!forbidden.has(k), 'prototype key rejected');
      requireThat('value' in Object.getOwnPropertyDescriptor(value, k), 'accessor rejected');
      requireThat(!/^(apikey|accessToken|refreshToken|password|secret|credential)$/i.test(k.replace(/[_-]/g, '')) && !(k.toLowerCase() === 'authorization' && typeof value[k] === 'string'), 'secret-bearing field rejected');
      return JSON.stringify(k) + ':' + canonical(value[k], seen);
    }).join(',') + '}';
  }
  seen.delete(value); return result;
}
function fingerprint(value) { return createHash('sha256').update(canonical(value)).digest('hex'); }
function identity(key) {
  requireThat(nonempty(key) && !/[\\\s]/.test(key), 'invalid model identity');
  let decoded; try { decoded = decodeURIComponent(key); } catch { throw Error('invalid identity encoding'); }
  const parts = decoded.split('/');
  requireThat(parts.length >= 2 && parts.every(p => p && p !== '.' && p !== '..' && !forbidden.has(p)) && /^[\w.-]+$/.test(parts[0]) && !decoded.includes('\\'), 'traversal/prototype identity rejected');
  return key.slice(0, key.indexOf('/'));
}
function sourceUrl(ref) {
  requireThat(nonempty(ref) && !/[\r\n]/.test(ref), 'invalid sourceRef');
  if (/^https:/i.test(ref)) {
    const url = new URL(ref);
    requireThat(url.protocol === 'https:' && !url.username && !url.password, 'credential-bearing source URL');
    requireThat(![...url.searchParams.keys()].some(k => /token|key|secret|password|credential/i.test(k)), 'credential-bearing source URL');
    return ref;
  }
  requireThat(!/^[a-z][a-z\d+.-]*:/i.test(ref) || /^[a-z]:[\\/]/i.test(ref), 'source must be HTTPS or local capture');
  requireThat(!ref.split(/[\\/]/).some(p => p === '..'), 'source traversal rejected');
  return null;
}
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const stripOption = option => Object.fromEntries(Object.entries(option).filter(([k]) => !['label','observedAt','mtime','path','paths'].includes(k)));
function typedValue(field, value) {
  if (field === 'tier') return value && typeof value === 'object' && !Array.isArray(value) && nonempty(value.nativeTier) && ['worker','premium','unknown'].includes(value.normalized);
  if (field === 'imageInput' || field === 'toolUse') return typeof value === 'boolean';
  if (field === 'contextTokens') return Number.isSafeInteger(value) && value > 0;
  return value && typeof value === 'object' && !Array.isArray(value) && nonempty(value.currency) && nonempty(value.unit) &&
    ['account','api-equivalent'].includes(value.basis) && ['input','output','cachedInput'].every(k => value[k] == null || typeof value[k] === 'number' && Number.isFinite(value[k]) && value[k] >= 0);
}
function resolveModelEvidence(input) {
  canonical(input); // Validate all input before projecting or resolving; never mutate it.
  const {key, modelOption, engine, routeScope, evidence, decision, preference, retired, now} = input;
  requireThat(Number.isFinite(now) && Number.isFinite(new Date(now).getTime()), 'invalid injected time');
  requireThat(engine && nonempty(engine.id) && identity(key) === engine.id && nonempty(engine.driver), 'engine identity mismatch');
  requireThat(Array.isArray(engine.options) && Array.isArray(engine.evidence) && Array.isArray(evidence), 'options/evidence arrays required');
  requireThat(engine.modelRoutes && engine.retirementGenerations && !Array.isArray(engine.modelRoutes) && !Array.isArray(engine.retirementGenerations), 'route/history maps required');
  requireThat(retired && typeof retired.isRetired === 'boolean' && Number.isSafeInteger(retired.retirementGeneration) && retired.retirementGeneration >= 0, 'explicit retirement state required');
  requireThat(decision === null || decision && typeof decision === 'object' && !Array.isArray(decision), 'decision must be object or null');
  requireThat(preference === null || preference && typeof preference === 'object' && !Array.isArray(preference), 'preference must be object or null');
  const current = new Map();
  for (const option of engine.options) {
    requireThat(option && nonempty(option.id), 'option id required');
    const k = engine.id + '/' + option.id; identity(k);
    requireThat(!current.has(k), 'duplicate option identity'); current.set(k, option);
  }
  for (const [k, generation] of Object.entries(engine.retirementGenerations)) {
    requireThat(identity(k) === engine.id && Number.isSafeInteger(generation) && generation >= 0 && (current.has(k) || generation > 0), 'invalid retirement map');
  }
  for (const k of current.keys()) requireThat(Object.hasOwn(engine.retirementGenerations, k), 'missing retirement generation');
  for (const [k, route] of Object.entries(engine.modelRoutes)) {
    requireThat(identity(k) === engine.id && Object.hasOwn(engine.retirementGenerations, k) && route && nonempty(route.providerId) && nonempty(route.routeScope) && Object.keys(route).sort().join(',') === 'providerId,routeScope', 'invalid route entry');
  }
  for (const k of current.keys()) requireThat(Object.hasOwn(engine.modelRoutes, k), 'missing explicit route');
  requireThat(Object.hasOwn(engine.retirementGenerations, key) && retired.retirementGeneration === engine.retirementGenerations[key] && retired.isRetired === !current.has(key), 'inconsistent target retirement state');
  requireThat(modelOption && engine.id + '/' + modelOption.id === key && Object.hasOwn(engine.modelRoutes, key) && routeScope === engine.modelRoutes[key].routeScope, 'target option/route mismatch');
  if (!retired.isRetired) requireThat(canonical(modelOption) === canonical(current.get(key)), 'target option differs from catalog');
  const route = engine.modelRoutes[key], baseEngine = {id:engine.id,driver:engine.driver};
  const rawModel = (k, option) => ({key:k,option:stripOption(option),providerId:engine.modelRoutes[k].providerId,routeScope:engine.modelRoutes[k].routeScope});
  const rawModels = [...current].sort(([a],[b]) => compare(a,b)).map(([k,o]) => rawModel(k,o));
  const rawCatalogFingerprint = fingerprint({engine:baseEngine,models:rawModels});
  const identities = new Set();
  const claims = engine.evidence.map(record => {
    requireThat(record && identity(record.key) === engine.id && Object.hasOwn(engine.retirementGenerations, record.key), 'evidence key outside retained engine history');
    requireThat(fields.includes(record.field) && nonempty(record.providerId) && nonempty(record.routeScope) &&
      ['provider-catalog','provider-doc','provider-pricing','aggregator','owner'].includes(record.kind) &&
      ['observed','inferred','unavailable','unverified'].includes(record.status) && ['high','medium','low'].includes(record.confidence) && hashString(record.catalogFingerprint), 'invalid evidence record');
    requireThat(typedValue(record.field,record.value), 'invalid typed evidence value');
    const url = sourceUrl(record.sourceRef), id = canonical([record.key,record.field,record.sourceRef]);
    requireThat(!identities.has(id), 'duplicate evidence identity'); identities.add(id);
    const value = record.field === 'price' ? {input:null,output:null,cachedInput:null,contextBand:null,serviceTier:null,...record.value} : record.value;
    return {key:record.key,providerId:record.providerId,routeScope:record.routeScope,field:record.field,value,
      kind:record.kind,status:record.status,confidence:record.confidence,
      sourceIdentity:{kind:record.kind,providerId:record.providerId,routeScope:record.routeScope,url},validUntil:record.validUntil};
  });
  const recordsForTarget = engine.evidence.filter(r => r.key === key);
  requireThat(canonical(recordsForTarget.map(canonicalRecord).sort()) === canonical(evidence.map(canonicalRecord).sort()), 'target evidence subset mismatch');
  const sortKey = c => [c.key,c.field,c.kind,c.providerId,c.routeScope,c.sourceIdentity.url || '',canonical(c)];
  claims.sort((a,b) => { const x=sortKey(a),y=sortKey(b);for(let i=0;i<x.length;i++){const n=compare(x[i],y[i]);if(n)return n;}return 0; });
  const hashModel = model => fingerprint({model,claims:claims.filter(c => c.key === model.key)});
  const modelFingerprint = hashModel(rawModel(key,modelOption));
  const catalogFingerprint = fingerprint({engine:baseEngine,models:rawModels.map(m => ({key:m.key,modelFingerprint:hashModel(m)})),claims,retirementGenerations:engine.retirementGenerations});
  function exclusions(record, field) {
    const reasons = [], observed = Date.parse(record.observedAt), until = Date.parse(record.validUntil);
    if (record.providerId !== route.providerId || record.routeScope !== routeScope) reasons.push('provider/account route mismatch');
    if (record.catalogFingerprint !== rawCatalogFingerprint) reasons.push('raw catalog binding mismatch');
    if (!Number.isFinite(observed) || !Number.isFinite(until) || until <= observed) reasons.push('invalid evidence time bounds');
    else { if (observed > now) reasons.push('future evidence'); if (until <= now) reasons.push('expired evidence'); }
    if (record.status !== 'observed' || record.confidence !== 'high') reasons.push('not high-confidence observed evidence');
    if (!(field === 'price' ? ['provider-catalog','provider-doc','provider-pricing'] : ['provider-catalog','provider-doc']).includes(record.kind)) reasons.push('ineligible evidence source');
    if (field === 'tier' && record.value.normalized === 'unknown') reasons.push('normalization unverified');
    if (retired.isRetired) reasons.push('model retired');
    return reasons;
  }
  function resolution(field) {
    const records=recordsForTarget.filter(r => r.field === field), excluded=[], accepted=[];
    for(const r of records){const reasons=exclusions(r,field);if(reasons.length)excluded.push({sourceRef:r.sourceRef,reasons});else accepted.push(r);}
    const values=accepted.map(r => field === 'tier' ? r.value.normalized : field === 'price' ? {input:null,output:null,cachedInput:null,contextBand:null,serviceTier:null,...r.value} : r.value);
    const agreementValues=field==='tier'?accepted.map(r=>r.value):values;
    const conflict=new Set(agreementValues.map(canonicalRecord)).size>1, known=accepted.length>0&&!conflict;
    return {value:known?values[0]:field==='tier'?'unknown':null,sourceRefs:records.map(r=>r.sourceRef).sort(),
      observedAt:known?accepted.reduce((a,b)=>Date.parse(a.observedAt)>Date.parse(b.observedAt)?a:b).observedAt:null,confidence:known?'high':'low',status:known?'observed':'unverified',
      reasons:known?[]:[conflict?'conflicting provider evidence':'no applicable provider evidence'],excluded};
  }
  const hierarchy=resolution('tier'),priceEvidence=resolution('price');
  const capabilities=Object.fromEntries(['imageInput','contextTokens','toolUse'].map(f=>[f,resolution(f)]));
  const decisionReasons=[],preferenceReasons=[],rankReasons=[];
  function answerReasons(answer, atField) {
    const reasons=[];
    if(answer.confirmedBy!=='user'||!nonempty(answer.sourceRef))reasons.push('explicit user answer reference required');
    else sourceUrl(answer.sourceRef);
    const at=Date.parse(answer[atField]);if(!Number.isFinite(at)||at>now)reasons.push('invalid/future user answer');
    if(retired.isRetired)reasons.push('model retired');return reasons;
  }
  if(decision!==null){
    decisionReasons.push(...answerReasons(decision,'confirmedAt'));
    if(!hashString(decision.modelFingerprint)||!hashString(decision.catalogFingerprint))decisionReasons.push('invalid decision fingerprints');
    if(!['model','catalog'].includes(decision.scope)||!['worker','premium'].includes(decision.tier))decisionReasons.push('invalid decision scope/tier');
    if(decision.retirementGeneration!==retired.retirementGeneration)decisionReasons.push('retirement generation mismatch');
    if(decision.scope==='model'&&decision.modelFingerprint!==modelFingerprint)decisionReasons.push('model fingerprint mismatch');
    if(decision.scope==='catalog'&&decision.catalogFingerprint!==catalogFingerprint)decisionReasons.push('catalog fingerprint mismatch');
    if(decision.preferenceRank!==null&&(!Number.isSafeInteger(decision.preferenceRank)||decision.preferenceRank<0))decisionReasons.push('invalid preference rank');
    if(!decisionReasons.length)Object.assign(hierarchy,{value:decision.tier,sourceRefs:[decision.sourceRef,...hierarchy.sourceRefs],observedAt:decision.confirmedAt,confidence:'high',status:'observed',reasons:[]});
    if(decision.preferenceRank!==null&&(decision.scope!=='catalog'||decision.catalogFingerprint!==catalogFingerprint))rankReasons.push('comparative rank requires current catalog-scoped binding');
  }
  if(preference!==null){
    preferenceReasons.push(...answerReasons(preference,'askedAt'));
    if(preference.scope!=='catalog'||preference.catalogFingerprint!==catalogFingerprint)preferenceReasons.push('catalog preference binding mismatch');
    if(!Array.isArray(preference.chosen)||!Array.isArray(preference.offered)||!preference.chosen.length)preferenceReasons.push('invalid preference keys');
    else {
      for(const k of new Set([...preference.chosen,...preference.offered])){
        identity(k);
        if(!current.has(k))preferenceReasons.push(`preference key not in bound current engine catalog: ${k}`);
      }
      if(new Set(preference.chosen).size!==preference.chosen.length||new Set(preference.offered).size!==preference.offered.length)preferenceReasons.push('duplicate preference keys');
      if(preference.chosen.some(k=>!preference.offered.includes(k)))preferenceReasons.push('chosen key not offered');
    }
  }
  const unknownFields=[...(hierarchy.value==='unknown'?['tier']:[]),...(priceEvidence.value===null?['price']:[]),...Object.keys(capabilities).filter(k=>capabilities[k].value===null)];
  return {rawCatalogFingerprint,modelFingerprint,catalogFingerprint,hierarchy,priceEvidence,capabilities,
    decisionState:{needsUserChoice:unknownFields.length>0||decisionReasons.length>0||preferenceReasons.length>0||rankReasons.length>0,
      reasons:[...decisionReasons,...preferenceReasons,...rankReasons,...unknownFields.map(f=>`${f} evidence unresolved`)],
      excludedAnswers:[...(decisionReasons.length?[{sourceRef:decision.sourceRef ?? null,reasons:decisionReasons}]:[]),...(preferenceReasons.length?[{sourceRef:preference.sourceRef ?? null,reasons:preferenceReasons}]:[])],
      options:[{action:'defer',label:'Keep held'},...(hierarchy.value==='unknown'?[{action:'record-tier',value:'worker'},{action:'record-tier',value:'premium'}]:[]),...(unknownFields.length?[{action:'provide-evidence',fields:unknownFields}]:[])],
      preferenceRank:decision&&!decisionReasons.length&&!rankReasons.length&&decision.scope==='catalog'?decision.preferenceRank:null}};
}
function canonicalRecord(value) { return canonical(value); }
const REASONS = {
  allowlist:'not in project allowlist',configured:'not a configured model selection',
  withdrawn:'no longer in engine catalog',noCatalog:'no catalog for engine',
  notReady:'engine not ready (list_team_setup)',notListed:'not listed by live list_team_setup',
  staleNoLive:'catalog stale and no live readiness capture',opencode:'OpenCode preference missing or not chosen',
};
const sourceKeys=['config','bots','catalogs','policy','evidence','decisions','history','limits','opencode'];
function observation(value, now, label) {
  const at=typeof value==='string'?Date.parse(value):NaN;
  requireThat(Number.isFinite(at)&&at<=now,`invalid/future ${label}`);return at;
}
function sourceMap(map) { requireThat(map&&sourceKeys.every(k=>hashString(map[k]))&&Object.keys(map).length===sourceKeys.length,'complete current source fingerprints required'); }
function unknownModel() {
  const unknown=()=>({value:null,sourceRefs:[],observedAt:null,confidence:'low',status:'unverified',reasons:['complete historical option/route unavailable'],excluded:[]});
  return {modelFingerprint:null,hierarchy:{...unknown(),value:'unknown'},priceEvidence:unknown(),capabilities:{toolUse:unknown(),imageInput:unknown(),contextTokens:unknown()},decisionState:{needsUserChoice:true,reasons:['model evidence unavailable'],options:[{action:'defer'}]}};
}
function buildSnapshot(args) {
  canonical(args);
  const {project,now,maxAgeMinutes,catalogStaleHours,supply,configured,allowlist,teamSetup,opencode,policy,sources,
    evidence,decisions,preference,routeScopes,activeLimits,retired,currentFingerprints}=args;
  requireThat(nonempty(project)&&/^[\w.-]+$/.test(project)&&!forbidden.has(project)&&project!=='.'&&project!=='..','invalid project identity');
  requireThat(Number.isFinite(now)&&Number.isFinite(new Date(now).getTime())&&Number.isFinite(maxAgeMinutes)&&maxAgeMinutes>0&&Number.isFinite(catalogStaleHours)&&catalogStaleHours>0,'invalid snapshot time/settings');
  requireThat(supply&&Array.isArray(supply.engines)&&Array.isArray(configured)&&Array.isArray(allowlist)&&Array.isArray(evidence)&&Array.isArray(activeLimits),'snapshot collections required');
  requireThat(decisions&&routeScopes&&retired&&policy&&sources&&opencode,'snapshot maps required');sourceMap(currentFingerprints);
  for(const [k,state] of Object.entries(retired)){
    identity(k);requireThat(state&&typeof state.isRetired==='boolean'&&Number.isSafeInteger(state.retirementGeneration)&&state.retirementGeneration>=0&&(!state.isRetired||state.retirementGeneration>0),'invalid retained retirement history');
    if(state.modelOption!==undefined)requireThat(state.modelOption&&identity(k)+'/'+state.modelOption.id===k,'historical option identity mismatch');
  }
  for(const [k,route] of Object.entries(routeScopes)){identity(k);requireThat(Object.hasOwn(retired,k)&&route&&nonempty(route.providerId)&&nonempty(route.routeScope),'route lacks retained history/identity');}
  for(const source of Object.values(sources))if(source&&typeof source==='object')for(const field of ['mtime','observedAt','capturedAt'])if(source[field]!=null)observation(source[field],now,'source observation');
  const configuredSet=new Set(configured),allowedSet=new Set(allowlist);for(const k of [...configured,...allowlist])identity(k);
  let captureStatus='absent',detail='no live readiness capture',captureAt=null,instances=[];
  const options=i=>Array.isArray(i?.models?.options)?i.models.options:[];
  if(teamSetup!==null){
    captureAt=observation(teamSetup.capturedAt,now,'capture time');
    if(!teamSetup.data||!Array.isArray(teamSetup.data.instances)){captureStatus='inconsistent';detail='capture requires instances array';}
    else {
      const list=teamSetup.data.instances,ids=new Set();let inconsistent=false;
      for(const i of list){requireThat(i&&nonempty(i.instanceId)&&!ids.has(i.instanceId),'duplicate/invalid capture engine');ids.add(i.instanceId);
        for(const o of options(i)){const k=i.instanceId+'/'+o.id;identity(k);if(!configuredSet.has(k))inconsistent=true;}}
      if(inconsistent){captureStatus='inconsistent';detail='capture lists unconfigured identity';}
      else if(now-captureAt>maxAgeMinutes*60000){captureStatus='expired';detail='capture too old';}
      else{captureStatus='used';detail='configured identities cross-checked';instances=list;}
    }
  }
  const used=captureStatus==='used',live=new Set(instances.flatMap(i=>options(i).map(o=>i.instanceId+'/'+o.id)));
  const engineIds=new Set(),engines=[],internals=new Map(),universe=new Set([...allowlist,...configured,...live]);
  let expiry=now+maxAgeMinutes*60000,evidenceExpiry=null;if(used)expiry=Math.min(expiry,captureAt+maxAgeMinutes*60000);
  for(const e of supply.engines){
    requireThat(e&&nonempty(e.id)&&!engineIds.has(e.id)&&Array.isArray(e.options)&&Array.isArray(e.models),'complete engine options/observations required');engineIds.add(e.id);
    if(e.catalogAt!==null)observation(e.catalogAt,now,'catalog observation');
    const currentKeys=e.options.map(o=>e.id+'/'+o.id),history=Object.fromEntries(Object.entries(retired).filter(([k])=>identity(k)===e.id).map(([k,v])=>[k,v.retirementGeneration]));
    if(e.catalogAt!==null)for(const k of Object.keys(history))requireThat(retired[k].isRetired===!currentKeys.includes(k),'retirement state differs from complete catalog');
    const routes=Object.fromEntries(Object.entries(routeScopes).filter(([k])=>identity(k)===e.id));
    const records=evidence.filter(r=>identity(r.key)===e.id);
    const engine={id:e.id,driver:e.driver,options:e.options,modelRoutes:routes,evidence:records,retirementGenerations:history};
    let raw=null,resolved=null;const resolutions=new Map();
    if(currentKeys.length){const k=currentKeys[0],o=e.options[0],r=resolveModelEvidence({key:k,modelOption:o,engine,routeScope:routes[k]?.routeScope ?? '',evidence:records.filter(r=>r.key===k),decision:decisions[k]??null,preference:e.driver==='opencodeGo'?preference:null,retired:retired[k],now});raw=r.rawCatalogFingerprint;resolved=r.catalogFingerprint;resolutions.set(k,r);}
    if(!currentKeys.length){
      raw=fingerprint({engine:{id:e.id,driver:e.driver},models:[]});
      // A retained historical target lets the verified resolver fingerprint an empty current catalog with tombstone claims.
      const historical=Object.keys(history).find(k=>retired[k]?.modelOption&&routes[k]);
      if(historical){const r=resolveModelEvidence({key:historical,modelOption:retired[historical].modelOption,engine,routeScope:routes[historical].routeScope,evidence:records.filter(r=>r.key===historical),decision:null,preference:null,retired:retired[historical],now});raw=r.rawCatalogFingerprint;resolved=r.catalogFingerprint;}
      else if(!records.length)resolved=fingerprint({engine:{id:e.id,driver:e.driver},models:[],claims:[],retirementGenerations:history});
    }
    const inst=instances.find(i=>i.instanceId===e.id),catalogStale=e.catalogAt?now-Date.parse(e.catalogAt)>catalogStaleHours*3600000:null;
    engines.push({id:e.id,driver:e.driver,options:e.options,modelRoutes:routes,retirementGenerations:history,catalogAt:e.catalogAt,catalogStale,ready:used?(inst?Boolean(inst.ready):configured.some(k=>k.startsWith(e.id+'/'))?false:null):null,readySource:used?'list_team_setup':'unknown',effortLevels:used?inst?.effortLevels??null:null,rawCatalogFingerprint:raw,catalogFingerprint:resolved});
    internals.set(e.id,{engine,observed:e,resolutions});for(const k of currentKeys)universe.add(k);for(const m of e.models)if(m.usage!=null)universe.add(e.id+'/'+m.id);
  }
  const models=[...universe].sort(compare).map(key=>{
    const engineId=identity(key),model=key.slice(key.indexOf('/')+1),entry=internals.get(engineId),e=entry?.observed,em=engines.find(e=>e.id===engineId);
    const observed=e?.models.find(m=>m.id===model),current=e?.options.find(o=>o.id===model),state=retired[key],route=routeScopes[key];
    let resolution=unknownModel();
    if(entry&&state&&route&&(current||state.isRetired&&state.modelOption))resolution=entry.resolutions.get(key)??resolveModelEvidence({key,modelOption:current??state.modelOption,engine:entry.engine,routeScope:route.routeScope,evidence:entry.engine.evidence.filter(r=>r.key===key),decision:decisions[key]??null,preference:e.driver==='opencodeGo'?preference:null,retired:state,now});
    const reasons=[],flags=[];
    if(!allowedSet.has(key))reasons.push(REASONS.allowlist);if(!configuredSet.has(key))reasons.push(REASONS.configured);
    if(!e||!e.catalogAt)reasons.push(REASONS.noCatalog);else if(!current||observed?.inCatalog===false)reasons.push(REASONS.withdrawn);
    if(used&&em?.ready===false)reasons.push(REASONS.notReady);if(used&&em?.ready===true&&!live.has(key))reasons.push(REASONS.notListed);
    if(!used&&em?.catalogStale===true)reasons.push(REASONS.staleNoLive);
    const preferred=e?.driver==='opencodeGo'&&preference&&resolution.catalogFingerprint===preference.catalogFingerprint&&preference.confirmedBy==='user'&&preference.chosen?.includes(key)&&!resolution.decisionState.excludedAnswers?.some(a=>a.sourceRef===preference.sourceRef);
    if(e?.driver==='opencodeGo'&&!preferred)reasons.push(REASONS.opencode);
    if(em?.catalogStale)flags.push('catalog stale');if(!used)flags.push('readiness unverified');if(!observed?.usage)flags.push('never run here');if(resolution.priceEvidence.value===null)flags.push('price unknown');
    if(!reasons.length&&!used&&e?.catalogAt)expiry=Math.min(expiry,Date.parse(e.catalogAt)+catalogStaleHours*3600000);
    for(const field of ['tier','price','imageInput','contextTokens','toolUse']){
      const result=field==='tier'?resolution.hierarchy:field==='price'?resolution.priceEvidence:resolution.capabilities[field];
      for(const record of evidence.filter(r=>r.key===key&&r.field===field))if(result.status==='observed'&&result.sourceRefs.includes(record.sourceRef)&&!result.excluded.some(x=>x.sourceRef===record.sourceRef)){
        const until=Date.parse(record.validUntil);expiry=Math.min(expiry,until);evidenceExpiry=evidenceExpiry===null?until:Math.min(evidenceExpiry,until);
      }
    }
    const authorization={status:reasons.length?'refused':'allowed',reasons,flags};
    const relevant=allowedSet.has(key)&&configuredSet.has(key)&&Boolean(current);
    return {key,engine:engineId,model,allowlisted:allowedSet.has(key),configuredSelection:configuredSet.has(key),inCatalog:Boolean(current)&&observed?.inCatalog!==false,liveListed:used?live.has(key):null,opencodePreferred:e?.driver==='opencodeGo'?Boolean(preferred):null,
      authorization,...resolution,decisionState:{...resolution.decisionState,needsUserChoice:relevant&&resolution.decisionState.needsUserChoice,options:relevant?resolution.decisionState.options:[]}};
  });
  const capabilityPolicy={minOutcomes:policy.capability?.minOutcomes??2,minSuccessRate:policy.capability?.minSuccessRate??0.7};
  requireThat(Number.isSafeInteger(capabilityPolicy.minOutcomes)&&capabilityPolicy.minOutcomes>0&&Number.isFinite(capabilityPolicy.minSuccessRate)&&capabilityPolicy.minSuccessRate>=0&&capabilityPolicy.minSuccessRate<=1,'invalid capability policy');
  const snapshot={schema:2,project,observedAt:new Date(now).toISOString(),expiresAt:new Date(expiry).toISOString(),evidenceExpiresAt:evidenceExpiry===null?null:new Date(evidenceExpiry).toISOString(),maxAgeMinutes,catalogStaleHours,
    sources:{...sources,teamSetup:{path:teamSetup?.path??null,capturedAt:teamSetup?.capturedAt??null,status:captureStatus,detail}},engines,models,allowed:models.filter(m=>m.authorization.status==='allowed').map(m=>m.key),catalogModelsOmitted:0,currentFingerprints,capabilityPolicy,activeLimits,retired};
  return {...snapshot,hash:fingerprint(snapshot)};
}
function isFresh(snapshot,now,currentFingerprints) {
  try{
    sourceMap(currentFingerprints);canonical(snapshot);
    if(snapshot.schema!==2||!Number.isFinite(now))return false;
    const {hash,...content}=snapshot,at=Date.parse(snapshot.observedAt),until=Date.parse(snapshot.expiresAt);
    return hashString(hash)&&fingerprint(content)===hash&&Number.isFinite(at)&&Number.isFinite(until)&&until>=at&&now>=at&&now<=until&&(snapshot.evidenceExpiresAt===null||now<Date.parse(snapshot.evidenceExpiresAt))&&canonical(snapshot.currentFingerprints)===canonical(currentFingerprints);
  }catch{return false;}
}
function decide(snapshot,key) {
  try{identity(key);}catch{return {decision:'refused',reasons:['invalid model identity']};}
  const model=snapshot?.models?.find(m=>m.key===key);
  return model&&snapshot.allowed.includes(key)&&model.authorization.status==='allowed'?{decision:'allowed',reasons:[]}:{decision:'refused',reasons:model?.authorization.reasons??['not in provider snapshot']};
}
function evaluateTask(snapshot,key,profile,context) {
  canonical({snapshot,key,profile,context});
  const result=(decision,reasons,premiumJustification=null)=>({decision,reasons,needsUserChoice:decision==='held',premiumJustification});
  const auth=decide(snapshot,key);if(auth.decision==='refused')return result('refused',auth.reasons);
  const now=context.now;if(!isFresh(snapshot,now,context.currentFingerprints??snapshot.currentFingerprints))return result('refused',['invalid/expired/changed provider snapshot']);
  const cx=['low','medium','high'],budgets=['free-first','balanced','best-quality'];
  if(!profile||!nonempty(profile.slice)||!nonempty(profile.workKind)||!cx.includes(profile.complexity)||!budgets.includes(profile.budget)||!profile.needs||typeof profile.needs.toolUse!=='boolean'||typeof profile.needs.imageInput!=='boolean'||!Number.isSafeInteger(profile.needs.contextTokens)||profile.needs.contextTokens<0)return result('refused',['invalid task profile']);
  if(profile.estimatedTokens!==undefined&&(!profile.estimatedTokens||!['input','output','cachedInput'].every(k=>Number.isSafeInteger(profile.estimatedTokens[k])&&profile.estimatedTokens[k]>=0)))return result('refused',['invalid estimated token counts']);
  const m=snapshot.models.find(m=>m.key===key),refused=[],held=[];
  const limits=[...snapshot.activeLimits,...(context.limits??[])];
  for(const l of limits){
    requireThat(l&&nonempty(l.engine),'invalid limit');if(l.at!==undefined)observation(l.at,now,'limit observation');
    const end=l.until??l.resetAt??l.expiresAt,until=end==null?Infinity:Date.parse(end);requireThat(Number.isFinite(until)||until===Infinity,'invalid limit expiry');
    if(l.engine===m.engine&&(l.scope!=='model'||l.model===m.model)&&until>now)refused.push('active account/model limit');
  }
  for(const field of ['toolUse','imageInput'])if(profile.needs[field]){const value=m.capabilities[field].value;if(value===false)refused.push(`known incapable: ${field}`);else if(value!==true)held.push(`unknown required capability: ${field}`);}
  if(profile.needs.contextTokens>0){const value=m.capabilities.contextTokens.value;if(value===null)held.push('unknown required capability: contextTokens');else if(value<profile.needs.contextTokens)refused.push('known incapable: contextTokens');}
  let success=0,failure=0;
  for(const o of context.outcomes??[]){
    if(o.engine!==m.engine||o.model!==m.model||!cx.includes(o.complexity)||['limit','transient'].includes(o.result))continue;
    requireThat(['ok','broken','too-big','spec','repeated'].includes(o.result),'invalid applicable outcome result');
    if(o.at!==undefined)observation(o.at,now,'outcome observation');
    if(o.result==='ok'&&cx.indexOf(o.complexity)>=cx.indexOf(profile.complexity))success++;
    if(o.result!=='ok'&&cx.indexOf(o.complexity)<=cx.indexOf(profile.complexity))failure++;
  }
  const count=success+failure,proven=count>=snapshot.capabilityPolicy.minOutcomes&&success/count>=snapshot.capabilityPolicy.minSuccessRate;
  if(count>=snapshot.capabilityPolicy.minOutcomes&&!proven)refused.push('known incapable: outcome threshold');
  function approved(a){
    if(!a||a.approvedBy!=='user'||!nonempty(a.sourceRef)||!Array.isArray(a.keys)||!a.keys.includes(key)||a.profileHash!==fingerprint(profile))return false;
    sourceUrl(a.sourceRef);const start=Date.parse(a.approvedAt),end=Date.parse(a.expiresAt);return Number.isFinite(start)&&Number.isFinite(end)&&start<=now&&end>start&&now<=end;
  }
  if(profile.complexity!=='low'&&!proven&&!approved(context.unprovenAcceptance))held.push('capability outcomes unproven; smaller authorized pilot or exact user acceptance required');
  const tier=m.hierarchy.value;
  if(tier==='unknown')held.push('provider tier unresolved');
  const price=m.priceEvidence.value;
  if(!price||price.input===null||price.output===null||(profile.estimatedTokens?.cachedInput>0&&price.cachedInput===null))held.push('price evidence unresolved');
  let justification=null;
  if(tier==='premium'){
    const need=profile.premiumNeed;
    const justified=need&&Array.isArray(need.requirementIds)&&need.requirementIds.length&&need.requirementIds.every(nonempty)&&nonempty(need.reason)&&Array.isArray(need.cheaperRejected)&&need.cheaperRejected.length&&need.cheaperRejected.every(r=>{
      if(!r||!nonempty(r.key)||r.key===key||!nonempty(r.reason)||!nonempty(r.evidenceRef))return false;
      try{identity(r.key);sourceUrl(r.evidenceRef);return true;}catch{return false;}
    });
    if(!justified)refused.push('premium requires documented task need and cheaper-alternative evidence');
    if(!approved(context.approval))refused.push('premium requires exact current user permission');
    if(justified&&approved(context.approval))justification={need,sourceRef:context.approval.sourceRef,profileHash:fingerprint(profile)};
  }
  if(refused.length)return result('refused',[...new Set(refused)],justification);
  return held.length?result('held',[...new Set(held)],justification):result('allowed',[],justification);
}
module.exports = {buildSnapshot,isFresh,decide,REASONS,fingerprint,resolveModelEvidence,evaluateTask};
