import { COLORS, VALUES } from './constants.js';

export class Card {
  constructor(color, value) {
    this.color = color;
    this.value = value;
  }
}

export class Player {
  constructor(id, name, isComputer = false) {
    this.id = id;
    this.name = name;
    this.isComputer = isComputer;
    this.hand = [];
    this.selectedIndex = 0;
  }

  addCard(card) {
    this.hand.push(card);
  }

  removeCard(index) {
    return this.hand.splice(index, 1)[0];
  }
}

export class Game {
  constructor() {
    this.deck = [];
    this.discardPile = [];
    this.players = [];
    this.currentPlayerIndex = 0;
    this.direction = 1; // 1 = clockwise, -1 = counter-clockwise
    this.isWildChoosingColor = false;
    this.gameStarted = false;
    this.winner = null;
    // When true, the current player must draw and is skipped (Draw Two / Wild Draw Four penalty)
    this.pendingDrawCount = 0;
  }

  initDeck() {
    const colors = [COLORS.RED, COLORS.BLUE, COLORS.GREEN, COLORS.YELLOW];
    const values = [
      VALUES.ZERO, VALUES.ONE, VALUES.TWO, VALUES.THREE, VALUES.FOUR,
      VALUES.FIVE, VALUES.SIX, VALUES.SEVEN, VALUES.EIGHT, VALUES.NINE,
      VALUES.SKIP, VALUES.REVERSE, VALUES.DRAW_TWO
    ];

    this.deck = [];
    for (const color of colors) {
      for (const value of values) {
        this.deck.push(new Card(color, value));
        if (value !== VALUES.ZERO) {
          this.deck.push(new Card(color, value));
        }
      }
    }

    for (let i = 0; i < 4; i++) {
      this.deck.push(new Card(COLORS.WILD, VALUES.WILD));
      this.deck.push(new Card(COLORS.WILD, VALUES.WILD_DRAW_FOUR));
    }

    this.shuffle();
  }

  shuffle() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  addPlayer(name, isComputer = false) {
    const id = Date.now() + Math.random();
    const player = new Player(id, name, isComputer);
    this.players.push(player);
    if (this.gameStarted) {
      for (let i = 0; i < 7; i++) {
        player.addCard(this.drawCardFromDeck());
      }
    }
    return player;
  }

  removePlayer(id) {
    const index = this.players.findIndex(p => p.id === id);
    if (index === -1) return;

    // FIX #4: Correctly adjust currentPlayerIndex after removal
    this.players.splice(index, 1);

    if (this.players.length === 0) {
      this.currentPlayerIndex = 0;
      return;
    }

    if (this.currentPlayerIndex > index) {
      // A player before current was removed — shift index back
      this.currentPlayerIndex--;
    } else if (this.currentPlayerIndex === index) {
      // The current player was removed — clamp to valid range
      this.currentPlayerIndex = this.currentPlayerIndex % this.players.length;
    }
    // If removed index > currentPlayerIndex, no adjustment needed
  }

  startGame() {
    if (this.players.length < 2) return false;
    this.initDeck();
    this.currentPlayerIndex = 0;
    this.direction = 1;
    this.winner = null;
    this.isWildChoosingColor = false;
    this.pendingDrawCount = 0;

    for (const player of this.players) {
      player.hand = [];
      player.selectedIndex = 0;
      for (let i = 0; i < 7; i++) {
        player.addCard(this.drawCardFromDeck());
      }
    }

    // Initial discard — must not be a wild
    let initialCard = this.drawCardFromDeck();
    while (initialCard.color === COLORS.WILD) {
      this.deck.push(initialCard);
      this.shuffle();
      initialCard = this.drawCardFromDeck();
    }
    this.discardPile = [initialCard];
    this.gameStarted = true;

    // FIX #8: Apply the effect of the starting card
    this._applyStartingCardEffect(initialCard);

    return true;
  }

  _applyStartingCardEffect(card) {
    switch (card.value) {
      case VALUES.SKIP:
        // First player is skipped
        this.nextTurn();
        break;
      case VALUES.REVERSE:
        // Reverse direction; in 2-player this skips first player
        if (this.players.length === 2) {
          this.nextTurn();
        } else {
          this.direction *= -1;
        }
        break;
      case VALUES.DRAW_TWO:
        // First player draws 2 and is skipped
        const first = this.players[this.currentPlayerIndex];
        first.addCard(this.drawCardFromDeck());
        first.addCard(this.drawCardFromDeck());
        this.nextTurn();
        break;
      // Number cards: no effect
    }
  }

