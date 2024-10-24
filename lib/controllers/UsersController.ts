import { ExegesisContext } from "exegesis";
import * as bcrypt from 'bcrypt';

const userTokens: UserToken[] = []

export async function loginUser(context: ExegesisContext) {
  const { username, password } = context.requestBody;

  if (!username || !password) {
    context.res.status(400).json({ message: 'Username and password are required.' });
    return;
  }

  const existingUser = userTokens.find(u => u.username == username);
  if (existingUser) {
    const passwordMatch = await bcrypt.compare(password, existingUser.token);
    if (!passwordMatch) {
      context.res.status(401).json({ message: 'Invalid username or password' });
      return;
    }
  } else {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    userTokens.push({ username, token: hashedPassword });
  }

  const generatedToken = userTokens.find(u => u.username == username).token;
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
