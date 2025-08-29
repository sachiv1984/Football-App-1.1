import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from './pages/HomePage'; // Adjust path as needed

describe('HomePage Render Test', () => {
  test('renders HomePage without errors', () => {
    render(<HomePage />);
    
    // Basic smoke test - check if key elements are present
    expect(screen.getByText('FootballStats')).toBeInTheDocument();
  });

  test('renders header navigation', () => {
    render(<HomePage />);
    
    // Check if main navigation items are present
    expect(screen.getByText('Fixtures')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Player Stats')).toBeInTheDocument();
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
  });

  test('renders main content sections', () => {
    render(<HomePage />);
    
    // Check if tab navigation renders
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    
    // Check if footer renders
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
