import 'dotenv/config';
import { getAccessTokenSecret } from '../../config/auth-secrets.js';

export const randomString = (length = 60) => {
  let output = '';
  const secret = getAccessTokenSecret();

  for (let i = 0; i < length; i++) {
    output += secret[Math.floor(Math.random() * secret.length)];
  }

  return output;
};