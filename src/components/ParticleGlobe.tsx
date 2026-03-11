import { useEffect, useMemo, useRef } from 'react';
import { shaderMaterial, useTexture } from '@react-three/drei';
import { extend, type ThreeElement, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTICLE_GLOBE_CONFIG } from '../config';
import { setDebugState } from '../lib/debug';
import {
  buildParticleBuffers,
  calculateDisplacementStrength,
  extractMaskImageData,
  type ParticleBuffers,
} from '../lib/earthMath';

export type ParticleBlendMode =
  | 'normal'
  | 'screen'
  | 'additive'
  | 'lighten'
  | 'darken'
  | 'multiply'
  | 'subtractive';

type ParticleBlendSettings = {
  blending: THREE.Blending;
  blendSrc?: THREE.BlendingSrcFactor;
  blendDst?: THREE.BlendingDstFactor;
  blendEquation?: THREE.BlendingEquation;
  blendSrcAlpha?: THREE.BlendingSrcFactor;
  blendDstAlpha?: THREE.BlendingDstFactor;
  blendEquationAlpha?: THREE.BlendingEquation;
};

const GlobeParticleMaterial = shaderMaterial(
  {
    color: new THREE.Color('#afc9ff'),
    pointSize: 0.019,
    pointScale: 338,
    frontOpacity: 0.8,
    backOpacity: 0.096,
    minPointSize: 1.55,
  },
  /* glsl */ `
    uniform float pointSize;
    uniform float pointScale;
    uniform float frontOpacity;
    uniform float backOpacity;
    uniform float minPointSize;

    attribute vec3 particleNormal;
    attribute float particleSeed;
    attribute float particleHeight;

    varying float vOpacity;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vec3 viewNormal = normalize(normalMatrix * particleNormal);
      float facing = smoothstep(-0.2, 0.55, viewNormal.z);
      float sizeJitter = mix(0.94, 1.14, particleSeed);
      float alphaJitter = mix(0.9, 1.0, particleSeed);
      float silhouetteThreshold = sqrt(max(0.0, 1.0 - 1.0 / pow(1.0 + particleHeight, 2.0)));
      float silhouetteMask = smoothstep(
        silhouetteThreshold,
        silhouetteThreshold + 0.08,
        abs(viewNormal.z)
      );
      float heightInfluence = smoothstep(0.002, 0.018, particleHeight);
      float pointVisibility = mix(1.0, silhouetteMask, heightInfluence);

      vOpacity = mix(backOpacity, frontOpacity, facing) * alphaJitter * pointVisibility;
      float renderedPointSize = max(
        minPointSize,
        pointSize * pointScale * sizeJitter / max(-mvPosition.z, 0.0001)
      );
      gl_PointSize = renderedPointSize * pointVisibility;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  /* glsl */ `
    uniform vec3 color;

    varying float vOpacity;

    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      float alpha = (1.0 - smoothstep(0.26, 0.5, dist)) * vOpacity;

      if (alpha <= 0.0) {
        discard;
      }

      gl_FragColor = vec4(color, alpha);
    }
  `,
);

const resolveBlendSettings = (mode: ParticleBlendMode): ParticleBlendSettings => {
  switch (mode) {
    case 'screen':
      return {
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneMinusSrcColorFactor,
        blendEquation: THREE.AddEquation,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
        blendEquationAlpha: THREE.AddEquation,
      };
    case 'lighten':
      return {
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
        blendEquation: THREE.MaxEquation,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
        blendEquationAlpha: THREE.AddEquation,
      };
    case 'darken':
      return {
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
        blendEquation: THREE.MinEquation,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
        blendEquationAlpha: THREE.AddEquation,
      };
    case 'additive':
      return { blending: THREE.AdditiveBlending };
    case 'subtractive':
      return { blending: THREE.SubtractiveBlending };
    case 'multiply':
      return { blending: THREE.MultiplyBlending };
    case 'normal':
    default:
      return { blending: THREE.NormalBlending };
  }
};

extend({ GlobeParticleMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    globeParticleMaterial: ThreeElement<typeof GlobeParticleMaterial>;
  }
}

type ParticleGlobeProps = {
  hitPoint: THREE.Vector3 | null;
  velocity: number;
  isDragging: boolean;
  rotationX: number;
  rotationY: number;
  cameraZ: number;
  radius: number;
  pointSize: number;
  terrainHeightScale: number;
  particleOpacity: number;
  particleColor: string;
  particleBlendMode: ParticleBlendMode;
};

export function ParticleGlobe({
  hitPoint,
  velocity,
  isDragging,
  rotationX,
  rotationY,
  cameraZ,
  radius,
  pointSize,
  terrainHeightScale,
  particleOpacity,
  particleColor,
  particleBlendMode,
}: ParticleGlobeProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const particleBuffersRef = useRef<ParticleBuffers | null>(null);
  const positionAttributeRef = useRef<THREE.BufferAttribute | null>(null);
  const elevationTexture = useTexture('/earth-elevation.png');
  const blendSettings = resolveBlendSettings(particleBlendMode);

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

    const positionAttribute = new THREE.BufferAttribute(particleBuffers.positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    positionAttributeRef.current = positionAttribute;

    const normalAttribute = new THREE.BufferAttribute(particleBuffers.normals, 3);
    const seedAttribute = new THREE.BufferAttribute(particleBuffers.seeds, 1);
    const heightAttribute = new THREE.BufferAttribute(particleBuffers.heights, 1);

    const geometry = geometryRef.current;
    if (geometry) {
      geometry.setAttribute('position', positionAttribute);
      geometry.setAttribute('particleNormal', normalAttribute);
      geometry.setAttribute('particleSeed', seedAttribute);
      geometry.setAttribute('particleHeight', heightAttribute);
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
      rotationX,
      rotationY,
      cameraZ,
      pointerHitEarth: Boolean(hitPoint),
      velocity: relaxedVelocity,
    });
  });

  return (
    <points renderOrder={1}>
      <bufferGeometry ref={geometryRef} />
      <globeParticleMaterial
        color={particleColor}
        pointSize={pointSize}
        pointScale={338}
        frontOpacity={particleOpacity}
        backOpacity={Math.max(0.02, particleOpacity * 0.12)}
        minPointSize={1.55}
        transparent
        depthWrite={false}
        toneMapped={false}
        {...blendSettings}
      />
    </points>
  );
}
