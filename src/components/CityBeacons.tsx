import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { MAJOR_CITY_BEACONS } from '../data/majorCityBeacons';
import { setDebugState } from '../lib/debug';
import { latLonToPoint } from '../lib/earthMath';

const BASE_AXIS = new THREE.Vector3(0, 1, 0);
const MAX_CITY_GLOW_STRENGTH = 2.2;
const SINGAPORE_CITY_NAME = 'Singapore';
const CITY_WEIGHT_RANGE = MAJOR_CITY_BEACONS.reduce(
  (range, city) => ({
    min: Math.min(range.min, city.weight),
    max: Math.max(range.max, city.weight),
  }),
  { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
);
const BEAM_SLICES = Array.from({ length: 16 }, (_, index) => (index * Math.PI) / 16);
const BEAM_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const BEAM_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    float v = clamp(vUv.y, 0.0, 1.0);
    float distanceFromCenter = abs(vUv.x - 0.5);
    float width = mix(0.48, 0.035, pow(v, 0.88));
    float core = 1.0 - smoothstep(width * 0.2, width, distanceFromCenter);
    float haze = 1.0 - smoothstep(width * 0.95, width * 1.8, distanceFromCenter);
    float verticalFade = pow(1.0 - v, 0.92);
    float baseBloom = exp(-pow((v - 0.08) / 0.14, 2.0));
    float tipBloom = exp(-pow((v - 0.78) / 0.2, 2.0));
    float alpha = core * verticalFade + haze * baseBloom * 0.42 + core * tipBloom * 0.12;

    if (alpha <= 0.0015) {
      discard;
    }

    gl_FragColor = vec4(uColor, alpha * uOpacity);
  }
