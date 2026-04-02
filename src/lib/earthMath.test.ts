import * as THREE from 'three';
import {
  buildParticleBuffers,
  calculateDisplacementStrength,
  isLandAtUv,
  latLonToFocusRotation,
  latLonToPoint,
  pointToUv,
  sampleMaskPixel,
  sampleTerrainHeight,
} from './earthMath';

function createMap(width: number, height: number, sampleAt: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const channel = sampleAt(x, y);
      data[index] = channel;
      data[index + 1] = channel;
      data[index + 2] = channel;
      data[index + 3] = 255;
    }
  }

  return { width, height, data };
}

function averageRadius(positions: Float32Array) {
  let total = 0;
  const count = positions.length / 3;

  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index];
    const y = positions[index + 1];
    const z = positions[index + 2];
    total += Math.sqrt(x * x + y * y + z * z);
  }

  return count > 0 ? total / count : 0;
}

const roundVector = (values: number[]) => values.map((value) => (Math.abs(value) < 0.00001 ? 0 : Number(value.toFixed(5))));

describe('earthMath helpers', () => {
  it('maps equator points to the expected uv values', () => {
    expect(pointToUv({ x: 1, y: 0, z: 0 })).toEqual({ u: 0.5, v: 0.5 });
    expect(pointToUv({ x: 0, y: 1, z: 0 })).toEqual({ u: 0.5, v: 0 });
  });

  it('maps latitude and longitude to the expected world axes', () => {
    expect(roundVector(latLonToPoint(0, 0, 1).toArray())).toEqual([1, 0, 0]);
    expect(roundVector(latLonToPoint(0, 90, 1).toArray())).toEqual([0, 0, -1]);
    expect(roundVector(latLonToPoint(90, 45, 1).toArray())).toEqual([0, 1, 0]);
  });

  it('derives a rotation that brings Singapore to the front of the globe', () => {
    const singaporePoint = latLonToPoint(1.3521, 103.8198, 1);
    const focusRotation = latLonToFocusRotation(1.3521, 103.8198);
    const focusedPoint = singaporePoint.applyEuler(new THREE.Euler(focusRotation.x, focusRotation.y, 0));

    expect(Math.abs(focusedPoint.x)).toBeLessThan(0.001);
    expect(Math.abs(focusedPoint.y)).toBeLessThan(0.001);
    expect(focusedPoint.z).toBeGreaterThan(0.999);
  });

  it('samples the elevation pixel using wrapped u coordinates', () => {
    const map = createMap(2, 1, (x) => (x === 0 ? 255 : 0));

    expect(sampleMaskPixel(map, 0.1, 0.2)).toBe(255);
    expect(sampleMaskPixel(map, 1.1, 0.2)).toBe(255);
    expect(isLandAtUv(map, 0.6, 0.2, 1)).toBe(false);
  });

  it('maps positive elevation pixels to normalized terrain height', () => {
    const map = createMap(2, 1, (x) => (x === 0 ? 128 : 0));

    expect(sampleTerrainHeight(map, 0.1, 0.2, 1)).toBeCloseTo(128 / 255, 5);
    expect(sampleTerrainHeight(map, 0.6, 0.2, 1)).toBe(0);
  });

  it('returns zero displacement outside the hover radius', () => {
    expect(
      calculateDisplacementStrength(0.5, 0.3, 1, {
        hoverStrength: 0.2,
        velocityMultiplier: 2,
      }),
    ).toBe(0);
  });

  it('increases displacement as the pointer velocity increases', () => {
    const slow = calculateDisplacementStrength(0.05, 0.3, 0.2, {
      hoverStrength: 0.2,
      velocityMultiplier: 2,
    });
    const fast = calculateDisplacementStrength(0.05, 0.3, 0.8, {
      hoverStrength: 0.2,
      velocityMultiplier: 2,
    });

    expect(fast).toBeGreaterThan(slow);
  });

  it('elevates higher terrain pixels further from the globe radius', () => {
    const lowElevationMap = createMap(2, 2, () => 64);
    const highElevationMap = createMap(2, 2, () => 255);
    const lowBuffers = buildParticleBuffers(lowElevationMap, {
      radius: 1,
      sampleCount: 512,
      landThreshold: 1,
      terrainHeightScale: 0.12,
    });
    const highBuffers = buildParticleBuffers(highElevationMap, {
      radius: 1,
      sampleCount: 512,
      landThreshold: 1,
      terrainHeightScale: 0.24,
    });

    expect(lowBuffers.count).toBe(512);
    expect(highBuffers.count).toBe(512);
    expect(averageRadius(highBuffers.basePositions)).toBeGreaterThan(
      averageRadius(lowBuffers.basePositions),
    );
  });

  it('skips ocean pixels when building particle buffers', () => {
    const oceanMap = createMap(2, 2, () => 0);
    const buffers = buildParticleBuffers(oceanMap, {
      radius: 1,
      sampleCount: 256,
      landThreshold: 1,
      terrainHeightScale: 0.2,
    });

    expect(buffers.count).toBe(0);
  });
});



