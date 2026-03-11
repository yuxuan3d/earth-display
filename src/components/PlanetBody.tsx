import { extend, type ThreeElement } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const DEFAULT_SUN_DIRECTION = new THREE.Vector3(-0.11, 0.11, 0.11).normalize();
const DEFAULT_SHADOW_BASE = new THREE.Color('#050816');

const PlanetBodyMaterial = shaderMaterial(
  {
    litColor: new THREE.Color('#4d63ff'),
    shadowColor: new THREE.Color('#110828'),
    fresnelColor: new THREE.Color('#56b8ff'),
    lightDirection: DEFAULT_SUN_DIRECTION,
    sunFalloff: 1.2,
    opacity: 0.62,
  },
  /* glsl */ `
    varying vec3 vWorldNormal;
    varying vec3 vViewDirection;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vViewDirection = normalize(cameraPosition - worldPosition.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  /* glsl */ `
    uniform vec3 litColor;
    uniform vec3 shadowColor;
    uniform vec3 fresnelColor;
    uniform vec3 lightDirection;
    uniform float sunFalloff;
    uniform float opacity;

    varying vec3 vWorldNormal;
    varying vec3 vViewDirection;

    void main() {
      vec3 normal = normalize(vWorldNormal);
      vec3 viewDirection = normalize(vViewDirection);
      float lightDot = dot(normal, normalize(lightDirection));
      float daylight = pow(clamp(lightDot * 0.5 + 0.5, 0.0, 1.0), max(sunFalloff, 0.0001));
      float light = smoothstep(0.08, 0.9, daylight);
      float horizon = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.05);
      float litRim = horizon * smoothstep(0.18, 0.98, daylight);
      float shadowRim = horizon * smoothstep(0.1, 0.96, 1.0 - daylight);
      float baseFresnel = smoothstep(0.18, 0.98, horizon);
      vec3 color = mix(shadowColor, litColor, light);
      color = mix(
        color,
        fresnelColor,
        clamp(baseFresnel * 0.18 + litRim * 0.4 + shadowRim * 0.54, 0.0, 1.0)
      );
      float alpha = opacity * (0.74 + baseFresnel * 0.26);
      gl_FragColor = vec4(color, alpha);
    }
  `,
);

extend({ PlanetBodyMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    planetBodyMaterial: ThreeElement<typeof PlanetBodyMaterial>;
  }
}

type PlanetBodyProps = {
  radius: number;
  planetColor: string;
  glowColor: string;
  sunDirection: [number, number, number];
  sunFalloff: number;
};

export function PlanetBody({
  radius,
  planetColor,
  glowColor,
  sunDirection,
  sunFalloff,
}: PlanetBodyProps) {
  const direction = new THREE.Vector3(...sunDirection);
  const normalizedSunDirection = direction.lengthSq() < 0.0001
    ? DEFAULT_SUN_DIRECTION.clone()
    : direction.normalize();
  const litColor = new THREE.Color(planetColor);
  const shadowColor = litColor.clone().multiplyScalar(0.22).lerp(DEFAULT_SHADOW_BASE, 0.55);

  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[radius, 96, 96]} />
      <planetBodyMaterial
        litColor={litColor}
        shadowColor={shadowColor}
        fresnelColor={glowColor}
        lightDirection={normalizedSunDirection}
        sunFalloff={sunFalloff}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
