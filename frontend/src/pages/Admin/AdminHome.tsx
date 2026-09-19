import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { library, IconProp } from '@fortawesome/fontawesome-svg-core';
import { useAutoAnimate } from '@formkit/auto-animate/react';

import AdminMovieSearch from '../../components/AdminMovieSearch/AdminMovieSearch';
import MovieSelectBtn from '../../components/MovieSelectBtn/MovieSelectBtn';
import { getCategories } from '../../services/categories.service';
import { getSavedMovies, updateAllMovies } from '../../services/movies.service';
import { useMovieStore } from '../../store/useMovieStore';
import { Category, MovieData } from '../../types';

library.add({ faArrowsRotate });

// @ts-ignore
const refreshIcon: IconProp = 'fa-solid fa-arrows-rotate';

export default function AdminHome() {
  const navigate = useNavigate();
  const { movies, setMovies } = useMovieStore();
  const [parent] = useAutoAnimate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const savedMovies = useMemo(() => {
    return Object.values(movies).sort((a, b) => {
      const aTime = a.released ? new Date(a.released).getTime() : 0;
      const bTime = b.released ? new Date(b.released).getTime() : 0;
      return aTime - bTime;
    });
  }, [movies]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        setCategoriesError(
          err instanceof Error ? err.message : 'Failed to load categories'
        );
      }
    }
    loadCategories();
  }, []);

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

  const onSavedMovieSelect = (movie: MovieData) => {
    navigate(`/admin/movie/${movie.tmdbID}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 text-left">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-sm text-stone-400 mt-1">
            Manage movies and categories.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-stone-400 hover:text-white transition-colors"
        >
          Back to lobby
        </button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
            Categories
          </h2>
          <Link
            to="/admin/categories"
            className="text-xs rounded-lg bg-cinema-700 hover:bg-cinema-600 px-3 py-1.5 text-white"
          >
            Manage all
          </Link>
        </div>
        {categoriesError && (
          <p className="text-sm text-rose-300">{categoriesError}</p>
        )}
        {categories.length === 0 && !categoriesError ? (
          <p className="text-sm text-stone-500">No categories yet.</p>
        ) : (
          <ul className="space-y-2">
            {categories.slice(0, 6).map((category) => (
              <li
                key={category.id}
                className="rounded-xl border border-cinema-800 bg-cinema-900/50 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <Link
                    to={`/admin/categories/${category.id}`}
                    className="font-semibold text-white hover:text-rose-400 transition-colors"
                  >
                    {category.lobby_label || category.comp_label || category.slug}
                  </Link>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {category.membershipCount ?? 0} movies
                    {!category.is_active && ' · inactive'}
                    {category.display_in_lobby === false && ' · hidden from lobby'}
                  </p>
                </div>
                <Link
                  to={`/admin/categories/${category.id}`}
                  className="text-xs text-stone-400 hover:text-white shrink-0"
                >
                  Edit →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
            Movies in database ({savedMovies.length})
          </h2>
          <button
            type="button"
            onClick={handleUpdateAllMovies}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 rounded-xl bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 w-fit"
          >
            <FontAwesomeIcon icon={refreshIcon} size="sm" spin={isUpdating} />
            {isUpdating ? 'Updating...' : 'Update all data'}
          </button>
        </div>
        <ul ref={parent} className="flex flex-wrap gap-4">
          {savedMovies.map((movie) => (
            <li key={movie.imdbID || movie.tmdbID} className="list-none">
              <MovieSelectBtn
                movie={movie}
                onSelect={() => onSavedMovieSelect(movie)}
              />
            </li>
          ))}
        </ul>
        {savedMovies.length === 0 && (
          <p className="text-sm text-stone-500">No movies saved yet.</p>
        )}
      </section>

      <section className="rounded-2xl border border-cinema-800 bg-cinema-900/60 p-5">
        <AdminMovieSearch
          onSelect={(tmdbID) => navigate(`/admin/movie/${tmdbID}`)}
        />
      </section>
    </div>
  );
}
