import React from 'react';
import { OptimizedFeaturedGamesCarousel } from './components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel';
import { ErrorBoundary, CarouselErrorBoundary } from './components/ErrorBoundary';
// Import other components as needed

function App() {
  const handleGameSelect = (fixture: any) => {
    console.log('Selected fixture:', fixture);
    // Handle game selection logic here
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Football Fixtures</h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Featured Games Carousel with its own error boundary */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Featured Games</h2>
            <CarouselErrorBoundary>
              <OptimizedFeaturedGamesCarousel
                onGameSelect={handleGameSelect}
                autoRotate={true}
                rotateInterval={5000}
                className="w-full"
              />
            </CarouselErrorBoundary>
          </section>

          {/* Other sections can go here */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">All Fixtures</h2>
            <ErrorBoundary
              fallback={
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <div className="text-red-500 mb-2">⚠️</div>
                  <p className="text-gray-600">Unable to load fixtures list</p>
                </div>
              }
            >
              {/* Your other fixture components would go here */}
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-center">Fixtures list component will go here</p>
              </div>
            </ErrorBoundary>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
