import { ExegesisContext } from "exegesis";
import { Request, Response } from 'express';
import * as crypto from 'crypto';

module.exports.loginUser = function (context: ExegesisContext): string {
  const { username, password } = context.requestBody;

  if (!username || !password) {
    context.res.status(400).json({ message: 'Username and password are required.' });
    return;
  }

  const token = crypto.createHash('sha256').update(username).digest('hex');
  context.res.status(200).json({ token });
  return token;
}

