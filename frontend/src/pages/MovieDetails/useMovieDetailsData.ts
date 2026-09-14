import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getMovieDetails } from "../../services/movies.service";
import { getGuessFromId, getAllGuessesForMovie } from "../../services/guesses.service";
import { getCompGroups } from "../../services/categories.service";
import { useMovieStore } from "../../store/useMovieStore";
import { useGuessStore } from "../../store/useGuessStore";
import { useUserStore } from "../../store/useUserStore";
import { useSetInviterId } from "../../store/useInviteStore";
import { getPredictionAvailability } from "../../utils/predictionWindows";
import { MovieData, SavedMovie, Guess, CompGroup } from "../../types";

export function useMovieDetailsData() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const fromGuessId = searchParams.get("fromGuess");

  const { movies } = useMovieStore();
  const user = useUserStore((state) => state.user);
  const setInviterId = useSetInviterId();

  const [movie, setMovie] = useState<MovieData | SavedMovie | null>(null);
  const [inviterGuess, setInviterGuess] = useState<Guess | undefined>();
  const [allMovieGuesses, setAllMovieGuesses] = useState<Guess[]>([]);
  const [compGroups, setCompGroups] = useState<CompGroup[]>([]);

  const isInDatabase = useMemo(
    () => (id ? Boolean(movies[id]) : false),
    [id, movies]
  );

  const predictionAvailability = useMemo(() => {
    if (!movie) return null;
    return getPredictionAvailability(movie);
  }, [movie]);

  const movieId = movie?.id;
  const loggedGuess = useGuessStore((state) =>
    movieId && user && isInDatabase ? state.guesses[movieId] : undefined
  );

  useEffect(() => {
    if (!id || Object.keys(movies).length === 0) return;

    if (movies[id]) {
      setMovie(movies[id]);
    } else {
      fetchMovieDetails();
    }
  }, [id, movies]);

  useEffect(() => {
    if (movieId && isInDatabase) {
      loadAllMovieGuesses();
      loadCompGroups(movieId);
    } else {
      setCompGroups([]);
    }
  }, [movieId, isInDatabase]);

  useEffect(() => {
    if (fromGuessId) {
      loadInviterGuess();
    }
  }, [fromGuessId]);

  async function loadInviterGuess() {
    if (!fromGuessId) return;
    const result = await getGuessFromId(fromGuessId);
    setInviterGuess(result.data);
    if (result.data?.user_id) {
      setInviterId(result.data.user_id);
    }
  }

  async function loadAllMovieGuesses() {
    if (!movieId || !isInDatabase) return;
    const allGuesses = await getAllGuessesForMovie(movieId);
    setAllMovieGuesses(allGuesses.data ?? []);
  }

  async function loadCompGroups(subjectMovieId: string) {
    try {
      const groups = await getCompGroups(subjectMovieId);
      setCompGroups(groups);
    } catch (error) {
      console.error("Error fetching comp groups:", error);
      setCompGroups([]);
    }
  }

  async function fetchMovieDetails() {
    try {
      const result: MovieData = await getMovieDetails(id!);
      setMovie(result);
    } catch (error) {
      console.error("Error fetching movie details:", error);
    }
  }

  return {
    id,
    movie,
    user,
    isInDatabase,
    predictionAvailability,
    loggedGuess,
    inviterGuess,
    allMovieGuesses,
    compGroups,
    refreshGuesses: loadAllMovieGuesses,
  };
}
