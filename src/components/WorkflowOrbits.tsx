import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORKFLOW_ORBITS, type WorkflowOrbit } from '../data/portfolioSignals';

type WorkflowOrbitsProps = {
  radius: number;
  isMobileMode: boolean;
  opacityScale: number;
  speedScale: number;
};

type WorkflowOrbitRingProps = {
  orbit: WorkflowOrbit;
  radius: number;
  opacityScale: number;
  speedScale: number;
};

function WorkflowOrbitRing({
  orbit,
  radius,
  opacityScale,
  speedScale,
}: WorkflowOrbitRingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [tiltX, tiltY, tiltZ] = useMemo(
    () => orbit.tilt.map((value) => THREE.MathUtils.degToRad(value)) as [number, number, number],
    [orbit.tilt],
  );
  const color = useMemo(() => new THREE.Color(orbit.color), [orbit.color]);
  const ringRadius = radius * orbit.radiusMultiplier;
  const tubeRadius = Math.max(radius * orbit.tubeRadius, 0.001);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const spin = clock.elapsedTime * orbit.speed * speedScale + orbit.phase * Math.PI * 2;
    groupRef.current.rotation.set(tiltX, tiltY + spin, tiltZ + spin * 0.38);
  });

  return (
    <group ref={groupRef}>
      <mesh renderOrder={2}>
        <torusGeometry args={[ringRadius, tubeRadius, 8, 160]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={orbit.opacity * opacityScale}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function WorkflowOrbits({
  radius,
  isMobileMode,
  opacityScale,
  speedScale,
}: WorkflowOrbitsProps) {
  const opacityMultiplier = isMobileMode ? 0.78 : 1;

  return (
    <group>
      {WORKFLOW_ORBITS.map((orbit) => (
        <WorkflowOrbitRing
          key={orbit.id}
          orbit={orbit}
          radius={radius}
          opacityScale={opacityScale * opacityMultiplier}
          speedScale={speedScale}
        />
      ))}
    </group>
  );
}