  drawCardFromDeck() {
    if (this.deck.length === 0) {
      if (this.discardPile.length <= 1) return new Card(COLORS.WILD, VALUES.WILD); // safety
      const topCard = this.discardPile.pop();
      this.deck = this.discardPile;
      this.discardPile = [topCard];
      this.shuffle();
    }
    return this.deck.pop();
  }

  playCard(playerIndex, cardIndex, chosenColor = null) {
    if (this.winner) return false;
    const player = this.players[playerIndex];
    const card = player.hand[cardIndex];
    const topCard = this.discardPile[this.discardPile.length - 1];

    if (!this.isValidMove(card, topCard)) return false;

    player.removeCard(cardIndex);
    this.discardPile.push(card);

    // FIX #5: Check for win immediately after playing
    if (player.hand.length === 0) {
      this.winner = player;
      this.gameStarted = false;
      return true;
    }

    if (card.color === COLORS.WILD) {
      if (chosenColor) {
        this.resolveWild(chosenColor);
      } else {
        this.isWildChoosingColor = true;
        // nextTurn() will be called from resolveWild()
      }
    } else {
      this.handleCardEffect(card);
    }
    return true;
  }

  isValidMove(card, topCard) {
    if (card.color === COLORS.WILD) return true;
    const effectiveTopColor = topCard.color === COLORS.WILD ? topCard.chosenColor : topCard.color;
    return card.color === effectiveTopColor || card.value === topCard.value;
  }

  handleCardEffect(card) {
    switch (card.value) {
      case VALUES.SKIP:
        // FIX #2: Skip advances past the next player (they lose their turn)
        this.nextTurn(); // move to victim
        this.nextTurn(); // skip victim, move to player after
        break;
      case VALUES.REVERSE:
        if (this.players.length === 2) {
          // In 2-player, reverse acts as skip
          this.nextTurn();
          this.nextTurn();
        } else {
          this.direction *= -1;
          this.nextTurn();
        }
        break;
      case VALUES.DRAW_TWO: {
        // FIX #2: Advance to victim, deal cards, then skip them
        this.nextTurn(); // move to victim
        const victim = this.players[this.currentPlayerIndex];
        victim.addCard(this.drawCardFromDeck());
        victim.addCard(this.drawCardFromDeck());
        this.nextTurn(); // skip victim
        break;
      }
      default:
        // Number card — just advance
        this.nextTurn();
        break;
    }
  }

  resolveWild(chosenColor) {
    const topCard = this.discardPile[this.discardPile.length - 1];
    topCard.chosenColor = chosenColor;
    this.isWildChoosingColor = false;

    if (topCard.value === VALUES.WILD_DRAW_FOUR) {
      // FIX #1: Advance to victim, deal cards, skip victim — only ONE extra nextTurn total
      this.nextTurn(); // move to victim
      const victim = this.players[this.currentPlayerIndex];
      for (let i = 0; i < 4; i++) {
        victim.addCard(this.drawCardFromDeck());
      }
      this.nextTurn(); // skip victim
    } else {
      // Plain wild — just advance once
      this.nextTurn();
    }
  }

  nextTurn() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
    if (this.players[this.currentPlayerIndex]) {
      this.players[this.currentPlayerIndex].selectedIndex = 0;
    }
  }

  // FIX #3: drawCard does NOT advance the turn; caller decides
  drawCard(playerIndex) {
    const player = this.players[playerIndex];
    const card = this.drawCardFromDeck();
    player.addCard(card);
    return card;
  }

  // Ends the player's turn without playing (called after drawing if they can't/won't play)
  endTurn() {
    this.nextTurn();
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  // Smart AI color choice: pick the color the AI has the most of
  bestColorForAI(player) {
    const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const card of player.hand) {
      if (card.color !== COLORS.WILD && counts[card.color] !== undefined) {
        counts[card.color]++;
      }
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return best[1] > 0 ? best[0] : [COLORS.RED, COLORS.BLUE, COLORS.GREEN, COLORS.YELLOW][Math.floor(Math.random() * 4)];
  }
}
