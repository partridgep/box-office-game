import styles from './MovieSelectBtn.module.css';

import { MovieData } from '../../types'

type MovieSelectBtnProps = {
  movie: MovieData,
  onSelect: () => void; // Callback for when the user selects this movie
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
