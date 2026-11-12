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
      for(const k of [...preference.chosen,...preference.offered])identity(k);
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
module.exports = {fingerprint, resolveModelEvidence};
