import { Game } from './game.js';
import { GamepadHandler } from './gamepad.js';
import { ACTION_TYPES, COLORS, VALUES } from './constants.js';
import { SoundManager } from './sounds.js';

// ── Label helpers ──────────────────────────────────────────────────────────

function cardLabel(card) {
  const v = card.value;
  if (v === VALUES.SKIP) return '⊘';
  if (v === VALUES.REVERSE) return '⇄';
  if (v === VALUES.DRAW_TWO) return '+2';
  if (v === VALUES.WILD) return '★';
  if (v === VALUES.WILD_DRAW_FOUR) return '+4';
  return v;
}

function cardIconClass(card) {
  if (card.value === VALUES.SKIP) return 'icon-skip';
  if (card.value === VALUES.REVERSE) return 'icon-reverse';
  if (card.value === VALUES.DRAW_TWO) return 'icon-draw2';
  if (card.value === VALUES.WILD) return 'icon-wild';
  if (card.value === VALUES.WILD_DRAW_FOUR) return 'icon-draw4';
  return '';
}

// Build a full card face element
function buildCardFace(card, displayColor) {
  const face = document.createElement('div');
  face.className = 'card-face';
  face.dataset.color = displayColor;

  const label = cardLabel(card);
  const iconCls = cardIconClass(card);

  const tl = document.createElement('div');
  tl.className = 'card-corner tl';
  tl.textContent = label;

  const center = document.createElement('div');
  center.className = `card-center ${iconCls}`;
  if (!iconCls) center.textContent = label;

  const br = document.createElement('div');
  br.className = 'card-corner br';
  br.textContent = label;

  face.append(tl, center, br);
  return face;
}

// ── UI ─────────────────────────────────────────────────────────────────────

class UI {
  constructor() {
    this.game = new Game();
    this.sounds = new SoundManager();
    this.gamepad = new GamepadHandler(this.handleGamepadAction.bind(this));

    // After drawing, the drawn card index is tracked so player can optionally play it
    this.drawnCardIndex = null;
    this.awaitingDrawPlay = false;
    this.isAnimating = false; // Locks AI turns during animations
    this.wildColorIndex = 0;

    // DOM refs
    this.discardEl = document.getElementById('discard');
    this.deckEl = document.getElementById('deck');
    this.playersEl = document.getElementById('players-container');
    this.modalRules = document.getElementById('modal-rules');
    this.modalPlayers = document.getElementById('modal-players');
    this.modalWild = document.getElementById('modal-wild');
    this.modalWin = document.getElementById('modal-win');
    this.directionEl = document.getElementById('direction-indicator');
    this.turnBanner = document.getElementById('turn-banner');
    this.logEl = document.getElementById('game-log');

    this.init();
  }

