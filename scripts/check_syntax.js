const fs = require('fs');
const path = require('path');
const vm = require('vm');
const htmlPath = path.resolve(__dirname, '..', 'igh_complete_FIXED.html');
const src = fs.readFileSync(htmlPath, 'utf8');
// Extract the first inline script without src attribute
const scriptRegex = /<script([^>]*?)>([\s\S]*?)<\/script>/gi;
let match, idx=0;
let found = null;
while((match = scriptRegex.exec(src)) !== null){
  const attrs = match[1];
  if(!/src\s*=/.test(attrs)){
    found = match[2];
    idx++;
    break;
  }
}
if(!found){
  console.error('No inline script found');
  process.exit(2);
}
try{
  // Try to compile via VM to find syntax errors
  new vm.Script(found, {filename: 'inline-script.js'});
  console.log('No syntax errors found by vm.Script');
} catch(e){
  console.error('Syntax error:', e && e.message);
  if(e.stack) console.error(e.stack);
  process.exit(1);
}