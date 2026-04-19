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

  it('keeps the globe horizontally centered and lifts narrow mobile layouts', () => {
    const desktop = getResponsiveSceneMetrics(1440, 900, PARTICLE_GLOBE_CONFIG);
    const mobile = getResponsiveSceneMetrics(390, 844, PARTICLE_GLOBE_CONFIG);
    const tablet = getResponsiveSceneMetrics(768, 1024, PARTICLE_GLOBE_CONFIG);

    expect(desktop.offsetX).toBe(0);
    expect(mobile.offsetX).toBe(0);
    expect(desktop.offsetY).toBe(0);
    expect(tablet.offsetY).toBe(0);
    expect(mobile.offsetY).toBeGreaterThan(0);
  });

  it('projects the globe circle from scene metrics', () => {
    const desktopMetrics = getResponsiveSceneMetrics(1440, 900, PARTICLE_GLOBE_CONFIG);
    const mobileMetrics = getResponsiveSceneMetrics(390, 844, PARTICLE_GLOBE_CONFIG);
    const desktopCircle = getProjectedGlobeCircle(1440, 900, desktopMetrics);
    const mobileCircle = getProjectedGlobeCircle(390, 844, mobileMetrics);

    expect(desktopCircle.centerX).toBeCloseTo(720, 1);
    expect(desktopCircle.radius).toBeGreaterThan(0);
    expect(mobileCircle.centerX).toBeCloseTo(195, 1);
    expect(mobileCircle.centerY).toBeLessThan(422);
  });
});
