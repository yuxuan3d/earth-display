import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { FresnelShell } from './FresnelShell';
import { PlanetBody } from './PlanetBody';
import { ParticleGlobe, type ParticleBlendMode } from './ParticleGlobe';
import { PARTICLE_GLOBE_CONFIG } from '../config';
import { getResponsiveSceneMetrics } from '../lib/sceneLayout';
import type { SceneRotation } from '../types';

type EarthSceneProps = {
  rotation: SceneRotation;
  terrainHeightScale: number;
  glowDistance: number;
  glowStrength: number;
  glowColor: string;
  planetColor: string;
  particleOpacity: number;
  particleSizeScale: number;
  particleSeparation: number;
  particleColor: string;
  particleBlendMode: ParticleBlendMode;
  sunDirection: [number, number, number];
  sunFalloff: number;
};

const DEFAULT_SUN_DIRECTION = new THREE.Vector3(-0.1, 0.11, 0.11).normalize();

export function EarthScene({
  rotation,
  terrainHeightScale,
  glowDistance,
  glowStrength,
  glowColor,
  planetColor,
  particleOpacity,
  particleSizeScale,
  particleSeparation,
  particleColor,
  particleBlendMode,
  sunDirection,
  sunFalloff,
}: EarthSceneProps) {
  const { camera, size } = useThree();
  const rigRef = useRef<THREE.Group>(null);
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

  useLayoutEffect(() => {
    camera.position.set(0, 0, sceneMetrics.cameraZ);
    camera.updateProjectionMatrix();
  }, [camera, sceneMetrics.cameraZ]);

  useFrame(() => {
    if (rigRef.current) {
      rigRef.current.rotation.set(rotation.x, rotation.y, 0);
      rigRef.current.position.set(sceneMetrics.offsetX, 0, 0);
    }
  });

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
          rotationX={rotation.x}
          rotationY={rotation.y}
          cameraZ={sceneMetrics.cameraZ}
          radius={sceneMetrics.radius}
          pointSize={sceneMetrics.pointSize}
          terrainHeightScale={terrainHeightScale}
          particleOpacity={particleOpacity}
          particleSizeScale={particleSizeScale}
          particleSeparation={particleSeparation}
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
      </group>
    </>
  );
}
