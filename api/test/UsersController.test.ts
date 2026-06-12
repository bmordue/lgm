import assert = require("assert");
import * as UsersController from "../controllers/UsersController";

describe("UsersController", function () {
  describe("loginUser", function () {
    it("should return 410 Gone (login no longer supported)", async function () {
      const mockContext: any = {
        requestBody: { username: "testuser", password: "testpass" },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          json: function(data: any) {
            this.jsonData = data;
            return this;
          },
          statusCode: 0,
          jsonData: {}
        }
      };

      const result = await UsersController.loginUser(mockContext);

      assert.equal(mockContext.res.statusCode, 410);
      assert(result.message, "Should have a message");
    });
  });

  describe("getCurrentUser", function () {
    it("should return guest user when no proxy headers are set", async function () {
      const mockContext: any = {
        req: {
          res: {
            locals: {}
          }
        },
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0
        }
      };

      const result = await UsersController.getCurrentUser(mockContext);

      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(result.id, 'guest');
      assert.equal(result.isGuest, true);
    });

    it("should return user from res.locals when set by middleware", async function () {
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
        res: {
          status: function(code: number) {
            this.statusCode = code;
            return this;
          },
          statusCode: 0
        }
      };

      const result = await UsersController.getCurrentUser(mockContext);

      assert.equal(mockContext.res.statusCode, 200);
      assert.equal(result.id, 'alice@example.com');
      assert.equal(result.email, 'alice@example.com');
      assert.equal(result.name, 'Alice');
      assert.equal(result.isGuest, false);
    });
  });
});
