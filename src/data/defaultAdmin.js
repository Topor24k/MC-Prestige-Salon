/*
 * The salon's built-in administrator: staff can sign in at /admin with this account on any
 * device, without a first-time setup. Only a salt and the hash of the password are kept
 * here — never the password itself.
 *
 * Change it with `npm run admin:set`. Set DEFAULT_ADMIN to null to go back to creating the
 * administrator on the first visit to /admin.
 *
 * This file ships with the site, so anyone can read the hash and try guesses against it.
 * Use a password that is not used for anything else.
 */
export const DEFAULT_ADMIN = {
  name: 'Kayeen Campaña',
  email: 'kayeencampana@gmail.com',
  salt: '7163c0aabd93eca38b1ec993e49731b8',
  hash: '22eb37502996f74be147d542ba24cbf0de6883d0c1514db751cae76e46042c52',
  algorithm: 'sha256-iterated',
};
