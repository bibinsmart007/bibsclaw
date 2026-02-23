const fs = require('fs');
let content = fs.readFileSync('ROADMAP.md', 'utf8');
content = content.replace('STARTED', 'COMPLETED');
const lines = content.split('\n');
let inPhase2 = false;
const result = lines.map(line => {
  if (line.includes('Phase 2:')) inPhase2 = true;
  if (line.includes('Phase 3:')) inPhase2 = false;
  if (inPhase2 && line.match(/^- \[ \]/)) {
    return line.replace('[ ]', '[x]');
  }
  return line;
});
fs.writeFileSync('ROADMAP.md', result.join('\n'));
console.log('ROADMAP updated');