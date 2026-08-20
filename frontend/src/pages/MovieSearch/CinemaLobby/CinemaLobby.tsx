import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMovieStore } from '../../../store/useMovieStore';
// import { useUserStore } from '../../../store/useUserStore';
import { useGuessStore } from '../../../store/useGuessStore';
import { 
  // searchMovies, 
  updateAllMovies, getSavedMovies } from '../../../services/movies.service';
// import MovieResult from '../../../components/MovieResult/MovieResult';
import { MovieData } from '../../../types';
import { getPredictionAvailability } from "../../../utils/predictionWindows";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { library, IconProp } from '@fortawesome/fontawesome-svg-core';

library.add({ faArrowsRotate });

 // @ts-ignore
const refreshIcon : IconProp = "fa-solid fa-arrows-rotate"

// type ApiMovie = {
//     Title: string;
//     Year: string;
//     Poster: string;
//     tmdbID: string;
// }

export function CinemaLobby() {
  
  const navigate = useNavigate();
  const { movies, setMovies } = useMovieStore();
  // const user = useUserStore((state) => state.user);
  const guesses = useGuessStore((state) => state.guesses);

  const [heroIndex, setHeroIndex] = useState(0);
  // const [search, setSearch] = useState<string>('');
  // const [movieResults, setMovieResults] = useState<ApiMovie[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Memoize, filter for upcoming movies (any prediction window open), and sort by release date (oldest first)
  const movieList = useMemo(() => {
    const rawList = Array.isArray(movies) ? movies : Object.values(movies);
    return rawList
      .filter((movie) => {
        // Check if predictions are still open using getPredictionAvailability
        const availability = getPredictionAvailability(movie);
        return availability.anyOpen;
      })
      .sort((a, b) => {
        const aTime = a.released ? new Date(a.released).getTime() : 0;
        const bTime = b.released ? new Date(b.released).getTime() : 0;
        return aTime - bTime;
      });
  }, [movies]);

  const featuredMovies = movieList.slice(0, 5);
  const activeMovie = featuredMovies[heroIndex] || movieList[0];

  // Auto-rotate hero banner every 6 seconds
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

  // const handleSearch = async () => {
  //   try {
  //       const result = await searchMovies(search);
  //       setMovieResults(result);
  //   } catch (error) {
  //       console.error(error);
  //   }
  // };

  // const onMovieSelect = (tmdbID: string) => {
  //     navigate(`/movie/${tmdbID}`);
  // };

  const onSavedMovieSelect = (movie: MovieData) => {
      navigate(`/movie/${movie.tmdbID}`);
  };

  const handleUpdateAllMovies = async () => {
    setIsUpdating(true);
    try {
      await updateAllMovies();
      const updatedMovies = await getSavedMovies();
      setMovies(updatedMovies);
    } catch (error) {
        console.error('Error updating movies:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-cinema-950 text-stone-100 flex flex-col">

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-12">
        
        {/* Hero Banner Section */}
        {activeMovie && (
          <section className="relative rounded-3xl overflow-hidden border border-theater-gold/30 bg-cinema-900 shadow-2xl">
            <div className="absolute inset-0 z-0">
              <img 
                src={`https://image.tmdb.org/t/p/w92${activeMovie.poster}`}
                alt={activeMovie.title} 
                className="w-full h-full object-cover object-center filter blur-2xl opacity-25 scale-110 transform"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-theater-gold/10 to-transparent" />
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

                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                    {activeMovie.title}
                  </h1>
                  <p className="text-stone-400 text-sm sm:text-base line-clamp-2 max-w-xl">
                    {activeMovie.plot}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs sm:text-sm text-slate-300">
                  <div className="bg-cinema-900/80 border border-cinema-800/50 px-3 py-1.5 rounded-xl">
                    Release <span className="font-semibold text-white">{activeMovie.released ? new Date(activeMovie.released).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="bg-cinema-900/80 border border-cinema-800/50 px-3 py-1.5 rounded-xl">
                    Budget <span className="font-semibold text-white">{activeMovie.budget || 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <button
                    onClick={() => activeMovie.tmdbID && navigate(`/movie/${activeMovie.tmdbID}`)}
                    className="w-full sm:w-auto bg-cinema-500/40 backdrop-blur text-white uppercase font-bold px-6 py-2 rounded-xl shadow-xl transform hover:-translate-y-0.5 transition-all"
                  >
                    {activeMovie.id && hasGuessed(activeMovie.id) ? 'Edit Predictions' : 'Predict Box Office Performance'}
                  </button>
                </div>
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

        {/* Saved Movies Database Grid & Management */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row text-left items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Upcoming Releases</h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {movieList.map((movie) => {
                const guessed = movie.id ? hasGuessed(movie.id) : false;
                return (
                  <div 
                    key={movie.imdbID}
                    onClick={() => onSavedMovieSelect(movie)}
                    className="group bg-cinema-900 border border-cinema-800 hover:border-cinema-700 rounded-2xl overflow-hidden shadow-lg cursor-pointer flex flex-col transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="relative aspect-2/3 w-full overflow-hidden bg-cinema-950">
                      <img 
                        src={`https://image.tmdb.org/t/p/original${movie.poster}`}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-cinema-950 via-transparent opacity-60" />

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
                          {movie.year} • {movie.rated}
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
                        <span>Release: {movie.released ? new Date(movie.released).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}</span>
                        <span className="text-rose-400 font-semibold group-hover:translate-x-1 transition-transform">Predict →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <hr className="border-cinema-800" />

        {/* API Search Section */}
        {/* <section className="space-y-6 bg-cinema-900/40 border border-cinema-800/80 p-6 sm:p-8 rounded-3xl">
            <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">API Search</h2>
                <p className="text-sm text-stone-400">Query external TMDB/OMDB sources to discover and pull new movies into the prediction arena.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder="Enter movie title..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSearch();
                        }
                    }}
                    className="flex-1 bg-cinema-950 border border-cinema-800 focus:border-indigo-500 text-stone-100 px-4 py-3 rounded-xl outline-none transition-colors text-sm"
                />
                <button 
                    onClick={handleSearch}
                    className="bg-cinema-600 hover:bg-cinema-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-cinema-600/30"
                >
                    Search Movies
                </button>
            </div>

            {movieResults && movieResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
                    {movieResults.map((movie) => (
                        <MovieResult
                            key={movie.tmdbID}
                            title={movie.Title}
                            year={movie.Year}
                            poster={movie.poster}
                            id={movie.tmdbID}
                            onSelect={() => onMovieSelect(movie.tmdbID)}
                        />
                    ))}
                </div>
            )}
        </section> */}

      </main>

      {/* Footer */}
      {/* <footer className="border-t border-cinema-800 bg-cinema-950/50 py-6 px-6 text-center text-xs text-stone-400">
        <p>© 2026 BoxOfficeGuesser. Powered by official box office tracking data.</p>
      </footer> */}
    </div>
  );
}