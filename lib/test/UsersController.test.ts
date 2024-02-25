import { UsersController } from '../UsersController';
import { assert } from 'chai';
import { createHash } from 'crypto';

describe('UsersController', () => {
  describe('login', () => {
    it('should return a consistent hash token for the same username', () => {
      const username = 'testUser';
      const password = 'password';
      const token1 = UsersController.login(username, password);
      const token2 = UsersController.login(username, password);
      assert.equal(token1, token2, 'Tokens should match for the same username');
    });

    it('should return different tokens for different usernames', () => {
      const username1 = 'userOne';
      const password1 = 'password';
      const username2 = 'userTwo';
      const password2 = 'password';
      const token1 = UsersController.login(username1, password1);
      const token2 = UsersController.login(username2, password2);
      assert.notEqual(token1, token2, 'Tokens should not match for different usernames');
    });

    it('should handle empty username and password gracefully', () => {
      const username = '';
      const password = '';
      const token = UsersController.login(username, password);
      const expectedToken = createHash('sha256').update(username).digest('hex');
      assert.equal(token, expectedToken, 'Should return a specific hash for empty inputs');
    });
  });
});
