import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOME_BASE } from '../data/portfolioSignals';
import { latLonToSurfaceFrame } from '../lib/earthMath';

type HomeBasePulseProps = {
  radius: number;
  opacityScale: number;
  speedScale: number;
};

type PulseRingProps = {
  color: THREE.Color;
  delay: number;
  opacity: number;
  speed: number;
};

function PulseRing({ color, delay, opacity, speed }: PulseRingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) {
      return;
    }

    const progress = THREE.MathUtils.euclideanModulo(clock.elapsedTime * speed + delay, 1);
    const fade = Math.pow(1 - progress, 1.35);
    const scale = THREE.MathUtils.lerp(0.55, 1.42, progress);

    meshRef.current.scale.setScalar(scale);
    materialRef.current.opacity = opacity * fade;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} renderOrder={3}>
      <ringGeometry args={[0.030, 0.034, 48]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export function HomeBasePulse({ radius, opacityScale, speedScale }: HomeBasePulseProps) {
  const frame = useMemo(
    () => latLonToSurfaceFrame(HOME_BASE.coordinate, radius * 1.006),
    [radius],
  );
  const coreColor = useMemo(
    () => new THREE.Color(HOME_BASE.color).lerp(new THREE.Color('#ffffff'), 0.22),
    [],
  );

  return (
    <group position={frame.position} quaternion={frame.quaternion}>
      <mesh position={[0, 0.009, 0]} renderOrder={4}>
        <sphereGeometry args={[0.0125, 18, 18]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={0.72 * opacityScale}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <PulseRing
        color={coreColor}
        delay={0}
        opacity={0.34 * opacityScale}
        speed={0.45 * speedScale}
      />
      <PulseRing
        color={coreColor}
        delay={0.48}
        opacity={0.22 * opacityScale}
        speed={0.45 * speedScale}
      />
    </group>
  );
}
