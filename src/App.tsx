import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import { EarthScene } from './components/EarthScene';
import type { ParticleBlendMode } from './components/ParticleGlobe';
import { INTERACTION_CONFIG, PARTICLE_GLOBE_CONFIG } from './config';
import { latLonToFocusRotation } from './lib/earthMath';
import { setDebugState } from './lib/debug';
import { getVisibleProjectThumbnails } from './lib/projectThumbnails';
import type { ProjectThumbnail, SceneRotation } from './types';

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

const SINGAPORE_COORDINATES = { latitude: 1.3521, longitude: 103.8198 };
const INITIAL_ROTATION: SceneRotation = latLonToFocusRotation(
  SINGAPORE_COORDINATES.latitude,
  SINGAPORE_COORDINATES.longitude,
);
const NATURAL_ROTATION_X = INITIAL_ROTATION.x;
const EMPTY_FRAME_SIZE: SceneFrameSize = { width: 0, height: 0 };
const ZERO_ROTATION: SceneRotation = { x: 0, y: 0 };
const PROJECT_THUMBNAILS_MESSAGE = 'particle-earth:project-thumbnails';
const OPEN_PROJECT_MESSAGE = 'particle-earth:open-project';
const PROJECT_THUMBNAIL_BUTTON_SELECTOR = '[data-project-thumbnail-button="true"]';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeProjectThumbnails(value: unknown): ProjectThumbnail[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const { slug, title } = item;
    if (typeof slug !== 'string' || typeof title !== 'string') {
      return [];
    }

    const normalizedProject = {
      slug: slug.trim(),
      title: title.trim(),
    };

    return normalizedProject.slug && normalizedProject.title
      ? [normalizedProject]
      : [];
  });
}

function isProjectThumbnailEventTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(PROJECT_THUMBNAIL_BUTTON_SELECTOR))
  );
}

