export type ParticleGlobeConfig = {
  radius: number;
  shellRadius: number;
  pointSize: number;
  sampleCount: number;
  landThreshold: number;
  terrainHeightScale: number;
  hoverRadius: number;
  hoverStrength: number;
  velocityMultiplier: number;
  recoveryDamping: number;
  dragRotateSpeed: number;
};

export type InteractionConfig = {
  velocitySmoothing: number;
  minimumVelocity: number;
  dragThreshold: number;
  dragInertiaDamping: number;
  minimumInertiaVelocity: number;
  idleAutoRotateSpeed: number;
  axisReturnStrength: number;
  axisReturnDamping: number;
  axisReturnAngleThreshold: number;
};

export type ResponsiveSceneMetrics = {
  radius: number;
  shellRadius: number;
  pointSize: number;
  cameraZ: number;
  offsetX: number;
};

export type ProjectedGlobeCircle = {
  centerX: number;
  centerY: number;
  radius: number;
};

export type SceneRotation = {
  x: number;
  y: number;
};

export type Vector3Like = {
  x: number;
  y: number;
  z: number;
};

export type MaskImageData = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export type PointerVelocityState = {
  lastX: number;
  lastY: number;
  lastTime: number;
  speed: number;
};

