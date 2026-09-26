import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  /dotenv\.config\(\);/,
  `dotenv.config();\nconsole.log("SERVER ENV KEYS:", Object.keys(process.env).filter(k => k.includes('SUPA')));`
);
fs.writeFileSync('server.ts', code);
