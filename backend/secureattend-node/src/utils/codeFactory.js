import { randomUUID } from 'crypto';

const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateQrToken() {
  return 'QR_' + randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();
}

export function generateCodeword() {
  let word = '';
  for (let i = 0; i < 6; i++) {
    word += ALPHANUM.charAt(Math.floor(Math.random() * ALPHANUM.length));
  }
  return word;
}
