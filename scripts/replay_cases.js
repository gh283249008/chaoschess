import { MatchController } from '../client/src/game/MatchController.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createMockApp() {
    return {
        currentPlayer: 'red',
        board: {
            clear() {},
            riverBlocked: false,
            smokeEffects: [],
            addPiece() {}
        },
        selectedPiece: null,
        waitingForTarget: null,
        riverBlockedTurns: 0,
        gameMode: 'move',
        placeModePieceType: 'go',
        resetTurnBudget() {},
        updateStatus() {},
        render() {},
        showNotification() {},
        pluginManager: { getPlugin() { return null; } },
        pokerPlugin: null,
        pokerHands: { red: [], black: [] },
        getCurrentTurnMovesLeft() { return 1; },
        ui: { renderRoundShop() {} }
    };
}

function testDefaultCharges() {
    const app = createMockApp();
    const mc = new MatchController(app);
    mc.initMatch('BO3');
    const loadout = mc.getLoadout('red');
    assert(loadout.etherealStepCharges === 0, '默认以太步次数应为0');
    assert(loadout.smokeBombCharges === 0, '默认烟雾弹次数应为0');
}

function testPurchaseAndConsumeCharges() {
    const app = createMockApp();
    const mc = new MatchController(app);
    mc.initMatch('BO3');

    let result = mc.purchaseEffect('ethereal_step', 'red');
    assert(result.success, '购买以太步应成功');
    assert(mc.getEtherealStepCharges('red') === 1, '以太步默认1次');
    assert(mc.consumeEtherealStepCharge('red') === true, '以太步应可消耗1次');
    assert(mc.consumeEtherealStepCharge('red') === false, '以太步不应可超额消耗');

    result = mc.purchaseEffect('smoke_bomb', 'black');
    assert(result.success, '购买烟雾弹应成功');
    assert(mc.getSmokeBombCharges('black') === 1, '烟雾弹默认1次');
    assert(mc.consumeSmokeBombCharge('black') === true, '烟雾弹应可消耗1次');
    assert(mc.consumeSmokeBombCharge('black') === false, '烟雾弹不应可超额消耗');
}

function testPassiveFlags() {
    const app = createMockApp();
    const mc = new MatchController(app);
    mc.initMatch('BO3');

    assert(mc.purchaseEffect('intl_chess_global', 'red').success, '购买国际象棋应成功');
    assert(mc.purchaseEffect('gomoku_mode', 'red').success, '购买五子棋应成功');
    assert(mc.purchaseEffect('skeleton_revival', 'black').success, '购买骷髅复苏应成功');

    assert(mc.hasGomokuMode('red') === true, '五子棋被动应整局生效');
    assert(mc.hasSkeletonRevival('black') === true, '骷髅复苏被动应整局生效');
}

function testGraveyardRules() {
    const app = createMockApp();
    const mc = new MatchController(app);
    mc.initMatch('BO3');

    mc.onPieceCaptured({ type: '马', player: 'black', pluginSource: 'ChineseChess' }, 'red');
    assert(mc.getEconomy('red').graveyard === 1, '击杀走棋类棋子应+1墓地');

    mc.onPieceCaptured({ type: 'stone', player: 'black', pluginSource: 'Go' }, 'red');
    assert(mc.getEconomy('red').graveyard === 1, '击杀落子类棋子不应增加墓地');
}

function main() {
    testDefaultCharges();
    testPurchaseAndConsumeCharges();
    testPassiveFlags();
    testGraveyardRules();
    console.log('PASS: replay cases passed');
}

main();
