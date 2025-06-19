// @ts-nocheck // TODO: Remove this when types are sorted out for mocks

// Mock bcrypt before importing UsersController
const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn(),
};
jest.mock('bcrypt', () => mockBcrypt);

// Mock the internal userTokens array if needed, or test its behavior as is.
// For now, we'll test its state changes due to loginUser.
// If this gets too complex, we might need to mock the module's own state.

const UsersController = require('../UsersController');

describe('UsersController', () => {
  let mockContext: any;

  beforeEach(() => {
    // Reset mocks and any state if necessary
    jest.clearAllMocks();
    // Clear the userTokens array in the actual module if it's stateful and modified by tests
    // This is a bit tricky as it's module-level state.
    // For true unit tests, this state should ideally be managed via instances or dependency injection.
    // As a workaround for this structure, we can try to reset it or ensure tests account for its state.
    // Let's assume for now that each test sequence manages.
    // If UsersController.userTokens was exported, we could clear it.
    // Since it's not, tests will interact with the shared state.
    // This is okay for this example, but in larger apps, avoid module-level mutable state.

    mockContext = {
      req: {},
      res: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      },
      requestBody: {},
    };
  });

  describe('loginUser', () => {
    // Need to manually clear the userTokens array from UsersController
    // This is a common issue with module-level state in Node.js tests.
    // One way is to export a reset function from the module, or re-require the module.
    // For simplicity here, we acknowledge this limitation.
    // A better approach would be for userTokens to not be a module-level const.
    // For the purpose of this test, we will test scenarios sequentially,
    // understanding that userTokens might persist between tests if not handled.
    // The tests below are written to be somewhat independent by using different usernames.

    it('should return 400 if username is missing', async () => {
      mockContext.requestBody = { password: 'password123' };
      await UsersController.loginUser(mockContext);

      expect(mockContext.res.status).toHaveBeenCalledWith(400);
      expect(mockContext.res.json).toHaveBeenCalledWith({ message: 'Username and password are required.' });
    });

    it('should return 400 if password is missing', async () => {
      mockContext.requestBody = { username: 'testuser' };
      await UsersController.loginUser(mockContext);

      expect(mockContext.res.status).toHaveBeenCalledWith(400);
      expect(mockContext.res.json).toHaveBeenCalledWith({ message: 'Username and password are required.' });
    });

    it('should create a new user and return a token if user does not exist', async () => {
      const username = 'newuser';
      const password = 'password123';
      const hashedPassword = 'hashedPassword123';
      mockContext.requestBody = { username, password };
      mockBcrypt.hash.mockResolvedValue(hashedPassword);

      // Ensure userTokens is clean or use a unique username
      // This test assumes 'newuser' is not already in UsersController.userTokens
      await UsersController.loginUser(mockContext);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(mockContext.res.status).toHaveBeenCalledWith(200);
      expect(mockContext.res.json).toHaveBeenCalledWith({ token: hashedPassword });
    });

    it('should return a token if user exists and password matches', async () => {
      // This test depends on the 'newuser' created in the previous test,
      // or requires pre-seeding the userTokens array, which is hard without exporting it or a reset function.
      // Let's assume 'newuser' was created and 'hashedPassword123' is its token.
      const username = 'existinguser';
      const password = 'password123';
      const hashedPassword = 'existingHashedPassword';

      // Manually add user for this test scenario - this is a workaround
      UsersController.userTokens.push({ username, token: hashedPassword });

      mockContext.requestBody = { username, password };
      mockBcrypt.compare.mockResolvedValue(true); // Password matches

      await UsersController.loginUser(mockContext);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockContext.res.status).toHaveBeenCalledWith(200);
      expect(mockContext.res.json).toHaveBeenCalledWith({ token: hashedPassword });

      // Clean up the user added for this test
      const index = UsersController.userTokens.findIndex(u => u.username === username);
      if (index > -1) UsersController.userTokens.splice(index, 1);
    });

    it('should return 401 if user exists and password does not match', async () => {
      const username = 'anotheruser';
      const password = 'wrongpassword';
      const hashedPassword = 'anotherHashedPassword';
      // Manually add user for this test scenario
      UsersController.userTokens.push({ username, token: hashedPassword });

      mockContext.requestBody = { username, password };
      mockBcrypt.compare.mockResolvedValue(false); // Password does not match

      await UsersController.loginUser(mockContext);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockContext.res.status).toHaveBeenCalledWith(401);
      expect(mockContext.res.json).toHaveBeenCalledWith({ message: 'Invalid username or password' });

      // Clean up
      const index = UsersController.userTokens.findIndex(u => u.username === username);
      if (index > -1) UsersController.userTokens.splice(index, 1);
    });
  });
});

// Hack to allow modification of userTokens for testing purposes
// This is not ideal for true unit testing but works around the module's design.
const actualUsersController = jest.requireActual('../UsersController');
if (!UsersController.userTokens) {
  UsersController.userTokens = actualUsersController.userTokens || [];
}
