const fs = require('node:fs');

const REQUIRED = ['Goal', 'Project and revision', 'Mentor and worker route', 'Expected change surface',
  'Files and interfaces', 'Files not to touch', 'Constraints', 'Example patterns', 'Acceptance commands', 'Stuck protocol'];

function checkBrief(text) {
  const sections = new Map();
  let current, fence;
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    const heading = !fence && line.match(/^## +(.+?)\s*$/);
    if (heading) {
      current = heading[1].toLowerCase();
      if (!sections.has(current)) sections.set(current, []);
    } else if (current) sections.get(current).push(line);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
    }
  }
  const findings = [];
  for (const name of REQUIRED) {
    const lines = sections.get(name.toLowerCase());
    if (!lines) findings.push('Missing brief section: ' + name);
    else {
      const body = lines.join('\n').trim();
      if (!body || /^<[\s\S]*>$/.test(body)) findings.push('Unfilled brief section: ' + name);
    }
  }
  return {pass: findings.length === 0, findings};
}

function checkBriefFile(file) {
  try { return checkBrief(fs.readFileSync(file, 'utf8')); }
  catch (error) { return {pass: false, findings: ['Cannot read brief: ' + error.message]}; }
}

module.exports = {REQUIRED, checkBrief, checkBriefFile};
