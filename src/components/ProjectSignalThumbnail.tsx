import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sampleArcPoint } from '../lib/signalArc';
import type { ProjectThumbnail } from '../types';

type ProjectSignalThumbnailProps = {
  points: THREE.Vector3[];
  thumbnail: ProjectThumbnail;
  radius: number;
  speed: number;
  phase: number;
  isMobileMode: boolean;
  onProjectOpen: (slug: string) => void;
};

export function ProjectSignalThumbnail({
  points,
  thumbnail,
  radius,
  speed,
  phase,
  isMobileMode,
  onProjectOpen,
}: ProjectSignalThumbnailProps) {
  const groupRef = useRef<THREE.Group>(null);
  const htmlRef = useRef<HTMLDivElement>(null);
  const pointerOpenedRef = useRef(false);
  const isOccludedRef = useRef(false);
  const cameraLocalPosition = useMemo(() => new THREE.Vector3(), []);
  const cameraWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const directionToMarker = useMemo(() => new THREE.Vector3(), []);
  const globeSphere = useMemo(() => new THREE.Sphere(new THREE.Vector3(0, 0, 0), radius * 1.018), [radius]);
  const intersectionPoint = useMemo(() => new THREE.Vector3(), []);
  const markerPosition = useMemo(() => new THREE.Vector3(), []);
  const markerNormal = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new THREE.Ray(), []);
  const radialOffset = radius * (isMobileMode ? 0.1 : 0.13);
  const initialPosition = useMemo(() => {
    const point = points[0] ?? new THREE.Vector3();
    const normal = point.clone().normalize();

    return point.clone().addScaledVector(normal, radialOffset);
  }, [points, radialOffset]);

  useFrame(({ camera, clock }) => {
    if (!groupRef.current) {
      return;
    }

    const progress = clock.elapsedTime * speed + phase;
    const pulsePosition = sampleArcPoint(points, progress);
    markerNormal.copy(pulsePosition).normalize();
    markerPosition.copy(pulsePosition).addScaledVector(markerNormal, radialOffset);
    groupRef.current.position.copy(markerPosition);

    const parent = groupRef.current.parent;
    if (!parent || !htmlRef.current) {
      return;
    }

    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
    cameraLocalPosition.copy(cameraWorldPosition);
    parent.worldToLocal(cameraLocalPosition);
    directionToMarker.copy(markerPosition).sub(cameraLocalPosition);
    const markerDistance = directionToMarker.length();

    if (markerDistance <= 0.0001) {
      return;
    }

    directionToMarker.divideScalar(markerDistance);
    ray.set(cameraLocalPosition, directionToMarker);
    const globeHit = ray.intersectSphere(globeSphere, intersectionPoint);
    const nextOccluded = Boolean(
      globeHit && cameraLocalPosition.distanceTo(intersectionPoint) < markerDistance - radius * 0.024,
    );

    if (nextOccluded === isOccludedRef.current) {
      return;
    }

    isOccludedRef.current = nextOccluded;
    htmlRef.current.style.opacity = nextOccluded ? '0' : '1';
    htmlRef.current.style.pointerEvents = nextOccluded ? 'none' : 'auto';
  });

  return (
    <group ref={groupRef} position={initialPosition}>
      <Html
        ref={htmlRef}
        center
        zIndexRange={[8, 8]}
        style={{ opacity: 1, pointerEvents: 'auto', transition: 'opacity 120ms ease' }}
      >
        <button
          type="button"
          className="project-signal-label"
          data-project-thumbnail-button="true"
          aria-label={`Open ${thumbnail.title}`}
          onPointerDown={(event) => {
            event.stopPropagation();
            pointerOpenedRef.current = true;
            onProjectOpen(thumbnail.slug);
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (pointerOpenedRef.current) {
              pointerOpenedRef.current = false;
              return;
            }

            onProjectOpen(thumbnail.slug);
          }}
        >
          <span>{thumbnail.title}</span>
        </button>
      </Html>
    </group>
  );
}
