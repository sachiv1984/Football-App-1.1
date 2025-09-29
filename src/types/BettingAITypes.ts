// ====================================================================
// CORE SHARED TYPES FOR ALL BETTING AI SERVICES (Goals, Corners, Cards)
// ====================================================================

/**
 * The standard structure for the final output of any AI Service.
 * This contract is used by the Conflict Resolver and the UI/API layer.
 */
export interface AIInsight {
  id: string;
  title: string;
  description: string;
  market?: string;
  confidence: 'high' | 'medium' | 'low';
  odds?: string; // Formatted as a string for display (e.g., "2.05")
  supportingData?: string;
  source?: string; // e.g., 'GoalsAI', 'CornersAI'
  aiEnhanced?: boolean;

  // Crucial fields for sorting and conflict resolution
  valueScore?: number; // The Calculated Expected Value (EV) or similar metric (The higher, the better)
  conflictScore?: number; // Used internally by conflictResolverService
}

/**
 * A standardized interface for any statistical analysis outcome
 * based on a specific threshold (e.g., Over 2.5, Under 9.5).
 */
export interface ThresholdAnalysis {
  threshold: number;
  percentage: number; // Historical success rate (0-100)
  consistency: number; // Recent form consistency (0-1)
  confidence: 'high' | 'medium' | 'low';
  recentForm: boolean[]; // Last 5 matches - did they hit this threshold?
  betType: 'over' | 'under';

  // Value calculated using the Centralized StatisticalAIGenerator
  value: number;
  odds?: number; // The specific odds used for the value calculation (raw number)
}

/**
 * The output structure when an Optimal Threshold is selected from
 * a list of ThresholdAnalysis options.
 */
export interface OptimalThreshold<T extends ThresholdAnalysis> {
  analysis: T;
  reasoning: string;
  alternativeConsidered: T[];
}

/**
 * Standardized interface used for passing cross-market conflict information
 * between services (e.g., GoalsAI informing CornersAI).
 */
export interface ConflictFlag {
    betLine: number; // e.g., 2.5 (for goals)
    betType: 'over' | 'under';
    confidence: 'high' | 'medium' | 'low';
}

// ====================================================================
// DOMAIN-SPECIFIC EXTENSIONS
// (Used within the GoalsAIService, CardsAIService, etc., for clarity)
// ====================================================================

export interface GoalThresholdAnalysis extends ThresholdAnalysis {}
export interface CornerThresholdAnalysis extends ThresholdAnalysis {}
export interface CardThresholdAnalysis extends ThresholdAnalysis {}


// ====================================================================
// API RESPONSE TYPES (Used by oddsAPIService, but consumed by AI services)
// ====================================================================

/**
 * Standardized structure for raw odds data retrieved from the API.
 */
export interface MatchOdds {
  matchId: string;
  lastFetched: number;

  // Goals
  totalGoalsOdds?: { market: string; overOdds: number; underOdds: number; };
  bttsOdds?: { market: string; yesOdds: number; noOdds: number; };

  // Cards
  totalCardsOdds?: { market: string; overOdds: number; underOdds: number; };
  homeCardsOdds?: { market: string; overOdds: number; underOdds: number; };
  awayCardsOdds?: { market: string; overOdds: number; underOdds: number; };
  mostCardsOdds?: { market: string; homeOdds: number; awayOdds: number; drawOdds: number; };

  // Corners
  totalCornersOdds?: { market: string; overOdds: number; underOdds: number; };
  homeCornersOdds?: { market: string; overOdds: number; underOdds: number; };
  awayCornersOdds?: { market: string; overOdds: number; underOdds: number; };
  mostCornersOdds?: { market: string; homeOdds: number; awayOdds: number; drawOdds: number; };
}
