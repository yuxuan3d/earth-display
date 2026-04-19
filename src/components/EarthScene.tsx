import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CityBeacons } from './CityBeacons';
import { FresnelShell } from './FresnelShell';
import { HomeBasePulse } from './HomeBasePulse';
import { PlanetBody } from './PlanetBody';
import { ParticleGlobe, type ParticleBlendMode } from './ParticleGlobe';
import { ProjectConstellations } from './ProjectConstellations';
import { TransmissionLayer } from './TransmissionLayer';
import { WorkflowOrbits } from './WorkflowOrbits';
import { PARTICLE_GLOBE_CONFIG } from '../config';
import { PROJECT_SIGNALS, RND_SIGNALS, WORKFLOW_ORBITS } from '../data/portfolioSignals';
import { setDebugState } from '../lib/debug';
import { getResponsiveSceneMetrics } from '../lib/sceneLayout';
import type { ProjectThumbnail, SceneRotation } from '../types';

type EarthSceneProps = {
  rotation: SceneRotation;
  isInteracting: boolean;
  isMobileMode: boolean;
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
  cityGlowColor: string;
  cityGlowSize: number;
  cityGlowStrength: number;
  cityGlowSizeVariance: number;
  singaporeGlowSize: number;
  singaporeGlowStrength: number;
  sunDirection: [number, number, number];
  sunFalloff: number;
  signalLayerOpacity: number;
  signalLayerSpeed: number;
  projectThumbnails: ProjectThumbnail[];
  onProjectOpen: (slug: string) => void;
};

const DEFAULT_SUN_DIRECTION = new THREE.Vector3(-0.1, 0.11, 0.11).normalize();

export function EarthScene({
  rotation,
  isInteracting,
  isMobileMode,
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
  cityGlowColor,
  cityGlowSize,
  cityGlowStrength,
  cityGlowSizeVariance,
  singaporeGlowSize,
  singaporeGlowStrength,
  sunDirection,
  sunFalloff,
  signalLayerOpacity,
  signalLayerSpeed,
  projectThumbnails,
  onProjectOpen,
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

  useEffect(() => {
    setDebugState({
      projectSignalCount: isMobileMode ? Math.min(2, PROJECT_SIGNALS.length) : PROJECT_SIGNALS.length,
      rndSignalCount: RND_SIGNALS.length,
      workflowOrbitCount: isMobileMode ? Math.min(1, WORKFLOW_ORBITS.length) : WORKFLOW_ORBITS.length,
      homeBasePulseCount: 1,
      signalLayerInteracting: isInteracting,
    });
  }, [isInteracting, isMobileMode]);

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
        <CityBeacons
          radius={sceneMetrics.radius}
          glowColor={cityGlowColor}
          glowSize={cityGlowSize}
          glowStrength={cityGlowStrength}
          sizeVariance={cityGlowSizeVariance}
          singaporeGlowSize={singaporeGlowSize}
          singaporeGlowStrength={singaporeGlowStrength}
        />
        <HomeBasePulse
          radius={sceneMetrics.radius}
          opacityScale={signalLayerOpacity}
          speedScale={signalLayerSpeed}
        />
        <ProjectConstellations
          radius={sceneMetrics.radius}
          isMobileMode={isMobileMode}
          opacityScale={signalLayerOpacity}
          speedScale={signalLayerSpeed}
          projectThumbnails={projectThumbnails}
          onProjectOpen={onProjectOpen}
        />
        <TransmissionLayer
          radius={sceneMetrics.radius}
          isInteracting={isInteracting}
          isMobileMode={isMobileMode}
          opacityScale={signalLayerOpacity}
          speedScale={signalLayerSpeed}
        />
        <WorkflowOrbits
          radius={sceneMetrics.radius}
          isMobileMode={isMobileMode}
          opacityScale={signalLayerOpacity}
          speedScale={signalLayerSpeed}
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
