import * as THREE from 'three';
import type { MaskImageData, ParticleGlobeConfig, SceneRotation, Vector3Like } from '../types';

export type ParticleBuffers = {
  positions: Float32Array;
  basePositions: Float32Array;
  heights: Float32Array;
  normals: Float32Array;
  seeds: Float32Array;
  count: number;
};

export function fibonacciSpherePoint(
  index: number,
  total: number,
  radius: number,
): THREE.Vector3 {
  const offset = 2 / total;
  const increment = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index * offset + offset / 2);
  const radial = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = index * increment;

  return new THREE.Vector3(
    Math.cos(phi) * radial * radius,
    y * radius,
    Math.sin(phi) * radial * radius,
  );
}

export function latLonToPoint(
  latitude: number,
  longitude: number,
  radius: number,
): THREE.Vector3 {
  const latitudeRadians = THREE.MathUtils.degToRad(latitude);
  const longitudeRadians = THREE.MathUtils.degToRad(longitude);
  const cosLatitude = Math.cos(latitudeRadians);

  return new THREE.Vector3(
    Math.cos(longitudeRadians) * cosLatitude * radius,
    Math.sin(latitudeRadians) * radius,
    -Math.sin(longitudeRadians) * cosLatitude * radius,
  );
}

export function latLonToFocusRotation(latitude: number, longitude: number): SceneRotation {
  return {
    x: THREE.MathUtils.degToRad(latitude),
    y:
      THREE.MathUtils.euclideanModulo(
        -Math.PI / 2 - THREE.MathUtils.degToRad(longitude) + Math.PI,
        Math.PI * 2,
      ) - Math.PI,
  };
}

export function pointToUv(point: Vector3Like) {
  const length = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2) || 1;
  const nx = point.x / length;
  const ny = point.y / length;
  const nz = point.z / length;

  const u = 0.5 + Math.atan2(-nz, nx) / (Math.PI * 2);
  const v = 0.5 - Math.asin(THREE.MathUtils.clamp(ny, -1, 1)) / Math.PI;

  return { u, v };
}

export function sampleMaskPixel(mask: MaskImageData, u: number, v: number) {
  const wrappedU = ((u % 1) + 1) % 1;
  const clampedV = THREE.MathUtils.clamp(v, 0, 0.999999);
  const x = Math.min(mask.width - 1, Math.floor(wrappedU * mask.width));
  const y = Math.min(mask.height - 1, Math.floor(clampedV * mask.height));
  const index = (y * mask.width + x) * 4;

  return mask.data[index];
}

export function isLandAtUv(
  mask: MaskImageData,
  u: number,
  v: number,
  threshold: number,
) {
  return sampleMaskPixel(mask, u, v) >= threshold;
}

export function sampleTerrainHeight(
  mask: MaskImageData,
  u: number,
  v: number,
  threshold: number,
) {
  const sample = sampleMaskPixel(mask, u, v);

  return sample >= threshold ? sample / 255 : 0;
}

export function calculateDisplacementStrength(
  surfaceDistance: number,
  hoverRadius: number,
  velocity: number,
  config: Pick<ParticleGlobeConfig, 'hoverStrength' | 'velocityMultiplier'>,
) {
  if (surfaceDistance >= hoverRadius || velocity <= 0) {
    return 0;
  }

  const normalizedDistance = 1 - surfaceDistance / hoverRadius;
  const falloff = normalizedDistance * normalizedDistance;
  return falloff * config.hoverStrength * velocity * config.velocityMultiplier;
}

export function extractMaskImageData(texture: THREE.Texture): MaskImageData {
  const image = texture.image as CanvasImageSource & {
    width?: number;
    height?: number;
  };

  const width = image.width ?? 0;
  const height = image.height ?? 0;

  if (!width || !height) {
    throw new Error('Terrain texture image is missing dimensions.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to create a 2D context for the terrain texture.');
  }

  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);

  return {
    width,
    height,
    data,
  };
}

export function buildParticleBuffers(
  mask: MaskImageData,
  config: Pick<
    ParticleGlobeConfig,
    'radius' | 'sampleCount' | 'landThreshold' | 'terrainHeightScale'
  >,
): ParticleBuffers {
  const acceptedPositions: number[] = [];
  const acceptedNormals: number[] = [];
  const acceptedSeeds: number[] = [];
  const acceptedHeights: number[] = [];

  for (let index = 0; index < config.sampleCount; index += 1) {
    const point = fibonacciSpherePoint(index, config.sampleCount, config.radius);
    const { u, v } = pointToUv(point);
    const height = sampleTerrainHeight(mask, u, v, config.landThreshold);

    if (height <= 0) {
      continue;
    }

    const elevatedHeight = height * config.terrainHeightScale;
    const elevatedPoint = point.clone().multiplyScalar(1 + elevatedHeight);

    acceptedPositions.push(elevatedPoint.x, elevatedPoint.y, elevatedPoint.z);

    const normal = point.clone().normalize();
    acceptedNormals.push(normal.x, normal.y, normal.z);

    const seed = (Math.sin(index * 12.9898) + 1) * 0.5;
    acceptedSeeds.push(seed);
    acceptedHeights.push(elevatedHeight);
  }

  return {
    positions: new Float32Array(acceptedPositions),
    basePositions: new Float32Array(acceptedPositions),
    heights: new Float32Array(acceptedHeights),
    normals: new Float32Array(acceptedNormals),
    seeds: new Float32Array(acceptedSeeds),
    count: acceptedSeeds.length,
  };
}

