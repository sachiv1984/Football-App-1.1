// src/hooks/useNavigation.ts
import { useNavigate } from 'react-router-dom';
import { navigateToStats } from '../utils/navigation';
import type { Fixture } from '../types';

/**
 * Custom hook for fixture navigation
 */
export const useFixtureNavigation = () => {
  const navigate = useNavigate();

  const goToStats = (fixture: Fixture) => {
    navigateToStats(fixture, navigate);
  };

  const goBack = () => {
    navigate(-1);
  };

  const goHome = () => {
    navigate('/');
  };

  return {
    goToStats,
    goBack,
    goHome
  };
};
