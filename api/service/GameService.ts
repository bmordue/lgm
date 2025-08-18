"use strict";

import store = require("./Store");
import logger = require("../utils/Logger");

export * from "./GameLifecycleService";
export * from "./PlayerService";
export * from "./OrderService";
export * from "./TurnResultService";


// DANGER - testing only; drop everything in the store
export function deleteStore() {
  store.deleteAll();
}
