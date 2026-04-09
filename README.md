# Card Color Match

A fast-paced, colorful web-based card game built entirely from scratch with Vanilla JavaScript, HTML, and CSS. The premise is simple: be the first player to get rid of all your cards by matching them with the discard pile by color or number! 

## Features
- **Dynamic Players**: Play against a table full of varying CPU opponents. CPU players are generated and tracked sequentially using an auto-incrementing naming system. 
- **Authentic Action Cards**: Disrupt that peaceful flow with Skips, Reverses, Draw Twos, Wilds, and Wild Draw Fours!
- **Full Gamepad Support**: Fully playable with a mouse, or sit back using a standard gamepad (D-pad to cycle, Action button to drop cards).
- **Light & Dark Theme**: Features a gorgeous glass-morphism themed UI that scales and transforms its elliptical orbit dynamically based on the number of players, complete with a selectable slick Dark Mode and crisp Light Mode. 

## How To Play
### The Rules
1. Every player is dealt 7 cards to start.
2. When it's your turn, play a card that matches the top card of the discard pile by either **Color** or **Number**.
3. If you do not have a matching card, you must draw a card from the deck.
4. If you draw a playable card, you may play it immediately, or choose to pass.
5. The first player to empty their hand completely wins! 

### Special Cards
- **⊘ (Skip)** — Next player loses their turn.
- **⇄ (Reverse)** — Reverses the sequence of play.
- **+2 (Draw Two)** — Next player draws 2 cards and skips their turn.
- **Wild (Multi-color circle)** — Play this on top of anything. You choose the next active color requirement.
- **+4 (Wild Draw Four)** — Play this on top of anything. You choose the next active color requirement, and the next player must draw 4 cards and skip their turn.

## Controls

**Mouse & Click Details:**
- **Click Cards**: Drop them onto the discard pile.
- **Click Deck**: Draw a card or pass your turn.
- **Interface**: Click UI buttons to toggle rules, manage players, or toggle the lighting theme.

**Gamepad (PS4/Xbox Context):**
- **D-Pad / Bumpers (L1/R1)**: Navigate through cards in your hand or cycle between color choices inside the Wild selection modal.
- **✕ (Cross) / A**: Play selected card, confirm your wild color choice, or quick-start a restart from the Victory screen.
- **○ (Circle) / B**: Draw a card from the central deck.
- **□ (Square) / X**: Toggle the 'How to Play' rules screen.
- **△ (Triangle) / Y**: Toggle the Player Management screen. 

## Getting Started
You don't need any complex environment packages or build tools! Simply clone or download the repository, double-click `index.html` to open it in any modern browser, and start matching!
