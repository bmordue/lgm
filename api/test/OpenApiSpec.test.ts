import assert = require("assert");
import fs = require("fs");
import path = require("path");
const yaml = require("js-yaml");

describe("OpenAPI spec", function () {
  function loadSpec(): any {
    const specPath = path.resolve(__dirname, "../../spec/api.yml");
    return yaml.load(fs.readFileSync(specPath, "utf8"));
  }

  it("documents the implemented create/join game responses", function () {
    const spec = loadSpec();

    assert.equal(
      spec.paths["/games"].post.responses["201"].content["application/json"].schema.$ref,
      "#/components/schemas/GameCreatedResponse"
    );
    assert.deepEqual(spec.components.schemas.GameCreatedResponse.required, ["gameId"]);
    assert.equal(spec.components.schemas.GameCreatedResponse.properties.gameId.type, "integer");

    assert.equal(
      spec.paths["/games/{id}"].put.responses["200"].content["application/json"].schema.$ref,
      "#/components/schemas/JoinGameResponse"
    );
    assert.equal(
      spec.paths["/games/{id}"].put.responses["404"].content["application/json"].schema.$ref,
      "#/components/schemas/ErrorMessageResponse"
    );
  });

  it("documents order submission and turn result response bodies", function () {
    const spec = loadSpec();

    assert.equal(
      spec.paths["/games/{gameId}/turns/{turn}/players/{playerId}"].post.responses["200"].content["application/json"].schema.$ref,
      "#/components/schemas/PostOrdersResponse"
    );
    assert.equal(spec.components.schemas.PostOrdersResponse.properties.turnStatus.properties.complete.type, "boolean");

    assert.equal(
      spec.paths["/games/{gameId}/turns/{turn}/players/{playerId}"].get.responses["200"].content["application/json"].schema.$ref,
      "#/components/schemas/TurnResultsResponse"
    );
    assert.deepEqual(spec.components.schemas.TurnResultsResponse.required, ["world"]);
    assert.equal(spec.components.schemas.TurnResultsResponse.properties.world.$ref, "#/components/schemas/World");
    assert.equal(
      spec.paths["/games/{gameId}/turns/{turn}/players/{playerId}"].get.responses["404"].content["application/json"].schema.$ref,
      "#/components/schemas/ErrorMessageResponse"
    );
  });

  it("documents actor orders using the implemented order schema", function () {
    const spec = loadSpec();

    assert.equal(
      spec.components.schemas.TurnOrders.properties.orders.items.$ref,
      "#/components/schemas/ActorOrders"
    );
    assert.deepEqual(spec.components.schemas.ActorOrders.required, ["actorId", "orderType"]);
    assert.deepEqual(spec.components.schemas.ActorOrders.properties.orderType.enum, [0, 1]);
    assert.equal(
      spec.components.schemas.ActorOrders.properties.ordersList.items.$ref,
      "#/components/schemas/Direction"
    );
  });
});
