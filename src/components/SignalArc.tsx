import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sampleArcPoint } from '../lib/signalArc';

type SignalArcLineProps = {
  points: THREE.Vector3[];
  color: string;
  opacity: number;
  renderOrder?: number;
  activityRef?: MutableRefObject<number>;
};

type TravelingSignalPulseProps = {
  points: THREE.Vector3[];
  color: string;
  size: number;
  opacity: number;
  speed: number;
  phase: number;
  renderOrder?: number;
  activityRef?: MutableRefObject<number>;
};

export function SignalArcLine({
  points,
  color,
  opacity,
  renderOrder = 2,
  activityRef,
}: SignalArcLineProps) {
  const materialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: activityRef ? 0 : opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const object = new THREE.Line(geometry, material);
    object.renderOrder = renderOrder;

    return object;
  }, [activityRef, color, opacity, points, renderOrder]);

  useFrame(() => {
    if (materialRef.current && activityRef) {
      materialRef.current.opacity = opacity * activityRef.current;
    }
  });

  useEffect(() => {
    materialRef.current = line.material;

    return () => {
      materialRef.current = null;
      line.geometry.dispose();
      line.material.dispose();
    };
  }, [line]);

  return <primitive object={line} />;
}

export function TravelingSignalPulse({
  points,
  color,
  size,
  opacity,
  speed,
  phase,
  renderOrder = 3,
  activityRef,
}: TravelingSignalPulseProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const colorValue = useMemo(() => new THREE.Color(color), [color]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) {
      return;
    }

    const progress = clock.elapsedTime * speed + phase;
    const position = sampleArcPoint(points, progress);
    const pulse = Math.sin(THREE.MathUtils.euclideanModulo(progress, 1) * Math.PI);
    const activity = activityRef?.current ?? 1;

    meshRef.current.position.copy(position);
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(0.72, 1.26, pulse));
    materialRef.current.opacity = opacity * activity * THREE.MathUtils.lerp(0.55, 1, pulse);
  });

  return (
    <mesh ref={meshRef} renderOrder={renderOrder}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial
        ref={materialRef}
        color={colorValue}
        transparent
        opacity={activityRef ? 0 : opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
