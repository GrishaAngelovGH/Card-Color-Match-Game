import { PS4_BUTTONS, ACTION_TYPES } from './constants.js';

export class GamepadHandler {
  constructor(onAction) {
    this.onAction = onAction;
    this.gamepads = {};
    this.prevButtons = {};
    this.enabled = true; // FIX #9: Can disable during computer turns

    window.addEventListener('gamepadconnected', (e) => this.addGamepad(e.gamepad));
    window.addEventListener('gamepaddisconnected', (e) => this.removeGamepad(e.gamepad));

    this.update = this.update.bind(this);
    requestAnimationFrame(this.update);
  }

  addGamepad(gamepad) {
    console.log('Gamepad connected:', gamepad.id);
    this.gamepads[gamepad.index] = gamepad;
    this.prevButtons[gamepad.index] = gamepad.buttons.map(b => b.pressed);
  }

  removeGamepad(gamepad) {
    console.log('Gamepad disconnected:', gamepad.id);
    delete this.gamepads[gamepad.index];
    delete this.prevButtons[gamepad.index];
  }

  update() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    for (const gp of gamepads) {
      if (!gp) continue;

      const prev = this.prevButtons[gp.index];
      if (!prev) {
        this.prevButtons[gp.index] = gp.buttons.map(b => b.pressed);
        continue;
      }

      const current = gp.buttons.map(b => b.pressed);

      // FIX #9: Only dispatch gameplay actions when input is enabled
      if (this.enabled) {
        if (current[PS4_BUTTONS.CROSS] && !prev[PS4_BUTTONS.CROSS]) this.onAction(ACTION_TYPES.PLAY_CARD);
        if (current[PS4_BUTTONS.CIRCLE] && !prev[PS4_BUTTONS.CIRCLE]) this.onAction(ACTION_TYPES.DRAW_CARD);
        if (current[PS4_BUTTONS.SQUARE] && !prev[PS4_BUTTONS.SQUARE]) this.onAction(ACTION_TYPES.TOGGLE_RULES);
        if (current[PS4_BUTTONS.TRIANGLE] && !prev[PS4_BUTTONS.TRIANGLE]) this.onAction(ACTION_TYPES.TOGGLE_PLAYERS);
        if ((current[PS4_BUTTONS.DPAD_RIGHT] && !prev[PS4_BUTTONS.DPAD_RIGHT]) || (current[PS4_BUTTONS.R1] && !prev[PS4_BUTTONS.R1])) this.onAction(ACTION_TYPES.NEXT_CARD);
        if ((current[PS4_BUTTONS.DPAD_LEFT] && !prev[PS4_BUTTONS.DPAD_LEFT]) || (current[PS4_BUTTONS.L1] && !prev[PS4_BUTTONS.L1])) this.onAction(ACTION_TYPES.PREV_CARD);
      } else {
        // Still allow UI actions even when gameplay is locked
        if (current[PS4_BUTTONS.SQUARE] && !prev[PS4_BUTTONS.SQUARE]) this.onAction(ACTION_TYPES.TOGGLE_RULES);
        if (current[PS4_BUTTONS.TRIANGLE] && !prev[PS4_BUTTONS.TRIANGLE]) this.onAction(ACTION_TYPES.TOGGLE_PLAYERS);
      }

      this.prevButtons[gp.index] = current;
    }

    requestAnimationFrame(this.update);
  }
}
