// @ts-nocheck // TODO: Remove this when types are sorted out for mocks

// Mock GameService before importing GameController
const mockGameService = {
  createGame: jest.fn(),
  joinGame: jest.fn(),
  postOrders: jest.fn(),
  turnResults: jest.fn(),
  listGames: jest.fn(),
};
jest.mock('../../service/GameService', () => mockGameService);

const GameController = require('../GameController');

describe('GameController', () => {
  let mockContext: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup a basic mock ExegesisContext
    mockContext = {
      req: {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'), // for host
      },
      res: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(), // for Exegesis
        end: jest.fn(), // for Exegesis when controller returns nothing
      },
      user: { username: 'testuser' },
      params: { path: {}, query: {} },
      requestBody: {},
    };
  });

  describe('createGame', () => {
    it('should return id and join_url on successful game creation', async () => {
      const gameId = 123;
      mockGameService.createGame.mockResolvedValue({ id: gameId });

      const result = await GameController.createGame(mockContext);

      expect(mockGameService.createGame).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.id).toBe(gameId);
      expect(result.join_url).toBe(`http://localhost:3000/games/${gameId}/join`);
      // Note: The controller itself doesn't call context.res.status().json() directly if it returns a value.
      // Exegesis handles sending the response. So we check the return value of the controller function.
    });
  });

  describe('listGames', () => {
    it('should return a list of games with correct properties', async () => {
      const gamesData = [
        { id: 1, playerCount: 2, maxPlayers: 4, isFull: false },
        { id: 2, playerCount: 4, maxPlayers: 4, isFull: true },
      ];
      mockGameService.listGames.mockResolvedValue({ games: gamesData });

      const result = await GameController.listGames(mockContext);

      expect(mockGameService.listGames).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.games).toBeInstanceOf(Array);
      expect(result.games.length).toBe(2);
      result.games.forEach(game => {
        expect(game).toHaveProperty('id');
        expect(typeof game.id).toBe('number');
        expect(game).toHaveProperty('playerCount');
        expect(typeof game.playerCount).toBe('number');
        expect(game).toHaveProperty('maxPlayers');
        expect(typeof game.maxPlayers).toBe('number');
        expect(game).toHaveProperty('isFull');
        expect(typeof game.isFull).toBe('boolean');
      });
    });
  });

  describe('turnResults', () => {
    it('should return placeholder string on success with results', async () => {
      const mockTurnResultData = { data: 'some_turn_data' };
      mockGameService.turnResults.mockResolvedValue({ success: true, results: mockTurnResultData });
      mockContext.params.path = { gameId: 1, turn: 1, playerId: 1 };

      const result = await GameController.turnResults(mockContext);

      expect(mockGameService.turnResults).toHaveBeenCalledWith(1, 1, 1);
      expect(result).toEqual({ placeholder: JSON.stringify(mockTurnResultData) });
    });

    it('should return placeholder message on failure with message', async () => {
      mockGameService.turnResults.mockResolvedValue({ success: false, message: 'Results not ready' });
      mockContext.params.path = { gameId: 1, turn: 1, playerId: 1 };

      const result = await GameController.turnResults(mockContext);

      expect(result).toEqual({ placeholder: 'Results not ready' });
    });

    it('should return generic placeholder on success with no results/message', async () => {
      mockGameService.turnResults.mockResolvedValue({ success: true });
      mockContext.params.path = { gameId: 1, turn: 1, playerId: 1 };

      const result = await GameController.turnResults(mockContext);
      expect(result).toEqual({ placeholder: "Turn results processed, but no specific data returned." });
    });

    it('should return generic placeholder on failure with no message', async () => {
      mockGameService.turnResults.mockResolvedValue({ success: false });
      mockContext.params.path = { gameId: 1, turn: 1, playerId: 1 };

      const result = await GameController.turnResults(mockContext);
      expect(result).toEqual({ placeholder: "Failed to process turn results or results not available." });
    });
  });

  describe('joinGame - Error Handling', () => {
    it('should return error message and set status on service failure', async () => {
      const errorMessage = 'Game is full';
      mockGameService.joinGame.mockRejectedValue(new Error(errorMessage));
      mockContext.params.path = { id: 1 };

      const result = await GameController.joinGame(mockContext);

      expect(mockGameService.joinGame).toHaveBeenCalledWith(1, 'testuser');
      expect(mockContext.res.status).toHaveBeenCalledWith(500); // Default status in controller
      expect(result).toEqual({ message: errorMessage });
    });

    it('should use error status if provided', async () => {
      const errorMessage = 'Player already joined';
      const error = new Error(errorMessage) as any;
      error.status = 403; // Forbidden
      mockGameService.joinGame.mockRejectedValue(error);
      mockContext.params.path = { id: 1 };

      const result = await GameController.joinGame(mockContext);

      expect(mockContext.res.status).toHaveBeenCalledWith(403);
      expect(result).toEqual({ message: errorMessage });
    });
  });

  describe('postOrders - Error Handling', () => {
    it('should return error message and set status on service failure', async () => {
      const errorMessage = 'Invalid orders';
      mockGameService.postOrders.mockRejectedValue(new Error(errorMessage));
      mockContext.params.path = { gameId: 1, turn: 1, playerId: 1 };
      mockContext.requestBody = { orders: [] };

      const result = await GameController.postOrders(mockContext);

      expect(mockGameService.postOrders).toHaveBeenCalledWith(mockContext.requestBody, 1, 1, 1);
      expect(mockContext.res.status).toHaveBeenCalledWith(500);
      expect(result).toEqual({ message: errorMessage });
    });

    it('should use error status if provided for postOrders', async () => {
      const errorMessage = 'Turn not active';
      const error = new Error(errorMessage) as any;
      error.status = 400; // Bad Request
      mockGameService.postOrders.mockRejectedValue(error);
      mockContext.params.path = { gameId: 1, turn: 1, playerId: 1 };
      mockContext.requestBody = { orders: [] };

      const result = await GameController.postOrders(mockContext);

      expect(mockContext.res.status).toHaveBeenCalledWith(400);
      expect(result).toEqual({ message: errorMessage });
    });
  });
});
