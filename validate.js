const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const start = html.indexOf('<script>') + 8;
const end = html.indexOf('</script>');
const js = html.slice(start, end);
try {
  new Function(js);
  console.log('JS syntax: OK');
} catch(e) {
  console.log('JS ERROR:', e.message);
  // Show context around error
  const line = parseInt(e.message.match(/position (\d+)/)?.[1] || 0);
  if (line) {
    console.log('Context:', js.slice(Math.max(0, line-50), line+50));
  }
}
