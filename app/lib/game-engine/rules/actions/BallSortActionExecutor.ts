import type { ActionExecutor } from './ActionExecutor';
import type { BallSortPickupAction, BallSortDropAction, BallSortCheckWinAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import type { RuntimeEntity } from '../../types';
import { logger } from '../../debug/Logger';

const LIFT_HEIGHT = 2.0;
// Bottom padding matches Ball Sort tube wall thickness for slot positioning
const TUBE_BOTTOM_PADDING = 0.18;  // = TUBE_WALL_THICKNESS * WORLD_SCALE from game.ts

export class BallSortActionExecutor implements ActionExecutor<BallSortPickupAction | BallSortDropAction | BallSortCheckWinAction> {
  execute(action: BallSortPickupAction | BallSortDropAction | BallSortCheckWinAction, context: RuleContext): void {
    switch (action.type) {
      case 'ball_sort_pickup':
        this.executePickup(action, context);
        break;
      case 'ball_sort_drop':
        this.executeDrop(action, context);
        break;
      case 'ball_sort_check_win':
        this.executeCheckWin(action, context);
        break;
    }
  }

  private getTubeDimensions(tubeIndex: number, context: RuleContext): { x: number; topY: number; bottomY: number; height: number } | null {
    const tube = context.entityManager.getEntity(`tube-${tubeIndex}`);
    
    if (!tube) return null;
    
    const tubeX = tube.transform.x;
    const tubeCenterY = tube.transform.y;
    
    let tubeHeight = 6.0;
    if (tube.collider?.height) {
      tubeHeight = tube.collider.height;
    } else if (tube.visual && 'height' in tube.visual) {
      tubeHeight = (tube.visual as { height: number }).height;
    }
    
    const tubeTopY = tubeCenterY + tubeHeight / 2;
    const tubeBottomY = tubeCenterY - tubeHeight / 2 + TUBE_BOTTOM_PADDING;
    
    return { x: tubeX, topY: tubeTopY, bottomY: tubeBottomY, height: tubeHeight };
  }

  private getBallDimensions(context: RuleContext): { radius: number; spacing: number } {
    const anyBall = context.entityManager.getEntitiesByTag('ball')[0];
    if (!anyBall) {
      return { radius: 0.6, spacing: 1.32 };
    }
    
    let radius = 0.6;
    if (anyBall.collider && 'radius' in anyBall.collider) {
      radius = anyBall.collider.radius as number;
    } else if (anyBall.visual && 'radius' in anyBall.visual) {
      radius = (anyBall.visual as { radius: number }).radius;
    } else if (anyBall.visual && 'imageWidth' in anyBall.visual) {
      radius = (anyBall.visual as { imageWidth: number }).imageWidth / 2;
    }
    
    const spacing = radius * 2.2;
    return { radius, spacing };
  }

  private calculateBallPositionInTube(tubeIndex: number, slot: number, context: RuleContext): { x: number; y: number } | null {
    const tubeDims = this.getTubeDimensions(tubeIndex, context);
    if (!tubeDims) return null;
    
    const ballDims = this.getBallDimensions(context);
    const y = tubeDims.bottomY + ballDims.radius + slot * ballDims.spacing;
    
    return { x: tubeDims.x, y };
  }

  private executePickup(action: BallSortPickupAction, context: RuleContext): void {
    const tubeIndex = action.tubeIndex ?? this.getTubeIndexFromInput(context);
    if (tubeIndex < 0) {
      context.mutator.triggerEvent('pickup_cancelled');
      return;
    }

    const countVar = `tube${tubeIndex}_count`;
    const countFromState = (context.mutator.getVariable(countVar) as number) ?? 0;
    const count = countFromState > 0 ? countFromState : this.getBallsInTube(tubeIndex, context).length;
    if (count === 0) {
      context.mutator.triggerEvent('pickup_cancelled');
      return;
    }

    const topColorVar = `tube${tubeIndex}_topColor`;

    const ballId = this.findTopBallInTube(tubeIndex, context);
    if (!ballId) {
      context.mutator.triggerEvent('pickup_cancelled');
      return;
    }

    const ball = context.entityManager.getEntity(ballId);
    if (!ball) {
      context.mutator.triggerEvent('pickup_cancelled');
      return;
    }

    const ballColorTag = ball.tags.find(t => t.startsWith('color-'));
    const actualBallColor = ballColorTag ? parseInt(ballColorTag.replace('color-', ''), 10) : -1;

    context.mutator.setVariable('heldBallId', ballId);
    context.mutator.setVariable('sourceTubeIndex', tubeIndex);
    context.mutator.setVariable('heldBallColor', actualBallColor);
    context.mutator.setVariable('_lastPickupElapsed', context.mutator.getElapsed());

    context.entityManager.addTag(ballId, 'held');
    context.entityManager.removeTag(ballId, `in-container-tube-${tubeIndex}`);

    context.mutator.setVariable(countVar, count - 1);
    const newTopColor = this.getNewTopColor(tubeIndex, count - 1, context);
    context.mutator.setVariable(topColorVar, newTopColor);

    const tubeDims = this.getTubeDimensions(tubeIndex, context);
    if (!tubeDims) {
      context.mutator.triggerEvent('pickup_cancelled');
      return;
    }
    
    const pickupX = tubeDims.x;
    const pickupY = tubeDims.topY + LIFT_HEIGHT;

    if (context.setEntityTargetPosition) {
      context.setEntityTargetPosition(ballId, pickupX, pickupY, {
        duration: 0.2,
        easing: 'easeOutQuad',
      });
    }

    context.mutator.triggerEvent('ball_picked');
  }

  private executeDrop(action: BallSortDropAction, context: RuleContext): void {
    const lastPickupElapsed = (context.mutator.getVariable('_lastPickupElapsed') as number) ?? -1;
    if (lastPickupElapsed >= 0 && context.mutator.getElapsed() - lastPickupElapsed < 0.05) {
      logger.debug('rules', '[BallSortDrop] blocked: same-frame pickup/drop guard');
      return;
    }

    const targetTubeIndex = action.tubeIndex ?? this.getTubeIndexFromInput(context);
    const sourceTubeIndex = (context.mutator.getVariable('sourceTubeIndex') as number) ?? -1;
    const heldBallId = (context.mutator.getVariable('heldBallId') as string) ?? '';
    const heldBallColor = (context.mutator.getVariable('heldBallColor') as number) ?? -1;

    logger.debug('rules', '[BallSortDrop] evaluate', {
      targetTubeIndex,
      sourceTubeIndex,
      heldBallId,
      heldBallColor,
    });

    if (targetTubeIndex < 0 || sourceTubeIndex < 0 || !heldBallId || heldBallColor < 0) {
      logger.debug('rules', '[BallSortDrop] blocked: missing drop context');
      context.mutator.triggerEvent('pickup_cancelled');
      return;
    }

    if (targetTubeIndex === sourceTubeIndex) {
      logger.debug('rules', '[BallSortDrop] blocked: same source/target tube');
      this.cancelPickup(context);
      return;
    }

    const targetCountVar = `tube${targetTubeIndex}_count`;
    const targetTopColorVar = `tube${targetTubeIndex}_topColor`;
    const targetBalls = this.getBallsInTube(targetTubeIndex, context);
    const targetCount = targetBalls.length;
    const targetTopColor = targetCount > 0 ? this.getBallColor(this.getTopBall(targetBalls)) : -1;
    const targetCountFromState = (context.mutator.getVariable(targetCountVar) as number) ?? 0;
    const targetTopColorFromState = (context.mutator.getVariable(targetTopColorVar) as number) ?? -1;

    logger.debug('rules', '[BallSortDrop] target tube snapshot', {
      targetCount,
      targetTopColor,
      targetCountFromState,
      targetTopColorFromState,
    });

    if (targetCount >= 4) {
      logger.debug('rules', '[BallSortDrop] blocked: target full');
      this.showInvalidFeedback(heldBallId, context);
      return;
    }

    if (targetCount > 0 && targetTopColor !== heldBallColor) {
      logger.debug('rules', '[BallSortDrop] blocked: color mismatch', {
        targetTopColor,
        heldBallColor,
      });
      this.showInvalidFeedback(heldBallId, context);
      return;
    }

    const ball = context.entityManager.getEntity(heldBallId);
    if (!ball) {
      this.cancelPickup(context);
      return;
    }

    const dropPos = this.calculateBallPositionInTube(targetTubeIndex, targetCount, context);
    if (!dropPos) {
      logger.debug('rules', '[BallSortDrop] blocked: could not compute drop position');
      this.cancelPickup(context);
      return;
    }

    if (context.setEntityTargetPosition) {
      context.setEntityTargetPosition(heldBallId, dropPos.x, dropPos.y, {
        duration: 0.2,
        easing: 'easeOutQuad',
      });
    }

    for (const tag of ball.tags) {
      if (tag.startsWith('in-container-tube-')) {
        context.entityManager.removeTag(heldBallId, tag);
      }
    }
    context.entityManager.addTag(heldBallId, `in-container-tube-${targetTubeIndex}`);
    context.entityManager.removeTag(heldBallId, 'held');

    const newTargetCount = targetCount + 1;
    context.mutator.setVariable(targetCountVar, newTargetCount);
    context.mutator.setVariable(targetTopColorVar, heldBallColor);

    const moveCountVar = 'moveCount';
    const moveCount = (context.mutator.getVariable(moveCountVar) as number) ?? 0;
    context.mutator.setVariable(moveCountVar, moveCount + 1);

    context.mutator.setVariable('heldBallId', '');
    context.mutator.setVariable('sourceTubeIndex', -1);
    context.mutator.setVariable('heldBallColor', -1);

    logger.debug('rules', '[BallSortDrop] success', {
      targetTubeIndex,
      newTargetCount,
      moveCount: moveCount + 1,
    });

    context.mutator.triggerEvent('ball_dropped');
  }

  private executeCheckWin(action: BallSortCheckWinAction, context: RuleContext): void {
    if (!this.isWinConditionMet(context)) {
      return;
    }

    // Schedule win by setting a target time - a frame rule will check this
    const winAtElapsed = context.mutator.getElapsed() + 0.3;
    context.mutator.setVariable('_winAtElapsed', winAtElapsed);
  }

  private isWinConditionMet(context: RuleContext): boolean {
    const activeTubeCountFromState = (context.mutator.getVariable('activeTubeCount') as number) || 0;
    const activeTubeCount = activeTubeCountFromState > 0
      ? activeTubeCountFromState
      : context.entityManager.getEntitiesByTag('tube').length;
    if (activeTubeCount === 0) return false;

    for (let i = 0; i < activeTubeCount; i++) {
      const countVar = `tube${i}_count`;
      const count = (context.mutator.getVariable(countVar) as number) ?? 0;

      if (count === 0) continue;
      if (count !== 4) return false;

      const balls = this.getBallsInTube(i, context);
      if (balls.length === 0) return false;

      const firstColor = this.getBallColor(balls[0]);
      for (let j = 1; j < balls.length; j++) {
        if (this.getBallColor(balls[j]) !== firstColor) {
          return false;
        }
      }
    }
    return true;
  }

  private getTubeIndexFromInput(context: RuleContext): number {
    const tapEvent = context.inputEvents?.tap;
    const targetEntityId = tapEvent?.targetEntityId;
    if (targetEntityId) {
      const match = targetEntityId.match(/^tube-(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }

      const targetEntity = context.entityManager.getEntity(targetEntityId);
      if (targetEntity) {
        for (const tag of targetEntity.tags) {
          const tubeTagMatch = tag.match(/^in-container-tube-(\d+)$/);
          if (tubeTagMatch) {
            return parseInt(tubeTagMatch[1], 10);
          }
        }
      }
    }

    const tapWorldX = tapEvent?.worldX;
    const tapWorldY = tapEvent?.worldY;
    if (typeof tapWorldX === 'number' && typeof tapWorldY === 'number') {
      const tubes = context.entityManager.getEntitiesByTag('tube');
      let bestTubeIndex = -1;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const tube of tubes) {
        const idMatch = tube.id.match(/^tube-(\d+)$/);
        if (!idMatch) continue;

        const dx = tapWorldX - tube.transform.x;
        const dy = tapWorldY - tube.transform.y;

        if (Math.abs(dx) > 1.0 || Math.abs(dy) > 3.0) continue;

        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTubeIndex = parseInt(idMatch[1], 10);
        }
      }

      if (bestTubeIndex >= 0) return bestTubeIndex;
    }

    return -1;
  }

  private findTopBallInTube(tubeIndex: number, context: RuleContext): string | null {
    const balls = this.getBallsInTube(tubeIndex, context);
    if (balls.length === 0) return null;

    let topBall = balls[0];
    let topY = balls[0].transform.y;

    for (let i = 1; i < balls.length; i++) {
      if (balls[i].transform.y > topY) {
        topY = balls[i].transform.y;
        topBall = balls[i];
      }
    }

    return topBall.id;
  }

  private getBallsInTube(tubeIndex: number, context: RuleContext): RuntimeEntity[] {
    const allBalls = context.entityManager.getEntitiesByTag('ball');
    return allBalls.filter(ball => ball.tags.includes(`in-container-tube-${tubeIndex}`));
  }

  private getBallColor(ball: RuntimeEntity): number {
    for (const tag of ball.tags) {
      if (tag.startsWith('color-')) {
        return parseInt(tag.substring(6), 10);
      }
    }
    return -1;
  }

  private getNewTopColor(tubeIndex: number, newCount: number, context: RuleContext): number {
    if (newCount === 0) return -1;

    const balls = this.getBallsInTube(tubeIndex, context);
    if (balls.length === 0) return -1;

    const topBall = this.getTopBall(balls);
    return this.getBallColor(topBall);
  }

  private getTopBall(balls: RuntimeEntity[]): RuntimeEntity {
    let topBall = balls[0];
    let topY = balls[0].transform.y;

    for (let i = 1; i < balls.length; i++) {
      if (balls[i].transform.y > topY) {
        topY = balls[i].transform.y;
        topBall = balls[i];
      }
    }

    return topBall;
  }

  private showInvalidFeedback(ballId: string, context: RuleContext): void {
    context.entityManager.addTag(ballId, 'invalid');
    setTimeout(() => {
      context.entityManager.removeTag(ballId, 'invalid');
    }, 300);
  }

  private cancelPickup(context: RuleContext): void {
    const heldBallId = (context.mutator.getVariable('heldBallId') as string) ?? '';
    const sourceTubeIndex = (context.mutator.getVariable('sourceTubeIndex') as number) ?? -1;

    if (heldBallId && sourceTubeIndex >= 0) {
      const countVar = `tube${sourceTubeIndex}_count`;
      const countFromState = (context.mutator.getVariable(countVar) as number) ?? 0;
      const count = countFromState > 0
        ? countFromState
        : this.getBallsInTube(sourceTubeIndex, context).length;
      const topColorVar = `tube${sourceTubeIndex}_topColor`;

      const ball = context.entityManager.getEntity(heldBallId);
      
      if (ball) {
        const returnPos = this.calculateBallPositionInTube(sourceTubeIndex, count, context);
        if (returnPos && context.setEntityTargetPosition) {
          context.setEntityTargetPosition(heldBallId, returnPos.x, returnPos.y, {
            duration: 0.2,
            easing: 'easeOutQuad',
          });
        }
        context.entityManager.removeTag(heldBallId, 'held');
        context.entityManager.addTag(heldBallId, `in-container-tube-${sourceTubeIndex}`);
      }

      context.mutator.setVariable(countVar, count + 1);
      const heldBallColor = (context.mutator.getVariable('heldBallColor') as number) ?? 0;
      context.mutator.setVariable(topColorVar, heldBallColor);
    }

    context.mutator.setVariable('heldBallId', '');
    context.mutator.setVariable('sourceTubeIndex', -1);
    context.mutator.setVariable('heldBallColor', -1);

    context.mutator.triggerEvent('pickup_cancelled');
  }
}
