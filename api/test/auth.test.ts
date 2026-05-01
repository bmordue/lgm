import assert = require("assert");

// We need to reset module state between tests since the usersByEmail map is module-level.
// We do this by clearing NODE_ENV and DEV_STUB_USER env vars and re-requiring the module.

describe("auth middleware", function () {
  let loadUser: any;
  let requireAuth: any;
  let requireProxyAuth: any;

  function makeReqRes(headers: Record<string, string> = {}) {
    const locals: Record<string, any> = {};
    const res: any = {
      locals,
      statusCode: 200,
      _jsonData: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this._jsonData = data;
        return this;
      },
    };
    const req: any = { headers };
    return { req, res };
  }

  // Re-load the module fresh for each suite that needs a clean env
  function loadModule() {
    // Clear require cache for the auth module
    const modulePath = require.resolve('../middleware/auth');
    delete require.cache[modulePath];
    const mod = require('../middleware/auth');
    loadUser = mod.loadUser;
    requireAuth = mod.requireAuth;
    requireProxyAuth = mod.requireProxyAuth;
  }

  beforeEach(function () {
    delete process.env.DEV_STUB_USER;
    delete process.env.REQUIRE_PROXY_AUTH;
    process.env.NODE_ENV = 'test';
    loadModule();
  });

  afterEach(function () {
    delete process.env.DEV_STUB_USER;
    delete process.env.REQUIRE_PROXY_AUTH;
  });

  describe("loadUser", function () {
    it("should set user from Remote-User header", function (done) {
      const { req, res } = makeReqRes({ 'remote-user': 'alice@example.com' });
      loadUser(req, res, () => {
        assert(res.locals.user, "user should be set");
        assert.equal(res.locals.user.email, 'alice@example.com');
        assert.equal(res.locals.user.id, 'alice@example.com');
        assert.equal(res.locals.user.isGuest, false);
        done();
      });
    });

    it("should fall back to Remote-Email when Remote-User is absent", function (done) {
      const { req, res } = makeReqRes({ 'remote-email': 'bob@example.com' });
      loadUser(req, res, () => {
        assert.equal(res.locals.user.email, 'bob@example.com');
        assert.equal(res.locals.user.isGuest, false);
        done();
      });
    });

    it("should normalise email to lowercase and trim whitespace", function (done) {
      const { req, res } = makeReqRes({ 'remote-user': '  CAROL@Example.COM  ' });
      loadUser(req, res, () => {
        assert.equal(res.locals.user.email, 'carol@example.com');
        done();
      });
    });

    it("should read Remote-Name and Remote-Groups", function (done) {
      const { req, res } = makeReqRes({
        'remote-user': 'dave@example.com',
        'remote-name': 'Dave Smith',
        'remote-groups': 'admins,players',
      });
      loadUser(req, res, () => {
        assert.equal(res.locals.user.name, 'Dave Smith');
        assert.deepEqual(res.locals.user.groups, ['admins', 'players']);
        done();
      });
    });

    it("should default name to email when Remote-Name is absent", function (done) {
      const { req, res } = makeReqRes({ 'remote-user': 'eve@example.com' });
      loadUser(req, res, () => {
        assert.equal(res.locals.user.name, 'eve@example.com');
        done();
      });
    });

    it("should return empty groups when Remote-Groups is absent", function (done) {
      const { req, res } = makeReqRes({ 'remote-user': 'frank@example.com' });
      loadUser(req, res, () => {
        assert.deepEqual(res.locals.user.groups, []);
        done();
      });
    });

    it("should use DEV_STUB_USER when no proxy headers and not production", function (done) {
      process.env.DEV_STUB_USER = 'stub@example.com:Stub User:testers,players';
      loadModule();

      const { req, res } = makeReqRes();
      loadUser(req, res, () => {
        assert.equal(res.locals.user.email, 'stub@example.com');
        assert.equal(res.locals.user.name, 'Stub User');
        assert.deepEqual(res.locals.user.groups, ['testers', 'players']);
        assert.equal(res.locals.user.isGuest, false);
        done();
      });
    });

    it("should parse DEV_STUB_USER with no groups", function (done) {
      process.env.DEV_STUB_USER = 'nogroup@example.com:No Group User:';
      loadModule();

      const { req, res } = makeReqRes();
      loadUser(req, res, () => {
        assert.equal(res.locals.user.email, 'nogroup@example.com');
        assert.deepEqual(res.locals.user.groups, []);
        done();
      });
    });

    it("should ignore DEV_STUB_USER in production mode", function (done) {
      process.env.DEV_STUB_USER = 'stub@example.com:Stub User:testers';
      process.env.NODE_ENV = 'production';
      loadModule();

      const { req, res } = makeReqRes();
      loadUser(req, res, () => {
        assert.equal(res.locals.user.isGuest, true, "Should be guest in production without proxy headers");
        done();
      });
    });

    it("should ignore DEV_STUB_USER when REQUIRE_PROXY_AUTH=true", function (done) {
      process.env.DEV_STUB_USER = 'stub@example.com:Stub User:testers';
      process.env.REQUIRE_PROXY_AUTH = 'true';
      loadModule();

      const { req, res } = makeReqRes();
      loadUser(req, res, () => {
        assert.equal(res.locals.user.isGuest, true, "Should be guest when REQUIRE_PROXY_AUTH=true without proxy headers");
        done();
      });
    });

    it("should fall back to guest sentinel when no proxy headers and no DEV_STUB_USER", function (done) {
      const { req, res } = makeReqRes();
      loadUser(req, res, () => {
        assert(res.locals.user, "user should be set");
        assert.equal(res.locals.user.id, 'guest');
        assert.equal(res.locals.user.isGuest, true);
        assert.deepEqual(res.locals.user.groups, []);
        done();
      });
    });
  });

  describe("requireAuth", function () {
    it("should call next() for authenticated user", function (done) {
      const { req, res } = makeReqRes();
      res.locals.user = { id: 'alice@example.com', email: 'alice@example.com', name: 'Alice', groups: [], isGuest: false };
      requireAuth(req, res, done);
    });

    it("should return 401 for guest sentinel", function () {
      const { req, res } = makeReqRes();
      res.locals.user = { id: 'guest', email: '', name: 'Guest', groups: [], isGuest: true };
      let nextCalled = false;
      requireAuth(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, false, "next should not be called");
      assert.equal(res.statusCode, 401);
    });

    it("should return 401 when no user is set", function () {
      const { req, res } = makeReqRes();
      let nextCalled = false;
      requireAuth(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, false, "next should not be called");
      assert.equal(res.statusCode, 401);
    });
  });

  describe("requireProxyAuth", function () {
    it("should call next() in development when Remote-User is absent", function (done) {
      process.env.NODE_ENV = 'development';
      loadModule();
      const { req, res } = makeReqRes();
      requireProxyAuth(req, res, done);
    });

    it("should return 401 in production when Remote-User is absent", function () {
      process.env.NODE_ENV = 'production';
      loadModule();
      const { req, res } = makeReqRes();
      let nextCalled = false;
      requireProxyAuth(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, false, "next should not be called in production without headers");
      assert.equal(res.statusCode, 401);
    });

    it("should return 401 when REQUIRE_PROXY_AUTH=true without headers", function () {
      process.env.REQUIRE_PROXY_AUTH = 'true';
      loadModule();
      const { req, res } = makeReqRes();
      let nextCalled = false;
      requireProxyAuth(req, res, () => { nextCalled = true; });
      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
    });

    it("should call next() in production when Remote-User header is present", function (done) {
      process.env.NODE_ENV = 'production';
      loadModule();
      const { req, res } = makeReqRes({ 'remote-user': 'alice@example.com' });
      requireProxyAuth(req, res, done);
    });
  });
});
