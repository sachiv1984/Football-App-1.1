// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useEffect, useState } from 'react';
import { FeaturedFixtureWithImportance } from '../../../types';

interface Props {
  onGameSelect: (fixture: FeaturedFixtureWithImportance) => void;
  rotateInterval?: number;
  className?: string;
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  onGameSelect,
  rotateInterval = 5000,
  className,
}) => {
  const [fixtures, setFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch('/api/featured-fixtures'); // replace with your API endpoint
        if (!res.ok) throw new Error(`API responded with status ${res.status}`);
        const data = await res.json();
        setFixtures(data);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) return <div>Loading featured games...</div>;

  if (error)
    return (
      <div className="p-4 bg-red-100 text-red-600 rounded">
        ❌ Error fetching games: {error}
      </div>
    );

  if (fixtures.length === 0)
    return <div className="p-4 bg-yellow-100 text-yellow-800 rounded">No featured games available</div>;

  return (
    <div className={className}>
      {/* Replace this with your actual carousel component or logic */}
      <div className="carousel">
        {fixtures.map((f) => (
          <div
            key={f.id}
            className="p-4 border rounded mb-2 cursor-pointer hover:bg-gray-100"
            onClick={() => onGameSelect(f)}
          >
            <div className="font-semibold">{f.homeTeam.name} vs {f.awayTeam.name}</div>
            <div className="text-sm text-gray-500">{new Date(f.dateTime).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