export default function App() {
  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isEmbedMode = searchParams?.get('embed') === '1';
  const isMobileMode = searchParams?.get('mobile') === '1';
  const particleOpacityDefault = isMobileMode ? 0.58 : 0.64;
  const particleSizeDefault = isMobileMode ? 1.9 : 2.4;
  const particleSeparationDefault = isMobileMode ? 1.8 : 1.4;
  const sceneFrameRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<ActiveDrag | null>(null);
  const inertiaVelocityRef = useRef<SceneRotation>({ ...ZERO_ROTATION });
  const inertiaFrameRef = useRef<number | null>(null);
  const inertiaLastTimeRef = useRef<number | null>(null);
  const autoRotateFrameRef = useRef<number | null>(null);
  const autoRotateLastTimeRef = useRef<number | null>(null);
  const [sceneFrameSize, setSceneFrameSize] = useState<SceneFrameSize>(EMPTY_FRAME_SIZE);
  const rotationRef = useRef<SceneRotation>({ ...INITIAL_ROTATION });
  const [isBackgroundDragging, setIsBackgroundDragging] = useState(false);
  const [projectThumbnails, setProjectThumbnails] = useState<ProjectThumbnail[]>([]);
  const { heroGradientColor, heroGradientLength } = useControls('Hero Background', {
    heroGradientColor: '#0d3b8b',
    heroGradientLength: {
      value: 64,
      min: 8,
      max: 100,
      step: 1,
    },
  });
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
    cityGlowColor,
    cityGlowSize,
    cityGlowStrength,
    cityGlowSizeVariance,
    singaporeGlowSize,
    singaporeGlowStrength,
    sunX,
    sunY,
    sunZ,
    sunFalloff,
  } = useControls('Particle Globe', {
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
    planetColor: '#1e9aff',
    particleOpacity: {
      value: particleOpacityDefault,
      min: 0.1,
      max: 1,
      step: 0.01,
    },
    particleSize: {
      value: particleSizeDefault,
      min: 0.7,
      max: 2.4,
      step: 0.01,
    },
    particleSeparation: {
      value: particleSeparationDefault,
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
    cityGlowColor: '#56b8ff',
    cityGlowSize: {
      value: 0.57,
      min: 0.35,
      max: 2.2,
      step: 0.01,
    },
    cityGlowStrength: {
      value: 0.9,
      min: 0,
      max: 2.2,
      step: 0.01,
    },
    cityGlowSizeVariance: {
      value: 1,
      min: 0,
      max: 2,
      step: 0.01,
    },
    singaporeGlowSize: {
      value: 1,
      min: 0.2,
      max: 3,
      step: 0.01,
    },
    singaporeGlowStrength: {
      value: 1,
      min: 0,
      max: 3,
      step: 0.01,
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
  const { signalLayerOpacity, signalLayerSpeed } = useControls('Signal Layers', {
    signalLayerOpacity: {
      value: isMobileMode ? 0.76 : 0.74,
      min: 0,
      max: 1.5,
      step: 0.01,
    },
    signalLayerSpeed: {
      value: 0.82,
      min: 0.1,
      max: 1.1,
      step: 0.01,
    },
  });

  const shellStyle = {
    '--hero-gradient-color': heroGradientColor,
    '--hero-gradient-length': `${heroGradientLength}%`,
  } as CSSProperties;

  const applyRotation = useCallback((updater: (current: SceneRotation) => SceneRotation) => {
    rotationRef.current = updater(rotationRef.current);
  }, []);

  const stopInertia = useCallback(() => {
    if (inertiaFrameRef.current !== null) {
      window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }

    inertiaLastTimeRef.current = null;
  }, []);

  const stopAutoRotate = useCallback(() => {
    if (autoRotateFrameRef.current !== null) {
      window.cancelAnimationFrame(autoRotateFrameRef.current);
      autoRotateFrameRef.current = null;
    }

    autoRotateLastTimeRef.current = null;
  }, []);

  const startAutoRotate = useCallback(() => {
    if (autoRotateFrameRef.current !== null || dragStateRef.current || inertiaFrameRef.current !== null) {
      return;
    }

    const step = (time: number) => {
      const lastTime = autoRotateLastTimeRef.current;
      autoRotateLastTimeRef.current = time;

      if (dragStateRef.current || inertiaFrameRef.current !== null) {
        autoRotateFrameRef.current = null;
        autoRotateLastTimeRef.current = null;
        return;
      }

      if (lastTime !== null) {
        const deltaSeconds = Math.max((time - lastTime) / 1000, 1 / 240);
        applyRotation((current) => ({
          x: current.x,
          y: current.y + INTERACTION_CONFIG.idleAutoRotateSpeed * deltaSeconds,
        }));
      }

      autoRotateFrameRef.current = window.requestAnimationFrame(step);
    };

    autoRotateFrameRef.current = window.requestAnimationFrame(step);
  }, [applyRotation]);

  const startInertia = () => {
    if (inertiaFrameRef.current !== null) {
      return;
    }

    stopAutoRotate();

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
          startAutoRotate();
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
    startAutoRotate();

    return () => {
      stopInertia();
      stopAutoRotate();
    };
  }, [startAutoRotate, stopAutoRotate, stopInertia]);

  useEffect(() => {
    const value = isEmbedMode ? 'true' : 'false';
    document.documentElement.dataset.embed = value;
    document.body.dataset.embed = value;

    return () => {
      delete document.documentElement.dataset.embed;
      delete document.body.dataset.embed;
    };
  }, [isEmbedMode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin && event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (!isRecord(data) || data.type !== PROJECT_THUMBNAILS_MESSAGE) {
        return;
      }

      setProjectThumbnails(normalizeProjectThumbnails(data.projects));
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    setDebugState({
      projectThumbnailCount: getVisibleProjectThumbnails(projectThumbnails, isMobileMode).length,
    });
  }, [isMobileMode, projectThumbnails]);

  const handleProjectOpen = useCallback((slug: string) => {
    window.parent.postMessage(
      {
        type: OPEN_PROJECT_MESSAGE,
        slug,
      },
      window.location.origin,
    );
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
    startAutoRotate();
  };

  const startBackgroundDrag = (
    input: DragInput,
    pointerId: number | null,
    clientX: number,
    clientY: number,
    timeStamp: number,
  ) => {
    stopInertia();
    stopAutoRotate();
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
    if (isProjectThumbnailEventTarget(event.target)) {
      return;
    }

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

    if (isProjectThumbnailEventTarget(event.target)) {
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
    <main className={`app-shell${isEmbedMode ? ' app-shell--embed' : ''}`} style={shellStyle}>
      {!isEmbedMode ? <Leva flat titleBar oneLineLabels /> : null}

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
          dpr={[1, isMobileMode ? 1.2 : 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <fog attach="fog" args={['#050816', 4.5, 9]} />
          <Suspense fallback={null}>
            <EarthScene
              rotationRef={rotationRef}
              isInteracting={isBackgroundDragging}
              isMobileMode={isMobileMode}
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
              cityGlowColor={cityGlowColor}
              cityGlowSize={cityGlowSize}
              cityGlowStrength={cityGlowStrength}
              cityGlowSizeVariance={cityGlowSizeVariance}
              singaporeGlowSize={singaporeGlowSize}
              singaporeGlowStrength={singaporeGlowStrength}
              sunDirection={[sunX, sunY, sunZ]}
              sunFalloff={sunFalloff}
              signalLayerOpacity={signalLayerOpacity}
              signalLayerSpeed={signalLayerSpeed}
              projectThumbnails={projectThumbnails}
              onProjectOpen={handleProjectOpen}
            />
          </Suspense>
        </Canvas>
      </div>
    </main>
  );
}















