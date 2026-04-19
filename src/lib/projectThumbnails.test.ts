import { PROJECT_SIGNALS } from '../data/portfolioSignals';
import { getVisibleProjectSignals, getVisibleProjectThumbnails } from './projectThumbnails';

describe('project signal visibility', () => {
  it('keeps the full project signal set on mobile and desktop', () => {
    expect(getVisibleProjectSignals(false)).toHaveLength(PROJECT_SIGNALS.length);
    expect(getVisibleProjectSignals(true)).toHaveLength(PROJECT_SIGNALS.length);
  });

  it('orders visible project labels by the curated signal list', () => {
    const projects = [...PROJECT_SIGNALS].reverse().map((signal) => ({
      slug: signal.slug,
      title: signal.id,
    }));

    expect(getVisibleProjectThumbnails(projects, true).map((project) => project.slug)).toEqual(
      PROJECT_SIGNALS.map((signal) => signal.slug),
    );
  });
});
