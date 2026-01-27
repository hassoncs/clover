import type { ActionExecutor } from './ActionExecutor';
import type { BallSortPickupAction, BallSortDropAction, BallSortCheckWinAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import type { RuntimeEntity } from '../../types';

const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

const TUBE_HEIGHT = 5.0;
const TUBE_WALL_THICKNESS = 0.15;
const BALL_RADIUS = 0.5;
const BALL_SPACING = 1.1;
const TUBE_Y = 10;
const TUBE_SPACING = 2.8;
const TUBE_START_X = 0.2;
const LIFT_HEIGHT = 3.0;

interface TubeInfo {
  count: number;
  topColor: number;
}

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
    const topColor = (context.mutator.getVariable(topColorVar) as number) ?? 0;

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

    context.mutator.setVariable('heldBallId', ballId);
    context.mutator.setVariable('sourceTubeIndex', tubeIndex);
    context.mutator.setVariable('heldBallColor', topColor);

    context.mutator.setVariable(countVar, count - 1);
    const newTopColor = this.getNewTopColor(tubeIndex, count - 1, context);
    context.mutator.setVariable(topColorVar, newTopColor);

    const liftY = ball.transform.y + LIFT_HEIGHT;
    if (context.bridge) {
      context.bridge.setPosition(ballId, ball.transform.x, liftY);
      ball.transform.y = liftY;
      context.entityManager.updateWorldTransforms(ballId);
    } else {
      ball.transform.y = liftY;
      context.entityManager.updateWorldTransforms(ballId);
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
      this.cancelPickup(context);
      return;
    }

    const targetTopColorVar = `tube${targetTubeIndex}_topColor`;
    const targetTopColor = (context.mutator.getVariable(targetTopColorVar) as number) ?? -1;

    if (targetCount > 0 && targetTopColor !== heldBallColor) {
      this.cancelPickup(context);
      return;
    }

    const ball = context.entityManager.getEntity(heldBallId);
    if (!ball) {
      this.cancelPickup(context);
      return;
    }

    const tubeX = TUBE_START_X + targetTubeIndex * TUBE_SPACING;
    const ballY = TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS - BALL_RADIUS - targetCount * BALL_SPACING;
    
    const worldX = cx(tubeX);
    const worldY = cy(ballY);

    if (context.bridge) {
      context.bridge.setPosition(heldBallId, worldX, worldY);
      ball.transform.x = worldX;
      ball.transform.y = worldY;
      context.entityManager.updateWorldTransforms(heldBallId);
    } else {
      ball.transform.x = worldX;
      ball.transform.y = worldY;
      context.entityManager.updateWorldTransforms(heldBallId);
    }

    for (const tag of ball.tags) {
      if (tag.startsWith('in-tube-')) {
        context.entityManager.removeTag(heldBallId, tag);
      }
    }
    context.entityManager.addTag(heldBallId, `in-tube-${targetTubeIndex}`);

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

      const firstColor = this.getBallColor(balls[0], context);
      for (let j = 1; j < balls.length; j++) {
        if (this.getBallColor(balls[j], context) !== firstColor) {
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
    return allBalls.filter(ball => ball.tags.includes(`in-tube-${tubeIndex}`));
  }

  private getBallColor(ball: RuntimeEntity, context: RuleContext): number {
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

    return this.getBallColor(topBall, context);
  }

  private cancelPickup(context: RuleContext): void {
    const heldBallId = (context.mutator.getVariable('heldBallId') as string) ?? '';
    const sourceTubeIndex = (context.mutator.getVariable('sourceTubeIndex') as number) ?? -1;

    if (heldBallId && sourceTubeIndex >= 0) {
      const countVar = `tube${sourceTubeIndex}_count`;
      const count = (context.mutator.getVariable(countVar) as number) ?? 0;
      const topColorVar = `tube${sourceTubeIndex}_topColor`;
      const topColor = (context.mutator.getVariable(topColorVar) as number) ?? -1;

      const ball = context.entityManager.getEntity(heldBallId);
      if (ball) {
        const ballY = TUBE_Y + TUBE_HEIGHT / 2 - TUBE_WALL_THICKNESS - BALL_RADIUS - count * BALL_SPACING;
        const worldY = cy(ballY);
        if (context.bridge) {
          context.bridge.setPosition(heldBallId, ball.transform.x, worldY);
          ball.transform.y = worldY;
          context.entityManager.updateWorldTransforms(heldBallId);
        } else {
          ball.transform.y = worldY;
          context.entityManager.updateWorldTransforms(heldBallId);
        }
      }

      context.mutator.setVariable(countVar, count + 1);
      if (topColor < 0) {
        const heldBallColor = (context.mutator.getVariable('heldBallColor') as number) ?? 0;
        context.mutator.setVariable(topColorVar, heldBallColor);
      }
    }

    context.mutator.setVariable('heldBallId', '');
    context.mutator.setVariable('sourceTubeIndex', -1);
    context.mutator.setVariable('heldBallColor', -1);

    context.mutator.triggerEvent('pickup_cancelled');
  }
}
