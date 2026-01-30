"use strict";

import * as store from "./DatabaseStore";
import logger = require("../utils/Logger");
import util = require("util");

import {
  TurnResult,
} from "./Models";

export interface TurnResultsResponse {
  success: boolean;
  results?: TurnResult;
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
    return Promise.resolve({ success: true, results: results[0] });
  } else {
    return Promise.reject(
      new Error("expected a single result for turn results")
    );
  }
}