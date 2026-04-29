/**
 * 扑克牌类
 */
export class PokerCard {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = this.getRankValue(rank);
        this.id = `${suit}${rank}-${Math.random().toString(36).substr(2, 9)}`;
    }

    getRankValue(rank) {
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        return ranks.indexOf(rank) + 2; // 2-14
    }

    toString() {
        return `${this.suit}${this.rank}`;
    }
}

/**
 * 扑克牌堆
 */
export class PokerDeck {
    constructor() {
        this.suits = ['♠', '♥', '♣', '♦'];
        this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        for (let suit of this.suits) {
            for (let rank of this.ranks) {
                this.cards.push(new PokerCard(suit, rank));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(count) {
        return this.cards.splice(0, count);
    }

    get remaining() {
        return this.cards.length;
    }
}
