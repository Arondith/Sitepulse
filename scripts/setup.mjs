import {randomBytes} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
if(existsSync('.env')){console.log('.env already exists; left unchanged.');process.exit(0)}
writeFileSync('.env',`DB_PASSWORD=${randomBytes(24).toString('hex')}\nAPI_TOKEN=${randomBytes(32).toString('hex')}\nALLOWED_ORIGINS=http://fixture\n`,{mode:0o600});
console.log('Created .env. Copy API_TOKEN into the dashboard after starting Docker Compose.');
