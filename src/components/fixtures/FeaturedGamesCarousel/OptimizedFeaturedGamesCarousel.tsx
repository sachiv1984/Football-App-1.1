import { useState, useRef, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  competition?: { name: string; logo?: string };
  kickOff: string;
  venue: string;
}

interface CarouselProps {
  games: Game[];
  onGameSelect: (game: Game) => void;
}

export const FeaturedGamesCarousel = ({ games, onGameSelect }: CarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Responsive cards per view
  const [cardsPerView, setCardsPerView] = useState(1);
  useEffect(() => {
    const updateCards = () => {
      if (window.innerWidth < 640) setCardsPerView(1);
      else if (window.innerWidth < 1024) setCardsPerView(2);
      else setCardsPerView(3);
    };
    updateCards();
    window.addEventListener("resize", updateCards);
    return () => window.removeEventListener("resize", updateCards);
  }, []);

  // Scroll to slide
  const scrollToSlide = (index: number) => {
    if (!trackRef.current) return;
    const slide = trackRef.current.children[index] as HTMLElement;
    slide?.scrollIntoView({ behavior: "smooth", inline: "start" });
  };

  const prevSlide = () => {
    const newIndex = Math.max(activeIndex - 1, 0);
    setActiveIndex(newIndex);
    scrollToSlide(newIndex);
  };

  const nextSlide = () => {
    const newIndex = Math.min(activeIndex + 1, games.length - cardsPerView);
    setActiveIndex(newIndex);
    scrollToSlide(newIndex);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, cardsPerView]);

  return (
    <div className="relative w-full">
      {/* Carousel Track */}
      <div
        ref={trackRef}
        className="flex overflow-x-auto gap-4 md:gap-8 scroll-smooth scrollbar-hide"
      >
        {games.map((game, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={game.id}
              role="button"
              aria-label={`View match between ${game.homeTeam} and ${game.awayTeam}`}
              tabIndex={0}
              onClick={() => onGameSelect(game)}
              className={`
                flex-shrink-0
                w-full max-w-[360px] md:w-[48%] md:max-w-[480px] lg:w-[32%] lg:max-w-[520px]
                aspect-[4/3]
                p-6 md:p-8
                bg-white rounded-xl shadow-card hover:shadow-card-hover
                transition-transform duration-300 ease-in-out
                ${isActive ? "scale-105 shadow-card-active" : "opacity-90"}
                focus:ring-2 focus:ring-[#FFD700] outline-none
                flex flex-col justify-between
              `}
            >
              {/* Competition Header */}
              <div className="flex items-center mb-4 space-x-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow flex items-center justify-center">
                  {game.competition?.logo ? (
                    <img
                      src={game.competition.logo}
                      alt={game.competition.name}
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
                  {game.competition?.name || ""}
                </span>
              </div>

              {/* Teams & Kickoff */}
              <div className="flex items-center justify-between mb-4">
                {/* Home Team */}
                <div className="w-20 h-20 rounded-full bg-white shadow flex items-center justify-center">
                  {game.homeLogo ? (
                    <img
                      src={game.homeLogo}
                      alt={game.homeTeam}
                      className="w-16 h-16 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">
                      {game.homeTeam[0]}
                    </span>
                  )}
                </div>

                {/* Kickoff */}
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
                      {new Date(game.kickOff).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                </div>

                {/* Away Team */}
                <div className="w-20 h-20 rounded-full bg-white shadow flex items-center justify-center">
                  {game.awayLogo ? (
                    <img
                      src={game.awayLogo}
                      alt={game.awayTeam}
                      className="w-16 h-16 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">
                      {game.awayTeam[0]}
                    </span>
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
        className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-full flex items-center justify-center"
        onClick={prevSlide}
        disabled={activeIndex === 0}
        aria-label="Previous slide"
      >
        <ChevronLeftIcon className="w-6 h-6 stroke-current" />
      </button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-full flex items-center justify-center"
        onClick={nextSlide}
        disabled={activeIndex >= games.length - cardsPerView}
        aria-label="Next slide"
      >
        <ChevronRightIcon className="w-6 h-6 stroke-current" />
      </button>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {games.map((_, index) => (
          <button
            key={index}
            className={`h-2 rounded-full transition-all duration-200 ${
              activeIndex === index ? "w-6 bg-[#FFD700]" : "w-2 bg-[#D1D5DB]"
            }`}
            onClick={() => {
              setActiveIndex(index);
              scrollToSlide(index);
            }}
            aria-current={activeIndex === index ? "true" : undefined}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
