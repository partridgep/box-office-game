import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMovieStore } from '../../../store/useMovieStore';
import { useGuessStore } from '../../../store/useGuessStore';
import { updateAllMovies, getSavedMovies } from '../../../services/movies.service';
import { getLobbySections } from '../../../services/categories.service';
import { LobbyMovie, LobbySection, MovieData } from '../../../types';
import { getPredictionAvailability } from "../../../utils/predictionWindows";

import PredictButton from '../../../components/PredictButton';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { library, IconProp } from '@fortawesome/fontawesome-svg-core';

library.add({ faArrowsRotate });

 // @ts-ignore
const refreshIcon : IconProp = "fa-solid fa-arrows-rotate"

function asMovieData(movie: LobbyMovie | MovieData): MovieData {
  return movie as MovieData;
}

function MovieCard({
  movie,
  guessed,
  onSelect,
}: {
  movie: LobbyMovie | MovieData;
  guessed: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="group bg-cinema-900 border border-cinema-800 hover:border-cinema-700 rounded-2xl overflow-hidden shadow-lg cursor-pointer flex flex-col transition-all duration-300 transform hover:-translate-y-1"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden bg-cinema-950">
        <img
          src={`https://image.tmdb.org/t/p/original${movie.poster}`}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-linear-to-t from-cinema-950 via-transparent opacity-60" />

        {guessed ? (
          <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-md text-emerald-950 text-xs font-bold px-2 py-0.5 rounded-full shadow border border-emerald-400/30">
            Guessed ✓
          </div>
        ) : (
          <div className="absolute top-3 right-3 bg-cinema-900/80 backdrop-blur-md text-stone-300 text-xs font-medium px-2 py-0.5 rounded-full border border-cinema-700">
            Pending
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <span className="text-xs font-semibold px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg backdrop-blur-md">
            {movie.year} • {movie.rated || "NR"}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-bold text-white text-base group-hover:text-rose-400 transition-colors line-clamp-1">
            {movie.title}
          </h3>
          <p className="text-xs text-stone-400 line-clamp-2 mt-1">
            {movie.plot}
          </p>
        </div>

        <div className="pt-2 border-t border-cinema-800 flex items-center justify-between text-xs text-stone-400">
          <span>
            Release:{" "}
            {movie.released
              ? new Date(movie.released).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "TBD"}
          </span>
          <span className="text-rose-400 font-semibold group-hover:translate-x-1 transition-transform">
            Predict →
          </span>
        </div>
      </div>
    </div>
  );
}

export function CinemaLobby() {
  const navigate = useNavigate();
  const { movies, setMovies } = useMovieStore();
  const guesses = useGuessStore((state) => state.guesses);

  const [heroIndex, setHeroIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lobbySections, setLobbySections] = useState<LobbySection[]>([]);

  const movieList = useMemo(() => {
    const rawList = Array.isArray(movies) ? movies : Object.values(movies);
    return rawList
      .filter((movie) => getPredictionAvailability(movie).anyOpen)
      .sort((a, b) => {
        const aTime = a.released ? new Date(a.released).getTime() : 0;
        const bTime = b.released ? new Date(b.released).getTime() : 0;
        return aTime - bTime;
      });
  }, [movies]);

  const moviesById = useMemo(() => {
    const map = new Map<string, MovieData>();
    for (const movie of movieList) {
      if (movie.id) map.set(movie.id, movie);
    }
    return map;
  }, [movieList]);

  const openSectionMovies = useMemo(() => {
    return lobbySections
      .map((section) => {
        const sectionMovies = section.movies
          .map((lobbyMovie) => moviesById.get(lobbyMovie.id) || asMovieData(lobbyMovie))
          .filter((movie) => {
            try {
              return getPredictionAvailability(asMovieData(movie)).anyOpen;
            } catch {
              return false;
            }
          });
        return { ...section, movies: sectionMovies };
      })
      .filter((section) => section.movies.length > 0);
  }, [lobbySections, moviesById]);

  const categorizedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const section of openSectionMovies) {
      for (const movie of section.movies) {
        if (movie.id) ids.add(String(movie.id));
      }
    }
    return ids;
  }, [openSectionMovies]);

  const moreUpcoming = useMemo(
    () =>
      movieList.filter(
        (movie) => !movie.id || !categorizedIds.has(String(movie.id))
      ),
    [movieList, categorizedIds]
  );

  const featuredMovies = movieList.slice(0, 5);
  const activeMovie = featuredMovies[heroIndex] || movieList[0];

  useEffect(() => {
    async function loadLobby() {
      try {
        const sections = await getLobbySections();
        setLobbySections(sections);
      } catch (error) {
        console.error("Error fetching lobby sections:", error);
      }
    }
    loadLobby();
  }, []);

  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  const hasGuessed = (movieId: string) => {
    const guessArray = Array.isArray(guesses) ? guesses : [guesses];
    return guessArray.some((g) => g && g.movie_id === movieId);
  };

  const onSavedMovieSelect = (movie: LobbyMovie | MovieData) => {
    navigate(`/movie/${movie.tmdbID}`);
  };

  const handleUpdateAllMovies = async () => {
    setIsUpdating(true);
    try {
      await updateAllMovies();
      const [updatedMovies, sections] = await Promise.all([
        getSavedMovies(),
        getLobbySections(),
      ]);
      setMovies(updatedMovies);
      setLobbySections(sections);
    } catch (error) {
      console.error('Error updating movies:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderMovieGrid = (list: Array<LobbyMovie | MovieData>) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {list.map((movie) => {
        const guessed = movie.id ? hasGuessed(String(movie.id)) : false;
        return (
          <MovieCard
            key={movie.id || movie.imdbID || String(movie.tmdbID)}
            movie={movie}
            guessed={guessed}
            onSelect={() => onSavedMovieSelect(movie)}
          />
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-cinema-950 text-stone-100 flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-12">
        {activeMovie && (
          <section className="relative rounded-3xl overflow-hidden border border-theater-gold/30 bg-cinema-900 shadow-2xl">
            <div className="absolute inset-0 z-0">
              <img
                src={`https://image.tmdb.org/t/p/w92${activeMovie.poster}`}
                alt={activeMovie.title}
                className="w-full h-full object-cover object-center filter blur-2xl opacity-30 scale-110 transform"
              />
              <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-theater-gold/10 to-transparent" />
            </div>

            <div className="relative z-5 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-10 lg:p-12 items-center">
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative group w-48 sm:w-64 block aspect-2/3 rounded-lg overflow-hidden shadow-2xl border border-yellow-900/40">
                  <img
                    src={`https://image.tmdb.org/t/p/original${activeMovie.poster}`}
                    alt={activeMovie.title}
                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
                  />
                  {activeMovie.id && hasGuessed(activeMovie.id) && (
                    <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur-md text-emerald-950 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg border border-emerald-400/30">
                      Predicted
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center space-x-2 bg-theater-gold/10 border border-theater-gold/20 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-theater-gold" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-theater-gold">Coming Soon</span>
                </div>

                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                    {activeMovie.title}
                  </h1>
                  <p className="text-stone-400 text-sm sm:text-base line-clamp-2 max-w-xl mt-2 mb-0">
                    {activeMovie.director ? `Directed by ${activeMovie.director}` : 'Director information not available.'}
                  </p>
                  <p className="text-stone-400 text-sm sm:text-base line-clamp-2 max-w-xl mt-1">
                    {activeMovie.actors ? `Starring ${activeMovie.actors}` : 'Cast information not available.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs sm:text-sm text-slate-300">
                  <div className="bg-cinema-900/80 border border-cinema-800/50 px-3 py-1.5 rounded-xl">
                    Release <span className="font-semibold text-white">{activeMovie.released ? new Date(activeMovie.released).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="bg-cinema-900/80 border border-cinema-800/50 px-3 py-1.5 rounded-xl">
                    Budget <span className="font-semibold text-white">{activeMovie.budget || 'Information not available'}</span>
                  </div>
                </div>

                <PredictButton
                  onClick={() => activeMovie.tmdbID && navigate(`/movie/${activeMovie.tmdbID}`)}
                />
              </div>
            </div>

            {featuredMovies.length > 1 && (
              <div className="absolute bottom-4 right-6 z-5 flex space-x-2">
                {featuredMovies.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHeroIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === heroIndex ? 'bg-theater-gold w-6' : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <div className="flex flex-col sm:flex-row text-left items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Now Booking</h2>
            <p className="text-sm text-stone-400">Pick a movie to forecast performance.</p>
          </div>

          <button
            onClick={handleUpdateAllMovies}
            disabled={isUpdating}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg ${
              isUpdating
                ? 'bg-slate-800 text-stone-400 cursor-not-allowed border border-cinema-700'
                : 'bg-cinema-600 hover:bg-cinema-500 text-white'
            }`}
          >
            <FontAwesomeIcon icon={refreshIcon} size="sm" spin={isUpdating} />
            <span>{isUpdating ? 'Updating All Data...' : 'Update All Data'}</span>
          </button>
        </div>

        {movieList.length === 0 ? (
          <div className="text-center py-16 bg-cinema-900/50 border border-cinema-800 rounded-3xl">
            <p className="text-stone-400">No saved movies found in the database.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {openSectionMovies.map((section) => (
              <section key={section.id} className="space-y-6">
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {section.label}
                  </h3>
                </div>
                {renderMovieGrid(section.movies)}
              </section>
            ))}

            {moreUpcoming.length > 0 && (
              <section className="space-y-6">
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {openSectionMovies.length > 0 ? "More upcoming" : "Upcoming Releases"}
                  </h3>
                  <p className="text-sm text-stone-400">
                    {openSectionMovies.length > 0
                      ? "Titles not yet placed in a lobby category."
                      : "Pick a movie to forecast performance."}
                  </p>
                </div>
                {renderMovieGrid(moreUpcoming)}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
