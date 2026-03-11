import { Billboard, shaderMaterial } from '@react-three/drei';
import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';

const ATMOSPHERE_GLOW_DIRECTION = new THREE.Vector2(-0.82, 0.58).normalize();
const ATMOSPHERE_GLOW_CREST_DIRECTION = new THREE.Vector2(-0.62, 0.92).normalize();

const AtmosphereGlowMaterial = shaderMaterial(
  {
    glowColor: new THREE.Color('#56b8ff'),
    accentColor: new THREE.Color('#cbeeff'),
    innerRadius: 0.74,
    outerRadius: 1.0,
    lightDirection: ATMOSPHERE_GLOW_DIRECTION,
    crestDirection: ATMOSPHERE_GLOW_CREST_DIRECTION,
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
};

export function FresnelShell({ globeRadius, radius }: FresnelShellProps) {
  const glowSize = Math.max(globeRadius * 2.7, radius * 2.58);
  const normalizedInnerRadius = globeRadius / (glowSize * 0.5);
  const normalizedOuterRadius = Math.min(0.985, normalizedInnerRadius + 0.19);

  return (
    <Billboard follow>
      <mesh renderOrder={2}>
        <planeGeometry args={[glowSize, glowSize, 1, 1]} />
        <atmosphereGlowMaterial
          glowColor="#56b8ff"
          accentColor="#cbeeff"
          innerRadius={normalizedInnerRadius}
          outerRadius={normalizedOuterRadius}
          lightDirection={ATMOSPHERE_GLOW_DIRECTION}
          crestDirection={ATMOSPHERE_GLOW_CREST_DIRECTION}
          intensity={0.92}
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
