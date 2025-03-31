import { useState, useEffect } from 'react';
import { searchMovies } from '../../services/movies.service';
import MovieResult from '../../components/MovieResult/MovieResult';
import MovieSelectBtn from '../../components/MovieSelectBtn/MovieSelectBtn';
import { useNavigate } from 'react-router-dom';
import styles from './MovieSearch.module.css';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useMovieStore } from '../../store/useMovieStore';

import { MovieData } from '../../types';

type Movie = {
    Title: string;
    Year: string;
    Poster: string;
    imdbID: string;
  }

const MovieSearch = () => {
    const [search, setSearch] = useState<string>('');
    const [movieResults, setMovieResults] = useState<Movie[]>([]);
    const [savedMovies, setSavedMovies] = useState<MovieData[]>([]);
    const { movies } = useMovieStore();
    const [parent] = useAutoAnimate()

      useEffect(() => {
        setSavedMovies(Object.values(movies)); // Convert object to array and update state
      }, [movies]); // Runs when `movies` changes

    const handleSearch = async () => {
        try {
            const result = await searchMovies(search);
            setMovieResults(result);
        } catch (error) {
            console.error(error);
        }
    };

    const navigate = useNavigate();

    const onMovieSelect = (imdbID: string) => {
        console.log('Selected Movie ID:', imdbID);
        navigate(`/movie/${imdbID}`);
    };

    const onSavedMovieSelect = (movie: MovieData) => {
        console.log('Saved movie:', movie);
        navigate(`/movie/${movie.imdbID}`);
    };

  return (
    <div className={styles['movie-search']}>
        <h1>Box office predictions</h1>
        <h2>Movies saved to database</h2>
          <ul ref={parent}>
            {savedMovies.map(movie => (
                <li key={movie.imdbID}>
                    <MovieSelectBtn
                        movie={movie}
                        onSelect={() => onSavedMovieSelect(movie)}
                    />
                </li>
            ))}
        </ul>
        <hr/>
        <section className="api-search">
            <h2 className=''>API Search</h2>
            <div className={styles['search-inputs']}>
                <input
                    type="text"
                    placeholder="Title"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSearch();
                        }
                    }}
                    onBlur={handleSearch}
                />
                <button onClick={handleSearch}>
                    Search Movies
                </button>
            </div>
            {movieResults &&
                movieResults.map(movie => (
                <MovieResult
                    key={movie.imdbID}
                    title={movie.Title}
                    year={movie.Year}
                    poster={movie.Poster}
                    id={movie.imdbID}
                    onSelect={() => onMovieSelect(movie.imdbID)}
                />
                ))
            }
        </section>
    </div>
  );
};

export default MovieSearch;
