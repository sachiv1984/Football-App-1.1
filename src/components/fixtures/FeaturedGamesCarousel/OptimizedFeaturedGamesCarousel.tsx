import { useState, useRef, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  competitionLogo?: string;
  kickoff: string;
  venue: string;
}

interface FeaturedGamesCarouselProps {
  games?: Game[];
  onGameSelect: (game: Game) => void;
  isLoading?: boolean;
}

export default function OptimizedFeaturedGamesCarousel({
  games = [],
  onGameSelect,
  isLoading = false,
}: FeaturedGamesCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Responsive cards per view
  useEffect(() => {
    const updateCardsPerView = () => {
      if (window.innerWidth < 640) setCardsPerView(1);
      else if (window.innerWidth < 1024) setCardsPerView(2);
      else setCardsPerView(3);
    };
    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  // Reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Slide navigation
  const prevSlide = () => setActiveIndex((prev) => Math.max(prev - 1, 0));
  const nextSlide = () =>
    setActiveIndex((prev) => Math.min(prev + 1, games.length - cardsPerView));

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") prevSlide();
    if (e.key === "ArrowRight") nextSlide();
  };

  // Swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    if (touchStartX.current - touchEndX.current > 50) nextSlide();
    else if (touchEndX.current - touchStartX.current > 50) prevSlide();
  };

  const cardWidth = `${100 / cardsPerView}%`;

  // Skeleton loader
  if (isLoading) {
    return (
      <div className="flex gap-4 sm:gap-8">
        {[...Array(cardsPerView)].map((_, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 bg-gray-200 animate-pulse rounded-xl w-full aspect-[4/3] p-6 sm:p-8"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (games.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="mb-4">Check back later for featured games</p>
        <button className="px-4 py-2 bg-yellow-400 text-white rounded hover:bg-yellow-500">
          View All Fixtures
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Featured games carousel"
    >
      {/* Carousel Track */}
      <div
        ref={containerRef}
        className="flex overflow-hidden gap-4 sm:gap-8"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {games.map((game, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={game.id}
              role="button"
              aria-label={`View match between ${game.homeTeam} and ${game.awayTeam}`}
              aria-live={isActive ? "polite" : undefined}
              onClick={() => onGameSelect(game)}
              className={`
                flex-shrink-0
                bg-white
                rounded-xl
                shadow-card
                hover:shadow-card-hover
                ${reduceMotion ? "" : "transition-transform duration-300"}
                ${isActive ? "scale-105 shadow-card-hover" : "opacity-90"}
                p-6 sm:p-8
              `}
              style={{ width: cardWidth, aspectRatio: "4/3" }}
            >
              {/* Competition Header */}
              <div className="flex items-center mb-4 space-x-3">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow flex items-center justify-center transform ${
                    reduceMotion ? "" : "transition-transform duration-300"
                  } ${isActive ? "scale-100" : "scale-90"}`}
                >
                  {game.competitionLogo ? (
                    <img
                      src={game.competitionLogo}
                      alt="Competition logo"
                      className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">
                      {game.homeTeam[0] || "?"}
                    </span>
                  )}
                </div>
                <span className="text-gray-500 text-sm sm:text-base">
                  {game.competitionLogo ? "" : game.homeTeam}
                </span>
              </div>

              {/* Team Logos & Kickoff */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-20 h-20 rounded-full bg-white shadow flex items-center justify-center">
                  {game.homeLogo ? (
                    <img
                      src={game.homeLogo}
                      alt={game.homeTeam}
                      className="w-16 h-16 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">{game.homeTeam[0]}</span>
                  )}
                </div>

                <div className="flex flex-col items-center text-gray-700 text-base sm:text-lg">
                  <span className="flex items-center space-x-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 sm:h-4 sm:w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      {new Date(game.kickoff).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </div>

                <div className="w-20 h-20 rounded-full bg-white shadow flex items-center justify-center">
                  {game.awayLogo ? (
                    <img
                      src={game.awayLogo}
                      alt={game.awayTeam}
                      className="w-16 h-16 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">{game.awayTeam[0]}</span>
                  )}
                </div>
              </div>

              {/* Venue */}
              <div className="text-gray-500 text-sm sm:text-base truncate" title={game.venue}>
                {game.venue}
              </div>
            </div>
          );
        })}
      </div>

      {/* Left/Right Arrows */}
      <button
        onClick={prevSlide}
        disabled={activeIndex === 0}
        className={`
          absolute left-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center
          bg-white rounded-full shadow hover:bg-gray-100 transition-opacity
          ${activeIndex === 0 ? "opacity-50 cursor-not-allowed" : "opacity-100"}
        `}
        aria-label="Previous slide"
      >
        <ChevronLeftIcon className="w-6 h-6 stroke-current" />
      </button>

      <button
        onClick={nextSlide}
        disabled={activeIndex >= games.length - cardsPerView}
        className={`
          absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center
          bg-white rounded-full shadow hover:bg-gray-100 transition-opacity
          ${activeIndex >= games.length - cardsPerView ? "opacity-50 cursor-not-allowed" : "opacity-100"}
        `}
        aria-label="Next slide"
      >
        <ChevronRightIcon className="w-6 h-6 stroke-current" />
      </button>

      {/* Pagination Dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {games.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`transition-all duration-200 rounded-full ${
              idx === activeIndex ? "w-6 bg-[#FFD700]" : "w-2 bg-[#D1D5DB]"
            }`}
            aria-current={idx === activeIndex ? "true" : undefined}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
