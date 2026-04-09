const fs = require('fs');
const path = process.argv[2] || 'frontend/src/components/AgreementPage/BLAgreement.js';
const s = fs.readFileSync(path, 'utf8');
let line = 1; let stack = [];
let inSingle=false, inDouble=false, inBack=false, inLineComment=false, inBlockComment=false;
for (let i=0;i<s.length;i++){
  const c = s[i];
  if (c === '\n') { line++; inLineComment = false; }
  if (inLineComment || inBlockComment) {
    if (!inBlockComment && inLineComment) continue;
    if (inBlockComment && c === '*' && s[i+1] === '/') { inBlockComment = false; i++; continue; }
    if (inLineComment) continue;
  }
  if (!inSingle && !inDouble && !inBack) {
    if (c === '/' && s[i+1] === '/') { inLineComment = true; i++; continue; }
    if (c === '/' && s[i+1] === '*') { inBlockComment = true; i++; continue; }
  }
  if (!inLineComment && !inBlockComment) {
    if (c === "'" && !inDouble && !inBack) { inSingle = !inSingle; continue; }
    if (c === '"' && !inSingle && !inBack) { inDouble = !inDouble; continue; }
    if (c === '`' && !inSingle && !inDouble) { inBack = !inBack; continue; }
  }
  if (inSingle || inDouble || inBack || inLineComment || inBlockComment) continue;
  if (c === '{' || c === '(') { stack.push({c,line}); }
  if (c === '}') { const last = stack.pop(); if (!last || last.c !== '{') { console.log('Mismatch } at line', line); process.exit(0);} }
  if (c === ')') { const last = stack.pop(); if (!last || last.c !== '(') { console.log('Mismatch ) at line', line); process.exit(0);} }
}
if (stack.length) console.log('Unclosed at EOF, first unclosed at line', stack[stack.length-1].line, 'char', stack[stack.length-1].c);
else console.log('Braces/paren balanced');
