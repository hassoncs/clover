import { describe, it, expect } from 'vitest';
import { classifyPrompt, getClassificationConfidence } from '../classifier';

describe('classifyPrompt', () => {
  describe('game type detection', () => {
    it('should detect projectile games', () => {
      const prompts = [
        'A game where I launch balls at targets',
        'Angry birds style game with throwing rocks',
        'Slingshot game to knock down blocks',
        'Fire projectiles at enemies',
      ];

      for (const prompt of prompts) {
        const result = classifyPrompt(prompt);
        expect(result.gameType).toBe('projectile');
      }
    });

    it('should detect platformer games', () => {
      const prompts = [
        'A platformer where a cat jumps between clouds',
        'Mario style jumping game',
        'Hop from platform to platform collecting coins',
        'Doodle jump clone',
      ];

      for (const prompt of prompts) {
        const result = classifyPrompt(prompt);
        expect(result.gameType).toBe('platformer');
      }
    });

    it('should detect stacking games', () => {
      const prompts = [
        'A game where you stack blocks',
        'Build a tower by dropping pieces',
        'Balance blocks on top of each other',
        'Tetris style block dropping',
      ];

      for (const prompt of prompts) {
        const result = classifyPrompt(prompt);
        expect(result.gameType).toBe('stacking');
      }
    });

    it('should detect vehicle games', () => {
      const prompts = [
        'Drive a car over hills',
        'Hill climb racing game',
        'Monster truck game',
        'Race a motorcycle through obstacles',
      ];

      for (const prompt of prompts) {
        const result = classifyPrompt(prompt);
        expect(result.gameType).toBe('vehicle');
      }
    });

    it('should detect falling objects games', () => {
      const prompts = [
        'Catch falling apples',
        'Collect falling coins in a basket',
        'Avoid the falling bombs',
        'Fruit ninja style catching game',
      ];

      for (const prompt of prompts) {
        const result = classifyPrompt(prompt);
        expect(result.gameType).toBe('falling_objects');
      }
    });

    it('should detect rope physics games', () => {
      const prompts = [
        'Cut the rope to drop candy',
        'Swing on ropes like Tarzan',
        'Pendulum swinging game',
        'Grapple and swing through levels',
      ];

      for (const prompt of prompts) {
        const result = classifyPrompt(prompt);
        expect(result.gameType).toBe('rope_physics');
      }
    });

    it('should default to projectile for ambiguous prompts', () => {
      const result = classifyPrompt('a fun game');
      expect(result.gameType).toBe('projectile');
    });
  });

  describe('theme extraction', () => {
    it('should detect cat theme', () => {
      const result = classifyPrompt('A game with a cute kitty jumping');
      expect(result.theme).toBe('cats');
    });

    it('should detect space theme', () => {
      const result = classifyPrompt('Rocket ship avoiding asteroids');
      expect(result.theme).toBe('space');
    });

    it('should detect food theme', () => {
      const result = classifyPrompt('A game about food and candy');
      expect(result.theme).toBe('food');
    });

    it('should detect underwater theme', () => {
      const result = classifyPrompt('A fish swimming in the ocean');
      expect(result.theme).toBe('underwater');
    });

    it('should return generic for unknown themes', () => {
      const result = classifyPrompt('A game with shapes');
      expect(result.theme).toBe('generic');
    });
  });

  describe('control type detection', () => {
    it('should detect drag_to_aim for slingshot games', () => {
      const result = classifyPrompt('Drag and aim to launch projectiles');
      expect(result.controlIntent).toBe('drag_to_aim');
    });

    it('should detect tap_to_jump for jumping games', () => {
      const result = classifyPrompt('Tap to make the character jump');
      expect(result.controlIntent).toBe('tap_to_jump');
    });

    it('should detect tilt_to_move for tilting games', () => {
      const result = classifyPrompt('Tilt the phone to steer');
      expect(result.controlIntent).toBe('tilt_to_move');
    });

    it('should detect drag_to_move for swipe games', () => {
      const result = classifyPrompt('Swipe to move the basket');
      expect(result.controlIntent).toBe('drag_to_move');
    });
  });

  describe('difficulty detection', () => {
    it('should detect easy difficulty', () => {
      const result = classifyPrompt('A simple game for kids');
      expect(result.difficulty).toBe('easy');
    });

    it('should detect hard difficulty', () => {
      const result = classifyPrompt('A challenging expert level game');
      expect(result.difficulty).toBe('hard');
    });

    it('should default to medium difficulty', () => {
      const result = classifyPrompt('A platformer game');
      expect(result.difficulty).toBe('medium');
    });
  });

  describe('win/lose condition detection', () => {
    it('should detect destroy_all win condition', () => {
      const result = classifyPrompt('Destroy all the targets to win');
      expect(result.winConditionType).toBe('destroy_all');
    });

    it('should detect survive_time win condition', () => {
      const result = classifyPrompt('Survive as long as possible');
      expect(result.winConditionType).toBe('survive_time');
    });

    it('should detect reach_entity win condition', () => {
      const result = classifyPrompt('Reach the finish line to win');
      expect(result.winConditionType).toBe('reach_entity');
    });

    it('should detect entity_destroyed lose condition', () => {
      const result = classifyPrompt("Don't let the player die");
      expect(result.loseConditionType).toBe('entity_destroyed');
    });

    it('should detect time_up lose condition', () => {
      const result = classifyPrompt('Complete before the timer runs out');
      expect(result.loseConditionType).toBe('time_up');
    });
  });

  describe('special requests extraction', () => {
    it('should detect bouncy request', () => {
      const result = classifyPrompt('A game with more bounce');
      expect(result.specialRequests).toContain('high_restitution');
    });

    it('should detect fast gameplay request', () => {
      const result = classifyPrompt('A fast-paced speed game');
      expect(result.specialRequests).toContain('fast_gameplay');
    });

    it('should detect low gravity request', () => {
      const result = classifyPrompt('A moon gravity jumping game');
      expect(result.specialRequests).toContain('low_gravity');
    });

    it('should detect timed game request', () => {
      const result = classifyPrompt('A game with a countdown timer');
      expect(result.specialRequests).toContain('timed_game');
    });

    it('should detect multiple special requests', () => {
      const result = classifyPrompt('A faster more bounce game with low gravity on the moon');
      expect(result.specialRequests).toContain('fast_gameplay');
      expect(result.specialRequests).toContain('high_restitution');
      expect(result.specialRequests).toContain('low_gravity');
    });
  });

  describe('player/target action extraction', () => {
    it('should extract launch action for projectile games', () => {
      const result = classifyPrompt('Launch balls to hit targets');
      expect(result.playerAction).toBe('launch');
      expect(result.targetAction).toBe('hit');
    });

    it('should extract jump action for platformer games', () => {
      const result = classifyPrompt('Jump between platforms to collect stars');
      expect(result.playerAction).toBe('jump');
      expect(result.targetAction).toBe('collect');
    });

    it('should extract catch action for falling objects games', () => {
      const result = classifyPrompt('Catch the falling apples');
      expect(result.playerAction).toBe('catch');
      expect(result.targetAction).toBe('catch');
    });
  });
});

describe('getClassificationConfidence', () => {
  it('should return high confidence for clear game descriptions', () => {
    const confidence = getClassificationConfidence(
      'Launch angry birds at pig structures to knock them down'
    );
    expect(confidence).toBeGreaterThan(0.5);
  });

  it('should return moderate confidence for partial matches', () => {
    const confidence = getClassificationConfidence('A jumping game');
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThan(1);
  });

  it('should return low confidence for vague prompts', () => {
    const confidence = getClassificationConfidence('a fun game');
    expect(confidence).toBe(0);
  });

  it('should return higher confidence with more keyword matches', () => {
    const lowConfidence = getClassificationConfidence('throw something');
    const highConfidence = getClassificationConfidence(
      'launch and throw projectiles to destroy and knock down targets'
    );
    expect(highConfidence).toBeGreaterThan(lowConfidence);
  });
});
