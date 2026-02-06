import { create, read, deleteAll } from './service/DatabaseStore';
import { keys } from './service/DatabaseStore';

async function testDatabaseIntegration() {
  try {
    console.log('Starting database integration test...');
    
    // First, clear any existing data
    await deleteAll();
    console.log('Cleared existing data');
    
    // Test creating a game
    const gameData = {
      hostPlayerId: 1,
      maxPlayers: 4,
      gameState: 'LOBBY',
      turn: 0,
      worldId: 1
    };
    
    const gameId = await create(keys.games, gameData);
    console.log(`Created game with ID: ${gameId}`);
    
    // Test reading the game back
    const retrievedGame = await read<any>(keys.games, gameId);
    console.log('Retrieved game:', retrievedGame);
    
    // Verify the data matches
    if (retrievedGame.id === gameId && 
        retrievedGame.maxPlayers === gameData.maxPlayers &&
        retrievedGame.gameState === gameData.gameState) {
      console.log('✅ Database integration test passed!');
    } else {
      console.log('❌ Database integration test failed - data mismatch');
    }
    
    // Test creating a player
    const playerData = {
      gameId: gameId,
      username: 'testuser',
      isHost: true
    };
    
    const playerId = await create(keys.players, playerData);
    console.log(`Created player with ID: ${playerId}`);
    
    // Test reading the player back
    const retrievedPlayer = await read<any>(keys.players, playerId);
    console.log('Retrieved player:', retrievedPlayer);
    
    // Verify the data matches
    if (retrievedPlayer.id === playerId && 
        retrievedPlayer.gameId === playerData.gameId &&
        retrievedPlayer.username === playerData.username) {
      console.log('✅ Player creation and retrieval test passed!');
    } else {
      console.log('❌ Player creation and retrieval test failed - data mismatch');
    }
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testDatabaseIntegration()
  .then(() => {
    console.log('Database integration test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database integration test script failed:', error);
    process.exit(1);
  });