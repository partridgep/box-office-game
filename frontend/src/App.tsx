import './App.css'
import { Routing } from "./Routing.tsx"
import { useEffect } from 'react';
import { getSavedMovies } from './services/api';
import { getGuessesForUser } from './services/guesses.service';
import { useMovieStore } from './store/useMovieStore';
import { useUserStore } from './store/useUserStore';
import { useGuessStore } from './store/useGuessStore';

function App() {

  const { movies, setMovies } = useMovieStore();

  const user = useUserStore((state) => state.user);
  const loadUser = useUserStore((state) => state.loadUser);

  const setGuesses = useGuessStore((state) => state.setGuesses);

  // load movies on initial mount
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
  }, []); // run once


  // automatically loads user from localStorage + decrypts access key
  useEffect(() => {
    loadUser(); 
  }, [loadUser]);

  // load guesses once the user is available
  useEffect(() => {
    console.log("user: ", user)
    if (!user) return; // user is not loaded or no user

    const fetchGuesses = async () => {
      try {
        const response = await getGuessesForUser(user.id);
        console.log("Loaded guesses:", response);
        if (response.status === 200) {
          setGuesses(response.data);
        }
      } catch (err) {
        console.error("Error loading guesses:", err);
      }
    };

    fetchGuesses();
  }, [user, setGuesses]);



  return (
    <Routing />
  )
}

export default App
