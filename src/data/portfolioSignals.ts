export type GlobeCoordinate = {
  latitude: number;
  longitude: number;
};

export type PortfolioSignal = {
  id: string;
  slug: string;
  coordinate: GlobeCoordinate;
  color: string;
  phase: number;
  speed: number;
  lift: number;
};

export type RndSignal = {
  id: string;
  slug: string;
  coordinate: GlobeCoordinate;
  color: string;
  phase: number;
  speed: number;
  lift: number;
};

export type WorkflowOrbit = {
  id: string;
  color: string;
  radiusMultiplier: number;
  tubeRadius: number;
  speed: number;
  opacity: number;
  phase: number;
  tilt: [number, number, number];
};

export const HOME_BASE = {
  id: 'singapore-home-base',
  coordinate: { latitude: 1.3521, longitude: 103.8198 },
  color: '#90d5ff',
} as const;

export const PROJECT_SIGNALS: PortfolioSignal[] = [
  {
    id: 'signal-cinder',
    slug: 'cinder',
    coordinate: { latitude: 34.0522, longitude: -118.2437 },
    color: '#90d5ff',
    phase: 0.08,
    speed: 0.042,
    lift: 0.18,
  },
  {
    id: 'signal-sit-open-house-2026',
    slug: 'sit-open-house-2026',
    coordinate: { latitude: 35.6762, longitude: 139.6503 },
    color: '#73ffd9',
    phase: 0.42,
    speed: 0.038,
    lift: 0.13,
  },
  {
    id: 'signal-betadine-sore-throat-lozenges',
    slug: 'betadine-sore-throat-lozenges',
    coordinate: { latitude: -33.8688, longitude: 151.2093 },
    color: '#cbeeff',
    phase: 0.68,
    speed: 0.034,
    lift: 0.15,
  },
  {
    id: 'signal-betadine-sore-throat-spray',
    slug: 'betadine-sore-throat-spray',
    coordinate: { latitude: 51.5072, longitude: -0.1276 },
    color: '#90d5ff',
    phase: 0.22,
    speed: 0.036,
    lift: 0.11,
  },
  {
    id: 'signal-samsung-energy-score',
    slug: 'what-s-your-energy-score-samsung',
    coordinate: { latitude: 40.7128, longitude: -74.006 },
    color: '#73ffd9',
    phase: 0.56,
    speed: 0.032,
    lift: 0.14,
  },
  {
    id: 'signal-visa-future-view',
    slug: 'visafw',
    coordinate: { latitude: -23.5505, longitude: -46.6333 },
    color: '#cbeeff',
    phase: 0.84,
    speed: 0.03,
    lift: 0.12,
  },
];

export const RND_SIGNALS: RndSignal[] = [
  {
    id: 'rnd-shophouse-generator',
    slug: 'shophouse-generator',
    coordinate: { latitude: 22.3193, longitude: 114.1694 },
    color: '#90d5ff',
    phase: 0.18,
    speed: 0.2,
    lift: 0.08,
  },
  {
    id: 'rnd-webgl-lab',
    slug: 'webgl-lab',
    coordinate: { latitude: 52.52, longitude: 13.405 },
    color: '#73ffd9',
    phase: 0.52,
    speed: 0.17,
    lift: 0.12,
  },
  {
    id: 'rnd-ai-node-sketch',
    slug: 'ai-node-sketch',
    coordinate: { latitude: 37.7749, longitude: -122.4194 },
    color: '#cbeeff',
    phase: 0.78,
    speed: 0.22,
    lift: 0.16,
  },
];

export const WORKFLOW_ORBITS: WorkflowOrbit[] = [
  {
    id: 'workflow-discover',
    color: '#90d5ff',
    radiusMultiplier: 1.165,
    tubeRadius: 0.0017,
    speed: 0.035,
    opacity: 0.22,
    phase: 0.1,
    tilt: [63, -18, 12],
  },
  {
    id: 'workflow-prototype',
    color: '#73ffd9',
    radiusMultiplier: 1.205,
    tubeRadius: 0.0014,
    speed: -0.026,
    opacity: 0.16,
    phase: 0.36,
    tilt: [78, 28, -22],
  },
  {
    id: 'workflow-polish',
    color: '#cbeeff',
    radiusMultiplier: 1.245,
    tubeRadius: 0.0012,
    speed: 0.019,
    opacity: 0.13,
    phase: 0.64,
    tilt: [54, 74, 35],
  },
];
