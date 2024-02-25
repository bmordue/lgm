import { createHash } from 'crypto';

export class UsersController {
  static login(username: string, password: string): string {
    const hash = createHash('sha256').update(username).digest('hex');
    return hash;
  }
}
