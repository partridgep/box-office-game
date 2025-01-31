import './App.css'
import { Routing } from "./Routing.tsx"
import { useEffect } from 'react';
import { getSavedMovies } from './services/api';
import { useMovieStore } from './store/useMovieStore';

function App() {

  const { movies, setMovies } = useMovieStore();

  useEffect(() => {
    const fetchSavedMovies = async () => {
        try {
            const savedResults = await getSavedMovies();
            console.log('Saved movies:', savedResults);
            setMovies(savedResults);
        } catch (error) {
            console.error('Error fetching saved movies:', error);
        }
    };

    if (Object.keys(movies).length === 0) fetchSavedMovies();
  }, []);

  return (
    <Routing />
  )
}

export default App
