import { PROJECT_SIGNALS } from '../data/portfolioSignals';
import type { ProjectThumbnail } from '../types';

export function getVisibleProjectThumbnails(projects: ProjectThumbnail[], isMobileMode: boolean) {
  const visibleSlugs = PROJECT_SIGNALS.slice(0, isMobileMode ? 2 : PROJECT_SIGNALS.length).map(
    (signal) => signal.slug,
  );
  const projectMap = new Map(projects.map((project) => [project.slug, project]));

  return visibleSlugs.flatMap((slug) => {
    const project = projectMap.get(slug);
    return project ? [project] : [];
  });
}
