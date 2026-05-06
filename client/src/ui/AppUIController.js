const SHOP_CATEGORIES = [
    { key: 'chess', title: '棋类' },
    { key: 'special', title: '特殊类' }
];

const SHOP_ITEMS = [
    { id: 'intl_chess_global', category: 'chess', name: '国际象棋体系', desc: '本局己方棋子改为国际象棋并使用对应规则（含升变、王车易位）。', actionConsumesMove: false, price: 360, disabled: false },
    { id: 'flip_chess_pair', category: 'chess', name: '翻转棋 +2', desc: '购买后获得 2 枚翻转棋，可重复购买。落子或移动后若两端均为我方翻转棋，则中间连续敌子全部翻为我方。', actionConsumesMove: false, price: 280, disabled: false },
    { id: 'chess_opening', category: 'chess', name: '布局强化', desc: '即将开放', actionConsumesMove: false, price: 180, disabled: true },
    { id: 'go_control', category: 'chess', name: '控盘强化', desc: '即将开放', actionConsumesMove: false, price: 200, disabled: true },
    { id: 'special_supply', category: 'special', name: '战术补给', desc: '即将开放', actionConsumesMove: false, price: 260, disabled: true },
    { id: 'special_repair', category: 'special', name: '紧急修复', desc: '即将开放', actionConsumesMove: false, price: 300, disabled: true }
];

const ONLINE_ERROR_TEXT = {
    INVALID_JSON: '消息格式错误，请稍后重试',
    UNKNOWN_MESSAGE_TYPE: '收到未知联机消息，请刷新重试',
    ROOM_NOT_FOUND: '房间不存在或已失效',
    NOT_IN_ROOM: '你当前不在房间内',
    NOT_HOST: '仅房主可以执行该操作',
    INVALID_ACTION: '当前操作无效，请检查阶段或参数',
    INVALID_PHASE: '当前阶段不支持该操作',
    NOT_YOUR_TURN: '当前不是你的行动回合',
    RECONNECT_FAILED: '重连失败，请稍后重试',
    SESSION_EXPIRED: '会话已过期，请重新加入房间',
    ROOM_EXPIRED: '房间已过期，请重新加入或创建'
};

const ONLINE_PHASE_TEXT = {
    connected: '联机已连接',
    reconnecting: '重连中...',
    recovered: '已恢复房间',
    expired: '会话过期，请重新加入'
};

export class AppUIController {
    constructor(app) {
        this.app = app;
        this.modeBtn = null;
        this.placePieceBtn = null;
        this.currentView = 'lobby';
        this.countdownTicker = null;
    }

    resolveOnlineErrorMessage(code, fallbackMessage) {
        if (code && ONLINE_ERROR_TEXT[code]) {
            return ONLINE_ERROR_TEXT[code];
        }
        return fallbackMessage || '网络错误';
    }

    initControls() {
        const statusDiv = document.getElementById('status');
        if (!statusDiv) {
            return;
        }

        this.modeBtn = this.createButton('切换到围棋模式', '#667eea', () => this.app.toggleMode());
        statusDiv.appendChild(this.modeBtn);

        this.placePieceBtn = this.createButton('落子：围棋', '#0f766e', () => this.togglePlacePieceType());
        this.placePieceBtn.style.marginLeft = '10px';
        statusDiv.appendChild(this.placePieceBtn);

        const pokerBtn = this.createButton('扑克', '#764ba2', () => this.app.togglePoker());
        pokerBtn.style.marginLeft = '10px';
        statusDiv.appendChild(pokerBtn);

        const shopBtn = this.createButton('商店', '#2f855a', () => this.toggleRoundShop());
        shopBtn.style.marginLeft = '10px';
        statusDiv.appendChild(shopBtn);

        this.renderRoundShop();
        this.renderOnlinePanel(this.app.getOnlineState());
        this.ensureCountdownTicker();
        this.updateModeUI(this.app.gameMode);
    }

    togglePlacePieceType() {
        const nextType = this.app.placeModePieceType === 'flip' ? 'go' : 'flip';
        this.app.setPlaceModePieceType(nextType);
    }

