import { Request, Response } from 'express';
import * as crypto from 'crypto';

export class UsersController {
  public loginUser(req: Request, res: Response): void {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: 'Username and password are required.' });
      return;
    }

    const token = crypto.createHash('sha256').update(username).digest('hex');
    res.status(200).json({ token });
  }
}
