const fs = require('node:fs'), cp = require('node:child_process');
const safeId = id => typeof id === 'string' && /^[\w.-]+\/[\w./:-]+$/.test(id);
function parse(text) {
  const clean = text.replace(/\x1b\[[0-9;]*m/g, '').trim();
  let rows;
  try { const json = JSON.parse(clean); rows = Array.isArray(json) ? json : json.models; } catch {}
  if (!Array.isArray(rows)) {
    rows = [];
    const lines = clean.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const id = lines[i].trim();
      if (!safeId(id)) continue;
      let metadata = {};
      if (lines[i + 1]?.trim() === '{') {
        let chunk = '';
        for (let j = i + 1; j < lines.length; j++) {
          chunk += lines[j] + '\n';
          try { metadata = JSON.parse(chunk); i = j; break; } catch {}
        }
      }
      rows.push({...metadata, id});
    }
  }
  return rows.filter(r => r && safeId(r.id)).map(r => ({id: r.id,
    price: r.priceReported === 'free' || (r.cost?.input === 0 && r.cost?.output === 0) ? 'free' :
      r.cost?.input > 0 || r.cost?.output > 0 || r.priceReported === 'paid' ? 'paid' : 'unknown'}));
}
function command(binary, args, timeout) {
  // Model IDs are validated before reaching cmd.exe; no arbitrary shell text.
  return cp.spawnSync(binary, args, {encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024,
    windowsHide: true, shell: process.platform === 'win32' && /\.cmd$/i.test(binary)});
}
function discover(file, options = {}) {
  const binary = options.binary || process.env.FACTORY_OPENCODE_BIN || (process.platform === 'win32' ? 'opencode.cmd' : 'opencode');
  const args = options.args || JSON.parse(process.env.FACTORY_OPENCODE_MODELS_ARGS || '["models","--standalone"]');
  const run = options.run || command;
  const listing = run(binary, args, 20000), models = parse(listing.stdout || '');
  const record = {observedAt: new Date().toISOString(), binary, args,
    runArgs: JSON.parse(process.env.FACTORY_OPENCODE_RUN_ARGS || '[]'), listingStatus: listing.status,
    reason: listing.error?.message || (listing.status !== 0 ? (listing.stderr || 'listing failed').slice(-1000) : !models.length ? 'empty model output; availability unverified' : null), models: []};
  for (const model of models) {
    const row = {...model, listed: true, responded: false, elapsedMs: null, reason: null};
    if (listing.status !== 0 || listing.error) row.reason = 'listing failed; no probes';
    else if (model.price !== 'free') row.reason = `skipped: ${model.price} price; explicit free evidence required`;
    else {
      const started = Date.now();
      const result = run(binary, ['run', ...JSON.parse(process.env.FACTORY_OPENCODE_RUN_ARGS || '[]'), '--model', model.id, '--format', 'json', 'Reply ONLY OK. Do not use tools or edit files.'], 10000);
      row.elapsedMs = Date.now() - started;
      // A successful process/step event alone does not prove a model answered.
      const events = (result.stdout || '').split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
      row.responded = !result.error && result.status === 0 && !events.some(e => e.type === 'error') && events.some(e => e.type === 'text' && typeof e.part?.text === 'string' && e.part.text.trim());
      row.reason = row.responded ? 'text response confirmed' : result.error?.message || events.find(e => e.type === 'error')?.error?.message || (result.stderr || 'no confirmed text response').slice(-1000);
    }
    record.models.push(row);
  }
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  return record;
}
function preference(record, policy) {
  const options = [...new Set((record?.models || []).filter(m => m.responded && m.price === 'free').map(m => m.id))];
  const p = policy.opencodePreference;
  const fresh = record && Date.now() - Date.parse(record.observedAt) >= 0 && Date.now() - Date.parse(record.observedAt) <= 86400000 && record.listingStatus === 0;
  const valid = p && Array.isArray(p.chosen) && p.chosen.length && p.chosen.every(id => options.includes(id)) &&
    Array.isArray(p.offered) && options.every(id => p.offered.includes(id)) && Number.isFinite(Date.parse(p.askedAt));
  return {needsUserChoice: !fresh || !valid, options, chosen: fresh && valid ? p.chosen : [],
    reason: !fresh ? 'OpenCode discovery missing, failed or older than one day' : !valid ? 'OpenCode preference missing, retired choice or newly discovered options; ask user' : null};
}
module.exports = {parse, discover, preference};