`;

type CityBeaconsProps = {
  radius: number;
  glowColor: string;
  glowSize: number;
  glowStrength: number;
  sizeVariance: number;
  singaporeGlowSize: number;
  singaporeGlowStrength: number;
};

type BeaconLayer = {
  width: number;
  height: number;
  opacity: number;
  color: THREE.Color;
};

type BeaconInstance = {
  name: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  layers: BeaconLayer[];
};

type BeaconBeamProps = {
  geometry: THREE.BufferGeometry;
  width: number;
  height: number;
  opacity: number;
  color: THREE.Color;
};

function BeaconBeam({ geometry, width, height, opacity, color }: BeaconBeamProps) {
  return (
    <group>
      {BEAM_SLICES.map((rotation) => (
        <mesh
          key={`${rotation}-${width.toFixed(4)}-${height.toFixed(4)}-${opacity.toFixed(4)}`}
          geometry={geometry}
          rotation={[0, rotation, 0]}
          scale={[width, height, 1]}
          renderOrder={2}
        >
          <shaderMaterial
            key={`${rotation}-${color.getHexString()}-${opacity.toFixed(4)}-${width.toFixed(4)}-${height.toFixed(4)}`}
            vertexShader={BEAM_VERTEX_SHADER}
            fragmentShader={BEAM_FRAGMENT_SHADER}
            uniforms={{
              uColor: { value: color.clone() },
              uOpacity: { value: opacity },
            }}
            transparent
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

export function CityBeacons({
  radius,
  glowColor,
  glowSize,
  glowStrength,
  sizeVariance,
  singaporeGlowSize,
  singaporeGlowStrength,
}: CityBeaconsProps) {
  const beamGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1, 1, 24);
    geometry.translate(0, 0.5, 0);
    return geometry;
  }, []);
  const accentColor = useMemo(
    () => new THREE.Color(glowColor).lerp(new THREE.Color('#ffffff'), 0.45),
    [glowColor],
  );
  const beacons = useMemo<BeaconInstance[]>(() => {
    const normalizedStrength = THREE.MathUtils.clamp(
      glowStrength / MAX_CITY_GLOW_STRENGTH,
      0,
      1,
    );
    const brightnessResponse = THREE.MathUtils.lerp(
      0,
      1.55,
      THREE.MathUtils.smootherstep(normalizedStrength, 0, 1),
    );
    const globalSizeResponse = THREE.MathUtils.lerp(
      0.45,
      1.45,
      Math.pow(normalizedStrength, 0.72),
    );
    const sizeVarianceExponent = THREE.MathUtils.lerp(0, 1.75, sizeVariance);

    return MAJOR_CITY_BEACONS.map((city) => {
      const normal = latLonToPoint(city.latitude, city.longitude, 1).normalize();
      const position = normal.clone().multiplyScalar(radius - 0.0025);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(BASE_AXIS, normal);
      const normalizedWeight = THREE.MathUtils.inverseLerp(
        CITY_WEIGHT_RANGE.min,
        CITY_WEIGHT_RANGE.max,
        city.weight,
      );
      const brightnessWeight = THREE.MathUtils.lerp(
        0.12,
        1,
        Math.pow(normalizedWeight, 0.68),
      );
      const weightedSize = THREE.MathUtils.lerp(
        0.34,
        1,
        Math.pow(normalizedWeight, 0.8),
      );
      const sizeWeight = Math.pow(weightedSize, sizeVarianceExponent);
      const isSingapore = city.name === SINGAPORE_CITY_NAME;
      const singaporeSizeMultiplier = isSingapore ? singaporeGlowSize : 1;
      const singaporeStrengthMultiplier = isSingapore ? singaporeGlowStrength : 1;
      const baseWidth =
        glowSize *
        THREE.MathUtils.lerp(0.032, 0.082, normalizedWeight) *
        globalSizeResponse *
        sizeWeight *
        singaporeSizeMultiplier;
      const beamHeight =
        glowSize *
        THREE.MathUtils.lerp(0.13, 0.34, normalizedWeight) *
        globalSizeResponse *
        sizeWeight *
        singaporeSizeMultiplier;
      const weightedStrength = brightnessResponse * brightnessWeight * singaporeStrengthMultiplier;

      return {
        name: city.name,
        position: position.toArray() as [number, number, number],
        quaternion: quaternion.toArray() as [number, number, number, number],
        layers: [
          {
            width: baseWidth * 1.5,
            height: beamHeight * 0.92,
            opacity: weightedStrength * 0.035,
            color: accentColor.clone(),
          },
          {
            width: baseWidth,
            height: beamHeight,
            opacity: weightedStrength * 0.06,
            color: new THREE.Color(glowColor),
          },
          {
            width: baseWidth * 0.62,
            height: beamHeight * 1.08,
            opacity: weightedStrength * 0.024,
            color: accentColor.clone(),
          },
        ],
      };
    });
  }, [
    accentColor,
    glowColor,
    glowSize,
    glowStrength,
    radius,
    sizeVariance,
    singaporeGlowSize,
    singaporeGlowStrength,
  ]);

  useEffect(() => {
    setDebugState({ cityBeaconCount: MAJOR_CITY_BEACONS.length });
  }, []);

  useEffect(() => {
    return () => {
      beamGeometry.dispose();
    };
  }, [beamGeometry]);

  return (
    <group>
      <mesh renderOrder={1}>
        <sphereGeometry args={[radius * 0.998, 96, 96]} />
        <meshBasicMaterial color="#000000" colorWrite={false} depthWrite toneMapped={false} />
      </mesh>
      {beacons.map((beacon) => (
        <group
          key={beacon.name}
          position={beacon.position}
          quaternion={beacon.quaternion}
        >
          {beacon.layers.map((layer, index) => (
            <BeaconBeam
              key={`${beacon.name}-${index}-${layer.width.toFixed(4)}-${layer.height.toFixed(4)}-${layer.opacity.toFixed(4)}`}
              geometry={beamGeometry}
              width={layer.width}
              height={layer.height}
              opacity={layer.opacity}
              color={layer.color}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
