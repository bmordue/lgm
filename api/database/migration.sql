-- Database schema for lgm project

-- Create tables for the game system

CREATE TABLE IF NOT EXISTS games (
    "id" SERIAL PRIMARY KEY,
    "hostPlayerId" INTEGER,
    "maxPlayers" INTEGER,
    "gameState" VARCHAR(20) DEFAULT 'LOBBY',
    "turn" INTEGER DEFAULT 0,
    "worldId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP WITH TIME ZONE
);

-- Backfill for existing databases created before the players column existed.
ALTER TABLE games ADD COLUMN IF NOT EXISTS "players" JSONB DEFAULT '[]'::jsonb;
UPDATE games SET "players" = '[]'::jsonb WHERE "players" IS NULL;

CREATE TABLE IF NOT EXISTS players (
    "id" SERIAL PRIMARY KEY,
    "gameId" INTEGER NOT NULL REFERENCES games("id") ON DELETE CASCADE,
    "username" VARCHAR(255),
    "isHost" BOOLEAN DEFAULT FALSE,
    "joinedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "sessionId" VARCHAR(255)
);

CREATE INDEX idx_players_game_id ON players("gameId");

CREATE TABLE IF NOT EXISTS worlds (
    "id" SERIAL PRIMARY KEY,
    "actorIds" JSONB DEFAULT '[]'::jsonb,
    "terrain" JSONB NOT NULL -- Will store 2D array of terrain values
);

CREATE TABLE IF NOT EXISTS actors (
    "id" SERIAL PRIMARY KEY,
    "pos" JSONB NOT NULL, -- Will store x, y coordinates as JSON
    "state" INTEGER DEFAULT 1, -- ActorState enum value (1 = ALIVE)
    "owner" INTEGER NOT NULL, -- References player id
    "health" INTEGER,
    "weapon" JSONB -- Store weapon properties as JSON
);

ALTER TABLE actors
  ALTER COLUMN "state" TYPE INTEGER
  USING CASE
    WHEN "state"::text IN ('ALIVE', '1') THEN 1
    WHEN "state"::text IN ('DEAD', '0') THEN 0
    -- Fallback for legacy or malformed data to preserve playability.
    ELSE 1
  END;

CREATE TABLE IF NOT EXISTS "turnOrders" (
    "id" SERIAL PRIMARY KEY,
    "gameId" INTEGER NOT NULL REFERENCES games("id") ON DELETE CASCADE,
    "turn" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL REFERENCES players("id") ON DELETE CASCADE,
    "orders" JSONB NOT NULL -- Store array of orders as JSON
);

CREATE INDEX idx_turn_orders_game_id ON "turnOrders"("gameId");
CREATE INDEX idx_turn_orders_player_id ON "turnOrders"("playerId");

CREATE TABLE IF NOT EXISTS "turnResults" (
    "id" SERIAL PRIMARY KEY,
    "gameId" INTEGER NOT NULL REFERENCES games("id") ON DELETE CASCADE,
    "turn" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL REFERENCES players("id") ON DELETE CASCADE,
    "world" JSONB NOT NULL -- Store world state as JSON
);

CREATE INDEX idx_turn_results_game_id ON "turnResults"("gameId");
CREATE INDEX idx_turn_results_player_id ON "turnResults"("playerId");

-- Create a function to create a new game with associated world
CREATE OR REPLACE FUNCTION create_new_game(p_max_players INTEGER DEFAULT 4)
RETURNS INTEGER AS $$
DECLARE
    new_game_id INTEGER;
    new_world_id INTEGER;
BEGIN
    -- Create a new world first
    INSERT INTO worlds ("actorIds", "terrain")
    VALUES ('[]', '[[0,0,0],[0,0,0],[0,0,0]]') -- Simple 3x3 terrain with terrain value 0 (EMPTY from Terrain enum)
    RETURNING id INTO new_world_id;
    
    -- Create the game referencing the world
    INSERT INTO games ("maxPlayers", "worldId")
    VALUES (p_max_players, new_world_id)
    RETURNING id INTO new_game_id;
    
    RETURN new_game_id;
END;
$$ LANGUAGE plpgsql;