  init() {
    this.game.addPlayer('You', false);
    this.game.addPlayer('Computer 1', true);
    this.game.addPlayer('Computer 2', true);
    this.game.startGame();
    this.render();
    this.updateTurnBanner();
    this.log(`Game started! First card: ${cardLabel(this.game.discardPile[0])}`, true);
    this.checkComputerTurn();

    this.deckEl.addEventListener('click', () => this.onDeckClick());
    document.getElementById('btn-draw-card').addEventListener('click', () => this.onDeckClick());
    document.getElementById('btn-rules').addEventListener('click', () => this.toggleModal(this.modalRules));
    document.getElementById('btn-players').addEventListener('click', () => { this.toggleModal(this.modalPlayers); this.renderPlayerListManage(); });
    document.getElementById('btn-theme').addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      document.getElementById('btn-theme').textContent = isLight ? '🌙' : '☀️';
    });
    document.getElementById('btn-restart').addEventListener('click', () => this.restartGame());
    document.getElementById('btn-play-again').addEventListener('click', () => { this.modalWin.style.display = 'none'; this.restartGame(); });

    document.getElementById('btn-add-player').addEventListener('click', () => {
      const nameInput = document.getElementById('new-player-name');
      const isCompInput = document.getElementById('new-player-is-comp');
      if (nameInput.value.trim()) {
        this.game.addPlayer(nameInput.value.trim(), isCompInput.checked);
        nameInput.value = '';
        isCompInput.checked = false;
        this.render();
        this.renderPlayerListManage();
        this.checkComputerTurn();
      }
    });

    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        this.game.resolveWild(color);
        this.modalWild.style.display = 'none';
        this.log(`Color chosen: ${color}`, true);
        this.render();
        this.checkComputerTurn();
      });
    });
  }

  restartGame() {
    this.drawnCardIndex = null;
    this.awaitingDrawPlay = false;
    this.isAnimating = false;
    this.game.startGame();
    this.render();
    this.updateTurnBanner();
    this.logEl.innerHTML = '';
    this.log('New game started!', true);
    this.checkComputerTurn();
  }

  // ── Input ────────────────────────────────────────────────────────────────

  handleGamepadAction(type) {
    const cp = this.game.getCurrentPlayer();
    if (!cp || cp.isComputer) return; // FIX #9: block during computer turn

    if (this.game.isWildChoosingColor) {
      if (type === ACTION_TYPES.NEXT_CARD) {
        this.wildColorIndex = (this.wildColorIndex + 1) % 4;
        this.updateWildColorSelection();
      } else if (type === ACTION_TYPES.PREV_CARD) {
        this.wildColorIndex = (this.wildColorIndex + 3) % 4;
        this.updateWildColorSelection();
      } else if (type === ACTION_TYPES.PLAY_CARD) {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const color = colors[this.wildColorIndex];
        this.game.resolveWild(color);
        this.modalWild.style.display = 'none';
        this.log(`Color chosen: ${color}`, true);
        this.render();
        this.checkComputerTurn();
      }
      return;
    }

    switch (type) {
      case ACTION_TYPES.NEXT_CARD:
        cp.selectedIndex = (cp.selectedIndex + 1) % cp.hand.length;
        this.render();
        break;
      case ACTION_TYPES.PREV_CARD:
        cp.selectedIndex = (cp.selectedIndex - 1 + cp.hand.length) % cp.hand.length;
        this.render();
        break;
      case ACTION_TYPES.PLAY_CARD:
        this.tryPlaySelected();
        break;
      case ACTION_TYPES.DRAW_CARD:
        this.onDeckClick();
        break;
      case ACTION_TYPES.TOGGLE_RULES:
        this.toggleModal(this.modalRules);
        break;
      case ACTION_TYPES.TOGGLE_PLAYERS:
        this.toggleModal(this.modalPlayers);
        this.renderPlayerListManage();
        break;
    }
  }

  updateWildColorSelection() {
    const btns = document.querySelectorAll('.color-btn');
    btns.forEach((btn, i) => {
      if (i === this.wildColorIndex) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  onDeckClick() {
    const cp = this.game.getCurrentPlayer();
    if (!cp || cp.isComputer || this.isAnimating) return;

    if (this.awaitingDrawPlay) {
      // Player chose not to play the drawn card — end their turn
      this.awaitingDrawPlay = false;
      this.drawnCardIndex = null;
      this.game.endTurn();
      this.log('You passed after drawing.');
      this.render();
      this.updateTurnBanner();
      this.checkComputerTurn();
      return;
    }

    // FIX #3: Draw card, then offer play if valid
    const pIndex = this.game.currentPlayerIndex;
    const drawnCard = this.game.drawCard(pIndex);
    this.sounds.playDraw();
    const topCard = this.game.discardPile[this.game.discardPile.length - 1];

    if (this.game.isValidMove(drawnCard, topCard)) {
      // Highlight drawn card and give option to play it
      this.drawnCardIndex = cp.hand.length - 1;
      cp.selectedIndex = this.drawnCardIndex;
      this.awaitingDrawPlay = true;
      this.log(`You drew ${cardLabel(drawnCard)} — click it to play or draw again to pass.`, true);
      this.render();
      this.updateTurnBanner('Play drawn card or click Deck to pass');
    } else {
      // Can't play it — turn ends
      this.game.endTurn();
      this.log(`You drew ${cardLabel(drawnCard)}.`);
      this.render();
      this.updateTurnBanner();
      this.checkComputerTurn();
    }
  }

  tryPlaySelected() {
    const pIndex = this.game.currentPlayerIndex;
    const player = this.game.players[pIndex];
    if (!player || player.isComputer || this.isAnimating) return;

    const cardIndex = player.selectedIndex;
    const card = player.hand[cardIndex];
    if (!card) return;

    const played = this.game.playCard(pIndex, cardIndex);
    if (!played) return;

    this.awaitingDrawPlay = false;
    this.drawnCardIndex = null;
    this.playSoundForCard(card);

    if (this.game.winner) {
      this.render();
      this.showWinner(this.game.winner);
      return;
    }

    if (this.game.isWildChoosingColor) {
      this.wildColorIndex = 0;
      this.updateWildColorSelection();
      this.modalWild.style.display = 'flex';
    }

    this.log(`You played ${cardLabel(card)}.`, true);
    this.render();
    this.updateTurnBanner();
    this.checkComputerTurn();
  }

  // ── Computer AI ──────────────────────────────────────────────────────────

  checkComputerTurn() {
    if (this.isAnimating) return;
    const cp = this.game.getCurrentPlayer();
    if (cp && cp.isComputer && this.game.gameStarted && !this.game.winner) {
      this.gamepad.enabled = false;
      this.isAnimating = true;
      setTimeout(() => this.runComputerTurn(), 1200);
    } else {
      this.gamepad.enabled = true;
    }
  }

  runComputerTurn() {
    if (this.game.isWildChoosingColor) {
      const color = this.game.bestColorForAI(this.game.getCurrentPlayer());
      this.game.resolveWild(color);
      this.log(`${this.game.players[(this.game.currentPlayerIndex - this.game.direction + this.game.players.length) % this.game.players.length]?.name ?? 'CPU'} chose ${color}.`);
      this.isAnimating = false;
      this.render();
      this.updateTurnBanner();
      this.checkComputerTurn();
      return;
    }

    const player = this.game.getCurrentPlayer();
    if (!player) { this.isAnimating = false; return; }

    const topCard = this.game.discardPile[this.game.discardPile.length - 1];
    const playableIndex = player.hand.findIndex(c => this.game.isValidMove(c, topCard));

    if (playableIndex !== -1) {
      // Animate scanning through cards to the playable one
      this.animateAIScan(player, playableIndex, () => {
        const card = player.hand[playableIndex];
        const chosenColor = card.color === COLORS.WILD ? this.game.bestColorForAI(player) : null;
        const playerName = player.name;

        if (this.game.playCard(this.game.currentPlayerIndex, playableIndex, chosenColor)) {
          this.playSoundForCard(card);
          this.log(`${playerName} played ${cardLabel(card)}.`, true);
          if (this.game.winner) {
            this.render();
            this.showWinner(this.game.winner);
            this.isAnimating = false;
            return;
          }
          if (this.game.isWildChoosingColor && chosenColor) {
            this.game.resolveWild(chosenColor);
            this.log(`${playerName} chose ${chosenColor}.`);
          }
        }
        this.isAnimating = false;
        this.render();
        this.updateTurnBanner();
        this.checkComputerTurn();
      });
    } else {
      // Draw card
      const drawnCard = this.game.drawCard(this.game.currentPlayerIndex);
      this.sounds.playDraw();
      this.log(`${player.name} drew a card.`);
      const topCard2 = this.game.discardPile[this.game.discardPile.length - 1];
      // Check if drawn card is playable
      if (this.game.isValidMove(drawnCard, topCard2)) {
        const newIndex = player.hand.length - 1;
        const card = player.hand[newIndex];
        const chosenColor = card.color === COLORS.WILD ? this.game.bestColorForAI(player) : null;
        const playerName = player.name;
        setTimeout(() => {
          if (this.game.playCard(this.game.currentPlayerIndex, newIndex, chosenColor)) {
            this.playSoundForCard(card);
            this.log(`${playerName} played drawn ${cardLabel(card)}.`, true);
            if (this.game.winner) { this.render(); this.showWinner(this.game.winner); this.isAnimating = false; return; }
            if (this.game.isWildChoosingColor && chosenColor) {
              this.game.resolveWild(chosenColor);
            }
          } else {
            this.game.endTurn();
          }
          this.isAnimating = false;
          this.render();
          this.updateTurnBanner();
          this.checkComputerTurn();
        }, 600);
      } else {
        this.game.endTurn();
        this.isAnimating = false;
        this.render();
        this.updateTurnBanner();
        this.checkComputerTurn();
      }
    }
  }

  // Animate the AI "scanning" through cards left-to-right, landing on target
  animateAIScan(player, targetIndex, onDone) {
    const STEP_DELAY = 220; // ms per card scan step
    const steps = [];

    // Always scan from index 0 up to targetIndex
    for (let i = 0; i <= targetIndex; i++) {
      steps.push(i);
    }

    let stepIdx = 0;
    const advance = () => {
      if (stepIdx >= steps.length) {
        // Final: flash chosen card then call done
        player.selectedIndex = targetIndex;
        this.render();
        // Mark the target as "chosen"
        const playerEls = document.querySelectorAll('.player');
        const aiPlayerIdx = this.game.currentPlayerIndex;
        // Find the correct player element (they're rendered in order)
        // We'll use a data attribute set in render()
        const aiEl = document.querySelector(`.player[data-player-index="${aiPlayerIdx}"]`);
        if (aiEl) {
          const cardEls = aiEl.querySelectorAll('.hand-card');
          if (cardEls[targetIndex]) {
            cardEls[targetIndex].classList.remove('ai-scanning');
            cardEls[targetIndex].classList.add('ai-chosen');
          }
        }
        setTimeout(onDone, 400);
        return;
      }

      player.selectedIndex = steps[stepIdx];
      this.render();

      // Add scan highlight to the current card
      const aiEl = document.querySelector(`.player[data-player-index="${this.game.currentPlayerIndex}"]`);
      if (aiEl) {
        const cardEls = aiEl.querySelectorAll('.hand-card');
        if (cardEls[steps[stepIdx]]) {
          cardEls[steps[stepIdx]].classList.add('ai-scanning');
        }
      }

      stepIdx++;
      setTimeout(advance, STEP_DELAY);
    };

    advance();
  }

  // ── Sound ────────────────────────────────────────────────────────────────

  playSoundForCard(card) {
    if (card.color === COLORS.WILD) {
      this.sounds.playWild();
    } else if ([VALUES.SKIP, VALUES.REVERSE, VALUES.DRAW_TWO].includes(card.value)) {
      this.sounds.playSpecial();
    } else {
      this.sounds.playCard();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  render() {
    // Direction
    if (this.game.direction === 1) {
      this.directionEl.classList.remove('reverse');
    } else {
      this.directionEl.classList.add('reverse');
    }

    // Discard pile
    const topCard = this.game.discardPile[this.game.discardPile.length - 1];
    if (topCard) {
      this.discardEl.innerHTML = '';
      const displayColor = topCard.color === COLORS.WILD ? (topCard.chosenColor || 'wild') : topCard.color;
      this.discardEl.appendChild(buildCardFace(topCard, displayColor));
      this.discardEl.dataset.color = displayColor;
    }

    // Players
    this.playersEl.innerHTML = '';
    const count = this.game.players.length;
    const angleStep = (Math.PI * 2) / count;

    // Dynamic elliptical positioning to prevent overlapping logic for large amount of players
    // Increases bounds with more players up to the limit of screen real estate.
    const rx = Math.max(340, Math.min(window.innerWidth / 2 - 150, 340 + count * 20));
    const ry = Math.max(280, Math.min(window.innerHeight / 2 - 160, 290 + count * 15));

    this.game.players.forEach((player, i) => {
      // Starts precisely at the bottom for first player -> +PI/2
      const angle = i * angleStep + Math.PI / 2;
      const x = Math.cos(angle) * rx;
      const y = Math.sin(angle) * ry;

      const isActive = i === this.game.currentPlayerIndex;
      const isHuman = !player.isComputer && !this.game.players.some((p, idx) => idx !== i && !p.isComputer);
      // Actually: is this the first human?
      const isFirstHuman = !player.isComputer;

      const playerEl = document.createElement('div');
      playerEl.className = `player ${isActive ? 'active' : ''}`;
      playerEl.dataset.playerIndex = i;
      playerEl.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`;

      // Name badge
      const nameEl = document.createElement('div');
      nameEl.className = 'player-name';
      nameEl.innerHTML = `
        <span>${player.name}${isActive ? ' <span style="color:var(--green)">▶</span>' : ''}</span>
        <div class="card-count">${player.hand.length}</div>
      `;
      playerEl.appendChild(nameEl);

      // Hand
      const handEl = document.createElement('div');
      handEl.className = 'hand';

      const cardCount = player.hand.length;
      const totalWidth = Math.min(cardCount * 38, 240);
      const spread = cardCount > 1 ? totalWidth / (cardCount - 1) : 0;
      const startX = -totalWidth / 2;

      player.hand.forEach((card, cIndex) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'hand-card';

        const posX = cardCount === 1 ? 0 : startX + cIndex * spread;
        const rot = cardCount > 1 ? ((cIndex / (cardCount - 1)) - 0.5) * 14 : 0;
        const baseY = Math.abs(rot) * 0.8;

        const isSelected = isActive && cIndex === player.selectedIndex;

        if (player.isComputer) {
          // Face-down for computer
          cardEl.classList.add('face-down');
        } else {
          // Face-up for human
          const displayColor = card.color === COLORS.WILD ? 'wild' : card.color;
          cardEl.dataset.color = displayColor;
          cardEl.appendChild(buildCardFace(card, displayColor));
        }

        if (isSelected) cardEl.classList.add('selected');

        // Position
        cardEl.style.cssText = `
          left: calc(50% + ${posX}px - ${Math.floor(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-w')) / 2)}px);
          transform: rotate(${rot}deg) translateY(${isSelected ? baseY - 22 : baseY}px);
          z-index: ${isSelected ? 200 : 10 + cIndex};
          --base-y: ${baseY}px;
        `;

        if (!player.isComputer && isActive) {
          cardEl.addEventListener('click', () => {
            player.selectedIndex = cIndex;
            if (this.awaitingDrawPlay && cIndex === this.drawnCardIndex) {
              this.tryPlaySelected();
            } else {
              this.render();
              this.tryPlaySelected();
            }
          });
        }

        handEl.appendChild(cardEl);
      });

      playerEl.appendChild(handEl);
      this.playersEl.appendChild(playerEl);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  updateTurnBanner(msg = null) {
    const cp = this.game.getCurrentPlayer();
    if (!cp) return;
    this.turnBanner.className = ''; // reset classes

    if (msg) {
      this.turnBanner.textContent = msg;
      this.turnBanner.classList.add('banner-msg');
    } else if (cp.isComputer) {
      this.turnBanner.textContent = `${cp.name} is thinking…`;
      this.turnBanner.classList.add('banner-ai');
    } else {
      this.turnBanner.textContent = `Your Turn`;
      this.turnBanner.classList.add('banner-player');
    }
  }

  log(msg, highlight = false) {
    const el = document.createElement('div');
    el.className = `log-entry${highlight ? ' highlight' : ''}`;
    el.textContent = msg;
    this.logEl.prepend(el);
    // Keep only last 5
    while (this.logEl.children.length > 5) {
      this.logEl.removeChild(this.logEl.lastChild);
    }
  }

  toggleModal(modal) {
    const visible = modal.style.display === 'flex';
    modal.style.display = visible ? 'none' : 'flex';
  }

  showWinner(player) {
    this.sounds.playWin();
    document.getElementById('winner-name-text').textContent = player.name;
    this.modalWin.style.display = 'flex';
    this.log(`🏆 ${player.name} wins!`, true);
    this.updateTurnBanner(`🏆 ${player.name} wins!`);
  }

  renderPlayerListManage() {
    const list = document.getElementById('player-list-manage');
    list.innerHTML = '';
    this.game.players.forEach(p => {
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.05);border-radius:8px;';
      div.innerHTML = `
        <span style="font-weight:700">${p.name} <span style="color:#888;font-weight:400">${p.isComputer ? '(CPU)' : '(Human)'}</span></span>
        <button data-id="${p.id}" style="background:rgba(230,57,70,0.25);border-color:var(--red);color:#ffaaaa;padding:4px 12px;font-size:0.8rem;">Remove</button>
      `;
      div.querySelector('button').onclick = () => {
        this.game.removePlayer(p.id);
        this.render();
        this.renderPlayerListManage();
        this.updateTurnBanner();
        this.checkComputerTurn();
      };
      list.appendChild(div);
    });
  }
}

new UI();
