import { useState } from 'react';
import { searchMovies } from '../../services/movies.service';
import MovieResult from '../MovieResult/MovieResult';

type SearchResult = {
  Title: string;
  Year: string;
  Poster: string;
  tmdbID: string;
};

type AdminMovieSearchProps = {
  onSelect: (tmdbID: string, result: SearchResult) => void | Promise<void>;
  title?: string;
  defaultYear?: string | number;
  selectingId?: string | null;
};

export default function AdminMovieSearch({
  onSelect,
  title = 'API Search',
  defaultYear = new Date().getFullYear(),
  selectingId = null,
}: AdminMovieSearchProps) {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(String(defaultYear ?? ''));
  const [movieResults, setMovieResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const result = await searchMovies(search.trim(), year.trim() || undefined);
      setMovieResults(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setMovieResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="space-y-3 text-left">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
        {title}
      </h2>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          className="flex-1 rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-cinema-500"
        />
        <input
          type="number"
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          className="w-full sm:w-28 rounded-xl bg-cinema-950 border border-cinema-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-cinema-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !search.trim()}
          className="rounded-xl bg-cinema-600 hover:bg-cinema-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 shrink-0"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-rose-300">{error}</p>
      )}
      <div className="space-y-1">
        {movieResults.map((movie) => (
          <div
            key={movie.tmdbID}
            className={selectingId === String(movie.tmdbID) ? 'opacity-60 pointer-events-none' : ''}
          >
            <MovieResult
              title={movie.Title}
              year={movie.Year}
              poster={movie.Poster}
              id={String(movie.tmdbID)}
              onSelect={() => onSelect(String(movie.tmdbID), movie)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
