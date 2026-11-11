const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {spawnSync} = require('node:child_process');
const {REQUIRED, checkBrief, checkBriefFile} = require('./factory-brief.cjs');

const bodies = {
  'Goal': 'Return a safe display label when the incoming string is blank.',
  'Project and revision': 'Repository /fixture/project, baseline abc123, branch worker/labels; worker thread labels.',
  'Mentor and worker route': 'Mentor thread lead-labels; implement work kind; owner-authorized worker route in receipt.json.',
  'Expected change surface': 'src/label.js and test/label.test.js only.',
  'Files and interfaces': 'src/label.js: export function label(value: string): string. Preserve nonblank values; use Unknown for blank values.',
  'Files not to touch': 'Do not edit package.json, owner configuration, project memory, or other worktrees.',
  'Constraints': 'No dependencies. Keep existing callers and the exported signature compatible.',
  'Example patterns': 'src/name.js:12 copies this fallback pattern:\n```js\nreturn value.trim() || fallback;\n```',
  'Acceptance commands': 'From /fixture/project run `node --test test/label.test.js`. Expected: exit 0, three tests pass, including blank input.',
  'Stuck protocol': 'Ask the mentor in this worker thread with what was tried, failing output and one specific question. Escalate after the same check fails twice or evidence proves the brief wrong.',
};
const filled = REQUIRED.map(name => '## ' + name + '\n' + bodies[name] + '\n').join('\n');

test('complete brief passes; every missing required section is named', () => {
  assert.equal(checkBrief(filled).pass, true);
  assert.equal(checkBrief(filled.replace(/\n/g, '\r\n')).pass, true);
  for (const name of REQUIRED) {
    const incomplete = REQUIRED.filter(n => n !== name).map(n => '## ' + n + '\n' + bodies[n] + '\n').join('\n');
    assert.deepEqual(checkBrief(incomplete), {pass: false, findings: ['Missing brief section: ' + name]});
  }
});

test('every empty required section is rejected and named', () => {
  for (const name of REQUIRED) {
    const empty = REQUIRED.map(n => '## ' + n + '\n' + (n === name ? ' \t' : bodies[n]) + '\n').join('\n');
    assert.deepEqual(checkBrief(empty), {pass: false, findings: ['Unfilled brief section: ' + name]});
  }
});

test('the distributed template is unfilled and unreadable files fail', () => {
  const template = fs.readFileSync(path.join(__dirname, '../shared/templates/slice-brief.md'), 'utf8');
  const result = checkBrief(template);
  assert.equal(result.pass, false);
  assert.ok(result.findings.includes('Unfilled brief section: Files and interfaces'));
  assert.ok(result.findings.includes('Unfilled brief section: Example patterns'));
  assert.equal(checkBriefFile(path.join(__dirname, 'missing-brief.md')).pass, false);
});

test('copied markdown headings inside code patterns do not supply missing sections', () => {
  const missing = REQUIRED.filter(n => n !== 'Constraints').map(n => '## ' + n + '\n' + bodies[n] + '\n').join('\n');
  const withExample = missing.replace(bodies['Example patterns'], bodies['Example patterns'] + '\n```md\n## Constraints\nFake heading\n```');
  assert.ok(checkBrief(withExample).findings.includes('Missing brief section: Constraints'));
});

test('factory-gates brief CLI accepts filled files and rejects the unfilled template', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brief-gate-'));
  try {
    const file = path.join(dir, 'slice-brief.md'); fs.writeFileSync(file, filled);
    const cli = path.join(__dirname, 'factory-gates.cjs');
    const valid = spawnSync(process.execPath, [cli, 'brief', file], {encoding: 'utf8'});
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(JSON.parse(valid.stdout).pass, true);
    const template = spawnSync(process.execPath, [cli, 'brief', path.join(__dirname, '../shared/templates/slice-brief.md')], {encoding: 'utf8'});
    assert.equal(template.status, 1);
    assert.ok(JSON.parse(template.stdout).findings.includes('Unfilled brief section: Goal'));
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
