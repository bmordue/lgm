import { ExegesisContext } from "exegesis";
import * as crypto from 'crypto';

const userTokens: UserToken[] = []

export function loginUser(context: ExegesisContext) {
  const { username, password } = context.requestBody;

  if (!username || !password) {
    context.res.status(400).json({ message: 'Username and password are required.' });
    return;
  }

  const input = `${username}${password}secretsalt`;
  const generatedToken = crypto.createHash('sha256').update(input).digest('hex');

  const existingUser = userTokens.find(u => u.username == username);
  if (existingUser && existingUser.token != generatedToken) {
    context.res.status(401).json({ message: 'Invalid username or password' });
    return;
  }

  userTokens.push({ username, token: generatedToken });

  context.res.status(200).json({ token: generatedToken });
}

export function tokenExists(token: string) {
  return userTokens.find(u => u.token == token) != null;
}

export function userForToken(token: string) {
  const foundUser = userTokens.find(u => u.token == token);
  if (!foundUser) {
    console.log(JSON.stringify(userTokens, null, 4));
  }
  return foundUser;
}

interface UserToken {
  username: string,
  token: string
}
