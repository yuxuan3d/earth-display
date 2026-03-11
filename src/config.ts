import type { InteractionConfig, ParticleGlobeConfig } from './types';

export const PARTICLE_GLOBE_CONFIG: ParticleGlobeConfig = {
  radius: 1.12,
  shellRadius: 1.1648,
  pointSize: 0.019,
  sampleCount: 88_000,
  landThreshold: 1,
  terrainHeightScale: 0.05,
  hoverRadius: 0.95,
  hoverStrength: 0.18,
  velocityMultiplier: 1.8,
  recoveryDamping: 2.6,
  dragRotateSpeed: 10.8,
};

export const INTERACTION_CONFIG: InteractionConfig = {
  velocitySmoothing: 0.2,
  minimumVelocity: 0.02,
  dragThreshold: 8,
};

