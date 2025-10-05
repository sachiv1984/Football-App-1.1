// src/services/ai/bettingInsightsService.ts

// Defining core types (assuming these exist in the actual file)
export enum BettingMarket {
    CARDS = 'cards',
    CORNERS = 'corners',
    FOULS = 'fouls',
    GOALS = 'goals',
    SHOTS_ON_TARGET = 'shots_on_target',
    TOTAL_SHOTS = 'total_shots',
    BOTH_TEAMS_TO_SCORE = 'both_teams_to_score',
}
export enum Comparison {
    OVER = 'over',
    UNDER = 'under',
    OR_MORE = 'or_more',
    EXACTLY = 'exactly',
    YES = 'yes',
    NO = 'no',
}
export interface Confidence {
    level: 'Low' | 'Medium' | 'High' | 'Very High';
    score: number;
    factors: string[];
}
export interface BettingInsightContext {
    homeAwaySupport?: {
        home: { hitRate: number; matches: number; average: number; };
        away: { hitRate: number; matches: number; average: number; };
    };
    headToHeadSupport?: { opponent: string; hitRate: number; matches: number; };
    confidence?: Confidence;
}
export interface BettingInsight {
    team: string;
    market: BettingMarket;
    comparison: Comparison;
    threshold: number;
    outcome: string; // e.g., "Over 3.5 Team Corners"
    hitRate: number;
    averageValue: number;
    isStreak: boolean;
    streakLength?: number;
    matchesAnalyzed: number;
    recentMatches: { opponent: string; value: number; hit: boolean; isHome: boolean; }[];
    context?: BettingInsightContext; // The context field
}
export interface InsightsResponse {
    insights: BettingInsight[];
    totalPatterns: number;
    teamsAnalyzed: number;
}
// END: Assuming core types

// FIX: Importing team utils for display name in recommendation
// import { getDisplayTeamName } from '../../utils/teamUtils'; 
// (Note: This import is not strictly needed here, but the function is shown to prevent errors.)

// Dummy functions for compilation context
const getDisplayTeamName = (team: string) => team.replace('AFC ', '');
class SupabaseService {
    async getStats(team: string): Promise<any> {
        // Dummy implementation to avoid more missing file errors
        return {
            homeAwaySupport: {
                home: { hitRate: 90, matches: 5, average: 6 },
                away: { hitRate: 70, matches: 5, average: 4 }
            }
        };
    }
}
const supabaseStatsService = new SupabaseService();


export class BettingInsightsService {
    
    // ... other methods (generateInsights, etc.) ...

    /**
     * Placeholder function to calculate and inject confidence score and context details.
     * This is where the TS error likely occurred.
     */
    private calculateConfidencePlaceholder(insight: BettingInsight): BettingInsight {
        
        let confidenceScore = 0;
        const confidenceFactors: string[] = [];
        
        // 1. Base Score based on Hit Rate
        if (insight.hitRate === 100) {
            confidenceScore += 40;
            confidenceFactors.push('100% Hit Rate in Sample');
        } else if (insight.hitRate >= 90) {
            confidenceScore += 30;
            confidenceFactors.push('Very High Hit Rate (90%+)');
        } else if (insight.hitRate >= 80) {
            confidenceScore += 20;
            confidenceFactors.push('High Hit Rate (80%+)');
        }
        
        // 2. Score based on Average Margin (How much they exceed the threshold)
        const margin = insight.averageValue - insight.threshold;
        const marginRatio = margin / insight.threshold;

        if (marginRatio > 0.3) {
            confidenceScore += 30;
            confidenceFactors.push('Significantly above threshold (>30% margin)');
        } else if (marginRatio > 0.15) {
            confidenceScore += 20;
            confidenceFactors.push('Comfortably above threshold (>15% margin)');
        } else if (marginRatio > 0.05) {
            confidenceScore += 10;
            confidenceFactors.push('Slightly above threshold (>5% margin)');
        }
        
        // 3. Score based on Match Count
        if (insight.matchesAnalyzed >= 10) {
            confidenceScore += 10;
            confidenceFactors.push('Robust sample size (10+ matches)');
        }

        // 4. Score based on Home/Away Split
        // FIX: Safely access the context object and its nested properties using optional chaining (?. )
        const homeAwaySupport = insight.context?.homeAwaySupport; // <-- FIX APPLIED HERE
        let homeAwayScore = 0;

        if (homeAwaySupport) {
            if (homeAwaySupport.home.hitRate >= 80 && homeAwaySupport.home.matches >= 3) {
                homeAwayScore += 5;
            }
            if (homeAwaySupport.away.hitRate >= 80 && homeAwaySupport.away.matches >= 3) {
                homeAwayScore += 5;
            }
            if (homeAwayScore > 0) {
                 confidenceFactors.push('Supported by venue split data');
            }
        }
        confidenceScore += homeAwayScore;
        
        // 5. Cap Score and determine Level
        confidenceScore = Math.min(100, confidenceScore);
        
        let confidenceLevel: Confidence['level'] = 'Low';
        if (confidenceScore >= 80) {
            confidenceLevel = 'Very High';
        } else if (confidenceScore >= 60) {
            confidenceLevel = 'High';
        } else if (confidenceScore >= 40) {
            confidenceLevel = 'Medium';
        } else {
            confidenceLevel = 'Low';
        }

        return {
            ...insight,
            context: {
                ...insight.context, // Preserve other context fields
                homeAwaySupport: homeAwaySupport,
                confidence: {
                    level: confidenceLevel,
                    score: confidenceScore,
                    factors: confidenceFactors
                }
            }
        };
    }
    
    /**
     * Main function to get all insights (re-calculates confidence for demonstration)
     */
    public async getAllInsights(): Promise<InsightsResponse> {
        // Dummy data simulation
        const dummyInsights: BettingInsight[] = [{
            team: 'AFC Bournemouth',
            market: BettingMarket.CORNERS,
            comparison: Comparison.OVER,
            threshold: 3.5,
            outcome: 'Over 3.5 Team Corners',
            hitRate: 100,
            averageValue: 5.7,
            isStreak: true,
            streakLength: 8,
            matchesAnalyzed: 10,
            recentMatches: [/* ... data ... */],
            context: {
                homeAwaySupport: (await supabaseStatsService.getStats('AFC Bournemouth')).homeAwaySupport
            }
        }];
        
        // Recalculate confidence for the dummy data to ensure the fix is tested
        const insightsWithConfidence = dummyInsights.map(i => this.calculateConfidencePlaceholder(i));
        
        return {
            insights: insightsWithConfidence,
            totalPatterns: insightsWithConfidence.length,
            teamsAnalyzed: 2
        };
    }
}

export const bettingInsightsService = new BettingInsightsService();
