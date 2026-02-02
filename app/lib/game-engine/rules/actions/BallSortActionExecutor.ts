import type { ActionExecutor } from './ActionExecutor';
import type { BallSortPickupAction, BallSortDropAction, BallSortCheckWinAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import type { RuntimeEntity } from '../../types';

const LIFT_HEIGHT = 2.0;

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
    const tubeSensor = context.entityManager.getEntity(`tube-${tubeIndex}-sensor`);
    const tubeBottom = context.entityManager.getEntity(`tube-${tubeIndex}-bottom`);
    
    if (!tubeSensor) return null;
    
    const tubeX = tubeSensor.transform.x;
    const tubeCenterY = tubeSensor.transform.y;
    
    let tubeHeight = 6.0;
    if (tubeSensor.collider?.height) {
      tubeHeight = tubeSensor.collider.height;
    } else if (tubeSensor.visual && 'height' in tubeSensor.visual) {
      tubeHeight = (tubeSensor.visual as { height: number }).height;
    }
    
    const tubeTopY = tubeCenterY + tubeHeight / 2;
    let tubeBottomY = tubeCenterY - tubeHeight / 2;
    
    if (tubeBottom) {
      let bottomThickness = 0.18;
      if (tubeBottom.collider?.height) {
        bottomThickness = tubeBottom.collider.height;
      }
      tubeBottomY = tubeBottom.transform.y + bottomThickness / 2;
    }
    
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
    const count = (context.mutator.getVariable(countVar) as number) ?? 0;
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
    const targetTubeIndex = action.tubeIndex ?? this.getTubeIndexFromInput(context);
    const sourceTubeIndex = (context.mutator.getVariable('sourceTubeIndex') as number) ?? -1;
    const heldBallId = (context.mutator.getVariable('heldBallId') as string) ?? '';
    const heldBallColor = (context.mutator.getVariable('heldBallColor') as number) ?? -1;

    if (targetTubeIndex < 0 || sourceTubeIndex < 0 || !heldBallId || heldBallColor < 0) {
      context.mutator.triggerEvent('pickup_cancelled');
      return;
    }

    if (targetTubeIndex === sourceTubeIndex) {
      this.cancelPickup(context);
      return;
    }

    const targetCountVar = `tube${targetTubeIndex}_count`;
    const targetCount = (context.mutator.getVariable(targetCountVar) as number) ?? 0;

    if (targetCount >= 4) {
      this.showInvalidFeedback(heldBallId, context);
      return;
    }

    const targetTopColorVar = `tube${targetTubeIndex}_topColor`;
    const targetTopColor = (context.mutator.getVariable(targetTopColorVar) as number) ?? -1;

    if (targetCount > 0 && targetTopColor !== heldBallColor) {
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

    context.mutator.triggerEvent('ball_dropped');
  }

  private executeCheckWin(action: BallSortCheckWinAction, context: RuleContext): void {
    for (let i = 0; i < 6; i++) {
      const countVar = `tube${i}_count`;
      const count = (context.mutator.getVariable(countVar) as number) ?? 0;

      if (count === 0) continue;
      if (count !== 4) return;

      const balls = this.getBallsInTube(i, context);
      if (balls.length === 0) return;

      const firstColor = this.getBallColor(balls[0]);
      for (let j = 1; j < balls.length; j++) {
        if (this.getBallColor(balls[j]) !== firstColor) {
          return;
        }
      }
    }

    context.mutator.setGameState('won');
  }

  private getTubeIndexFromInput(context: RuleContext): number {
    const tapEvent = context.inputEvents?.tap;
    const targetEntityId = tapEvent?.targetEntityId;
    if (!targetEntityId) return -1;

    const match = targetEntityId.match(/tube-(\d+)-sensor/);
    if (match) {
      return parseInt(match[1], 10);
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

    let topBall = balls[0];
    let topY = balls[0].transform.y;

    for (let i = 1; i < balls.length; i++) {
      if (balls[i].transform.y > topY) {
        topY = balls[i].transform.y;
        topBall = balls[i];
      }
    }

    return this.getBallColor(topBall);
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
      const count = (context.mutator.getVariable(countVar) as number) ?? 0;
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
