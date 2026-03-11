import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import { EarthScene } from './components/EarthScene';
import { PARTICLE_GLOBE_CONFIG } from './config';
import { shouldStartRotateDrag } from './lib/interaction';
import { getProjectedGlobeCircle, getResponsiveSceneMetrics } from './lib/sceneLayout';
import type { SceneRotation } from './types';

type SceneFrameSize = {
  width: number;
  height: number;
};

type DragInput = 'mouse' | 'pointer';

type ActiveDrag = {
  input: DragInput;
  pointerId: number | null;
  origin: {
    x: number;
    y: number;
  };
};

const INITIAL_ROTATION: SceneRotation = { x: -0.18, y: 1.2 };
const EMPTY_FRAME_SIZE: SceneFrameSize = { width: 0, height: 0 };

export default function App() {
  const sceneFrameRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<ActiveDrag | null>(null);
  const [sceneFrameSize, setSceneFrameSize] = useState<SceneFrameSize>(EMPTY_FRAME_SIZE);
  const [rotation, setRotation] = useState<SceneRotation>(INITIAL_ROTATION);
  const [isBackgroundDragging, setIsBackgroundDragging] = useState(false);
  const { terrainHeight } = useControls({
    terrainHeight: {
      value: PARTICLE_GLOBE_CONFIG.terrainHeightScale,
      min: 0,
      max: 0.35,
      step: 0.005,
    },
  });
  const sceneMetrics = useMemo(
    () =>
      getResponsiveSceneMetrics(
        sceneFrameSize.width,
        sceneFrameSize.height,
        PARTICLE_GLOBE_CONFIG,
      ),
    [sceneFrameSize.height, sceneFrameSize.width],
  );
  const projectedGlobe = useMemo(
    () => getProjectedGlobeCircle(sceneFrameSize.width, sceneFrameSize.height, sceneMetrics),
    [sceneFrameSize.height, sceneFrameSize.width, sceneMetrics],
  );

  useEffect(() => {
    const sceneFrame = sceneFrameRef.current;
    if (!sceneFrame) {
      return;
    }

    const updateSize = () => {
      const rect = sceneFrame.getBoundingClientRect();
      setSceneFrameSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(sceneFrame);

    return () => {
      observer.disconnect();
    };
  }, []);

  const updateBackgroundDrag = (clientX: number, clientY: number) => {
    const activeDrag = dragStateRef.current;
    if (!activeDrag) {
      return;
    }

    const deltaX = clientX - activeDrag.origin.x;
    const deltaY = clientY - activeDrag.origin.y;
    dragStateRef.current = {
      ...activeDrag,
      origin: { x: clientX, y: clientY },
    };

    if (!deltaX && !deltaY) {
      return;
    }

    setRotation((current) => ({
      x:
        current.x +
        (deltaY / Math.max(sceneFrameSize.height, 1)) * PARTICLE_GLOBE_CONFIG.dragRotateSpeed,
      y:
        current.y +
        (deltaX / Math.max(sceneFrameSize.width, 1)) * PARTICLE_GLOBE_CONFIG.dragRotateSpeed,
    }));
  };

  const stopBackgroundDrag = () => {
    dragStateRef.current = null;
    setIsBackgroundDragging(false);
  };

  const startBackgroundDrag = (
    input: DragInput,
    pointerId: number | null,
    clientX: number,
    clientY: number,
  ) => {
    const sceneFrame = sceneFrameRef.current;
    if (!sceneFrame) {
      return false;
    }

    const rect = sceneFrame.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const distanceFromGlobe = Math.hypot(
      localX - projectedGlobe.centerX,
      localY - projectedGlobe.centerY,
    );
    const pointerStartedOnEarth = distanceFromGlobe <= projectedGlobe.radius;

    if (!shouldStartRotateDrag(pointerStartedOnEarth)) {
      return false;
    }

    dragStateRef.current = {
      input,
      pointerId,
      origin: { x: clientX, y: clientY },
    };
    setIsBackgroundDragging(true);
    return true;
  };

  const handleSceneMouseDownCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!startBackgroundDrag('mouse', null, event.clientX, event.clientY)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  const handleSceneMouseMoveCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    const activeDrag = dragStateRef.current;
    if (!activeDrag || activeDrag.input !== 'mouse') {
      return;
    }

    updateBackgroundDrag(event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleSceneMouseEndCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    const activeDrag = dragStateRef.current;
    if (!activeDrag || activeDrag.input !== 'mouse') {
      return;
    }

    stopBackgroundDrag();
    event.preventDefault();
    event.stopPropagation();
  };

  const handleScenePointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      return;
    }

    if (!startBackgroundDrag('pointer', event.pointerId, event.clientX, event.clientY)) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleScenePointerMoveCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activeDrag = dragStateRef.current;
    if (
      event.pointerType === 'mouse' ||
      !activeDrag ||
      activeDrag.input !== 'pointer' ||
      activeDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    updateBackgroundDrag(event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
  };

  const handleScenePointerEndCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activeDrag = dragStateRef.current;
    if (
      event.pointerType === 'mouse' ||
      !activeDrag ||
      activeDrag.input !== 'pointer' ||
      activeDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    stopBackgroundDrag();
    event.preventDefault();
    event.stopPropagation();
  };

  const handleSceneLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const activeDrag = dragStateRef.current;
    if (
      !activeDrag ||
      activeDrag.input !== 'pointer' ||
      activeDrag.pointerId !== event.pointerId
    ) {
      return;
    }

    stopBackgroundDrag();
  };

  return (
    <main className="app-shell">
      <Leva flat titleBar={false} oneLineLabels />

      <div
        ref={sceneFrameRef}
        className={`scene-frame${isBackgroundDragging ? ' is-dragging' : ''}`}
        data-testid="scene-frame"
        onMouseDownCapture={handleSceneMouseDownCapture}
        onMouseMoveCapture={handleSceneMouseMoveCapture}
        onMouseUpCapture={handleSceneMouseEndCapture}
        onPointerDownCapture={handleScenePointerDownCapture}
        onPointerMoveCapture={handleScenePointerMoveCapture}
        onPointerUpCapture={handleScenePointerEndCapture}
        onPointerCancelCapture={handleScenePointerEndCapture}
        onLostPointerCapture={handleSceneLostPointerCapture}
      >
        <Canvas
          camera={{ position: [0, 0, 4.4], fov: 34 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={['#050816']} />
          <fog attach="fog" args={['#050816', 4.5, 9]} />
          <Suspense fallback={null}>
            <EarthScene
              rotation={rotation}
              isBackgroundDragging={isBackgroundDragging}
              terrainHeightScale={terrainHeight}
            />
          </Suspense>
        </Canvas>
      </div>
    </main>
  );
}

