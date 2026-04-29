"use strict";

import * as store from "./DatabaseStore";
import logger = require("../utils/Logger");
import util = require("util");

import {
  TurnResult,
  World,
} from "./Models";

export interface TurnResultsResponse {
  success: boolean;
  world?: World;
  message?: string;
}

/**
 * get turn results
 *
 * id Integer
 * returns TurnResultsResponse
 **/

export async function turnResults(
  gameId: number,
  turn: number,
  playerId: number
): Promise<TurnResultsResponse> {
  const results = await store.readAll<TurnResult>(
    store.keys.turnResults,
    (r: TurnResult) => {
      return r.gameId == gameId && r.turn == turn && r.playerId == playerId;
    }
  );

  logger.debug(util.format("turnResults: found %s results", results.length));

  if (results.length == 0) {
    return Promise.resolve({
      success: false,
      message: "turn results not available",
    });
  } else if (results.length == 1) {
    const turnResult = results[0];
    if (turnResult.world) {
      return Promise.resolve({ success: true, world: turnResult.world });
    }

    logger.error(`TurnResult for game ${gameId}, turn ${turn}, player ${playerId} is missing world data.`);
    return Promise.resolve({
      success: false,
      message: "Turn results are available but world data is missing.",
    });
  } else {
    logger.error(`Found ${results.length} TurnResult entries for game ${gameId}, turn ${turn}, player ${playerId}. Expected 1.`);
    return Promise.reject(
      new Error("Internal server error: Duplicate turn results found.")
    );
  }
}
