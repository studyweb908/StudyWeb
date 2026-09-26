import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  /console.error\("SERVER ERROR IN \/upload:", e\);\n    fs.appendFileSync\('\/app\/applet\/server_error.log', e.message \+ "\\n" \+ \(e.stack \|\| ""\) \+ "\\n"\);/,
  `console.error("SERVER ERROR IN /upload:", e);`
);
fs.writeFileSync('server.ts', code);
