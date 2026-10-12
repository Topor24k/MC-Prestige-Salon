/*
 * Sets the salon's built-in administrator account — the one that can sign in at /admin on
 * any device without a first-time setup.
 *
 *   npm run admin:set
 *
 * It asks for a name, an email and a password, then rewrites src/data/defaultAdmin.js.
 * The password itself is never written anywhere: only a random salt and the hash derived
 * from it. (ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD can be supplied as environment
 * variables instead of typing the answers.)
 */
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { env, exit, stdin, stdout } from 'node:process';
import { hashPassword } from '../src/lib/password.js';

const TARGET = fileURLToPath(new URL('../src/data/defaultAdmin.js', import.meta.url));
// The JS-only algorithm, because it can be checked on every device — including a phone
// opening the dev server over plain http, where the browser's Web Crypto is switched off.
const ALGORITHM = 'sha256-iterated';
const MIN_PASSWORD = 8; // same rule as the first-time setup form
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ask(question) {
  const prompt = createInterface({ input: stdin, output: stdout });
  const answer = await prompt.question(question);
  prompt.close();
  return answer.trim();
}

/** Reads a line without showing it on screen. */
function askHidden(question) {
  if (!stdin.isTTY) return ask(question);
  return new Promise((resolve) => {
    stdout.write(question);
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\u0003') exit(1); // Ctrl+C
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on('data', onData);
  });
}

const name = (env.ADMIN_NAME || (await ask('Administrator name: '))).trim();
const email = (env.ADMIN_EMAIL || (await ask('Email: '))).trim().toLowerCase();
const password = env.ADMIN_PASSWORD || (await askHidden('Password (hidden): '));

if (!name) {
  console.error('A name is required.');
  exit(1);
}
if (!EMAIL.test(email)) {
  console.error('That does not look like an email address.');
  exit(1);
}
if (password.length < MIN_PASSWORD) {
  console.error(`Use at least ${MIN_PASSWORD} characters for the password.`);
  exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = await hashPassword(password, salt, ALGORITHM);

/** A JavaScript single-quoted string literal. */
const quote = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const file = `/*
 * The salon's built-in administrator: staff can sign in at /admin with this account on any
 * device, without a first-time setup. Only a salt and the hash of the password are kept
 * here — never the password itself.
 *
 * Change it with \`npm run admin:set\`. Set DEFAULT_ADMIN to null to go back to creating the
 * administrator on the first visit to /admin.
 *
 * This file ships with the site, so anyone can read the hash and try guesses against it.
 * Use a password that is not used for anything else.
 */
export const DEFAULT_ADMIN = {
  name: ${quote(name)},
  email: ${quote(email)},
  salt: ${quote(salt)},
  hash: ${quote(hash)},
  algorithm: ${quote(ALGORITHM)},
};
`;

await writeFile(TARGET, file, 'utf8');
console.log(`Administrator set to ${name} <${email}>. Updated src/data/defaultAdmin.js.`);
