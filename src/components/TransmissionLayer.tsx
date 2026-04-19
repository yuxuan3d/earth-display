import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { HOME_BASE, RND_SIGNALS } from '../data/portfolioSignals';
import { buildGreatCircleArc } from '../lib/earthMath';
import { SignalArcLine, TravelingSignalPulse } from './SignalArc';

type TransmissionLayerProps = {
  radius: number;
  isInteracting: boolean;
  isMobileMode: boolean;
  opacityScale: number;
  speedScale: number;
};

export function TransmissionLayer({
  radius,
  isInteracting,
  isMobileMode,
  opacityScale,
  speedScale,
}: TransmissionLayerProps) {
  const activityRef = useRef(0);
  const arcs = useMemo(
    () =>
      RND_SIGNALS.map((signal) => ({
        signal,
        points: buildGreatCircleArc(
          HOME_BASE.coordinate,
          signal.coordinate,
          radius * 1.02,
          radius * signal.lift,
          isMobileMode ? 36 : 54,
        ),
      })),
    [isMobileMode, radius],
  );
  const lineOpacity = (isMobileMode ? 0.18 : 0.2) * opacityScale;
  const pulseOpacity = (isMobileMode ? 0.48 : 0.62) * opacityScale;
  const pulseSize = radius * (isMobileMode ? 0.0064 : 0.0075);

  useFrame((_, delta) => {
    const target = isInteracting ? 1 : 0;
    const ease = 1 - Math.exp(-5.8 * delta);
    activityRef.current += (target - activityRef.current) * ease;
  });

  return (
    <group>
      {arcs.map(({ signal, points }) => (
        <group key={signal.id}>
          <SignalArcLine
            points={points}
            color={signal.color}
            opacity={lineOpacity}
            renderOrder={3}
            activityRef={activityRef}
          />
          <TravelingSignalPulse
            points={points}
            color={signal.color}
            size={pulseSize}
            opacity={pulseOpacity}
            speed={signal.speed * speedScale}
            phase={signal.phase}
            renderOrder={4}
            activityRef={activityRef}
          />
        </group>
      ))}
    </group>
  );
}
