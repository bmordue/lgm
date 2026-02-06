-- Database schema for lgm project

-- Create tables for the game system

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    host_player_id INTEGER,
    max_players INTEGER,
    game_state VARCHAR(20) DEFAULT 'LOBBY',
    turn INTEGER DEFAULT 0,
    world_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    username VARCHAR(255),
    is_host BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255)
);

CREATE INDEX idx_players_game_id ON players(game_id);

CREATE TABLE IF NOT EXISTS worlds (
    id SERIAL PRIMARY KEY,
    actor_ids JSONB DEFAULT '[]'::jsonb,
    terrain JSONB NOT NULL -- Will store 2D array of terrain values
);

CREATE TABLE IF NOT EXISTS actors (
    id SERIAL PRIMARY KEY,
    pos JSONB NOT NULL, -- Will store x, y coordinates as JSON
    state VARCHAR(10) DEFAULT 'ALIVE', -- 'ALIVE' or 'DEAD'
    owner INTEGER NOT NULL, -- References player id
    health INTEGER,
    weapon JSONB -- Store weapon properties as JSON
);

CREATE TABLE IF NOT EXISTS turn_orders (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    turn INTEGER NOT NULL,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    orders JSONB NOT NULL -- Store array of orders as JSON
);

CREATE INDEX idx_turn_orders_game_id ON turn_orders(game_id);
CREATE INDEX idx_turn_orders_player_id ON turn_orders(player_id);

CREATE TABLE IF NOT EXISTS turn_results (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    turn INTEGER NOT NULL,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    world JSONB NOT NULL -- Store world state as JSON
);

CREATE INDEX idx_turn_results_game_id ON turn_results(game_id);
CREATE INDEX idx_turn_results_player_id ON turn_results(player_id);

-- Create a function to create a new game with associated world
CREATE OR REPLACE FUNCTION create_new_game(p_max_players INTEGER DEFAULT 4)
RETURNS INTEGER AS $$
DECLARE
    new_game_id INTEGER;
    new_world_id INTEGER;
BEGIN
    -- Create a new world first
    INSERT INTO worlds (actor_ids, terrain) 
    VALUES ('[]', '[[0,0,0],[0,0,0],[0,0,0]]') -- Simple 3x3 terrain with terrain value 0 (EMPTY from Terrain enum)
    RETURNING id INTO new_world_id;
    
    -- Create the game referencing the world
    INSERT INTO games (max_players, world_id) 
    VALUES (p_max_players, new_world_id)
    RETURNING id INTO new_game_id;
    
    RETURN new_game_id;
END;
$$ LANGUAGE plpgsql;