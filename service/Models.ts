interface Game {
    id :number;
    players :Array<number>;
    turn :number;
    worldId :number;
}

interface World {
    id :number;
    actors :Array<Actor>;
}

interface Actor {
    id :number;
}