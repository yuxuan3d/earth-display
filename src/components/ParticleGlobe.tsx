import { useEffect, useMemo, useRef } from 'react';
import { shaderMaterial, useTexture } from '@react-three/drei';
import { extend, type ThreeElement, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTICLE_GLOBE_CONFIG } from '../config';
import { setDebugState } from '../lib/debug';
import {
  buildParticleBuffers,
  extractMaskImageData,
  type ParticleBuffers,
} from '../lib/earthMath';
import type { SceneRotation } from '../types';

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

const MIN_POINT_SIZE = 1.55;
const MIN_SAMPLE_COUNT = 12_000;
const MAX_SAMPLE_COUNT = 140_000;

const GlobeParticleMaterial = shaderMaterial(
  {
    color: new THREE.Color('#afc9ff'),
    pointSize: 0.019,
    pointScale: 338,
    frontOpacity: 0.8,
    backOpacity: 0.096,
    minPointSize: MIN_POINT_SIZE,
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

function resolveParticleSampleCount(baseSampleCount: number, particleSeparation: number) {
  const safeSeparation = Math.max(0.01, particleSeparation);
  const densityAdjustedCount = Math.round(baseSampleCount / (safeSeparation * safeSeparation));

  return THREE.MathUtils.clamp(densityAdjustedCount, MIN_SAMPLE_COUNT, MAX_SAMPLE_COUNT);
}

extend({ GlobeParticleMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    globeParticleMaterial: ThreeElement<typeof GlobeParticleMaterial>;
  }
}

type ParticleGlobeProps = {
  rotationRef: { current: SceneRotation };
  cameraZ: number;
  radius: number;
  pointSize: number;
  terrainHeightScale: number;
  particleOpacity: number;
  particleSizeScale: number;
  particleSeparation: number;
  particleColor: string;
  particleBlendMode: ParticleBlendMode;
};

export function ParticleGlobe({
  rotationRef,
  cameraZ,
  radius,
  pointSize,
  terrainHeightScale,
  particleOpacity,
  particleSizeScale,
  particleSeparation,
  particleColor,
  particleBlendMode,
}: ParticleGlobeProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const particleBuffersRef = useRef<ParticleBuffers | null>(null);
  const elevationTexture = useTexture(`${import.meta.env.BASE_URL}earth-elevation.png`);
  const blendSettings = resolveBlendSettings(particleBlendMode);
  const sampleCount = useMemo(
    () => resolveParticleSampleCount(PARTICLE_GLOBE_CONFIG.sampleCount, particleSeparation),
    [particleSeparation],
  );
  const effectivePointSize = pointSize * particleSizeScale;
  const effectiveMinPointSize = Math.max(0.7, MIN_POINT_SIZE * particleSizeScale);

  const particleBuffers = useMemo(() => {
    const elevationMap = extractMaskImageData(elevationTexture);
    return buildParticleBuffers(elevationMap, {
      radius,
      sampleCount,
      landThreshold: PARTICLE_GLOBE_CONFIG.landThreshold,
      terrainHeightScale,
    });
  }, [elevationTexture, radius, sampleCount, terrainHeightScale]);

  useEffect(() => {
    particleBuffersRef.current = particleBuffers;

    const positionAttribute = new THREE.BufferAttribute(particleBuffers.positions, 3);
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

  useFrame(() => {
    const buffers = particleBuffersRef.current;

    if (!buffers) {
      return;
    }

    const rotation = rotationRef.current;

    setDebugState({
      particleCount: buffers.count,
      averageDisplacement: 0,
      rotationX: rotation.x,
      rotationY: rotation.y,
      cameraZ,
      pointerHitEarth: false,
      velocity: 0,
    });
  });

  return (
    <points renderOrder={1}>
      <bufferGeometry ref={geometryRef} />
      <globeParticleMaterial
        color={particleColor}
        pointSize={effectivePointSize}
        pointScale={338}
        frontOpacity={particleOpacity}
        backOpacity={Math.max(0.02, particleOpacity * 0.12)}
        minPointSize={effectiveMinPointSize}
        transparent
        depthWrite={false}
        toneMapped={false}
        {...blendSettings}
      />
    </points>
  );
}
