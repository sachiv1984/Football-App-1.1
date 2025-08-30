import React from "react";
import { useFeaturedGamesCarousel } from "../../../hooks/useFeaturedGamesCarousel";
import { Fixture } from "./FeaturedGamesCarousel.types";

interface Props {
  fixtures: Fixture[];
  rotateInterval?: number; // optional interval for auto-rotate
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  rotateInterval = 5000,
}) => {
  const {
    containerRef,
    slides,
    currentIndex,
    realCount,
    setCurrentIndex,
    scrollToIndex,
  } = useFeaturedGamesCarousel({ fixtures, rotateInterval });

  const handleDotClick = (index: number) => {
    scrollToIndex(index);
    setCurrentIndex(index);
  };

  return (
    <div className="carousel-wrapper">
      <div className="carousel-container" ref={containerRef}>
        {slides.map((fixture, i) => (
          <div
            key={i}
            className={`carousel-slide ${
              i === currentIndex ? "active" : ""
            }`}
          >
            {/* Render your fixture card */}
            <div>{fixture.homeTeam} vs {fixture.awayTeam}</div>
          </div>
        ))}
      </div>

      <div className="carousel-dots">
        {Array.from({ length: realCount }).map((_, i) => (
          <button
            key={i}
            className={`dot ${i === currentIndex ? "active" : ""}`}
            onClick={() => handleDotClick(i)}
          />
        ))}
      </div>
    </div>
  );
};
