declare global {
  interface Window {
    __particleEarthDebug?: {
      particleCount: number;
      averageDisplacement: number;
      rotationX: number;
      rotationY: number;
      cameraZ: number;
      pointerHitEarth: boolean;
      velocity: number;
    };
  }
}

export function setDebugState(state: NonNullable<Window['__particleEarthDebug']>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.__particleEarthDebug = state;
}
