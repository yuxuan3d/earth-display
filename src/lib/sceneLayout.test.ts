import { PARTICLE_GLOBE_CONFIG } from '../config';
import { getProjectedGlobeCircle, getResponsiveSceneMetrics } from './sceneLayout';

describe('scene layout metrics', () => {
  it('shrinks the globe and increases camera distance on small screens', () => {
    const desktop = getResponsiveSceneMetrics(1440, 900, PARTICLE_GLOBE_CONFIG);
    const mobile = getResponsiveSceneMetrics(390, 844, PARTICLE_GLOBE_CONFIG);

    expect(mobile.radius).toBeLessThan(desktop.radius);
    expect(mobile.cameraZ).toBeGreaterThan(desktop.cameraZ);
  });

  it('keeps shell radius slightly larger than the globe radius', () => {
    const metrics = getResponsiveSceneMetrics(1024, 768, PARTICLE_GLOBE_CONFIG);

    expect(metrics.shellRadius).toBeGreaterThan(metrics.radius);
    expect(metrics.pointSize).toBeGreaterThan(0);
  });

  it('offsets the globe to the right on wider screens', () => {
    const desktop = getResponsiveSceneMetrics(1440, 900, PARTICLE_GLOBE_CONFIG);
    const mobile = getResponsiveSceneMetrics(390, 844, PARTICLE_GLOBE_CONFIG);

    expect(desktop.offsetX).toBeGreaterThan(0);
    expect(mobile.offsetX).toBe(0);
  });

  it('projects the globe circle from scene metrics', () => {
    const desktopMetrics = getResponsiveSceneMetrics(1440, 900, PARTICLE_GLOBE_CONFIG);
    const mobileMetrics = getResponsiveSceneMetrics(390, 844, PARTICLE_GLOBE_CONFIG);
    const desktopCircle = getProjectedGlobeCircle(1440, 900, desktopMetrics);
    const mobileCircle = getProjectedGlobeCircle(390, 844, mobileMetrics);

    expect(desktopCircle.centerX).toBeGreaterThan(720);
    expect(desktopCircle.radius).toBeGreaterThan(0);
    expect(mobileCircle.centerX).toBeCloseTo(195, 1);
  });
});
