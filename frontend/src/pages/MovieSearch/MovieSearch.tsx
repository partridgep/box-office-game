import { useState } from 'react';
import { searchMovies } from '../../services/api';
import MovieResult from '../../components/MovieResult/MovieResult';
import { useNavigate } from 'react-router-dom';

type Movie = {
    Title: string;
    Year: string;
    Poster: string;
    imdbID: string;
  }

const MovieSearch = () => {
    const [search, setSearch] = useState<string>('');
    const [movieResults, setMovieResults] = useState<Movie[]>([]);

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

  return (
    <div>
        <input
            type="text"
            placeholder="Title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={handleSearch}>
            Search Movies
            </button>
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
    </div>
  );
};

export default MovieSearch;
