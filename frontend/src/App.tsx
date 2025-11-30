import './App.css'
import { Routing } from "./Routing.tsx"
import { useEffect } from 'react';
import { getSavedMovies } from './services/api';
import { useMovieStore } from './store/useMovieStore';
import { useUserStore } from './store/useUserStore';

function App() {

  const { movies, setMovies } = useMovieStore();
  const loadUser = useUserStore((state) => state.loadUser);

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


  useEffect(() => {
    loadUser(); // automatically loads user from localStorage + decrypts access key
  }, [loadUser]);

  return (
    <Routing />
  )
}

export default App