    ensureCountdownTicker() {
        if (this.countdownTicker) return;
        this.countdownTicker = setInterval(() => {
            if (this.currentView === 'match') {
                this.renderRoundShop();
            }
        }, 1000);
    }

    toggleRoundShop() {
        const panel = document.getElementById('round-shop-panel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    renderRoundShop() {
        const appRoot = document.getElementById('app');
        if (!appRoot) return;

        let panel = document.getElementById('round-shop-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'round-shop-panel';
            panel.style.cssText = 'margin-top: 16px; border: 1px solid #d6d6d6; border-radius: 10px; padding: 14px; background: #fafafa;';
            appRoot.appendChild(panel);
        }

        const onlineState = this.app.getOnlineState();
        const remoteSnapshot = onlineState?.roomSnapshot || null;
        const roundState = remoteSnapshot?.roundState || this.app.getRoundState();
        const matchState = remoteSnapshot?.matchState || this.app.getMatchState();
        if (!roundState || !matchState) {
            panel.innerHTML = '<div style="color:#666;">商店加载中...</div>';
            return;
        }

        const currentPlayer = remoteSnapshot ? (onlineState.color || this.app.currentPlayer) : this.app.currentPlayer;
        const economy = remoteSnapshot ? roundState.economies[currentPlayer] : this.app.matchController.getEconomy(currentPlayer);
        const loadout = remoteSnapshot
            ? { purchasedEffects: (roundState.loadouts[currentPlayer]?.purchasedEffects || []).map(effectId => ({ effectId })) }
            : this.app.matchController.getLoadout(currentPlayer);
        const purchasedCount = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.purchasedEffects?.length || 0)
            : this.app.matchController.getPurchasedEffectSlotUsage(loadout);
        const flipChessStock = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.flipChessStock || 0)
            : (loadout.flipChessStock || 0);
        const isBuying = remoteSnapshot ? roundState.status === 'buying' : this.app.matchController.isRoundBuying();
        const isFinished = !!matchState.winner;
        const phaseText = isBuying ? '购物时间' : '对局时间';
        const countdownText = remoteSnapshot && isBuying
            ? this.getBuyCountdownText(roundState.buyEndsAt)
            : '';

        panel.innerHTML = '';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;';
        header.innerHTML = `
            <div>
                <div style="font-size:16px; color:#1f2937; font-weight:700;">Round 前商店</div>
                <div style="font-size:13px; color:#4b5563; margin-top:4px;">第 ${matchState.currentRound} 局 | 阶段：${phaseText}${countdownText} | 我的颜色 ${currentPlayer === 'red' ? '红方' : '黑方'} | 余额 ${economy?.credits ?? '-'} | 已购 ${purchasedCount}/3 | 翻转棋库存 ${flipChessStock} | 剩余走棋 ${remoteSnapshot ? (roundState.sharedState?.turnBudget?.[currentPlayer] ?? 1) : this.app.getCurrentTurnMovesLeft()}</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button id="round-begin-btn" style="padding:7px 12px; border:none; border-radius:6px; background:#2563eb; color:#fff; cursor:pointer;">开始本局</button>
                <button id="round-next-btn" style="padding:7px 12px; border:none; border-radius:6px; background:#374151; color:#fff; cursor:pointer;">下一局</button>
            </div>
        `;
        panel.appendChild(header);

        const body = document.createElement('div');
        body.style.cssText = 'display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:10px;';
        panel.appendChild(body);

