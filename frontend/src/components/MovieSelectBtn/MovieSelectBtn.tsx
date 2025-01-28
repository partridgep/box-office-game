import styles from './MovieSelectBtn.module.css';

type MovieSelectBtnProps = {
  movie: MovieData,
  onSelect: () => void; // Callback for when the user selects this movie
};

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

const MovieResult = ({
  movie,
  onSelect,
}: MovieSelectBtnProps) => {

  return (
    <div
      className={styles['movie-btn']}
      onClick={onSelect}
    >
      <img src={movie.poster} alt={`${movie.title} Poster`} style={{ width: '100px', height: '150px' }} />
      <div>
        <h3>{movie.title}</h3>
        <p>{new Date(movie.released).toDateString()}</p>
      </div>
    </div>
  );
};

export default MovieResult;
