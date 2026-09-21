import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMovieDetails, saveMovieDetails, updateMovieDetails, deleteMovie } from '../../services/movies.service';
import { useMovieStore } from '../../store/useMovieStore';
import { MovieData, SavedMovie } from '../../types';
import { generateAcronym } from '../../utils/acronym';
import styles from './MovieDetails.module.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeftLong, faCircleCheck, faPlus, faTrashCan, faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { library, IconProp } from '@fortawesome/fontawesome-svg-core';

library.add({ faLeftLong, faCircleCheck, faPlus, faTrashCan, faArrowsRotate });

// @ts-ignore
const leftIcon: IconProp = 'fa-solid fa-left-long';
// @ts-ignore
const checkIcon: IconProp = 'fa-solid fa-circle-check';
// @ts-ignore
const plusIcon: IconProp = 'fa-solid fa-plus';
// @ts-ignore
const trashIcon: IconProp = 'fa-solid fa-trash-can';
// @ts-ignore
const refreshIcon: IconProp = 'fa-solid fa-arrows-rotate';

const MovieDetailsAdmin = () => {
  const { id } = useParams<{ id: string }>();
  const { movies, addMovie, removeMovie } = useMovieStore();
  const [movie, setMovie] = useState<MovieData | SavedMovie | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingAcronym, setIsSavingAcronym] = useState(false);
  const [acronymDraft, setAcronymDraft] = useState('');

  const isInDatabase = useMemo(
    () => (id ? Boolean(movies[id]) : false),
    [id, movies]
  );

  useEffect(() => {
    if (!id) return;

    if (movies[id]) {
      setMovie(movies[id]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result: MovieData = await getMovieDetails(id);
        // Prefer DB copy if it landed while we were fetching.
        if (cancelled) return;
        const fromStore = useMovieStore.getState().movies[id];
        setMovie(fromStore ?? result);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, movies]);

  useEffect(() => {
    if (!movie) return;
    setAcronymDraft(
      movie.acronym?.trim() || generateAcronym(movie.title) || ''
    );
  }, [movie?.id, movie?.acronym, movie?.title]);

  const navigate = useNavigate();

  function goToAdmin() {
    navigate('/admin');
  }

  const fetchMovieDetails = async () => {
    try {
      const result: MovieData = await getMovieDetails(id!);
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
        removeMovie(String(movie.tmdbID));
      } else {
        const savedMovie: SavedMovie = (await saveMovieDetails(movie))?.movie;
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
      if (updatedMovieDetails) {
        const updatedSavedMovie = await updateMovieDetails(updatedMovieDetails);
        addMovie(updatedSavedMovie.movie);
        setMovie(updatedSavedMovie.movie);
      }
    } catch (error) {
      console.error('Error updating movie:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveAcronym = async () => {
    if (!movie?.tmdbID || !isInDatabase) return;
    setIsSavingAcronym(true);
    try {
      const next =
        acronymDraft.trim() || generateAcronym(movie.title) || movie.title;
      const result = await updateMovieDetails({
        tmdbID: movie.tmdbID,
        acronym: next,
      });
      const updated = result.movie ?? { ...movie, acronym: next };
      addMovie(updated);
      setMovie(updated);
    } catch (error) {
      console.error('Error saving acronym:', error);
    } finally {
      setIsSavingAcronym(false);
    }
  };

  if (!movie) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles['movie-details']}>
      <button className={styles['back-button']} onClick={goToAdmin}>
        <FontAwesomeIcon icon={leftIcon} size="xl" />
      </button>
      <h1>{movie.title}</h1>
      {isInDatabase ? (
        <div className={styles['db-indicator']}>
          <FontAwesomeIcon icon={checkIcon} size="lg" />
          <p>In database</p>
        </div>
      ) : (
        <p>Not in database</p>
      )}
      <img
        className={styles['poster']}
        src={`https://image.tmdb.org/t/p/original${movie.poster}`}
        alt={`${movie.title} Poster`}
      />

      <div className={styles['movie-btns']}>
        <button
          onClick={() => handleMovieExistence(movie)}
          disabled={isSaving}
          className={
            isSaving
              ? styles['disabled-btn']
              : isInDatabase
                ? styles['remove-btn']
                : styles['add-btn']
          }
        >
          {isSaving ? (
            isInDatabase ? (
              'Removing...'
            ) : (
              'Saving...'
            )
          ) : isInDatabase ? (
            <p>
              <FontAwesomeIcon icon={trashIcon} size="lg" />
              Remove from Database
            </p>
          ) : (
            <p>
              <FontAwesomeIcon icon={plusIcon} size="lg" />
              Add to Database
            </p>
          )}
        </button>
        {isInDatabase && (
          <button
            onClick={() => handleMovieUpdate()}
            disabled={isUpdating}
            className={
              isUpdating ? styles['disabled-btn'] : styles['update-btn']
            }
          >
            <p>
              <FontAwesomeIcon
                icon={refreshIcon}
                size="lg"
                spin={isUpdating}
              />
              {isUpdating ? 'Updating...' : 'Update Data'}
            </p>
          </button>
        )}
        {isInDatabase && id && (
          <button
            onClick={() => navigate(`/admin/movies/${id}/comps`)}
            className={styles['update-btn']}
          >
            <p>Manage comps</p>
          </button>
        )}
        {id && (
          <button
            onClick={() => navigate(`/movie/${id}`)}
            className={styles['update-btn']}
          >
            <p>Player view</p>
          </button>
        )}
      </div>
      <div className={styles['movie-data']}>
        {isInDatabase && (
          <div className={styles['acronym-row']}>
            <label htmlFor="movie-acronym">
              <strong>Acronym:</strong>
            </label>
            <input
              id="movie-acronym"
              type="text"
              value={acronymDraft}
              onChange={(e) => setAcronymDraft(e.target.value)}
              placeholder={generateAcronym(movie.title) || movie.title}
            />
            <button
              type="button"
              onClick={handleSaveAcronym}
              disabled={isSavingAcronym}
              className={
                isSavingAcronym ? styles['disabled-btn'] : styles['update-btn']
              }
            >
              {isSavingAcronym ? 'Saving...' : 'Save acronym'}
            </button>
            <button
              type="button"
              onClick={() =>
                setAcronymDraft(generateAcronym(movie.title) || movie.title)
              }
              className={styles['update-btn']}
            >
              Reset default
            </button>
          </div>
        )}
        <p>
          <strong>Year:</strong> {movie.year}
        </p>
        <p>
          <strong>Genre:</strong> {movie.genre}
        </p>
        <p>
          <strong>Director:</strong> {movie.director}
        </p>
        <p>
          <strong>Plot:</strong> {movie.plot}
        </p>
        {movie.imdbRating && (
          <p>
            <strong>IMDb Rating:</strong> {movie.imdbRating}
          </p>
        )}
        {movie.rottenTomatoesScore && (
          <p>
            <strong>Rotten Tomatoes Score:</strong> {movie.rottenTomatoesScore}
          </p>
        )}
        {movie.domesticGross && (
          <p>
            <strong>Domestic Gross:</strong> {movie.domesticGross}
          </p>
        )}
        {movie.internationalGross && (
          <p>
            <strong>International Gross:</strong> {movie.internationalGross}
          </p>
        )}
        {movie.worldwideGross && (
          <p>
            <strong>Worldwide Gross:</strong> {movie.worldwideGross}
          </p>
        )}
        {movie.domesticOpening && (
          <p>
            <strong>Domestic Opening:</strong> {movie.domesticOpening}
          </p>
        )}
        {movie.internationalOpening && (
          <p>
            <strong>International Opening:</strong> {movie.internationalOpening}
          </p>
        )}
        {movie.domesticOpening && movie.internationalOpening && (
          (() => {
            const domestic = Number(
              movie.domesticOpening.replace(/[^0-9.-]+/g, '')
            );
            const international = Number(
              movie.internationalOpening.replace(/[^0-9.-]+/g, '')
            );
            const worldwide = domestic + international;

            return (
              <p>
                <strong>Worldwide Opening:</strong> ${worldwide.toLocaleString()}
              </p>
            );
          })()
        )}
        {movie.budget && (
          <p>
            <strong>Budget:</strong> {movie.budget}
          </p>
        )}
        <p>
          <strong>All data:</strong>
        </p>
        <div className={styles['json-data']}>
          <pre>{JSON.stringify(movie, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsAdmin;
