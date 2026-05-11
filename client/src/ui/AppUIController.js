const SHOP_CATEGORIES = [
    { key: 'chess', title: '棋类' },
    { key: 'special', title: '特殊类' }
];

const SHOP_ITEMS = [
    { id: 'intl_chess_global', category: 'chess', name: '国际象棋体系', desc: '本局己方棋子改为国际象棋并使用对应规则（含升变、王车易位）。', actionConsumesMove: false, price: 360, disabled: false },
    { id: 'flip_chess_pair', category: 'chess', name: '翻转棋 +2', desc: '购买后获得 2 枚翻转棋，可重复购买。落子或移动后若两端均为我方翻转棋，则中间连续敌子全部翻为我方。', actionConsumesMove: false, price: 280, disabled: false },
    { id: 'gomoku_mode', category: 'chess', name: '五子棋模式', desc: '本局解锁五子连珠直接获胜；若触发三三/四四/长连禁手则立即判负。若仅本方购买，则本方失去提子能力（仍可被提子/吃子）。', actionConsumesMove: false, price: 300, disabled: false },
    { id: 'skeleton_revival', category: 'special', name: '骷髅复苏', desc: '本局解锁骷髅复苏：在落子模式可选择“骷髅”，消耗 1 墓地在己方半场部署一枚骷髅棋。', actionConsumesMove: true, price: 260, disabled: false },
    { id: 'ethereal_step', category: 'special', name: '以太步', desc: '本局解锁以太步：选择己方棋子，再选一个己方锚点棋子，将前者移动到锚点周围8格任一空位。不能吃子。', actionConsumesMove: true, price: 240, disabled: false },
    { id: 'smoke_bomb', category: 'special', name: '烟雾弹', desc: '本局解锁烟雾弹：选择棋盘目标点，生成 3x3 烟雾区（效果与扑克同花烟雾弹一致）。', actionConsumesMove: true, price: 220, disabled: false },
    { id: 'dragon_wrath', category: 'special', name: '守护巨龙之怒', desc: '整场 BO3/BO5 每方仅可购买 1 次。使用后增加一次额外的走棋次数。', actionConsumesMove: true, price: 400, disabled: false },
    
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

import lobbyLogo from '../assets/lobby-avif/lobby_logo.avif';
import lobbyJoinButton from '../assets/lobby-avif/btn_join_room_default.avif';
import lobbyCreateButton from '../assets/lobby-avif/btn_create_room_default.avif';
import lobbyRulesButton from '../assets/lobby-avif/btn_rules.avif';
import lobbySettingsButton from '../assets/lobby-avif/btn_settings.avif';
import hallTitle from '../assets/hall-avif/hall_title.avif';
import hallRefreshButton from '../assets/hall-avif/btn_refresh.avif';
import hallCreateRoomButton from '../assets/hall-avif/btn_create_room.avif';
import hallQuickJoinButton from '../assets/hall-avif/btn_quick_join.avif';
import hallStatusPlaying from '../assets/hall-avif/status_playing.avif';
import hallStatusWaiting from '../assets/hall-avif/status_waiting.avif';
import hallBadgeHost from '../assets/hall-avif/badge_host.avif';
import hallCopyRoomIcon from '../assets/hall-avif/icon_copy_room.avif';
import hallStartGameButton from '../assets/hall-avif/btn_start_game.avif';
import hallReadyButton from '../assets/hall-avif/btn_ready.avif';
import hallLeaveRoomButton from '../assets/hall-avif/btn_leave_room.avif';
import hallStatusReady from '../assets/hall-avif/status_ready.avif';
import hallStatusUnready from '../assets/hall-avif/status_unready.avif';
import hallAvatarDefault from '../assets/hall-avif/avatar_default.avif';

const SLOT_ICONS = {
    flip_chess_pair: '🧿',
    skeleton_revival: '💀',
    ethereal_step: '🌀',
    smoke_bomb: '🌫️',
    dragon_wrath: '🐉',
    intl_chess_global: '♞',
    gomoku_mode: '⚫'
};

export class AppUIController {
    constructor(app) {
        this.app = app;
        this.modeBtn = null;
        this.moveModeBtn = null;
        this.placeModeBtn = null;
        this.placePieceBtn = null;
        this.currentView = 'lobby';
        this.countdownTicker = null;
        this.lobbyStage = 'entry';
        this.roundShopLastPhaseIsBuying = null;
        this.gameTestShopAutoOpened = false;
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

        this.moveModeBtn = this.createButton('走棋', '#4b5563', () => this.app.setGameMode('move'));
        statusDiv.appendChild(this.moveModeBtn);

        this.placeModeBtn = this.createButton('落子', '#4b5563', () => this.app.setGameMode('place'));
        this.placeModeBtn.style.marginLeft = '10px';
        statusDiv.appendChild(this.placeModeBtn);

        const shopBtn = this.createButton('商店', '#2f855a', () => this.toggleRoundShop());
        shopBtn.style.marginLeft = '10px';
        statusDiv.appendChild(shopBtn);

        this.renderRoundShop();
        this.renderItemSlots();
        this.renderOnlinePanel(this.app.getOnlineState());
        this.ensureCountdownTicker();
        this.updateModeUI(this.app.gameMode);
    }

    ensureCountdownTicker() {
        if (this.countdownTicker) return;
        this.countdownTicker = setInterval(() => {
            if (this.currentView === 'match') {
                this.renderRoundShop();
                this.renderItemSlots();
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
            panel.style.cssText = 'position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:1200; width:min(92vw, 920px); max-height:78vh; overflow:auto; border:1px solid #d6d6d6; border-radius:12px; padding:14px; background:#fafafa; box-shadow:0 12px 36px rgba(0,0,0,0.18);';
            appRoot.appendChild(panel);
        }
        if (this.app?.isGameTestPage && !this.gameTestShopAutoOpened) {
            panel.style.display = 'block';
            this.gameTestShopAutoOpened = true;
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
        const purchasedEffects = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.purchasedEffects || []).map(effectId => ({ effectId }))
            : (loadout.purchasedEffects || []);
        const purchasedCount = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.purchasedEffects?.length || 0)
            : this.app.matchController.getPurchasedEffectSlotUsage(loadout);
        const flipChessStock = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.flipChessStock || 0)
            : (loadout.flipChessStock || 0);
        const etherealStepCharges = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.etherealStepCharges || 0)
            : (loadout.etherealStepCharges || 0);
        const smokeBombCharges = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.smokeBombCharges || 0)
            : (loadout.smokeBombCharges || 0);
        const dragonWrathUsed = remoteSnapshot
            ? Boolean(roundState.loadouts[currentPlayer]?.dragonWrathUsed)
            : Boolean(loadout.dragonWrathUsed);
        const graveyard = remoteSnapshot
            ? (roundState.economies?.[currentPlayer]?.graveyard || 0)
            : (economy?.graveyard || 0);
        const isBuying = remoteSnapshot ? roundState.status === 'buying' : this.app.matchController.isRoundBuying();
        const canPurchaseInCurrentPhase = isBuying || this.app?.isGameTestPage;
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
                <div style="font-size:13px; color:#4b5563; margin-top:4px;">第 ${matchState.currentRound} 局 | 阶段：${phaseText}${countdownText} | 我的颜色 ${currentPlayer === 'red' ? '红方' : '黑方'} | 余额 ${economy?.credits ?? '-'} | 墓地 ${graveyard} | 剩余走棋 ${remoteSnapshot ? (roundState.sharedState?.turnBudget?.[currentPlayer] ?? 1) : this.app.getCurrentTurnMovesLeft()}</div>
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
                const cannotBuyNow = !canPurchaseInCurrentPhase || item.disabled || alreadyOwned || purchasedCount >= 3;
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
                if (!this.app?.isGameTestPage) {
                    panel.style.display = 'none';
                }
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
            this.renderItemSlots();
        };

        if (this.app?.isGameTestPage) {
            // 测试页仅首次自动弹出，之后尊重手动开关
        } else {
            if (this.roundShopLastPhaseIsBuying === null || this.roundShopLastPhaseIsBuying !== isBuying) {
                if (isBuying) {
                    // 进入购买阶段时自动弹出一次，之后允许手动收起
                    panel.style.display = 'block';
                }
                if (!isBuying) {
                    // 进入对局阶段时自动收起
                    panel.style.display = 'none';
                }
                this.roundShopLastPhaseIsBuying = isBuying;
            }
        }
    }

    renderItemSlots() {
        const matchView = document.getElementById('match-view');
        if (!matchView) return;

        let slotPanel = document.getElementById('item-slot-panel');
        if (!slotPanel) {
            slotPanel = document.createElement('div');
            slotPanel.id = 'item-slot-panel';
            slotPanel.style.cssText = 'display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:8px; margin:10px auto 0 auto; width:min(500px, 100%);';
            const statusEl = document.getElementById('status');
            if (statusEl) {
                matchView.insertBefore(slotPanel, statusEl);
            } else {
                matchView.appendChild(slotPanel);
            }
        }

        const onlineState = this.app.getOnlineState();
        const remoteSnapshot = onlineState?.roomSnapshot || null;
        const roundState = remoteSnapshot?.roundState || this.app.getRoundState();
        if (!roundState) {
            slotPanel.innerHTML = '';
            return;
        }

        const currentPlayer = remoteSnapshot ? (onlineState.color || this.app.currentPlayer) : this.app.currentPlayer;
        const loadout = remoteSnapshot
            ? { purchasedEffects: (roundState.loadouts[currentPlayer]?.purchasedEffects || []).map(effectId => ({ effectId })) }
            : this.app.matchController.getLoadout(currentPlayer);
        const purchasedEffects = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.purchasedEffects || []).map(effectId => ({ effectId }))
            : (loadout.purchasedEffects || []);

        const flipChessStock = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.flipChessStock || 0)
            : (loadout.flipChessStock || 0);
        const etherealStepCharges = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.etherealStepCharges || 0)
            : (loadout.etherealStepCharges || 0);
        const smokeBombCharges = remoteSnapshot
            ? (roundState.loadouts[currentPlayer]?.smokeBombCharges || 0)
            : (loadout.smokeBombCharges || 0);
        const dragonWrathUsed = remoteSnapshot
            ? Boolean(roundState.loadouts[currentPlayer]?.dragonWrathUsed)
            : Boolean(loadout.dragonWrathUsed);
        const graveyard = remoteSnapshot
            ? (roundState.economies?.[currentPlayer]?.graveyard || 0)
            : (this.app.matchController.getEconomy(currentPlayer)?.graveyard || 0);

        const isRoundActive = remoteSnapshot ? roundState.status === 'playing' : this.app.matchController?.isRoundActive?.();
        const getItemByEffectId = (effectId) => SHOP_ITEMS.find(item => item.id === effectId);

        slotPanel.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = 'border:1px dashed #d1d5db; border-radius:8px; padding:8px; min-height:54px; background:#fff;';
            const effectEntry = purchasedEffects[i];

            if (!effectEntry) {
                slot.innerHTML = '<div style="font-size:12px; color:#9ca3af; text-align:center; padding-top:10px;">空槽位</div>';
                slotPanel.appendChild(slot);
                continue;
            }

            const effectId = effectEntry.effectId;
            const item = getItemByEffectId(effectId);
            const isActiveItem = effectId === 'ethereal_step' || effectId === 'smoke_bomb' || effectId === 'flip_chess_pair' || effectId === 'skeleton_revival';
            const desc = `${item?.desc || effectId}${this.getMoveDeclarationText(item?.actionConsumesMove ?? false)}`;

            let charges = 0;
            if (effectId === 'ethereal_step') charges = etherealStepCharges;
            if (effectId === 'smoke_bomb') charges = smokeBombCharges;
            if (effectId === 'flip_chess_pair') charges = flipChessStock;
            if (effectId === 'skeleton_revival') charges = graveyard;
            if (effectId === 'dragon_wrath') charges = dragonWrathUsed ? 1 : 0;
            const icon = SLOT_ICONS[effectId] || '🧩';

            const btn = document.createElement('button');
            btn.textContent = `${icon} ${charges}`;
            btn.title = desc;
            btn.style.cssText = 'width:100%; padding:8px 6px; border:none; border-radius:6px; font-size:16px; font-weight:700; color:#fff;';

            if (!isActiveItem) {
                btn.style.background = '#6b7280';
                btn.style.cursor = 'help';
                btn.onclick = () => {
                    this.app.showNotification(`${item?.name || effectId}：被动道具，购买后本局生效`, 'info');
                };
            } else {
                let canUse = !remoteSnapshot
                    && isRoundActive
                    && this.app.getCurrentTurnMovesLeft() > 0;

                if (effectId === 'ethereal_step' || effectId === 'smoke_bomb') {
                    canUse = canUse && charges > 0;
                }
                if (effectId === 'flip_chess_pair') {
                    canUse = canUse && charges > 0;
                }
                if (effectId === 'skeleton_revival') {
                    canUse = canUse && this.app.matchController?.hasSkeletonRevival?.(currentPlayer);
                }
                if (effectId === 'dragon_wrath') {
                    canUse = canUse && charges > 0;
                }

                if (effectId === 'ethereal_step') btn.style.background = '#7c3aed';
                if (effectId === 'smoke_bomb') btn.style.background = '#0ea5a5';
                if (effectId === 'flip_chess_pair') btn.style.background = '#2563eb';
                if (effectId === 'skeleton_revival') btn.style.background = '#7c2d12';
                if (effectId === 'dragon_wrath') btn.style.background = '#b45309';

                if (!canUse) {
                    btn.disabled = true;
                    btn.style.opacity = '0.55';
                    btn.style.cursor = 'not-allowed';
                } else {
                    btn.style.cursor = 'pointer';
                    btn.onclick = () => {
                        if (effectId === 'ethereal_step') this.app.startEtherealStep();
                        if (effectId === 'smoke_bomb') this.app.startSmokeBomb();
                        if (effectId === 'flip_chess_pair') {
                            this.app.gameMode = 'place';
                            this.app.setPlaceModePieceType('flip');
                            this.app.showNotification('已切换为翻转棋落子模式', 'info');
                        }
                        if (effectId === 'skeleton_revival') {
                            this.app.gameMode = 'place';
                            this.app.setPlaceModePieceType('skeleton');
                            this.app.showNotification('已切换为骷髅复苏落子模式', 'info');
                        }
                        if (effectId === 'dragon_wrath') {
                            this.app.useDragonWrath();
                        }
                        this.app.ui?.updateModeUI?.(this.app.gameMode);
                        this.app.render?.();
                    };
                }
            }

            slot.appendChild(btn);
            slotPanel.appendChild(slot);
        }
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
        const helpBtn = document.getElementById('online-help-btn');
        const settingsBtn = document.getElementById('online-settings-btn');
        const backToEntryBtn = document.getElementById('online-back-entry-btn');
        const refreshBtn = document.getElementById('online-refresh-btn');
        const roomInput = document.getElementById('online-room-input');
        if (createBtn) {
            createBtn.onclick = () => {
                this.app.createOnlineRoom();
            };
        }
        if (joinBtn) {
            joinBtn.onclick = () => {
                if (this.lobbyStage === 'entry') {
                    this.lobbyStage = 'hall';
                    this.renderOnlinePanel(this.app.getOnlineState());
                    return;
                }
                this.app.joinOnlineRoom(roomInput?.value || '');
            };
        }
        if (backToEntryBtn) {
            backToEntryBtn.onclick = () => {
                this.lobbyStage = 'entry';
                this.renderOnlinePanel(this.app.getOnlineState());
            };
        }
        if (helpBtn) {
            helpBtn.onclick = () => {
                this.lobbyStage = 'help';
                this.renderOnlinePanel(this.app.getOnlineState());
            };
        }
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                this.lobbyStage = 'settings';
                this.renderOnlinePanel(this.app.getOnlineState());
            };
        }
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
        const copyRoomBtn = document.getElementById('online-copy-room-btn');
        const switchColorButtons = document.querySelectorAll('.online-switch-color-btn');
        if (readyBtn) readyBtn.onclick = () => this.app.setOnlineReady(!selfReady);
        if (startBtn) startBtn.onclick = () => this.app.startOnlineMatch('BO3');
        if (leaveBtn) leaveBtn.onclick = () => this.app.leaveOnlineRoom();
        switchColorButtons.forEach(btn => {
            btn.onclick = () => this.app.switchOnlineColor();
        });
        if (copyRoomBtn) {
            copyRoomBtn.onclick = async () => {
                const text = state.roomId || '';
                if (!text) return;
                try {
                    if (navigator?.clipboard?.writeText) {
                        await navigator.clipboard.writeText(text);
                        this.app.showNotification('房间号已复制', 'success');
                    }
                } catch (error) {
                    this.app.showNotification('复制失败，请手动复制', 'warning');
                }
            };
        }
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
            if (view !== 'match') {
                shopPanel.style.display = 'none';
            }
        }

    }

    renderLobbyHtml(state) {
        const rooms = state.rooms || [];
        const isPending = !!state.pendingAction;
        const phaseText = ONLINE_PHASE_TEXT[state.connectionPhase] || (state.connected ? '联机已连接' : '联机未连接');
        const shouldScrollRoomList = rooms.length >= 5;
        const roomRows = rooms.length === 0
            ? '<div style="color:#6b7280; font-size:13px;">暂无可加入房间</div>'
            : rooms.map(r => `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding:6px 8px; border:1px solid #e5e7eb; border-radius:6px;">
                    <div style="font-size:13px; color:#1f2937;">${r.id} (${r.playerCount}/2, ${r.status})</div>
                    <button class="online-quick-join-btn" data-room-id="${r.id}" style="padding:5px 9px; border:none; border-radius:5px; background:#2563eb; color:#fff; cursor:pointer; font-size:12px;">加入</button>
                </div>
            `).join('');

        if (this.lobbyStage === 'entry') {
            return `
                <div style="position:relative; background:rgb(253,248,240); border-radius:0; padding:18px 14px; max-width:540px; margin:0 auto; text-align:center; transform:translateY(-100px);">
                    <div style="position:absolute; top:8px; right:10px; font-size:11px; padding:4px 8px; border-radius:999px; background:rgba(255,255,255,0.75); color:${state.connectionPhase === 'reconnecting' ? '#b45309' : (state.connected ? '#166534' : '#991b1b')}; border:1px solid rgba(0,0,0,0.08);">
                        ${phaseText}
                    </div>
                    <img src="${lobbyLogo}" alt="Lobby Logo" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(90vw, 470px); height:auto; margin:0 auto 10px auto;" />
                    <button id="online-join-btn" style="display:block; width:min(60.75vw, 317px); margin:0 auto 10px auto; border:none; background:transparent; padding:0; cursor:${isPending ? 'not-allowed' : 'pointer'}; opacity:${isPending ? '0.6' : '1'};" ${isPending ? 'disabled' : ''}>
                        <img src="${lobbyJoinButton}" alt="加入房间" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:100%; height:auto;" />
                    </button>
                    <button id="online-create-btn" style="display:block; width:min(60.75vw, 317px); margin:0 auto; border:none; background:transparent; padding:0; cursor:${isPending ? 'not-allowed' : 'pointer'}; opacity:${isPending ? '0.6' : '1'};" ${isPending ? 'disabled' : ''}>
                        <img src="${lobbyCreateButton}" alt="创建房间" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:100%; height:auto;" />
                    </button>
                    <div style="display:flex; justify-content:space-between; align-items:center; width:min(60.75vw, 317px); margin:8px auto 0 auto;">
                        <button id="online-help-btn" style="border:none; background:transparent; padding:0; cursor:pointer;">
                            <img src="${lobbyRulesButton}" alt="规则" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(28vw, 140px); height:auto;" />
                        </button>
                        <button id="online-settings-btn" style="border:none; background:transparent; padding:0; cursor:pointer;">
                            <img src="${lobbySettingsButton}" alt="设置" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(28vw, 140px); height:auto;" />
                        </button>
                    </div>
                </div>
            `;
        }

        if (this.lobbyStage === 'help') {
            return `
                <div style="border:1px solid #d1d5db; border-radius:10px; padding:14px; background:#ffffff; max-width:540px; margin:0 auto;">
                    <div style="font-size:18px; font-weight:700; color:#111827;">游戏帮助</div>
                    <div style="font-size:13px; color:#6b7280; margin-top:8px;">（页面预留，内容待补充）</div>
                    <div style="margin-top:12px;">
                        <button id="online-back-entry-btn" style="padding:8px 12px; border:none; border-radius:6px; background:#9ca3af; color:#fff; cursor:pointer;">返回</button>
                    </div>
                </div>
            `;
        }

        if (this.lobbyStage === 'settings') {
            return `
                <div style="border:1px solid #d1d5db; border-radius:10px; padding:14px; background:#ffffff; max-width:540px; margin:0 auto;">
                    <div style="font-size:18px; font-weight:700; color:#111827;">设置</div>
                    <div style="font-size:13px; color:#6b7280; margin-top:8px;">（页面预留，内容待补充）</div>
                    <div style="margin-top:12px;">
                        <button id="online-back-entry-btn" style="padding:8px 12px; border:none; border-radius:6px; background:#9ca3af; color:#fff; cursor:pointer;">返回</button>
                    </div>
                </div>
            `;
        }

        const themedRows = rooms.length === 0
            ? '<div style="color:#6b7280; font-size:13px; text-align:center; padding:10px 0;">暂无可加入房间</div>'
            : rooms.map((r, idx) => {
                const token = ['♠', '♥', '♦', '♣'][idx % 4];
                const statusText = r.status === 'playing' ? '对局中' : '准备中';
                const statusBg = r.status === 'playing' ? '#fee2e2' : '#e0f2fe';
                const statusColor = r.status === 'playing' ? '#991b1b' : '#0c4a6e';
                const statusIcon = r.status === 'playing'
                    ? `<img src="${hallStatusPlaying}" alt="对局中" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:72px; height:auto;" />`
                    : `<img src="${hallStatusWaiting}" alt="准备中" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:72px; height:auto;" />`;
                return `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 10px; border:1px solid #e8dccb; border-radius:10px; margin-top:8px; background:rgb(251,245,236); min-height:68px;">
                        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                            <span style="font-size:18px; line-height:1;">${token}</span>
                            <div style="min-width:0;">
                                <div style="font-size:13px; font-weight:700; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.id}</div>
                                <div style="font-size:12px; color:#6b7280;">👥 ${r.playerCount}/2人</div>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                            ${statusIcon || `<span style="font-size:11px; padding:3px 7px; border-radius:999px; background:${statusBg}; color:${statusColor};">${statusText}</span>`}
                            <button class="online-quick-join-btn" data-room-id="${r.id}" style="border:none; background:transparent; padding:0; cursor:pointer;">
                                <img src="${hallQuickJoinButton}" alt="快速加入" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:67px; height:auto;" />
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        return `
            <div style="max-width:540px; margin:0 auto; background:rgb(253,248,240); padding:8px 10px 12px 10px; border-radius:12px; transform:translateY(-20px);">
                <div style="display:flex; justify-content:center; margin:2px 0 8px 0;">
                    <img src="${hallTitle}" alt="联机大厅" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(86vw, 420px); height:auto;" />
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border:1px solid #eadfd1; border-radius:10px; background:#fffaf6;">
                    <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:#374151;">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:999px; background:${state.connected ? '#16a34a' : '#dc2626'};"></span>
                        <span>${phaseText}</span>
                    </div>
                    <button id="online-back-entry-btn" style="padding:6px 10px; border:none; border-radius:8px; background:#9ca3af; color:#fff; font-size:12px; cursor:pointer;">返回</button>
                </div>

                <div style="display:flex; align-items:center; gap:8px; margin-top:10px; padding:10px; border:1px solid #eadfd1; border-radius:10px; background:#fff;">
                    <span style="font-size:18px; line-height:1;">♜</span>
                    <input id="online-room-input" placeholder="输入房间号" style="flex:1; min-width:120px; border:none; outline:none; font-size:14px; background:transparent;" />
                    <button id="online-join-btn" style="padding:8px 12px; border:none; border-radius:8px; background:#2563eb; color:#fff; cursor:${isPending ? 'not-allowed' : 'pointer'}; opacity:${isPending ? '0.6' : '1'}; font-size:12px;" ${isPending ? 'disabled' : ''}>加入房间</button>
                </div>

                <div style="margin-top:10px; max-height:${shouldScrollRoomList ? '300px' : 'none'}; overflow:${shouldScrollRoomList ? 'auto' : 'visible'}; border:1px solid #eadfd1; border-radius:10px; padding:8px; background:#fffaf6;">
                    ${themedRows}
                </div>

                <div style="display:flex; gap:8px; margin-top:10px; justify-content:space-between;">
                    <button id="online-create-btn" style="border:none; background:transparent; padding:0; cursor:${isPending ? 'not-allowed' : 'pointer'}; opacity:${isPending ? '0.6' : '1'};" ${isPending ? 'disabled' : ''}>
                        <img src="${hallCreateRoomButton}" alt="创建房间" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(43vw, 210px); height:auto;" />
                    </button>
                    <button id="online-refresh-btn" style="border:none; background:transparent; padding:0; cursor:${isPending ? 'not-allowed' : 'pointer'}; opacity:${isPending ? '0.6' : '1'};" ${isPending ? 'disabled' : ''}>
                        <img src="${hallRefreshButton}" alt="刷新列表" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(43vw, 210px); height:auto;" />
                    </button>
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
            const canSwitchColor = isHost && p.id === state.clientId;
            return `
                <button class="online-switch-color-btn" ${canSwitchColor ? '' : 'disabled'} style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:8px; padding:8px 10px; border:1px solid #e6ded2; border-radius:10px; background:rgb(251,245,236); width:100%; text-align:left; ${canSwitchColor ? 'cursor:pointer;' : 'cursor:default; opacity:0.9;'}">
                    <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                        <img src="${hallAvatarDefault}" alt="默认头像" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:42px; height:42px; border-radius:999px;" />
                        <div style="min-width:0;">
                            <div style="font-size:13px; color:#1f2937; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.color === 'red' ? '红方' : '黑方'} · ${p.token}</div>
                            <div style="font-size:11px; color:${onlineColor}; margin-top:2px;">${onlineText}${canSwitchColor ? ' · 点击切换红黑方' : ''}</div>
                        </div>
                    </div>
                    <div style="flex-shrink:0;">
                        <img src="${ready ? hallStatusReady : hallStatusUnready}" alt="${ready ? '已准备' : '未准备'}" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:72px; height:auto;" />
                    </div>
                </button>
            `;
        }).join('');

        const copyRoomButtonDisabled = !state.roomId;

        return `
            <div style="padding:8px 10px 12px 10px; max-width:540px; margin:0 auto; width:min(94vw, 540px); background:transparent;">
                <div style="display:flex; justify-content:center; margin-bottom:8px;">
                    <img src="${lobbyLogo}" alt="房间页标题" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(78vw, 360px); height:auto;" />
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                    <div style="font-size:18px; font-weight:700; color:#111827;">房间 ${state.roomId || '-'}</div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${isHost ? `<img src="${hallBadgeHost}" alt="房主" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:72px; height:auto;" />` : ''}
                        <button id="online-copy-room-btn" style="border:none; background:transparent; padding:0; cursor:${copyRoomButtonDisabled ? 'not-allowed' : 'pointer'}; opacity:${copyRoomButtonDisabled ? '0.55' : '1'};" ${copyRoomButtonDisabled ? 'disabled' : ''}>
                            <img src="${hallCopyRoomIcon}" alt="复制房间号" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:86px; height:auto;" />
                        </button>
                    </div>
                </div>
                <div style="font-size:12px; color:#4b5563; margin-top:4px;">我的颜色: ${state.color || '-'} | 我的凭证: ${state.clientToken || '-'}</div>
                <div style="margin-top:10px;">${playerRows}</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; column-gap:8px; align-items:center; margin-top:12px; transform:translateX(-10px);">
                    <button id="online-ready-btn" style="border:none; background:transparent; padding:0; cursor:pointer; justify-self:start;">
                        <img src="${hallReadyButton}" alt="准备" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(28vw, 132px); height:auto; opacity:${selfReady ? '0.7' : '1'};" />
                    </button>
                    <button id="online-start-btn" style="border:none; background:transparent; padding:0; cursor:${isHost ? 'pointer' : 'not-allowed'}; opacity:${isHost ? '1' : '0.55'}; justify-self:center;" ${isHost ? '' : 'disabled'}>
                        <img src="${hallStartGameButton}" alt="开始对局" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(34vw, 170px); height:auto;" />
                    </button>
                    <button id="online-leave-btn" style="border:none; background:transparent; padding:0; cursor:pointer; justify-self:end;">
                        <img src="${hallLeaveRoomButton}" alt="离开房间" loading="eager" decoding="async" fetchpriority="high" style="display:block; width:min(28vw, 132px); height:auto;" />
                    </button>
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
        if (!this.moveModeBtn || !this.placeModeBtn) {
            return;
        }

        if (gameMode === 'move') {
            this.moveModeBtn.style.background = '#2563eb';
            this.placeModeBtn.style.background = '#4b5563';
            this.updateStatus('走棋模式');
        } else {
            this.moveModeBtn.style.background = '#4b5563';
            this.placeModeBtn.style.background = '#2563eb';
            this.updateStatus('落子模式');
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
