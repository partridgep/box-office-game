import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { getMovieDetails, saveMovieDetails, deleteMovie } from '../../services/api';
import { useMovieStore } from '../../store/useMovieStore';
import { MovieData } from '../../types';
import { useNavigate } from 'react-router-dom';
import styles from './MovieDetails.module.css';

// import ReactDOM from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLeftLong, faCircleCheck, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import { library, IconProp } from '@fortawesome/fontawesome-svg-core'

library.add({ faLeftLong, faCircleCheck, faPlus, faTrashCan })

 // @ts-ignore
const leftIcon : IconProp = "fa-solid fa-left-long"
 // @ts-ignore
const checkIcon : IconProp = "fa-solid fa-circle-check"
 // @ts-ignore
const plusIcon : IconProp = "fa-solid fa-plus"
 // @ts-ignore
const trashIcon : IconProp = "fa-solid fa-trash-can"

type MovieJSON = {
    Title: string;
    Year: string;
    imdbID: string;
    Poster: string;
    Plot: string;
    Genre: string;
    Director: string;
    imdbRating: string;
    Ratings: MovieRating[];
    domesticGross: string;
    internationalGross: string;
    worldwideGross: string;
    domesticOpening: string;
    budget: string;
    Rated: string;
    Released: string;
    Runtime: string;
    Writer: string;
    Actors: string;
    Language: string;
    Country: string;
    Awards: string;
    Metascore: string;
    imdbVotes: string;
    Production: string;
}

type MovieRating = {
    Source: string;
    Value: string
}

const MovieDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { movies, addMovie, removeMovie } = useMovieStore();
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [movieJSON, setMovieJSON] = useState<MovieJSON | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isInDatabase = useMemo(() => (
    id ? Boolean(movies[id]) : false)
  ,[id, movies]);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const result: MovieJSON = await getMovieDetails(id!);
        setMovieJSON(result);
        console.log(result)

        const movieDetails = {
          imdbID: result.imdbID,
          title: result.Title,
          year: parseInt(result.Year),
          plot: result.Plot,
          poster: result.Poster,
          domesticGross: result.domesticGross,
          internationalGross: result.internationalGross,
          worldwideGross: result.worldwideGross,
          domesticOpening: result.domesticOpening,
          budget: result.budget,
          rated: result.Rated,
          released: new Date(result.Released),
          runtime: result.Runtime,
          genre: result.Genre,
          director: result.Director,
          writer: result.Writer,
          actors: result.Actors,
          language: result.Language,
          country: result.Country,
          awards: result.Awards !== 'N/A' ? result.Awards : null,
          metascore: result.Metascore !== 'N/A' ? result.Metascore : null,
          imdbRating: result.imdbRating !== 'N/A' ? parseFloat(result.imdbRating) : null,
          imdbVotes: result.imdbVotes !== 'N/A' ? parseInt(result.imdbVotes.replace(/,/g, ''), 10) : null,
          production: result.Production !== 'N/A' ? result.Production : null,
          rottenTomatoesScore: result.Ratings.find(rating => rating.Source === "Rotten Tomatoes")?.Value,
          metacriticRating: result.Ratings.find(rating => rating.Source === "Metacritic")?.Value,
        };

        console.log("movie details", movieDetails)

        setMovie(movieDetails);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      }
    };

    if (id && movies[id]) {
      console.log(movies[id]);
      setMovie(movies[id]);
    }
    else fetchMovieDetails();

  }, [id]);

  const navigate = useNavigate();

  function goToHomepage() {
    navigate(`/`);
  }

  const handleMovieExistence = async (movie: MovieData) => {
    setIsSaving(true);
    try {
        if (isInDatabase) {
            await deleteMovie(movie.imdbID);
            removeMovie(movie.imdbID);
        } else {
            console.log("movie to save", movie);
            const savedMovie = await saveMovieDetails(movie);
            console.log(savedMovie);
            addMovie(savedMovie.movie);
        }
    } catch (error) {
        console.error('Error updating movie:', error);
    } finally {
        setIsSaving(false); // Avoids repeating this in both try blocks
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
      <button
        onClick={() => handleMovieExistence(movie)}
        disabled={isSaving}
        className={isSaving
          ? styles['btn-disabled']
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
