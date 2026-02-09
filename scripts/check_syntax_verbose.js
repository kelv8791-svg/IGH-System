const fs = require('fs');
const path = require('path');
const vm = require('vm');
const htmlPath = path.resolve(__dirname, '..', 'igh_complete_FIXED.html');
const src = fs.readFileSync(htmlPath, 'utf8');
// Extract all inline scripts without src attribute
const scriptRegex = /<script([^>]*?)>([\s\S]*?)<\/script>/gi;
let match, i=0;
while((match = scriptRegex.exec(src)) !== null){
  const attrs = match[1];
  if(/src\s*=/.test(attrs)) continue;
  i++;
  const found = match[2];
  console.log('--- SCRIPT #' + i + ' LENGTH: ' + found.length + ' ---');
  console.log(found.slice(0,1000));
  try{
    new vm.Script(found, {filename: `inline-script-${i}.js`});
    console.log('No syntax error detected by vm.Script');
  } catch(e){
    console.error('vm.Script error:', e && e.message);
    if(e.stack) console.error(e.stack);
  }

  try{
    // try function constructor to get error position if any
    new Function(found);
    console.log('No syntax error detected by new Function');
  } catch(e){
    console.error('new Function error:', e && e.message);
    console.error(e.stack);
  }
}
if(i===0) console.log('No inline scripts found');
