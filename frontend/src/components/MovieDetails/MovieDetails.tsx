import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMovieDetails, saveMovieDetails, getSavedMovies } from '../../services/api';

type MovieDetailsProps = {
    Title: string;
    Year: string;
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
}

type MovieRating = {
    Source: string;
    Value: string
}

const MovieDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<MovieDetailsProps | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const details = await getMovieDetails(id!);
        setMovie(details);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      }
    };

    fetchMovieDetails();
  }, [id]);

  const handleSaveMovie = async (movie: MovieDetailsProps) => {
    setIsSaving(true);
    try {
      const savedMovie = await saveMovieDetails(movie);
      console.log('Movie saved successfully:', savedMovie);
    } catch (error) {
      console.error('Error saving movie:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchSaved = async () => {
    try {
        const savedMovies = await getSavedMovies();
        console.log('Saved movies:', savedMovies);
      } catch (error) {
        console.error('Error fetching saved movies:', error);
      } finally {
        setIsSaving(false);
      }
  }

  if (!movie) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{movie.Title}</h1>
      <img src={movie.Poster} alt={`${movie.Title} Poster`} />
      <button
        onClick={() => handleSaveMovie(movie)}
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save To Database'}
      </button>
      <button
        onClick={() => handleFetchSaved()}
      >
        Fetch saved
      </button>
      <p><strong>Year:</strong> {movie.Year}</p>
      <p><strong>Genre:</strong> {movie.Genre}</p>
      <p><strong>Director:</strong> {movie.Director}</p>
      <p><strong>IMDb Rating:</strong> {movie.imdbRating}</p>
      <p><strong>Plot:</strong> {movie.Plot}</p>
      {movie.Ratings &&
        <p><strong>Rotten Tomatoes Score:</strong> {
            movie.Ratings.find(rating => rating.Source === "Rotten Tomatoes")?.Value || "N/A"
          }</p>
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
      <p><strong>All data:</strong> <span>{JSON.stringify(movie, null, 2)}</span></p>
    </div>
  );
};

export default MovieDetails;
