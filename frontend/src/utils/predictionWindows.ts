import { MovieData } from "../types";

export function getPredictionWindows(movie: MovieData) {
  const release = new Date(movie.released);

  // Thursday before release
  const boxOfficeCutoff = new Date(release);
  boxOfficeCutoff.setDate(release.getDate() - 1);
  boxOfficeCutoff.setHours(23, 59, 59, 999);

  // cutoff before RT embargo
  const rottenTomatoesCutoff = new Date(release);
  rottenTomatoesCutoff.setDate(release.getDate() - 7);

  return {
    boxOfficeCutoff,
    rottenTomatoesCutoff,
  };
}

export function getPredictionAvailability(movie: MovieData) {
  const now = new Date();

  const {
    boxOfficeCutoff,
    rottenTomatoesCutoff,
  } = getPredictionWindows(movie);

  return {
    domesticOpening: now < boxOfficeCutoff,
    internationalOpening: now < boxOfficeCutoff,
    finalDomestic: now < boxOfficeCutoff,
    finalInternational: now < boxOfficeCutoff,
    rottenTomatoes: now < rottenTomatoesCutoff,

    // useful overall flag
    anyOpen:
      now < boxOfficeCutoff ||
      now < rottenTomatoesCutoff,
  };
}