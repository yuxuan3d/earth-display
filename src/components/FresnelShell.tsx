import { Billboard, shaderMaterial } from '@react-three/drei';
import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';

const DEFAULT_GLOW_DIRECTION = new THREE.Vector2(-0.82, 0.58).normalize();
const BASE_GLOW_DISTANCE = 0.29;

const AtmosphereGlowMaterial = shaderMaterial(
  {
    glowColor: new THREE.Color('#56b8ff'),
    accentColor: new THREE.Color('#cbeeff'),
    innerRadius: 0.74,
    outerRadius: 1.0,
    lightDirection: DEFAULT_GLOW_DIRECTION,
    crestDirection: DEFAULT_GLOW_DIRECTION,
    intensity: 1.0,
    edgeSoftness: 1.0,
  },
  /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform vec3 glowColor;
    uniform vec3 accentColor;
    uniform float innerRadius;
    uniform float outerRadius;
    uniform vec2 lightDirection;
    uniform vec2 crestDirection;
    uniform float intensity;
    uniform float edgeSoftness;

    varying vec2 vUv;

    void main() {
      vec2 centered = vUv * 2.0 - 1.0;
      float radius = length(centered);
      float overlap = 0.04;

      if (radius <= innerRadius - overlap || radius >= outerRadius) {
        discard;
      }

      float haloWidth = max(outerRadius - innerRadius, 0.0001);
      float outsideDistance = max(radius - innerRadius, 0.0) / haloWidth;
      vec2 radialDirection = centered / max(radius, 0.0001);
      float outsideMask = smoothstep(innerRadius - overlap, innerRadius + 0.008, radius);
      float outerFade = 1.0 - smoothstep(outerRadius - 0.18, outerRadius, radius);
      float directional = smoothstep(-0.22, 1.0, dot(radialDirection, normalize(lightDirection)));
      float broadLight = pow(directional, 1.5);
      float crest = pow(max(dot(radialDirection, normalize(crestDirection)), 0.0), 4.8);
      float nearSurface = exp(-outsideDistance * (5.8 - edgeSoftness * 1.2));
      float farBloom = exp(-outsideDistance * (2.3 + edgeSoftness * 0.45));
      float alpha = outsideMask
        * outerFade
        * intensity
        * (
          farBloom * (0.028 + broadLight * 0.2)
          + nearSurface * (0.03 + broadLight * 0.34 + crest * 0.28)
        );
      float accent = clamp(broadLight * 0.72 + crest * 0.85, 0.0, 1.0);
      vec3 color = mix(glowColor, accentColor, accent);
      gl_FragColor = vec4(color * alpha * 1.4, alpha);
    }
  `,
);

extend({ AtmosphereGlowMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    atmosphereGlowMaterial: ThreeElement<typeof AtmosphereGlowMaterial>;
  }
}

type FresnelShellProps = {
  globeRadius: number;
  radius: number;
  glowDistance: number;
  glowStrength: number;
  glowColor: string;
  sunDirection: [number, number, number];
};

export function FresnelShell({
  globeRadius,
  radius,
  glowDistance,
  glowStrength,
  glowColor,
  sunDirection,
}: FresnelShellProps) {
  const extraGlowReach = Math.max(0, glowDistance - BASE_GLOW_DISTANCE);
  const glowSize = Math.max(
    globeRadius * (2.7 + extraGlowReach * 3.2),
    radius * (2.58 + extraGlowReach * 3.0),
  );
  const normalizedInnerRadius = globeRadius / (glowSize * 0.5);
  const normalizedOuterRadius = Math.min(0.998, normalizedInnerRadius + glowDistance);
  const direction2D = new THREE.Vector2(sunDirection[0], sunDirection[1] + sunDirection[2] * 0.3);
  const lightDirection = direction2D.lengthSq() < 0.0001
    ? DEFAULT_GLOW_DIRECTION.clone()
    : direction2D.normalize();
  const crestVector = new THREE.Vector2(lightDirection.x * 0.72, lightDirection.y * 1.12 + 0.16);
  const crestDirection = crestVector.lengthSq() < 0.0001
    ? lightDirection.clone()
    : crestVector.normalize();
  const accentColor = new THREE.Color(glowColor).lerp(new THREE.Color('#ffffff'), 0.62);

  return (
    <Billboard follow>
      <mesh renderOrder={2}>
        <planeGeometry args={[glowSize, glowSize, 1, 1]} />
        <atmosphereGlowMaterial
          glowColor={glowColor}
          accentColor={accentColor}
          innerRadius={normalizedInnerRadius}
          outerRadius={normalizedOuterRadius}
          lightDirection={lightDirection}
          crestDirection={crestDirection}
          intensity={glowStrength}
          edgeSoftness={1.05}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}
