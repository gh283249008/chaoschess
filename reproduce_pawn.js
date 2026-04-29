
import { Board } from './client/src/core/Board.js';
import { PluginManager } from './client/src/core/PluginManager.js';
import { InternationalChessPlugin } from './client/src/plugins/pieces/InternationalChess/InternationalChessPlugin.js';
import { ChineseChessPlugin } from './client/src/plugins/pieces/ChineseChess/ChineseChessPlugin.js';

async function testPawnMovement() {
    console.log('--- Testing Pawn Movement ---');

    const board = new Board();
    const pluginManager = new PluginManager();

    const intlPlugin = new InternationalChessPlugin();
    pluginManager.registerPiecePlugin('InternationalChess', intlPlugin);

    const chinesePlugin = new ChineseChessPlugin();
    pluginManager.registerPiecePlugin('ChineseChess', chinesePlugin);

    // Test 1: International Pawn (Red) Move Forward
    console.log('\nTest 1: International Pawn (Red) Move Forward 1 Step');
    const redIntlPawn = { type: 'Pawn', x: 0, y: 6, player: 'red', pluginSource: 'InternationalChess' };
    board.addPiece(redIntlPawn);

    // Move from (0,6) to (0,5) -> Should be VALID (dy = -1, dir = -1)
    let isValid = intlPlugin.validateMove(
        redIntlPawn,
        { x: 0, y: 6 },
        { x: 0, y: 5 },
        board.getState()
    );
    console.log(`Move (0,6)->(0,5): ${isValid ? 'VALID' : 'INVALID'} (Expected: VALID)`);

    // Test 2: International Pawn (Red) Move Forward 2 Steps (First move)
    console.log('\nTest 2: International Pawn (Red) Move Forward 2 Steps');
    isValid = intlPlugin.validateMove(
        redIntlPawn,
        { x: 0, y: 6 },
        { x: 0, y: 4 },
        board.getState()
    );
    console.log(`Move (0,6)->(0,4): ${isValid ? 'VALID' : 'INVALID'} (Expected: VALID)`);

    // Test 3: International Pawn (Red) Spawned at y=5, Move Forward 1 Step
    console.log('\nTest 3: International Pawn (Red) Spawned at y=5, Move Forward 1 Step');
    const spawnedPawn = { type: 'Pawn', x: 2, y: 5, player: 'red', pluginSource: 'InternationalChess' };
    board.addPiece(spawnedPawn);

    isValid = intlPlugin.validateMove(
        spawnedPawn,
        { x: 2, y: 5 },
        { x: 2, y: 4 },
        board.getState()
    );
    console.log(`Move (2,5)->(2,4): ${isValid ? 'VALID' : 'INVALID'} (Expected: VALID)`);

    // Test 4: Chinese Pawn (Red) Move Forward
    console.log('\nTest 4: Chinese Pawn (Red) Move Forward');
    const redChinesePawn = { type: '兵', x: 4, y: 6, player: 'red', pluginSource: 'ChineseChess' };
    board.addPiece(redChinesePawn);

    isValid = chinesePlugin.validateMove(
        redChinesePawn,
        { x: 4, y: 6 },
        { x: 4, y: 5 },
        board.getState()
    );
    console.log(`Chinese Pawn Move (4,6)->(4,5): ${isValid ? 'VALID' : 'INVALID'} (Expected: VALID)`);

    // Test 5: Chinese Pawn (Red) Cross River Side Move
    console.log('\nTest 5: Chinese Pawn (Red) Cross River Side Move');
    const crossedPawn = { type: '兵', x: 4, y: 4, player: 'red', pluginSource: 'ChineseChess' };
    board.addPiece(crossedPawn);

    // Move side (4,4)->(3,4)
    isValid = chinesePlugin.validateMove(
        crossedPawn,
        { x: 4, y: 4 },
        { x: 3, y: 4 },
        board.getState()
    );
    console.log(`Chinese Pawn Side Move (4,4)->(3,4): ${isValid ? 'VALID' : 'INVALID'} (Expected: VALID)`);

}

testPawnMovement();