        SHOP_CATEGORIES.forEach(category => {
            const section = document.createElement('div');
            section.style.cssText = 'border:1px solid #e5e7eb; border-radius:8px; background:#fff; padding:10px; min-height:120px;';

            const title = document.createElement('div');
            title.textContent = category.title;
            title.style.cssText = 'font-size:14px; font-weight:700; color:#111827; margin-bottom:8px;';
            section.appendChild(title);

            const items = SHOP_ITEMS.filter(item => item.category === category.key);
            items.forEach(item => {
                const row = document.createElement('div');
                row.style.cssText = 'margin-bottom:8px; border-top:1px solid #f3f4f6; padding-top:8px;';

                const name = document.createElement('div');
                name.textContent = `${item.name} (${this.getItemPrice(item)} 资金)`;
                name.style.cssText = 'font-size:13px; color:#1f2937; font-weight:600;';

                const desc = document.createElement('div');
                desc.textContent = `${item.desc}${this.getMoveDeclarationText(item.actionConsumesMove)}`;
                desc.style.cssText = 'font-size:12px; color:#6b7280; margin-top:2px;';

                const buyBtn = document.createElement('button');
                buyBtn.textContent = '购买';
                buyBtn.style.cssText = 'margin-top:6px; padding:5px 10px; border:none; border-radius:5px; background:#10b981; color:#fff; cursor:pointer;';

                const alreadyOwned = item.id === 'flip_chess_pair'
                    ? false
                    : loadout.purchasedEffects.some(entry => entry.effectId === item.id);
                const cannotBuyNow = !isBuying || item.disabled || alreadyOwned || purchasedCount >= 3;
                if (alreadyOwned) {
                    buyBtn.textContent = '已购买';
                }
                if (item.disabled) {
                    buyBtn.textContent = '待开放';
                }
                if (cannotBuyNow) {
                    buyBtn.disabled = true;
                    buyBtn.style.opacity = '0.55';
                    buyBtn.style.cursor = 'not-allowed';
                }

                buyBtn.onclick = () => {
                    const result = this.app.purchaseEffect(item.id);
                    this.app.showNotification(result.message, result.success ? 'success' : 'warning');
                    this.renderRoundShop();
                    if (this.app.pokerController && typeof this.app.pokerController.renderPokerHand === 'function') {
                        this.app.pokerController.renderPokerHand();
                    }
                };

                row.appendChild(name);
                row.appendChild(desc);
                row.appendChild(buyBtn);
                section.appendChild(row);
            });

            body.appendChild(section);
        });

        const beginBtn = document.getElementById('round-begin-btn');
        const nextBtn = document.getElementById('round-next-btn');

        if (remoteSnapshot) {
            beginBtn.style.display = 'none';
        }

        beginBtn.disabled = !isBuying || isFinished || !!remoteSnapshot;
        if (beginBtn.disabled) {
            beginBtn.style.opacity = '0.55';
            beginBtn.style.cursor = 'not-allowed';
        }
        beginBtn.onclick = () => {
            const ok = this.app.beginRound();
            if (ok) {
                this.app.showNotification('本局开始', 'success');
                this.renderRoundShop();
            }
        };

