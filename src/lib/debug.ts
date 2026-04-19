declare global {
  interface Window {
    __particleEarthDebug?: {
      particleCount?: number;
      averageDisplacement?: number;
      rotationX?: number;
      rotationY?: number;
      cameraZ?: number;
      pointerHitEarth?: boolean;
      velocity?: number;
      cityBeaconCount?: number;
      projectSignalCount?: number;
      rndSignalCount?: number;
      workflowOrbitCount?: number;
      homeBasePulseCount?: number;
      signalLayerInteracting?: boolean;
      projectThumbnailCount?: number;
    };
  }
}

export function setDebugState(state: Partial<NonNullable<Window['__particleEarthDebug']>>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.__particleEarthDebug = {
    ...window.__particleEarthDebug,
    ...state,
  };
}
