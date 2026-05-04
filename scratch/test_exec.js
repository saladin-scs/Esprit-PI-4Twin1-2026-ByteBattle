const fetch = require('node-fetch'); // wait fetch is built-in in node 22

fetch('http://localhost:3000/code-execution', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    language: 'javascript',
    code: 'const fs=require("fs"); console.log(fs.readFileSync(0, "utf8"));',
    testCases: [{ input: 'hello world\\n', expectedOutput: 'hello world\\n' }]
  })
}).then(r => r.json()).then(console.log).catch(console.error);
