import type {
  ParticleGlobeConfig,
  ProjectedGlobeCircle,
  ResponsiveSceneMetrics,
} from '../types';

const CAMERA_FOV_DEGREES = 34;

function getSafeViewport(width: number, height: number) {
  return {
    width: Math.max(width, 360),
    height: Math.max(height, 360),
  };
}

export function getResponsiveSceneMetrics(
  width: number,
  height: number,
  config: Pick<ParticleGlobeConfig, 'radius' | 'shellRadius' | 'pointSize'>,
): ResponsiveSceneMetrics {
  const safeViewport = getSafeViewport(width, height);
  const smallestSide = Math.min(safeViewport.width, safeViewport.height);
  const aspectFactor = Math.min(1, safeViewport.width / safeViewport.height);
  const scale = Math.min(0.92, Math.max(0.68, smallestSide / 1120));
  const radius = Number((config.radius * scale).toFixed(4));
  const shellRatio = config.shellRadius / config.radius;
  const shellRadius = Number((radius * shellRatio).toFixed(4));
  const pointSize = Number(
    (config.pointSize * Math.max(0.78, scale * 0.94)).toFixed(4),
  );
  const desiredViewportFraction = smallestSide < 560 ? 0.5 : smallestSide < 860 ? 0.56 : 0.6;
  const tanHalfFov = Math.tan((CAMERA_FOV_DEGREES * Math.PI) / 360);
  const cameraZ = Number(
    (radius / (desiredViewportFraction * tanHalfFov * aspectFactor)).toFixed(4),
  );
  const isNarrowPortraitMobile = safeViewport.width <= 430 && safeViewport.height > safeViewport.width;
  const offsetY = isNarrowPortraitMobile ? Number((radius * 0.42).toFixed(4)) : 0;

  return {
    radius,
    shellRadius,
    pointSize,
    cameraZ,
    offsetX: 0,
    offsetY,
  };
}

export function getProjectedGlobeCircle(
  width: number,
  height: number,
  metrics: Pick<ResponsiveSceneMetrics, 'radius' | 'shellRadius' | 'cameraZ' | 'offsetX' | 'offsetY'>,
): ProjectedGlobeCircle {
  const safeViewport = getSafeViewport(width, height);
  const tanHalfFov = Math.tan((CAMERA_FOV_DEGREES * Math.PI) / 360);
  const pixelsPerWorldUnit = safeViewport.height / (2 * metrics.cameraZ * tanHalfFov);
  const visualRadius = Math.max(metrics.radius, metrics.shellRadius);

  return {
    centerX: Number((safeViewport.width / 2 + metrics.offsetX * pixelsPerWorldUnit).toFixed(2)),
    centerY: Number((safeViewport.height / 2 - metrics.offsetY * pixelsPerWorldUnit).toFixed(2)),
    radius: Number((visualRadius * pixelsPerWorldUnit).toFixed(2)),
  };
}
