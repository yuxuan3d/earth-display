import * as THREE from 'three';

export function sampleArcPoint(points: THREE.Vector3[], progress: number) {
  const clampedProgress = THREE.MathUtils.euclideanModulo(progress, 1);
  const scaledIndex = clampedProgress * (points.length - 1);
  const startIndex = Math.floor(scaledIndex);
  const endIndex = Math.min(points.length - 1, startIndex + 1);
  const blend = scaledIndex - startIndex;

  return points[startIndex].clone().lerp(points[endIndex], blend);
}
