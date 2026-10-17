import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getMovieDetails, getMovieBoxOffice } from "../../services/movies.service";
import { getGuessFromId, getAllGuessesForMovie } from "../../services/guesses.service";
import { getCompGroups } from "../../services/categories.service";
import { useMovieStore } from "../../store/useMovieStore";
import { useGuessStore } from "../../store/useGuessStore";
import { useUserStore } from "../../store/useUserStore";
import { useSetInviterId } from "../../store/useInviteStore";
import { useFriendsStore } from "../../store/useFriendsStore";
import { getPredictionAvailability } from "../../utils/predictionWindows";
import { MovieData, SavedMovie, Guess, CompGroup, BoxOfficeHistory } from "../../types";

const EMPTY_BOX_OFFICE: BoxOfficeHistory = { weekly: [], weekend: [] };

export function useMovieDetailsData() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const fromGuessId = searchParams.get("fromGuess");

  const { movies } = useMovieStore();
  const user = useUserStore((state) => state.user);
  const setInviterId = useSetInviterId();
  const friendsVersion = useFriendsStore((state) => state.version);

  const [movie, setMovie] = useState<MovieData | SavedMovie | null>(null);
  const [inviterGuess, setInviterGuess] = useState<Guess | undefined>();
  const [allMovieGuesses, setAllMovieGuesses] = useState<Guess[]>([]);
  const [compGroups, setCompGroups] = useState<CompGroup[]>([]);
  const [boxOffice, setBoxOffice] = useState<BoxOfficeHistory>(EMPTY_BOX_OFFICE);

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
      loadCompGroups(movieId);
      loadBoxOffice(movieId);
    } else {
      setCompGroups([]);
      setBoxOffice(EMPTY_BOX_OFFICE);
    }
  }, [movieId, isInDatabase]);

  // Refetch on login/logout and follow/unfollow: which guesses are friends' (and named) depends on the viewer.
  useEffect(() => {
    if (movieId && isInDatabase) {
      loadAllMovieGuesses();
    }
  }, [movieId, isInDatabase, user?.id, friendsVersion]);

  // The server can only flag the viewer's guess when their JWT is still valid; the stored guess id always can.
  const markedGuesses = useMemo(
    () =>
      loggedGuess
        ? allMovieGuesses.map((g) =>
            g.id === loggedGuess.id ? { ...g, ...loggedGuess, is_viewer: true, is_friend: false } : g
          )
        : allMovieGuesses,
    [allMovieGuesses, loggedGuess]
  );

  // The inviter counts as a friend even for a logged-out visitor; their shared guess carries the name.
  const friendGuesses = useMemo(
    () =>
      markedGuesses.flatMap((g) => {
        if (g.is_viewer) return [];
        if (inviterGuess && g.id === inviterGuess.id) return [{ ...g, ...inviterGuess }];
        return g.is_friend ? [g] : [];
      }),
    [markedGuesses, inviterGuess]
  );

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
    try {
      const allGuesses = await getAllGuessesForMovie(movieId);
      setAllMovieGuesses(allGuesses.data ?? []);
    } catch (error) {
      console.error("Error fetching movie guesses:", error);
      setAllMovieGuesses([]);
    }
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

  async function loadBoxOffice(subjectMovieId: string) {
    try {
      setBoxOffice(await getMovieBoxOffice(subjectMovieId));
    } catch (error) {
      console.error("Error fetching box office history:", error);
      setBoxOffice(EMPTY_BOX_OFFICE);
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
    allMovieGuesses: markedGuesses,
    friendGuesses,
    compGroups,
    boxOffice,
    refreshGuesses: loadAllMovieGuesses,
  };
}
