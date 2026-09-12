import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";

import { useMovieDetailsData } from "./useMovieDetailsData";
import { usePageMode } from "../../hooks/usePageMode";
import MovieContextPanel from "../../components/MovieContextPanel/MovieContextPanel";
import { getMockComps, compsToMarkers } from "../../data/mockComps";
import PredictionControls from "../../components/PredictionControls/PredictionControls";
import LockedPredictionSummary from "../../components/LockedPredictionSummary/LockedPredictionSummary";
import GuessComparisonCards from "../../components/GuessComparisonCards/GuessComparisonCards";
import BoxOfficeJourneyChart from "../../components/BoxOfficeJourney/BoxOfficeJourneyChart";
import ShareLink from "../../components/ShareLink/ShareLink";
import CountdownStrip from "../../components/Countdown/CountdownStrip";
import TicketStub from "../../components/TicketStub/TicketStub";
import { getWeeklyGrossData } from "../../data/mockWeeklyGross";
import { parseMoney } from "../../utils/guessComparison";

function PosterBackground({
  src,
  className,
  fade = "page",
}: {
  src: string;
  className?: string;
  fade?: "page" | "left";
}) {
  return (
    <div className={`pointer-events-none ${className ?? ""}`} aria-hidden>
      <img
        src={src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-top"
      />
      {fade === "page" ? (
        <div className="absolute inset-0 bg-linear-to-b from-cinema-950/35 via-cinema-950/65 to-cinema-950/90" />
      ) : (
        <>
          <div className="absolute inset-0 bg-linear-to-b from-cinema-950/20 via-cinema-950/45 to-cinema-950/80" />
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-transparent to-cinema-950/85" />
        </>
      )}
    </div>
  );
}

export default function MovieDetails() {
  const navigate = useNavigate();
  const {
    id,
    movie,
    user,
    isInDatabase,
    predictionAvailability,
    loggedGuess,
    inviterGuess,
    allMovieGuesses,
  } = useMovieDetailsData();

  const [showingShareDialog, setShowingShareDialog] = useState(false);
  const [domesticOpeningSeed, setDomesticOpeningSeed] = useState<number | undefined>();

  const mode = usePageMode(movie, loggedGuess, isInDatabase);

  const compMarkers = useMemo(() => {
    if (!movie) return [];
    return compsToMarkers(getMockComps(movie.genre));
  }, [movie]);

  const hasOpeningData = movie?.domesticOpening
    ? parseMoney(movie.domesticOpening) != null
    : false;

  const weeklyData = getWeeklyGrossData(hasOpeningData || mode === "results");

  const inviterName = useMemo(() => {
    if (!inviterGuess) return undefined;
    if (user && inviterGuess.user_id === user.id) return undefined;
    return inviterGuess.guess_user?.name;
  }, [inviterGuess, user]);

  if (!movie || !predictionAvailability) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="animate-spin text-cinema-400" size={48} />
      </div>
    );
  }

  const posterUrl = `https://image.tmdb.org/t/p/original${movie.poster}`;
  const useTicketShell = mode !== "results";

  const releaseDate = movie.released
    ? new Date(movie.released).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "TBA";

  const titleBlock = (
    <TicketStub compact className="max-w-md">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="shrink-0 -ml-1 -mt-0.5 p-1 text-ticket-ink/80 hover:text-ticket-ink hover:bg-ticket-ink/10 transition-colors"
          aria-label="Back to lobby"
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ticket-ink/70">
            Box Office Arena
          </p>
          <h1 className="text-2xl md:text-4xl font-bold uppercase leading-none mt-1">
            {movie.title}
          </h1>
          <p className="text-xs uppercase tracking-wide mt-2 text-ticket-ink/80">
            {releaseDate}
          </p>
          <p className="text-xs uppercase tracking-wide mt-0.5 text-ticket-ink/80">
            {movie.genre}
          </p>
        </div>
      </div>
    </TicketStub>
  );

  const panelContent = (
    <>
      {mode === "predict" && movie.id && (
        <PredictionControls
          movieId={movie.id}
          availability={predictionAvailability}
          compMarkers={compMarkers}
          inviterName={inviterName}
          domesticOpeningSeed={domesticOpeningSeed}
        />
      )}

      {mode === "waiting" && loggedGuess && (
        <LockedPredictionSummary
          guess={loggedGuess}
          friendGuess={
            inviterGuess?.user_id !== loggedGuess.user_id
              ? inviterGuess
              : undefined
          }
          onShareClick={() => setShowingShareDialog(true)}
        />
      )}

      {mode === "results" && loggedGuess && (
        <div className="space-y-6">
          <GuessComparisonCards
            movie={movie}
            userGuess={loggedGuess}
            friendGuess={
              inviterGuess?.user_id !== loggedGuess.user_id
                ? inviterGuess
                : undefined
            }
            allMovieGuesses={allMovieGuesses}
          />
          <BoxOfficeJourneyChart
            weeklyData={weeklyData}
            userFinalDomesticPrediction={loggedGuess.final_domestic}
          />
        </div>
      )}

      {mode === "closed" && (
        <div className="min-h-50 flex flex-col items-center justify-center text-center gap-2 text-ticket-ink">
          <p className="font-bold uppercase tracking-wide text-lg">
            Predictions for this movie have closed.
          </p>
          <p className="text-sm text-ticket-ink/65 font-[Outfit,sans-serif]">
            Check back on another title in the lobby.
          </p>
        </div>
      )}

      {mode === "notInArena" && (
        <div className="min-h-50 flex flex-col items-center justify-center text-center gap-2 text-ticket-ink">
          <p className="font-bold uppercase tracking-wide text-lg">
            This movie is not in the Arena yet.
          </p>
          <p className="text-sm text-ticket-ink/65 font-[Outfit,sans-serif]">
            Browse upcoming titles from the lobby to make predictions.
          </p>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile: full page poster background */}
      <PosterBackground
        src={posterUrl}
        fade="page"
        className="fixed inset-0 z-0 lg:hidden"
      />

      {/* Desktop: entire left half of the viewport */}
      <PosterBackground
        src={posterUrl}
        fade="left"
        className="hidden lg:block fixed inset-y-0 left-0 z-0 w-1/2"
      />

      <div className="relative z-10 space-y-6 pt-5">
        {/* Mobile: title above the fold */}
        <div className="lg:hidden">{titleBlock}</div>

        {/* Countdown visible first on mobile */}
        <div className="lg:hidden">
          <CountdownStrip movie={movie} availability={predictionAvailability} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Right column first on mobile for controls */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-24 space-y-4">
            <div className="hidden lg:block">
              <CountdownStrip movie={movie} availability={predictionAvailability} />
            </div>
            {useTicketShell ? (
              <TicketStub
                footer={`${movie.title.toUpperCase()} · ADMIT ONE · BOX OFFICE ARENA`}
              >
                {panelContent}
              </TicketStub>
            ) : (
              <div className="rounded-2xl border border-theater-gold/20 bg-cinema-950/90 backdrop-blur-md p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
                {panelContent}
              </div>
            )}
          </div>

          <div className="order-2 lg:order-1 space-y-6">
            <div className="hidden lg:block">{titleBlock}</div>

            <MovieContextPanel
              movie={movie}
              allMovieGuesses={allMovieGuesses}
              onCompSelect={(value) => setDomesticOpeningSeed(value)}
            />
          </div>
        </div>

        {showingShareDialog && loggedGuess && id && (
          <ShareLink
            shareLink={`${window.location.origin}/movie/${id}?fromGuess=${loggedGuess.id}`}
            onClose={() => setShowingShareDialog(false)}
          />
        )}
      </div>
    </>
  );
}
