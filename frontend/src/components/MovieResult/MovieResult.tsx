import styles from './MovieResult.module.css';

type MovieResultProps = {
  title: string;
  year: string;
  poster: string;
  id: string;
  onSelect: () => void; // Callback for when the user selects this movie
}

const MovieResult = ({ title, year, poster, onSelect }: MovieResultProps) => {

  return (
    <div
      className={styles['movie-result']}
      onClick={onSelect}
    >
      <img src={poster} alt={`${title} Poster`} style={{ width: '100px', height: '150px' }} />
      <div>
        <h3>{title}</h3>
        <p>{year}</p>
      </div>
    </div>
  );
};

export default MovieResult;
