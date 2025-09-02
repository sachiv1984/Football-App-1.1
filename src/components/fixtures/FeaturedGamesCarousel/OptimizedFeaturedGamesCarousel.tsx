"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import type { FeaturedFixtureWithImportance } from "@/types";

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  rotateInterval?: number;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  rotateInterval = 6000,
  className,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;
  const totalFixtures = fixtures.length;

  // Navigate carousel
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalFixtures) % totalFixtures);
  }, [totalFixtures]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalFixtures);
  }, [totalFixtures]);

  // Auto-rotate on mobile
  useEffect(() => {
    if (window.innerWidth < 640 && totalFixtures > 1) {
      const interval = setInterval(goToNext, rotateInterval);
      return () => clearInterval(interval);
    }
  }, [goToNext, rotateInterval, totalFixtures]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goToNext();
    if (distance < -minSwipeDistance) goToPrevious();
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Display helpers
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "TBD";
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? "TBD"
      : date.toLocaleString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const getLogo = (team: any) =>
    team?.crest ||
    (team?.shortName ? `/team-logos/${team.shortName.replace(/\s+/g, "-").toLowerCase()}.png` : "/team-logos/default.png");

  return (
    <div
      className={`w-full bg-gradient-to-r from-purple-700 via-purple-600 to-purple-700 rounded-xl shadow-lg overflow-hidden relative ${className || ""}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-purple-900 bg-opacity-90">
        <div className="flex items-center space-x-2">
          <Star className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-bold text-white">Featured Matches</h2>
        </div>
      </div>

      <div className="relative h-[360px] sm:h-[400px]">
        {/* ✅ AnimatePresence fix: always returns valid JSX (null fallback) */}
        <AnimatePresence initial={false} custom={currentIndex}>
          {fixtures.length > 0 ? (
            <motion.div
              key={fixtures[currentIndex].id}
              className="absolute inset-0 flex items-center justify-center"
              custom={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              onClick={() => onGameSelect?.(fixtures[currentIndex])}
            >
              <div className="bg-white rounded-xl shadow-xl p-6 w-[95%] sm:w-[85%] max-w-2xl mx-auto">
                {(() => {
                  const fixture = fixtures[currentIndex];
                  if (!fixture) return null;
                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-xs sm:text-sm font-semibold text-purple-600 bg-white px-2 py-1 rounded-full">
                          Matchweek {fixture.matchWeek}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">{fixture.competition?.name}</div>
                      </div>

                      <div className="flex justify-around items-center">
                        <div className="flex flex-col items-center w-1/3">
                          <img src={getLogo(fixture.homeTeam)} alt={fixture.homeTeam?.name} className="w-16 h-16 object-contain" />
                          <span className="mt-2 text-center text-sm sm:text-base font-medium">{fixture.homeTeam?.shortName}</span>
                        </div>

                        <div className="flex flex-col items-center w-1/3">
                          <div className="text-lg sm:text-xl font-bold text-purple-700">vs</div>
                          <div className="mt-2 text-sm font-medium text-purple-600">{formatDate(fixture.dateTime)}</div>
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3 mr-1" />
                            {fixture.venue || "TBD"}
                          </div>
                        </div>

                        <div className="flex flex-col items-center w-1/3">
                          <img src={getLogo(fixture.awayTeam)} alt={fixture.awayTeam?.name} className="w-16 h-16 object-contain" />
                          <span className="mt-2 text-center text-sm sm:text-base font-medium">{fixture.awayTeam?.shortName}</span>
                        </div>
                      </div>

                      {fixture.tags && fixture.tags.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                          {fixture.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 border border-purple-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Arrows (desktop only) */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-2 sm:pl-4">
          <button
            onClick={goToPrevious}
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-purple-800 bg-opacity-60 text-white hover:bg-opacity-90 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-4">
          <button
            onClick={goToNext}
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-purple-800 bg-opacity-60 text-white hover:bg-opacity-90 transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center space-x-2 pb-4 mt-2">
        {fixtures.map((_, idx) => (
          <button
            key={idx}
            className={`w-2.5 h-2.5 rounded-full transition ${
              idx === currentIndex ? "bg-purple-600 w-6" : "bg-purple-300 hover:bg-purple-400"
            }`}
            onClick={() => setCurrentIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
