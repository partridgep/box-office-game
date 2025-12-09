import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import GuessForm from "../MovieGuessForm/MovieGuessForm";
import { getMovieDetails, saveMovieDetails, updateMovieDetails, deleteMovie } from '../../services/movies.service';
import { useMovieStore } from '../../store/useMovieStore';
import { useGuessStore } from '../../store/useGuessStore';
import { useUserStore } from '../../store/useUserStore';
import { MovieData, SavedMovie } from '../../types';
import { useNavigate } from 'react-router-dom';
import styles from './MovieDetails.module.css';

// import ReactDOM from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeftLong, faCircleCheck, faPlus, faTrashCan, faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { library, IconProp } from '@fortawesome/fontawesome-svg-core';

library.add({ faLeftLong, faCircleCheck, faPlus, faTrashCan, faArrowsRotate });

 // @ts-ignore
const leftIcon : IconProp = "fa-solid fa-left-long"
 // @ts-ignore
const checkIcon : IconProp = "fa-solid fa-circle-check"
 // @ts-ignore
const plusIcon : IconProp = "fa-solid fa-plus"
 // @ts-ignore
const trashIcon : IconProp = "fa-solid fa-trash-can"
 // @ts-ignore
const refreshIcon : IconProp = "fa-solid fa-arrows-rotate"

const MovieDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { movies, addMovie, removeMovie } = useMovieStore();
  const user = useUserStore((state) => state.user);
  const [movie, setMovie] = useState<MovieData | SavedMovie | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isInDatabase = useMemo(() => (
    id ? Boolean(movies[id]) : false)
  ,[id, movies]);

  const movieId = movie?.id;
  const loggedGuess = useGuessStore((state) =>
    movieId && user && isInDatabase ? state.guesses[movieId] : undefined
  );

  useEffect(() => {
    if (!id || Object.keys(movies).length === 0) return; // Wait for `movies` to load

    if (movies[id]) {
        console.log("movie already in database", movies[id]);
        setMovie(movies[id]);
    } else {
        fetchMovieDetails();
    }
}, [id, movies]);

  const navigate = useNavigate();

  function goToHomepage() {
    navigate(`/`);
  }

  const fetchMovieDetails = async () => {
    try {
      const result: MovieData = await getMovieDetails(id!);
      console.log("movie details", result)
      setMovie(result);
      return result;
    } catch (error) {
      console.error('Error fetching movie details:', error);
    }
  };

  const handleMovieExistence = async (movie: MovieData) => {
    setIsSaving(true);
    try {
        if (isInDatabase) {
            await deleteMovie(movie.imdbID);
            removeMovie(movie.imdbID);
        } else {
            console.log("movie to save", movie);
            const savedMovie: SavedMovie = (await saveMovieDetails(movie))?.movie;
            console.log(savedMovie);
            addMovie(savedMovie);
            setMovie(savedMovie);
        }
    } catch (error) {
        console.error('Error updating movie:', error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleMovieUpdate = async () => {
    setIsUpdating(true);
    try {
      const updatedMovieDetails = await fetchMovieDetails();
      console.log("updated movie", updatedMovieDetails);
      if (updatedMovieDetails) {
        const updatedSavedMovie = await updateMovieDetails(updatedMovieDetails);
        console.log(updatedSavedMovie)
        addMovie(updatedSavedMovie.movie);
        setMovie(updatedSavedMovie.movie)
      }
    } catch (error) {
        console.error('Error updating movie:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!movie) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles['movie-details']}>
      <button className={styles['back-button']} onClick={goToHomepage}>
        <FontAwesomeIcon icon={leftIcon} size="xl" />
      </button>
      <h1>{movie.title}</h1>
      { isInDatabase ?
        <div className={styles['db-indicator']}> 
          <FontAwesomeIcon icon={checkIcon} size="lg"/>
          <p>In database</p>
        </div>
        : 
        <p>Not in database</p>
      }
      <img className={styles['poster']} src={movie.poster} alt={`${movie.title} Poster`} />

      { loggedGuess && isInDatabase && movie && movie.id && user &&
        <div className={styles['movie-data']}>
          <p><strong>Your predictions:</strong></p>
          <div className={styles['json-data']}><pre>{JSON.stringify(loggedGuess, null, 2)}</pre></div>
        </div>
      }

      { isInDatabase && movie && movie.id && !loggedGuess &&
        <GuessForm movieId={movie.id} />
      }

      <div className={styles['movie-btns']}>
        <button
          onClick={() => handleMovieExistence(movie)}
          disabled={isSaving}
          className={isSaving
            ? styles['disabled-btn']
            : (isInDatabase ? styles['remove-btn'] : styles['add-btn'] )
          }
        >
          {isSaving
            ? (isInDatabase ? 'Removing...' : 'Saving...')
            : (isInDatabase
              ?
                <p>
                <FontAwesomeIcon icon={trashIcon} size="lg"/>
                Remove from Database
                </p>
              : 
              <p>
                <FontAwesomeIcon icon={plusIcon} size="lg"/>
                Add to Database
              </p>
            )
          }
        </button>
        { isInDatabase && 
          <button
            onClick={() => handleMovieUpdate()}
            disabled={isUpdating}
            className={isUpdating
              ? styles['disabled-btn']
              : styles['update-btn']
            }
          >
            <p>
              <FontAwesomeIcon icon={refreshIcon} size="lg" spin={isUpdating}/>
              {isUpdating ? 'Updating...' : 'Update Data'}
            </p>
          </button>
        }
      </div>
      <div className={styles['movie-data']}>
        <p><strong>Year:</strong> {movie.year}</p>
        <p><strong>Genre:</strong> {movie.genre}</p>
        <p><strong>Director:</strong> {movie.director}</p>
        <p><strong>Plot:</strong> {movie.plot}</p>
        {movie.imdbRating &&
          <p><strong>IMDb Rating:</strong> {movie.imdbRating}</p>
        }
        {movie.rottenTomatoesScore &&
          <p><strong>Rotten Tomatoes Score:</strong> {movie.rottenTomatoesScore}</p>
        }
        {movie.domesticGross &&
          <p><strong>Domestic Gross:</strong> {movie.domesticGross}</p>
        }
        {movie.internationalGross &&
          <p><strong>International Gross:</strong> {movie.internationalGross}</p>
        }
        {movie.worldwideGross &&
          <p><strong>Worlwide Gross:</strong> {movie.worldwideGross}</p>
        }
        {movie.domesticOpening &&
          <p><strong>Domestic Opening:</strong> {movie.domesticOpening}</p>
        }
        {movie.budget &&
          <p><strong>Budget:</strong> {movie.budget}</p>
        }
        <p><strong>All data:</strong></p>
        <div className={styles['json-data']}><pre>{JSON.stringify(movie, null, 2)}</pre></div>
      </div>
    </div>
  );
};

export default MovieDetails;
