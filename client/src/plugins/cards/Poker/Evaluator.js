/**
 * 扑克牌型评估器
 */
export class PokerHandEvaluator {
    /**
     * 评估5张牌的牌型
     * @returns { type: number, name: string, tieBreakers: array }
     * Types: 0=High, 1=Pair, 2=TwoPair, 3=Three, 4=Straight, 5=Flush, 6=FullHouse, 7=Four, 8=StraightFlush, 9=Royal
     */
    static evaluate(cards) {
        if (cards.length !== 5) return { type: -1, name: "Invalid Hand" };

        const sorted = [...cards].sort((a, b) => a.value - b.value);
        const ranks = sorted.map(c => c.value);
        const suits = sorted.map(c => c.suit);

        const isFlush = suits.every(s => s === suits[0]);

        let isStraight = true;
        for (let i = 0; i < 4; i++) {
            if (ranks[i + 1] !== ranks[i] + 1) {
                isStraight = false;
                break;
            }
        }
        // Special case: A-2-3-4-5 (Ace is 14, but can be 1)
        if (!isStraight && ranks.join(',') === '2,3,4,5,14') {
            isStraight = true;
        }

        const counts = {};
        for (let r of ranks) counts[r] = (counts[r] || 0) + 1;
        const countValues = Object.values(counts);

        // Straight Flush / Royal (check first for highest priority)
        if (isStraight && isFlush) {
            if (ranks[4] === 14 && ranks[0] === 10) {
                return { type: 9, name: "皇家同花顺 (Royal Flush)", tieBreakers: [] };
            }
            return { type: 8, name: "同花顺 (Straight Flush)", tieBreakers: [Math.max(...ranks)] };
        }

        // 4 of a kind
        if (countValues.includes(4)) {
            return { type: 7, name: "四条 (Four of a Kind)", tieBreakers: this.getTieBreakers(counts, 4) };
        }

        // Full House
        if (countValues.includes(3) && countValues.includes(2)) {
            return { type: 6, name: "葫芦 (Full House)", tieBreakers: this.getTieBreakers(counts, 3) };
        }

        // Flush
        if (isFlush && !isStraight) {
            return { type: 5, name: "同花 (Flush)", tieBreakers: ranks.reverse() };
        }

        // Straight
        if (isStraight && !isFlush) {
            return { type: 4, name: "顺子 (Straight)", tieBreakers: [Math.max(...ranks)] };
        }

        // 3 of a kind
        if (countValues.includes(3)) {
            return { type: 3, name: "三条 (Three of a Kind)", tieBreakers: this.getTieBreakers(counts, 3) };
        }

        // Two Pair
        if (countValues.filter(c => c === 2).length === 2) {
            return { type: 2, name: "两对 (Two Pair)", tieBreakers: this.getTieBreakers(counts, 2) };
        }

        // Pair
        if (countValues.includes(2)) {
            return { type: 1, name: "一对 (One Pair)", tieBreakers: this.getTieBreakers(counts, 2) };
        }

        // High Card
        return { type: 0, name: "高牌 (High Card)", tieBreakers: ranks.reverse() };
    }

    static getTieBreakers(counts, primaryCount) {
        const primary = [];
        const kickers = [];
        for (let [rank, count] of Object.entries(counts)) {
            if (count === primaryCount) primary.push(parseInt(rank));
            else kickers.push(parseInt(rank));
        }
        return [...primary.sort((a, b) => b - a), ...kickers.sort((a, b) => b - a)];
    }

    /**
     * 比较两手牌
     * @returns 1 if A > B, -1 if B > A, 0 if tie
     */
    static compare(handA, handB) {
        const evalA = this.evaluate(handA);
        const evalB = this.evaluate(handB);

        if (evalA.type !== evalB.type) {
            return evalA.type > evalB.type ? 1 : -1;
        }

        // Compare tie breakers
        for (let i = 0; i < Math.min(evalA.tieBreakers.length, evalB.tieBreakers.length); i++) {
            if (evalA.tieBreakers[i] !== evalB.tieBreakers[i]) {
                return evalA.tieBreakers[i] > evalB.tieBreakers[i] ? 1 : -1;
            }
        }
        return 0;
    }

    /**
     * 从多张牌中找出最佳5张组合
     */
    static getBestHand(cards) {
        if (cards.length < 5) return null;

        const getCombinations = (arr, k) => {
            if (k === 0) return [[]];
            if (arr.length === 0) return [];
            const head = arr[0];
            const tail = getCombinations(arr.slice(1), k - 1);
            const withoutHead = getCombinations(arr.slice(1), k);
            return tail.map(item => [head, ...item]).concat(withoutHead);
        };

        const combos = getCombinations(cards, 5);
        let bestCombo = null;
        let bestEval = null;

        combos.forEach(hand => {
            const ev = this.evaluate(hand);
            if (!bestEval || this.compare(hand, bestCombo) > 0) {
                bestCombo = hand;
                bestEval = ev;
            }
        });

        return { cards: bestCombo, eval: bestEval };
    }
}
