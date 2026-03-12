import type { PointerVelocityState } from '../types';

export type PointerSample = {
  x: number;
  y: number;
  time: number;
};

export function createInitialVelocityState(sample: PointerSample): PointerVelocityState {
  return {
    lastX: sample.x,
    lastY: sample.y,
    lastTime: sample.time,
    speed: 0,
  };
}

export function updatePointerVelocity(
  state: PointerVelocityState,
  sample: PointerSample,
  smoothing: number,
): PointerVelocityState {
  const deltaTime = Math.max(sample.time - state.lastTime, 1);
  const deltaX = sample.x - state.lastX;
  const deltaY = sample.y - state.lastY;
  const instantaneousSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;
  const speed = state.speed + (instantaneousSpeed - state.speed) * smoothing;

  return {
    lastX: sample.x,
    lastY: sample.y,
    lastTime: sample.time,
    speed,
  };
}

export function decayVelocity(speed: number, deltaSeconds: number, damping: number) {
  return Math.max(0, speed - deltaSeconds * damping);
}
