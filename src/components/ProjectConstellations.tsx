import { useMemo } from 'react';
import { HOME_BASE } from '../data/portfolioSignals';
import { buildGreatCircleArc } from '../lib/earthMath';
import { getVisibleProjectSignals, getVisibleProjectThumbnails } from '../lib/projectThumbnails';
import type { ProjectThumbnail } from '../types';
import { ProjectSignalThumbnail } from './ProjectSignalThumbnail';
import { SignalArcLine, TravelingSignalPulse } from './SignalArc';

type ProjectConstellationsProps = {
  radius: number;
  isMobileMode: boolean;
  opacityScale: number;
  speedScale: number;
  projectThumbnails: ProjectThumbnail[];
  onProjectOpen: (slug: string) => void;
};

export function ProjectConstellations({
  radius,
  isMobileMode,
  opacityScale,
  speedScale,
  projectThumbnails,
  onProjectOpen,
}: ProjectConstellationsProps) {
  const thumbnailMap = useMemo(() => {
    const visibleThumbnails = getVisibleProjectThumbnails(projectThumbnails, isMobileMode);
    return new Map(visibleThumbnails.map((thumbnail) => [thumbnail.slug, thumbnail]));
  }, [isMobileMode, projectThumbnails]);
  const arcs = useMemo(
    () => {
      const visibleSignals = getVisibleProjectSignals(isMobileMode);

      return visibleSignals.map((signal) => ({
        signal,
        points: buildGreatCircleArc(
          HOME_BASE.coordinate,
          signal.coordinate,
          radius * 1.012,
          radius * signal.lift,
          isMobileMode ? 52 : 72,
        ),
      }));
    },
    [isMobileMode, radius],
  );
  const lineOpacity = (isMobileMode ? 0.34 : 0.26) * opacityScale;
  const pulseOpacity = (isMobileMode ? 0.58 : 0.68) * opacityScale;
  const pulseSize = radius * (isMobileMode ? 0.0074 : 0.0085);

  return (
    <group>
      {arcs.map(({ signal, points }) => (
        <group key={signal.id}>
          <SignalArcLine points={points} color={signal.color} opacity={lineOpacity} />
          <TravelingSignalPulse
            points={points}
            color={signal.color}
            size={pulseSize}
            opacity={pulseOpacity}
            speed={signal.speed * speedScale}
            phase={signal.phase}
          />
          {thumbnailMap.has(signal.slug) ? (
            <ProjectSignalThumbnail
              points={points}
              thumbnail={thumbnailMap.get(signal.slug)!}
              radius={radius}
              speed={signal.speed * speedScale}
              phase={signal.phase}
              isMobileMode={isMobileMode}
              onProjectOpen={onProjectOpen}
            />
          ) : null}
        </group>
      ))}
    </group>
  );
}
