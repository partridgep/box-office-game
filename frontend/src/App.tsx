import './App.css'
import { Routing } from "./Routing.tsx"
import { useEffect } from 'react';
import { getSavedMovies } from './services/api';
import { getGuessesForUser } from './services/guesses.service';
import { useMovieStore } from './store/useMovieStore';
import { useUserStore } from './store/useUserStore';
import { useGuessStore } from './store/useGuessStore';

function App() {

  const setMovies = useMovieStore((state) => state.setMovies);

  const user = useUserStore((state) => state.user);
  const loadUser = useUserStore((state) => state.loadUser);

  const setGuesses = useGuessStore((state) => state.setGuesses);
  const applyRunPhasesFromGuesses = useMovieStore(
    (state) => state.applyRunPhasesFromGuesses
  );

  // load movies on initial mount
  useEffect(() => {
    const state = useMovieStore.getState();
    if (state.loaded) return;

    // HMR / remount with warm store — mark loaded without refetching.
    if (Object.keys(state.movies).length > 0) {
      setMovies(Object.values(state.movies));
      return;
    }

    const fetchSavedMovies = async () => {
        try {
            const savedResults = await getSavedMovies();
            console.log('Saved movies:', savedResults);
            setMovies(savedResults);
        } catch (error) {
            console.error('Error fetching saved movies:', error);
            // Mark loaded so lobby can show empty instead of spinning forever.
            setMovies([]);
        }
    };

    void fetchSavedMovies();
  }, [setMovies]); // run once (setMovies is stable)


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
          applyRunPhasesFromGuesses(response.data);
        } else {
          setGuesses([]);
        }
      } catch (err) {
        console.error("Error loading guesses:", err);
        setGuesses([]);
      }
    };

    fetchGuesses();
  }, [user, setGuesses, applyRunPhasesFromGuesses]);



  return (
    <Routing />
  )
}

export default App
