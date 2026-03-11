import { extend, type ThreeElement } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const PLANET_BODY_LIGHT_DIRECTION = new THREE.Vector3(-1, 0.12, 0.1).normalize();

const PlanetBodyMaterial = shaderMaterial(
  {
    litColor: new THREE.Color('#4d63ff'),
    shadowColor: new THREE.Color('#170a3c'),
    horizonColor: new THREE.Color('#bce2ff'),
    lightDirection: PLANET_BODY_LIGHT_DIRECTION,
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
    uniform vec3 horizonColor;
    uniform vec3 lightDirection;
    uniform float opacity;

    varying vec3 vWorldNormal;
    varying vec3 vViewDirection;

    void main() {
      vec3 normal = normalize(vWorldNormal);
      vec3 viewDirection = normalize(vViewDirection);
      float light = smoothstep(-0.15, 0.28, dot(normal, normalize(lightDirection)));
      float horizon = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.6);
      float lightRim = horizon * smoothstep(-0.3, 0.72, dot(normal, normalize(lightDirection)));
      vec3 color = mix(shadowColor, litColor, light);
      color = mix(color, horizonColor, lightRim * 0.72 + horizon * 0.08);
      float alpha = opacity * (0.76 + horizon * 0.24);
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
};

export function PlanetBody({ radius }: PlanetBodyProps) {
  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[radius, 96, 96]} />
      <planetBodyMaterial transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

