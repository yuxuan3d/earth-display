import {
  createInitialVelocityState,
  decayVelocity,
  shouldStartRotateDrag,
  updatePointerVelocity,
} from './interaction';

describe('interaction helpers', () => {
  it('smooths pointer velocity samples over time', () => {
    const initial = createInitialVelocityState({ x: 10, y: 10, time: 10 });
    const updated = updatePointerVelocity(
      initial,
      { x: 30, y: 10, time: 20 },
      0.5,
    );

    expect(updated.speed).toBeCloseTo(1, 2);
  });

  it('decays the current velocity toward zero', () => {
    expect(decayVelocity(0.8, 0.1, 2)).toBeCloseTo(0.6);
    expect(decayVelocity(0.1, 1, 1)).toBe(0);
  });

  it('starts a rotate drag only when pointer down begins outside the earth', () => {
    expect(shouldStartRotateDrag(false)).toBe(true);
    expect(shouldStartRotateDrag(true)).toBe(false);
  });
});
