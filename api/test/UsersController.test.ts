import assert = require("assert");
import * as UsersController from "../controllers/UsersController";
import { clearAuthStore } from "../service/AuthService";

function makeResponse() {
  return {
    statusCode: 0,
    jsonData: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
      return this;
    }
  };
}

describe("UsersController", function () {
  beforeEach(function () {
    clearAuthStore();
  });

  describe("registerUser", function () {
    it("should register a user and return a token", async function () {
      const mockContext: any = {
        requestBody: { username: "testuser", password: "testpass" },
        res: makeResponse()
      };

      await UsersController.registerUser(mockContext);

      assert.equal(mockContext.res.statusCode, 201);
      assert.equal(mockContext.res.jsonData.user.email, 'testuser');
      assert.equal(typeof mockContext.res.jsonData.token, 'string');
    });
  });

  describe("loginUser", function () {
    it("should authenticate a registered user", async function () {
      const registrationContext: any = {
        requestBody: { username: "testuser", password: "testpass" },
        res: makeResponse()
      };

      await UsersController.registerUser(registrationContext);

      const mockContext: any = {
        requestBody: { username: "testuser", password: "testpass" },
        res: makeResponse()
      };

      await UsersController.loginUser(mockContext);

      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(mockContext.res.jsonData.user.email, 'testuser');
      assert.equal(typeof mockContext.res.jsonData.token, 'string');
    });
  });

  describe("getCurrentUser", function () {
    it("should return guest user when no auth context is set", function () {
      const mockContext: any = {
        req: {
          res: {
            locals: {}
          }
        },
        res: makeResponse()
      };

      UsersController.getCurrentUser(mockContext);

      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(mockContext.res.jsonData.id, 'guest');
      assert.equal(mockContext.res.jsonData.isGuest, true);
    });

    it("should return user from res.locals when set by middleware", function () {
      const mockUser = {
        id: 'alice@example.com',
        email: 'alice@example.com',
        name: 'Alice',
        groups: ['players'],
        isGuest: false
      };

      const mockContext: any = {
        req: {
          res: {
            locals: { user: mockUser }
          }
        },
        res: makeResponse()
      };

      UsersController.getCurrentUser(mockContext);

      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(mockContext.res.jsonData.id, 'alice@example.com');
      assert.equal(mockContext.res.jsonData.email, 'alice@example.com');
      assert.equal(mockContext.res.jsonData.name, 'Alice');
      assert.equal(mockContext.res.jsonData.isGuest, false);
    });

    it("should return 401 for an invalid bearer token", function () {
      const mockContext: any = {
        req: {
          res: {
            locals: { authError: 'Invalid authentication token' }
          }
        },
        res: makeResponse()
      };

      UsersController.getCurrentUser(mockContext);

      assert.equal(mockContext.res.statusCode, 401);
      assert.equal(mockContext.res.jsonData.message, 'Invalid authentication token');
    });
  });
});
