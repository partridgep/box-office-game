import { Guess } from '../../types';
import styles from './MoviePredictions.module.css';

interface MoviePredictionsProps {
  guess: Guess;
}

export default function MoviePredictions({ guess }: MoviePredictionsProps) {
    return (
        <div className={styles['movie-predictions']}>
            {guess.domestic_opening &&
                <p><strong>Domestic Opening:</strong> {guess.domestic_opening}M</p>
            }
            {guess.international_opening &&
                <p><strong>International Opening:</strong> {guess.international_opening}M</p>
            }
            {(guess.domestic_opening && guess.international_opening) &&
                <p><strong>Worlwide Opening:</strong> {Number(guess.domestic_opening) + Number(guess.international_opening)}M</p>
            }
            {guess.final_domestic &&
                <p><strong>Domestic Gross:</strong> {guess.final_domestic}M</p>
            }
            {guess.final_international &&
                <p><strong>International Gross:</strong> {guess.final_international}M</p>
            }
            {(guess.final_domestic && guess.final_international) &&
                <p><strong>Worlwide Gross:</strong> {Number(guess.final_domestic) + Number(guess.final_international)}M</p>
            }
            {guess.rotten_tomatoes_score &&
            <p><strong>Rotten Tomatoes Score:</strong> {guess.rotten_tomatoes_score}%</p>
            }
        </div>
    )
}