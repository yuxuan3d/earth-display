import { Suspense, useEffect, useRef, useState } from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import { EarthScene } from './components/EarthScene';
import type { ParticleBlendMode } from './components/ParticleGlobe';
import { INTERACTION_CONFIG, PARTICLE_GLOBE_CONFIG } from './config';
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
    time: number;
  };
};

const INITIAL_ROTATION: SceneRotation = { x: -0.18, y: 1.2 };
const NATURAL_ROTATION_X = INITIAL_ROTATION.x;
const EMPTY_FRAME_SIZE: SceneFrameSize = { width: 0, height: 0 };
const ZERO_ROTATION: SceneRotation = { x: 0, y: 0 };

export default function App() {
  const sceneFrameRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<ActiveDrag | null>(null);
  const inertiaVelocityRef = useRef<SceneRotation>({ ...ZERO_ROTATION });
  const inertiaFrameRef = useRef<number | null>(null);
  const inertiaLastTimeRef = useRef<number | null>(null);
  const [sceneFrameSize, setSceneFrameSize] = useState<SceneFrameSize>(EMPTY_FRAME_SIZE);
  const [rotation, setRotation] = useState<SceneRotation>(INITIAL_ROTATION);
  const rotationRef = useRef<SceneRotation>({ ...INITIAL_ROTATION });
  const [isBackgroundDragging, setIsBackgroundDragging] = useState(false);
  const {
    terrainHeight,
    glowDistance,
    glowStrength,
    glowColor,
    planetColor,
    particleOpacity,
    particleSize,
    particleSeparation,
    particleColor,
    particleBlendMode,
    sunX,
    sunY,
    sunZ,
    sunFalloff,
  } = useControls({
    terrainHeight: {
      value: PARTICLE_GLOBE_CONFIG.terrainHeightScale,
      min: 0,
      max: 0.35,
      step: 0.005,
    },
    glowDistance: {
      value: 0.51,
      min: 0.08,
      max: 0.6,
      step: 0.005,
    },
    glowStrength: {
      value: 0.57,
      min: 0.2,
      max: 1.8,
      step: 0.01,
    },
    glowColor: '#56b8ff',
    planetColor: '#4d63ff',
    particleOpacity: {
      value: 0.8,
      min: 0.1,
      max: 1,
      step: 0.01,
    },
    particleSize: {
      value: 2.4,
      min: 0.7,
      max: 2.4,
      step: 0.01,
    },
    particleSeparation: {
      value: 1.4,
      min: 0.7,
      max: 2.5,
      step: 0.01,
    },
    particleColor: '#afc9ff',
    particleBlendMode: {
      value: 'normal',
      options: {
        Normal: 'normal',
        Screen: 'screen',
        Additive: 'additive',
        Lighten: 'lighten',
        Darken: 'darken',
        Multiply: 'multiply',
        Subtractive: 'subtractive',
      },
    },
    sunX: {
      value: -0.1,
      min: -2,
      max: 2,
      step: 0.01,
    },
    sunY: {
      value: 0.11,
      min: -2,
      max: 2,
      step: 0.01,
    },
    sunZ: {
      value: 0.11,
      min: -2,
      max: 2,
      step: 0.01,
    },
    sunFalloff: {
      value: 1.56,
      min: 0.35,
      max: 3,
      step: 0.01,
    },
  });

  const applyRotation = (updater: (current: SceneRotation) => SceneRotation) => {
    setRotation((current) => {
      const next = updater(current);
      rotationRef.current = next;
      return next;
    });
  };

  const stopInertia = () => {
    if (inertiaFrameRef.current !== null) {
      window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }

    inertiaLastTimeRef.current = null;
  };

  const startInertia = () => {
    if (inertiaFrameRef.current !== null) {
      return;
    }

    const step = (time: number) => {
      const lastTime = inertiaLastTimeRef.current;
      inertiaLastTimeRef.current = time;

      if (lastTime !== null) {
        const deltaSeconds = Math.max((time - lastTime) / 1000, 1 / 240);
        const currentVelocity = inertiaVelocityRef.current;
        const currentRotation = rotationRef.current;
        const tiltOffset = currentRotation.x - NATURAL_ROTATION_X;
        const nextVelocityX = (
          currentVelocity.x - tiltOffset * INTERACTION_CONFIG.axisReturnStrength * deltaSeconds
        ) * Math.exp(-INTERACTION_CONFIG.axisReturnDamping * deltaSeconds);
        const nextVelocityY = currentVelocity.y * Math.exp(
          -INTERACTION_CONFIG.dragInertiaDamping * deltaSeconds,
        );
        const nextRotation = {
          x: currentRotation.x + nextVelocityX * deltaSeconds,
          y: currentRotation.y + nextVelocityY * deltaSeconds,
        };
        const tiltSettled =
          Math.abs(nextVelocityX) < INTERACTION_CONFIG.axisReturnAngleThreshold &&
          Math.abs(nextRotation.x - NATURAL_ROTATION_X) <
            INTERACTION_CONFIG.axisReturnAngleThreshold;
        const spinSettled =
          Math.abs(nextVelocityY) < INTERACTION_CONFIG.minimumInertiaVelocity;

        if (tiltSettled && spinSettled) {
          inertiaVelocityRef.current = { ...ZERO_ROTATION };
          applyRotation(() => ({ x: NATURAL_ROTATION_X, y: nextRotation.y }));
          inertiaFrameRef.current = null;
          inertiaLastTimeRef.current = null;
          return;
        }

        inertiaVelocityRef.current = {
          x: nextVelocityX,
          y: nextVelocityY,
        };
        applyRotation(() => nextRotation);
      }

      inertiaFrameRef.current = window.requestAnimationFrame(step);
    };

    inertiaFrameRef.current = window.requestAnimationFrame(step);
  };

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

  useEffect(() => {
    return () => {
      stopInertia();
    };
  }, []);

  const updateBackgroundDrag = (clientX: number, clientY: number, timeStamp: number) => {
    const activeDrag = dragStateRef.current;
    if (!activeDrag) {
      return;
    }

    const deltaX = clientX - activeDrag.origin.x;
    const deltaY = clientY - activeDrag.origin.y;
    const deltaSeconds = Math.max((timeStamp - activeDrag.origin.time) / 1000, 1 / 240);
    dragStateRef.current = {
      ...activeDrag,
      origin: { x: clientX, y: clientY, time: timeStamp },
    };

    if (!deltaX && !deltaY) {
      return;
    }

    const deltaRotationX =
      (deltaY / Math.max(sceneFrameSize.height, 1)) * PARTICLE_GLOBE_CONFIG.dragRotateSpeed;
    const deltaRotationY =
      (deltaX / Math.max(sceneFrameSize.width, 1)) * PARTICLE_GLOBE_CONFIG.dragRotateSpeed;

    inertiaVelocityRef.current = {
      x: deltaRotationX / deltaSeconds,
      y: deltaRotationY / deltaSeconds,
    };

    applyRotation((current) => ({
      x: current.x + deltaRotationX,
      y: current.y + deltaRotationY,
    }));
  };

  const stopBackgroundDrag = () => {
    dragStateRef.current = null;
    setIsBackgroundDragging(false);

    if (
      Math.abs(inertiaVelocityRef.current.x) >= INTERACTION_CONFIG.minimumInertiaVelocity ||
      Math.abs(inertiaVelocityRef.current.y) >= INTERACTION_CONFIG.minimumInertiaVelocity ||
      Math.abs(rotationRef.current.x - NATURAL_ROTATION_X) >=
        INTERACTION_CONFIG.axisReturnAngleThreshold
    ) {
      startInertia();
      return;
    }

    inertiaVelocityRef.current = { ...ZERO_ROTATION };
  };

  const startBackgroundDrag = (
    input: DragInput,
    pointerId: number | null,
    clientX: number,
    clientY: number,
    timeStamp: number,
  ) => {
    stopInertia();
    inertiaVelocityRef.current = { ...ZERO_ROTATION };


    dragStateRef.current = {
      input,
      pointerId,
      origin: { x: clientX, y: clientY, time: timeStamp },
    };
    setIsBackgroundDragging(true);
    return true;
  };

  const handleSceneMouseDownCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!startBackgroundDrag('mouse', null, event.clientX, event.clientY, event.timeStamp)) {
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

    updateBackgroundDrag(event.clientX, event.clientY, event.timeStamp);
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

    if (
      !startBackgroundDrag(
        'pointer',
        event.pointerId,
        event.clientX,
        event.clientY,
        event.timeStamp,
      )
    ) {
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

    updateBackgroundDrag(event.clientX, event.clientY, event.timeStamp);
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
              terrainHeightScale={terrainHeight}
              glowDistance={glowDistance}
              glowStrength={glowStrength}
              glowColor={glowColor}
              planetColor={planetColor}
              particleOpacity={particleOpacity}
              particleSizeScale={particleSize}
              particleSeparation={particleSeparation}
              particleColor={particleColor}
              particleBlendMode={particleBlendMode as ParticleBlendMode}
              sunDirection={[sunX, sunY, sunZ]}
              sunFalloff={sunFalloff}
            />
          </Suspense>
        </Canvas>
      </div>
    </main>
  );
}












