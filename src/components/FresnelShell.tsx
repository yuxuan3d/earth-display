import { extend, type ThreeElement } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const ATMOSPHERE_LIGHT_DIRECTION = new THREE.Vector3(-1, 0.18, 0.95).normalize();

const FresnelMaterial = shaderMaterial(
  {
    color: new THREE.Color('#9ae6ff'),
    rimPower: 2.3,
    intensity: 1.2,
    alphaStrength: 0.12,
    lightDirection: ATMOSPHERE_LIGHT_DIRECTION,
    lightMix: 0,
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
    uniform vec3 color;
    uniform float rimPower;
    uniform float intensity;
    uniform float alphaStrength;
    uniform vec3 lightDirection;
    uniform float lightMix;

    varying vec3 vWorldNormal;
    varying vec3 vViewDirection;

    void main() {
      vec3 normal = normalize(vWorldNormal);
      float rim = 1.0 - abs(dot(normal, normalize(vViewDirection)));
      float glow = pow(clamp(rim, 0.0, 1.0), rimPower);
      float lightRim = pow(clamp(1.0 - max(dot(normal, normalize(lightDirection)), 0.0), 0.0, 1.0), 2.2);
      float lighting = mix(1.0, 0.45 + lightRim * 0.9, lightMix);
      glow *= lighting;
      float alpha = glow * alphaStrength;
      gl_FragColor = vec4(color * glow * intensity, alpha);
    }
  `,
);

extend({ FresnelMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    fresnelMaterial: ThreeElement<typeof FresnelMaterial>;
  }
}

type FresnelShellProps = {
  globeRadius: number;
  radius: number;
};

export function FresnelShell({ globeRadius, radius }: FresnelShellProps) {
  return (
    <>
      <mesh renderOrder={1}>
        <sphereGeometry args={[globeRadius * 0.982, 96, 96]} />
        <meshBasicMaterial colorWrite={false} depthWrite />
      </mesh>

      <mesh renderOrder={2}>
        <sphereGeometry args={[radius * 1.002, 96, 96]} />
        <fresnelMaterial
          color="#c8f6ff"
          rimPower={6.2}
          intensity={2.15}
          alphaStrength={0.05}
          lightDirection={ATMOSPHERE_LIGHT_DIRECTION}
          lightMix={1}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh renderOrder={3}>
        <sphereGeometry args={[radius * 1.008, 96, 96]} />
        <fresnelMaterial
          color="#8deeff"
          rimPower={3.1}
          intensity={0.95}
          alphaStrength={0.055}
          lightDirection={ATMOSPHERE_LIGHT_DIRECTION}
          lightMix={0.35}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh renderOrder={4}>
        <sphereGeometry args={[radius * 1.05, 96, 96]} />
        <fresnelMaterial
          color="#2ab9ff"
          rimPower={1.75}
          intensity={1.3}
          alphaStrength={0.09}
          lightDirection={ATMOSPHERE_LIGHT_DIRECTION}
          lightMix={0.2}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
