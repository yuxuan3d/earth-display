import { PROJECT_SIGNALS } from '../data/portfolioSignals';
import type { ProjectThumbnail } from '../types';

const PROJECT_SIGNAL_LIMITS = {
  mobile: PROJECT_SIGNALS.length,
  desktop: PROJECT_SIGNALS.length,
} as const;

export function getVisibleProjectSignals(isMobileMode: boolean) {
  const limit = isMobileMode
    ? PROJECT_SIGNAL_LIMITS.mobile
    : PROJECT_SIGNAL_LIMITS.desktop;

  return PROJECT_SIGNALS.slice(0, limit);
}

export function getVisibleProjectThumbnails(projects: ProjectThumbnail[], isMobileMode: boolean) {
  const visibleSlugs = getVisibleProjectSignals(isMobileMode).map((signal) => signal.slug);
  const projectMap = new Map(projects.map((project) => [project.slug, project]));

  return visibleSlugs.flatMap((slug) => {
    const project = projectMap.get(slug);
    return project ? [project] : [];
  });
}