        nextBtn.disabled = roundState.status !== 'ended' || isFinished;
        if (nextBtn.disabled) {
            nextBtn.style.opacity = '0.55';
            nextBtn.style.cursor = 'not-allowed';
        }
        nextBtn.onclick = () => {
            this.app.startNextRound();
            this.renderRoundShop();
        };
    }

    renderOnlinePanel(onlineState) {
        const lobbyView = document.getElementById('lobby-view');
        const roomView = document.getElementById('room-view');
        if (!lobbyView || !roomView) return;

        const state = onlineState || { connected: false, rooms: [] };
        const snapshot = state.roomSnapshot;
        const isHost = snapshot?.players?.[0]?.id === state.clientId;
        const selfReady = snapshot?.readyByPlayer?.[state.clientId] || false;

        const targetView = this.resolveView(state);
        this.setView(targetView);

        lobbyView.innerHTML = this.renderLobbyHtml(state);
        roomView.innerHTML = this.renderRoomHtml(state, snapshot, selfReady, isHost);

        const createBtn = document.getElementById('online-create-btn');
        const joinBtn = document.getElementById('online-join-btn');
        const refreshBtn = document.getElementById('online-refresh-btn');
        const roomInput = document.getElementById('online-room-input');
        if (createBtn) createBtn.onclick = () => this.app.createOnlineRoom();
        if (joinBtn) joinBtn.onclick = () => this.app.joinOnlineRoom(roomInput.value || '');
        if (refreshBtn) refreshBtn.onclick = () => this.app.refreshOnlineRooms();

        const quickJoinButtons = document.querySelectorAll('.online-quick-join-btn');
        quickJoinButtons.forEach(btn => {
            btn.onclick = () => {
                const roomId = btn.getAttribute('data-room-id') || '';
                this.app.joinOnlineRoom(roomId);
            };
        });

        const readyBtn = document.getElementById('online-ready-btn');
        const startBtn = document.getElementById('online-start-btn');
        const leaveBtn = document.getElementById('online-leave-btn');
        if (readyBtn) readyBtn.onclick = () => this.app.setOnlineReady(!selfReady);
        if (startBtn) startBtn.onclick = () => this.app.startOnlineMatch('BO3');
        if (leaveBtn) leaveBtn.onclick = () => this.app.leaveOnlineRoom();
    }

    resolveView(state) {
        if (!state.connected) return 'lobby';
        if (!state.roomId) return 'lobby';
        if (!state.roomSnapshot) return 'room';
        if (state.roomSnapshot.status === 'playing' || state.roomSnapshot.status === 'match_end') {
            return 'match';
        }
        return 'room';
    }

    setView(view) {
        this.currentView = view;
        const lobbyView = document.getElementById('lobby-view');
        const roomView = document.getElementById('room-view');
        const matchView = document.getElementById('match-view');
        if (!lobbyView || !roomView || !matchView) return;

        lobbyView.style.display = view === 'lobby' ? 'block' : 'none';
        roomView.style.display = view === 'room' ? 'block' : 'none';
        matchView.style.display = view === 'match' ? 'block' : 'none';

        const shopPanel = document.getElementById('round-shop-panel');
        if (shopPanel) {
            shopPanel.style.display = view === 'match' ? 'block' : 'none';
        }

        const pokerContainer = document.getElementById('poker-hand-container');
        if (pokerContainer && view !== 'match') {
            pokerContainer.classList.add('translate-y-full');
        }
    }

    renderLobbyHtml(state) {
        const rooms = state.rooms || [];
        const isPending = !!state.pendingAction;
        const phaseText = ONLINE_PHASE_TEXT[state.connectionPhase] || (state.connected ? '联机已连接' : '联机未连接');
        const roomRows = rooms.length === 0
            ? '<div style="color:#6b7280; font-size:13px;">暂无可加入房间</div>'
            : rooms.map(r => `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding:6px 8px; border:1px solid #e5e7eb; border-radius:6px;">
                    <div style="font-size:13px; color:#1f2937;">${r.id} (${r.playerCount}/2, ${r.status})</div>
                    <button class="online-quick-join-btn" data-room-id="${r.id}" style="padding:5px 9px; border:none; border-radius:5px; background:#2563eb; color:#fff; cursor:pointer; font-size:12px;">加入</button>
                </div>
            `).join('');

        return `
            <div style="border:1px solid #d1d5db; border-radius:10px; padding:14px; background:#ffffff;">
                <div style="font-size:18px; font-weight:700; color:#111827;">大厅</div>
                <div style="font-size:12px; color:${state.connectionPhase === 'reconnecting' ? '#b45309' : (state.connected ? '#166534' : '#991b1b')}; margin-top:4px;">${phaseText}</div>
                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                    <button id="online-create-btn" style="padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:${isPending ? 'not-allowed' : 'pointer'}; opacity:${isPending ? '0.6' : '1'};" ${isPending ? 'disabled' : ''}>创建房间</button>
                    <input id="online-room-input" placeholder="输入房间号" style="padding:8px 10px; border:1px solid #d1d5db; border-radius:6px;" />
                    <button id="online-join-btn" style="padding:8px 12px; border:none; border-radius:6px; background:#2563eb; color:#fff; cursor:${isPending ? 'not-allowed' : 'pointer'}; opacity:${isPending ? '0.6' : '1'};" ${isPending ? 'disabled' : ''}>加入房间</button>
                    <button id="online-refresh-btn" style="padding:8px 12px; border:none; border-radius:6px; background:#374151; color:#fff; cursor:${isPending ? 'not-allowed' : 'pointer'}; opacity:${isPending ? '0.6' : '1'};" ${isPending ? 'disabled' : ''}>刷新列表</button>
                </div>
                <div style="margin-top:12px; border-top:1px solid #e5e7eb; padding-top:8px;">
                    <div style="font-size:13px; font-weight:600; color:#111827;">公共大厅房间</div>
                    ${roomRows}
                </div>
            </div>
        `;
    }

    renderRoomHtml(state, snapshot, selfReady, isHost) {
        if (!snapshot) {
            return '<div style="color:#6b7280;">房间状态同步中...</div>';
        }
        const playerRows = (snapshot.players || []).map(p => {
            const ready = !!snapshot.readyByPlayer?.[p.id];
            const onlineText = p.online ? '在线' : '离线重连中';
            const onlineColor = p.online ? '#166534' : '#b45309';
            return `<div style="font-size:13px; color:#1f2937; margin-top:4px;">${p.color === 'red' ? '红方' : '黑方'} - ${p.token} - ${ready ? '已准备' : '未准备'} - <span style="color:${onlineColor};">${onlineText}</span></div>`;
        }).join('');

        return `
            <div style="border:1px solid #d1d5db; border-radius:10px; padding:14px; background:#ffffff;">
                <div style="font-size:18px; font-weight:700; color:#111827;">房间 ${state.roomId || '-'}</div>
                <div style="font-size:12px; color:#4b5563; margin-top:4px;">我的颜色: ${state.color || '-'} | 我的凭证: ${state.clientToken || '-'}</div>
                <div style="margin-top:10px;">${playerRows}</div>
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button id="online-ready-btn" style="padding:8px 12px; border:none; border-radius:6px; background:${selfReady ? '#166534' : '#15803d'}; color:#fff; cursor:pointer;">${selfReady ? '取消准备' : '准备'}</button>
                    <button id="online-start-btn" style="padding:8px 12px; border:none; border-radius:6px; background:#1d4ed8; color:#fff; cursor:${isHost ? 'pointer' : 'not-allowed'}; opacity:${isHost ? '1' : '0.55'};" ${isHost ? '' : 'disabled'}>双方就绪后开始对局</button>
                    <button id="online-leave-btn" style="padding:8px 12px; border:none; border-radius:6px; background:#b91c1c; color:#fff; cursor:pointer;">离开房间</button>
                </div>
            </div>
        `;
    }

    getBuyCountdownText(buyEndsAt) {
        if (!buyEndsAt) return '';
        const msLeft = buyEndsAt - Date.now();
        const sec = Math.max(0, Math.ceil(msLeft / 1000));
        return `（倒计时 ${sec}s）`;
    }

    getItemPrice(item) {
        const fromConfig = this.app.matchController.getEffectPrice(item.id);
        if (fromConfig) return fromConfig;
        return item.price;
    }

    getMoveDeclarationText(actionConsumesMove) {
        return actionConsumesMove ? ' 该特效视为一步走棋。' : ' 该特效不视为一步走棋。';
    }

    updateModeUI(gameMode) {
        if (!this.modeBtn) {
            return;
        }

        if (this.placePieceBtn) {
            this.placePieceBtn.style.display = gameMode === 'place' ? 'inline-block' : 'none';
            this.placePieceBtn.textContent = this.app.placeModePieceType === 'flip' ? '落子：翻转棋' : '落子：围棋';
        }

        if (gameMode === 'move') {
            this.modeBtn.textContent = '下棋模式';
            this.updateStatus('下棋模式 - 移动棋子');
        } else {
            this.modeBtn.textContent = '落子模式';
            this.updateStatus(`落子模式 - 当前放置${this.app.placeModePieceType === 'flip' ? '翻转棋' : '围棋子'}`);
        }
    }

    updateStatus(message) {
        const statusEl = document.getElementById('status');
        if (!statusEl) {
            return;
        }

        const textNode = statusEl.childNodes[0];
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = message;
            return;
        }

        statusEl.insertBefore(document.createTextNode(message), statusEl.firstChild);
    }

    displayPlugins(plugins) {
        const pluginListEl = document.getElementById('plugin-list');
        if (!pluginListEl) {
            return;
        }

        const pluginInfo = pluginListEl.closest('.plugin-info');
        if (pluginInfo) {
            pluginInfo.style.display = 'none';
        }
    }

    createButton(text, background, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `margin-left: 20px; padding: 8px 16px; background: ${background}; color: white; border: none; border-radius: 5px; cursor: pointer;`;
        button.onclick = onClick;
        return button;
    }

    createPluginBadge(text, background) {
        const badge = document.createElement('div');
        badge.className = 'plugin-badge';
        if (background) {
            badge.style.background = background;
        }
        badge.textContent = text;
        return badge;
    }
}
