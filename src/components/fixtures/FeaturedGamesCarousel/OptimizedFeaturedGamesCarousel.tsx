import { useState, useRef, useEffect } from "react";
import { GameCard } from "./GameCard"; // Your card component
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickOff: string;
  venue: string;
  competition: { name: string; logo?: string };
}

interface CarouselProps {
  games: Game[];
  onGameSelect: (game: Game) => void;
}

export const FeaturedGamesCarousel = ({ games, onGameSelect }: CarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const prevSlide = () => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
    scrollToSlide(activeIndex - 1);
  };

  const nextSlide = () => {
    setActiveIndex((prev) => Math.min(prev + 1, games.length - 1));
    scrollToSlide(activeIndex + 1);
  };

  const scrollToSlide = (index: number) => {
    if (!trackRef.current) return;
    const slide = trackRef.current.children[index] as HTMLElement;
    slide?.scrollIntoView({ behavior: "smooth", inline: "start" });
  };

  // Keyboard navigation placeholder
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex]);

  return (
    <div className="relative w-full">
      {/* Carousel Track */}
      <div
        ref={trackRef}
        className="flex flex-row gap-4 md:gap-8 overflow-x-auto scroll-smooth scrollbar-hide"
      >
        {games.map((game, index) => (
          <div
            key={game.id}
            className={`
              flex-shrink-0 
              w-full max-w-[360px] md:w-[48%] md:max-w-[480px] lg:w-[32%] lg:max-w-[520px] 
              aspect-[4/3] p-6 md:p-8
              bg-white rounded-xl shadow-card hover:shadow-card-hover
              transition-transform duration-300 ease-in-out
              ${activeIndex === index ? "scale-105 shadow-card-active" : "opacity-90"}
              focus:ring-2 focus:ring-[#FFD700] outline-none
            `}
            role="button"
            aria-label={`View match between ${game.homeTeam} and ${game.awayTeam}`}
            tabIndex={0}
            onClick={() => onGameSelect(game)}
          >
            <GameCard game={game} />
          </div>
        ))}
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
        disabled={activeIndex === games.length - 1}
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
              activeIndex === index
                ? "w-6 bg-[#FFD700]"
                : "w-2 bg-[#D1D5DB]"
            }`}
            onClick={() => setActiveIndex(index)}
            aria-current={activeIndex === index ? "true" : undefined}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

