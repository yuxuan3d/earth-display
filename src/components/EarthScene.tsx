import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FresnelShell } from './FresnelShell';
import { PlanetBody } from './PlanetBody';
import { ParticleGlobe, type ParticleBlendMode } from './ParticleGlobe';
import { INTERACTION_CONFIG, PARTICLE_GLOBE_CONFIG } from '../config';
import { getResponsiveSceneMetrics } from '../lib/sceneLayout';
import {
  createInitialVelocityState,
  decayVelocity,
  updatePointerVelocity,
} from '../lib/interaction';
import type { SceneRotation } from '../types';

type HoverInteractionState = {
  hitPoint: THREE.Vector3 | null;
  velocity: number;
};

type SceneInputEvent = Pick<MouseEvent, 'clientX' | 'clientY' | 'timeStamp'>;

type EarthSceneProps = {
  rotation: SceneRotation;
  isBackgroundDragging: boolean;
  terrainHeightScale: number;
  glowDistance: number;
  glowStrength: number;
  glowColor: string;
  planetColor: string;
  particleOpacity: number;
  particleColor: string;
  particleBlendMode: ParticleBlendMode;
  sunDirection: [number, number, number];
  sunFalloff: number;
};

const DEFAULT_SUN_DIRECTION = new THREE.Vector3(-0.11, 0.11, 0.11).normalize();

export function EarthScene({
  rotation,
  isBackgroundDragging,
  terrainHeightScale,
  glowDistance,
  glowStrength,
  glowColor,
  planetColor,
  particleOpacity,
  particleColor,
  particleBlendMode,
  sunDirection,
  sunFalloff,
}: EarthSceneProps) {
  const { camera, gl, raycaster, size } = useThree();
  const rigRef = useRef<THREE.Group>(null);
  const interactionMeshRef = useRef<THREE.Mesh>(null);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const velocityState = useRef<ReturnType<typeof createInitialVelocityState> | null>(null);
  const sceneMetrics = useMemo(
    () => getResponsiveSceneMetrics(size.width, size.height, PARTICLE_GLOBE_CONFIG),
    [size.height, size.width],
  );
  const normalizedSunDirection = (() => {
    const direction = new THREE.Vector3(...sunDirection);

    if (direction.lengthSq() < 0.0001) {
      return DEFAULT_SUN_DIRECTION.clone();
    }

    return direction.normalize();
  })();
  const sunLightPosition: [number, number, number] = [
    normalizedSunDirection.x * 5,
    normalizedSunDirection.y * 5,
    normalizedSunDirection.z * 5,
  ];
  const fillLightPosition: [number, number, number] = [
    -normalizedSunDirection.x * 3.2,
    -normalizedSunDirection.y * 2.1,
    -normalizedSunDirection.z * 3.2,
  ];
  const [interaction, setInteraction] = useState<HoverInteractionState>({
    hitPoint: null,
    velocity: 0,
  });

  useLayoutEffect(() => {
    camera.position.set(0, 0, sceneMetrics.cameraZ);
    camera.updateProjectionMatrix();
  }, [camera, sceneMetrics.cameraZ]);

  useEffect(() => {
    const canvas = gl.domElement;

    const getHitPoint = (event: SceneInputEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const sphere = interactionMeshRef.current;

      if (!sphere || !rigRef.current) {
        return null;
      }

      const intersections = raycaster.intersectObject(sphere, false);
      if (!intersections.length) {
        return null;
      }

      return rigRef.current.worldToLocal(intersections[0].point.clone());
    };

    const updateHover = (event: SceneInputEvent) => {
      if (isBackgroundDragging) {
        return;
      }

      const sample = {
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
      };

      if (!velocityState.current) {
        velocityState.current = createInitialVelocityState(sample);
      } else {
        velocityState.current = updatePointerVelocity(
          velocityState.current,
          sample,
          INTERACTION_CONFIG.velocitySmoothing,
        );
      }

      setInteraction({
        hitPoint: getHitPoint(event),
        velocity: velocityState.current?.speed ?? 0,
      });
    };

    const clearHover = () => {
      if (isBackgroundDragging) {
        return;
      }

      velocityState.current = null;
      setInteraction((current) =>
        current.hitPoint || current.velocity > 0
          ? {
              hitPoint: null,
              velocity: 0,
            }
          : current,
      );
    };

    const handleMouseMove = (event: MouseEvent) => {
      updateHover(event);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      updateHover(event);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', clearHover);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', clearHover);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', clearHover);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', clearHover);
    };
  }, [camera, gl, isBackgroundDragging, pointer, raycaster]);

  useFrame((_, delta) => {
    setInteraction((current) => {
      const nextVelocity = current.hitPoint
        ? current.velocity
        : decayVelocity(current.velocity, delta, PARTICLE_GLOBE_CONFIG.recoveryDamping);

      return nextVelocity === current.velocity
        ? current
        : {
            ...current,
            velocity: nextVelocity,
          };
    });

    if (rigRef.current) {
      rigRef.current.rotation.set(rotation.x, rotation.y, 0);
      rigRef.current.position.set(sceneMetrics.offsetX, 0, 0);
    }
  });

  const activeHitPoint = isBackgroundDragging ? null : interaction.hitPoint;
  const activeVelocity =
    isBackgroundDragging || interaction.velocity < INTERACTION_CONFIG.minimumVelocity
      ? 0
      : interaction.velocity;

  return (
    <>
      <ambientLight intensity={0.52} />
      <directionalLight position={sunLightPosition} intensity={0.82} color="#b6d7ff" />
      <directionalLight position={fillLightPosition} intensity={0.22} color="#73ffd9" />

      <group ref={rigRef}>
        <PlanetBody
          radius={sceneMetrics.radius * 0.999}
          planetColor={planetColor}
          glowColor={glowColor}
          sunDirection={sunDirection}
          sunFalloff={sunFalloff}
        />
        <ParticleGlobe
          hitPoint={activeHitPoint}
          velocity={activeVelocity}
          isDragging={isBackgroundDragging}
          rotationX={rotation.x}
          rotationY={rotation.y}
          cameraZ={sceneMetrics.cameraZ}
          radius={sceneMetrics.radius}
          pointSize={sceneMetrics.pointSize}
          terrainHeightScale={terrainHeightScale}
          particleOpacity={particleOpacity}
          particleColor={particleColor}
          particleBlendMode={particleBlendMode}
        />
        <FresnelShell
          globeRadius={sceneMetrics.radius}
          radius={sceneMetrics.shellRadius}
          glowDistance={glowDistance}
          glowStrength={glowStrength}
          glowColor={glowColor}
          sunDirection={sunDirection}
        />
        <mesh ref={interactionMeshRef}>
          <sphereGeometry args={[sceneMetrics.radius, 48, 48]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

