import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { PARTICLE_GLOBE_CONFIG } from '../config';
import { setDebugState } from '../lib/debug';
import {
  buildParticleBuffers,
  calculateDisplacementStrength,
  extractMaskImageData,
  type ParticleBuffers,
} from '../lib/earthMath';

type ParticleGlobeProps = {
  hitPoint: THREE.Vector3 | null;
  velocity: number;
  isDragging: boolean;
  rotationY: number;
  cameraZ: number;
  radius: number;
  pointSize: number;
  terrainHeightScale: number;
};

export function ParticleGlobe({
  hitPoint,
  velocity,
  isDragging,
  rotationY,
  cameraZ,
  radius,
  pointSize,
  terrainHeightScale,
}: ParticleGlobeProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const particleBuffersRef = useRef<ParticleBuffers | null>(null);
  const positionAttributeRef = useRef<THREE.BufferAttribute | null>(null);
  const elevationTexture = useTexture('/earth-elevation.png');

  const particleBuffers = useMemo(() => {
    const elevationMap = extractMaskImageData(elevationTexture);
    return buildParticleBuffers(elevationMap, {
      radius,
      sampleCount: PARTICLE_GLOBE_CONFIG.sampleCount,
      landThreshold: PARTICLE_GLOBE_CONFIG.landThreshold,
      terrainHeightScale,
    });
  }, [elevationTexture, radius, terrainHeightScale]);

  useEffect(() => {
    particleBuffersRef.current = particleBuffers;

    const attribute = new THREE.BufferAttribute(particleBuffers.positions, 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    positionAttributeRef.current = attribute;

    const geometry = geometryRef.current;
    if (geometry) {
      geometry.setAttribute('position', attribute);
      geometry.computeBoundingSphere();
    }
  }, [particleBuffers]);

  useFrame((_, delta) => {
    const buffers = particleBuffersRef.current;
    const positionAttribute = positionAttributeRef.current;

    if (!buffers || !positionAttribute) {
      return;
    }

    const positions = buffers.positions;
    const basePositions = buffers.basePositions;
    const normals = buffers.normals;
    const seeds = buffers.seeds;
    const relaxedVelocity = isDragging ? 0 : velocity;
    let displacementSum = 0;

    for (let index = 0; index < buffers.count; index += 1) {
      const offset = index * 3;
      const seed = seeds[index];
      const baseX = basePositions[offset];
      const baseY = basePositions[offset + 1];
      const baseZ = basePositions[offset + 2];

      let targetX = baseX;
      let targetY = baseY;
      let targetZ = baseZ;

      if (hitPoint && relaxedVelocity > 0) {
        const dx = baseX - hitPoint.x;
        const dy = baseY - hitPoint.y;
        const dz = baseZ - hitPoint.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const strength = calculateDisplacementStrength(
          distance,
          PARTICLE_GLOBE_CONFIG.hoverRadius,
          relaxedVelocity,
          PARTICLE_GLOBE_CONFIG,
        );

        if (strength > 0) {
          const normalX = normals[offset];
          const normalY = normals[offset + 1];
          const normalZ = normals[offset + 2];
          const variation = 0.85 + seed * 0.5;
          targetX += normalX * strength * variation;
          targetY += normalY * strength * variation;
          targetZ += normalZ * strength * variation;
        }
      }

      const easing = Math.min(1, delta * (PARTICLE_GLOBE_CONFIG.recoveryDamping + seed));
      positions[offset] += (targetX - positions[offset]) * easing;
      positions[offset + 1] += (targetY - positions[offset + 1]) * easing;
      positions[offset + 2] += (targetZ - positions[offset + 2]) * easing;

      const diffX = positions[offset] - baseX;
      const diffY = positions[offset + 1] - baseY;
      const diffZ = positions[offset + 2] - baseZ;
      displacementSum += Math.sqrt(diffX * diffX + diffY * diffY + diffZ * diffZ);
    }

    positionAttribute.needsUpdate = true;

    setDebugState({
      particleCount: buffers.count,
      averageDisplacement: buffers.count > 0 ? displacementSum / buffers.count : 0,
      rotationY,
      cameraZ,
      pointerHitEarth: Boolean(hitPoint),
      velocity: relaxedVelocity,
    });
  });

  return (
    <points>
      <bufferGeometry ref={geometryRef} />
      <pointsMaterial
        color="#ffffff"
        size={pointSize}
        sizeAttenuation
        depthWrite={false}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
