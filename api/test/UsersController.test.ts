import assert = require("assert");
import * as UsersController from "../controllers/UsersController";

describe("UsersController", function () {
  describe("loginUser", function () {
    it("should return 400 when username is missing", async function () {
      const mockContext: any = {
        requestBody: { password: "testpass" },
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

      await UsersController.loginUser(mockContext);
      
      assert.equal(mockContext.res.statusCode, 400);
      assert.equal(mockContext.res.jsonData.message, "Username and password are required.");
    });

    it("should return 400 when password is missing", async function () {
      const mockContext: any = {
        requestBody: { username: "testuser" },
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

      await UsersController.loginUser(mockContext);
      
      assert.equal(mockContext.res.statusCode, 400);
      assert.equal(mockContext.res.jsonData.message, "Username and password are required.");
    });

    it("should create a new user and return token", async function () {
      const username = "newuser_" + Date.now(); // Unique username to avoid conflicts
      
      const mockContext: any = {
        requestBody: { username, password: "testpass123" },
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

      await UsersController.loginUser(mockContext);
      
      assert.equal(mockContext.res.statusCode, 200);
      assert(mockContext.res.jsonData.token, "Should have a token");
      assert(typeof mockContext.res.jsonData.token === "string", "Token should be a string");
    });

    it("should return token for existing user with correct password", async function () {
      const username = "existinguser_" + Date.now();
      const password = "testpass123";
      
      // First login to create the user
      const mockContext1: any = {
        requestBody: { username, password },
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

      await UsersController.loginUser(mockContext1);
      const firstToken = mockContext1.res.jsonData.token;

      // Second login with same credentials
      const mockContext2: any = {
        requestBody: { username, password },
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

      await UsersController.loginUser(mockContext2);
      
      assert.equal(mockContext2.res.statusCode, 200);
      assert.equal(mockContext2.res.jsonData.token, firstToken, "Should return same token");
    });

    it("should return 401 for existing user with wrong password", async function () {
      const username = "wrongpassuser_" + Date.now();
      
      // First login to create the user
      const mockContext1: any = {
        requestBody: { username, password: "correctpass" },
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

      await UsersController.loginUser(mockContext1);

      // Second login with wrong password
      const mockContext2: any = {
        requestBody: { username, password: "wrongpass" },
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

      await UsersController.loginUser(mockContext2);
      
      assert.equal(mockContext2.res.statusCode, 401);
      assert.equal(mockContext2.res.jsonData.message, "Invalid username or password");
    });
  });

  describe("tokenExists", function () {
    it("should return false for non-existent token", function () {
      const result = UsersController.tokenExists("nonexistent_token_12345");
      assert.equal(result, false);
    });

    it("should return true for existing token", async function () {
      const username = "tokentest_" + Date.now();
      
      const mockContext: any = {
        requestBody: { username, password: "testpass" },
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

      await UsersController.loginUser(mockContext);
      const token = mockContext.res.jsonData.token;
      
      const result = UsersController.tokenExists(token);
      assert.equal(result, true);
    });
  });

  describe("userForToken", function () {
    it("should return user for valid token", async function () {
      const username = "userfortoken_" + Date.now();
      
      const mockContext: any = {
        requestBody: { username, password: "testpass" },
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

      await UsersController.loginUser(mockContext);
      const token = mockContext.res.jsonData.token;
      
      const user = UsersController.userForToken(token);
      assert(user, "Should return user object");
      assert.equal(user.username, username);
      assert.equal(user.token, token);
    });

    it("should return undefined for invalid token", function () {
      const user = UsersController.userForToken("invalid_token_12345");
      assert.equal(user, undefined);
    });
  });
});
