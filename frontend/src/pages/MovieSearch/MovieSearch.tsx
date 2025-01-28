import { useState, useEffect } from 'react';
import { searchMovies, getSavedMovies } from '../../services/api';
import MovieResult from '../../components/MovieResult/MovieResult';
import MovieSelectBtn from '../../components/MovieSelectBtn/MovieSelectBtn';
import { useNavigate } from 'react-router-dom';
import styles from './MovieSearch.module.css';

type Movie = {
    Title: string;
    Year: string;
    Poster: string;
    imdbID: string;
  }

type MovieData = {
    actors: string,
    awards: string,
    budget: string,
    country: string,
    createdAt: string,
    director: string,
    domesticGross: string,
    domesticOpening: string,
    genre: string,
    id: string,
    imdbID: string,
    imdbRating: number,
    imdbVotes: number,
    internationalGross: string,
    language: string,
    metacriticRating: string,
    metascore: string,
    plot: string,
    poster: string
    production: string,
    rated: string,
    released: Date,
    rottenTomatoesScore: string,
    runtime: string,
    title: string,
    updatedAt: string,
    worldwideGross: string,
    writer: string,
    year: number,
  };

const MovieSearch = () => {
    const [search, setSearch] = useState<string>('');
    const [movieResults, setMovieResults] = useState<Movie[]>([]);
    const [savedMovies, setSavedMovies] = useState<MovieData[]>([]);

    useEffect(() => {
        const fetchSavedMovies = async () => {
            try {
            const savedResults = await getSavedMovies();
            console.log('Saved movies:', savedResults);
            setSavedMovies(savedResults);
            } catch (error) {
            console.error('Error fetching saved movies:', error);
            }
        };
    
        fetchSavedMovies();
      }, []);

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
        <h1>Box office game</h1>
        <h2>Movies saved to database</h2>
        {(savedMovies) && (
            <ul>
            {savedMovies.map(movie => (
                <li key={movie.imdbID}>
                    <MovieSelectBtn
                        movie={movie}
                        onSelect={() => onSavedMovieSelect(movie)}
                    />
                </li>
            ))}
        </ul>
        )}
        <hr/>
        <section className="api-search">
            <h2 className=''>API Search</h2>
            <div className={styles['search-inputs']}>
                <input
                    type="text"
                    placeholder="Title"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
