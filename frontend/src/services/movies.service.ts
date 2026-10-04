import { BoxOfficeHistory, InternationalRefreshResult } from '../types';

export const searchMovies = async (search: string, year?: string | number) => {
  const params = new URLSearchParams({ search });
  if (year !== undefined && year !== null && String(year).trim() !== '') {
    params.set('year', String(year).trim());
  }
  const response = await fetch(`/api/search-movies?${params}`);
  if (!response.ok) throw new Error('Failed to fetch movies');
  return response.json();
};

export const getMovieBoxOffice = async (movieId: string): Promise<BoxOfficeHistory> => {
  const response = await fetch(`/api/movies/${movieId}/box-office`);
  if (!response.ok) throw new Error('Failed to fetch box office history');
  return response.json();
};

export const refreshMovieBoxOffice = async (movieId: string): Promise<BoxOfficeHistory> => {
  const response = await fetch(`/api/movies/${movieId}/box-office/refresh`, { method: 'POST' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to refresh box office history');
  }
  return response.json();
};

export const refreshMovieInternationalBoxOffice = async (
  movieId: string,
  opts?: { force?: boolean }
): Promise<BoxOfficeHistory & { refreshResult: InternationalRefreshResult }> => {
  const response = await fetch(`/api/movies/${movieId}/box-office/international/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: Boolean(opts?.force) }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to refresh foreign history');
  }
  return response.json();
};

export const getMovieDetails = async (tmdbID: string) => {
  const response = await fetch(`/api/movie?id=${tmdbID}`);
  if (!response.ok) throw new Error('Failed to fetch movie');
  return response.json();
};

export const saveMovieDetails = async (movieData: Record<string, any>) => {
  const response = await fetch('/api/movie/save', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(movieData),
  });

  if (!response.ok) {
      throw new Error('Failed to save movie details');
  }

  return response.json();
};

export const updateMovieDetails = async (movieData: Record<string, any>) => {
  console.log("updateMovieDetails", movieData)
  const response = await fetch(`/api/movie/${movieData.tmdbID}`, {
      method: 'PUT',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(movieData),
  });

  console.log(response)

  if (!response.ok) {
      throw new Error('Failed to update movie details');
  }

  return response.json();
};

export const updateAllMovies = async () => {
  console.log("updateAllMovies")
  const response = await fetch(`/api/refresh-movies`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
  });

  if (!response.ok) {
      throw new Error('Failed to update movies');
  }

  return response.json();
};

export const deleteMovie = async (imdbID: string) => {
  const response = await fetch(`/api/movie/delete?imdbID=${imdbID}`, {
      method: 'DELETE',
      headers: {
          'Content-Type': 'application/json',
      },
  });

  if (!response.ok) {
      throw new Error('Failed to delete movie');
  }

  return response.json();
};

export const fetchBoxOfficeData = async (imdbID: string) => {
  const response = await fetch(`/api/box-office?id=${imdbID}`);
  if (!response.ok) throw new Error('Failed to fetch box office data');
  return response.json();
};

export const fetchRottenTomatoesScore = async (title: string) => {
  const response = await fetch(`/api/rotten-tomatoes?title=${title}`);
  if (!response.ok) throw new Error('Failed to fetch rotten tomatoes data');
  return response.json();
};

export const getSavedMovies = async () => {
  const response = await fetch(`/api/all-movies`);
  if (!response.ok) throw new Error('Failed to fetch movies');
  return response.json();
};