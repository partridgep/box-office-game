import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMovieDetails } from '../../services/api';

type MovieDetailsProps = {
    Title: string;
    Year: string;
    Poster: string;
    Plot: string;
    Genre: string;
    Director: string;
    imdbRating: string;
    Ratings: MovieRating[];
    boxOffice: BoxOffice;
}

type MovieRating = {
    Source: string;
    Value: string
}

type BoxOffice = {
    domesticGross: string,
    internationalGross: string,
    worldwideGross: string,
    domesticOpening: string,
    budget: string
}

const MovieDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [movie, setMovie] = useState<MovieDetailsProps | null>(null);

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

  if (!movie) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{movie.Title}</h1>
      <img src={movie.Poster} alt={`${movie.Title} Poster`} />
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
      {movie.boxOffice.domesticGross &&
        <p><strong>Domestic Gross:</strong> {movie.boxOffice.domesticGross}</p>
      }
      {movie.boxOffice.internationalGross &&
        <p><strong>Domestic Gross:</strong> {movie.boxOffice.internationalGross}</p>
      }
      {movie.boxOffice.worldwideGross &&
        <p><strong>Domestic Gross:</strong> {movie.boxOffice.worldwideGross}</p>
      }
      {movie.boxOffice.domesticOpening &&
        <p><strong>Domestic Gross:</strong> {movie.boxOffice.domesticOpening}</p>
      }
      {movie.boxOffice.budget &&
        <p><strong>Domestic Gross:</strong> {movie.boxOffice.budget}</p>
      }
    </div>
  );
};

export default MovieDetails;
