// @ts-check
const fs = require('fs');
const path = require('path');

// Load .env file from project root (local dev only)
const envPath = path.resolve(__dirname, '../.env');
const env = {};

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    env[key.trim()] = rest.join('=').trim();
  }
  console.log('✓ Loaded environment from .env file');
} else {
  console.log('No .env file found — reading from process.env (CI / server)');
}

// Merge process.env so environment variables from the build machine take precedence
const get = (key) => env[key] ?? process.env[key] ?? '';

const apiUrl = get('API_URL') || 'http://127.0.0.1:8000/api';

const buildContent = (production) => `export const environment = {
  production: ${production},
  apiUrl: '${apiUrl}',
};
`;

const envDir = path.resolve(__dirname, '../src/environments');
fs.writeFileSync(path.join(envDir, 'environment.ts'), buildContent(false));
fs.writeFileSync(path.join(envDir, 'environment.prod.ts'), buildContent(true));

console.log(`✓ Environment files written (apiUrl=${apiUrl})`);
