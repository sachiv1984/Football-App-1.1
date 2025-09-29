// src/services/ai/conflictResolverService.ts

// Local type definition (Ensuring valueScore and conflictScore are known)
interface AIInsight {
  id: string;
  title: string;
  description: string;
  market?: string;
  confidence: 'high' | 'medium' | 'low';
  odds?: string;
  supportingData?: string;
  source?: string;
  aiEnhanced?: boolean;
  conflictScore?: number; // Added for conflict resolution
  valueScore?: number; // Added for value ranking
}

interface ConflictRule {
  id: string;
  name: string;
  detect: (insights: AIInsight[]) => AIInsight[][];
  resolve: (conflictingInsights: AIInsight[]) => AIInsight | null;
  priority: number; // Higher = more important to resolve
}

interface ConflictResolution {
  conflictId: string;
  conflictType: string;
  conflictingInsights: AIInsight[];
  resolvedInsight: AIInsight | null;
  reasoning: string;
  action: 'keep_best' | 'merge' | 'remove_all' | 'conditional_keep';
}

export class ConflictResolverService {
  private readonly conflictRules: ConflictRule[] = [];

  constructor() {
    this.initializeConflictRules();
  }

  /**
   * Initialize all conflict detection and resolution rules
   */
  private initializeConflictRules(): void {
    // Rule 1: Direct Over/Under Conflicts (same threshold)
    this.conflictRules.push({
      id: 'direct-over-under',
      name: 'Direct Over/Under Conflict',
      priority: 10,
      detect: (insights) => this.detectDirectOverUnderConflicts(insights),
      resolve: (conflicting) => this.resolveDirectOverUnderConflict(conflicting)
    });

    // Rule 2: Logical BTTS Conflicts (Not strictly for Cards, but kept for completeness)
    this.conflictRules.push({
      id: 'btts-team-goals',
      name: 'BTTS vs Team Goals Conflict',
      priority: 9,
      detect: (insights) => this.detectBTTSTeamGoalsConflicts(insights),
      resolve: (conflicting) => this.resolveBTTSTeamGoalsConflict(conflicting)
    });

    // Rule 3: Overlapping/Contradictory Threshold Conflicts (CRITICAL for corners/goals/cards)
    this.conflictRules.push({
      id: 'overlapping-thresholds',
      name: 'Overlapping/Contradictory Threshold Conflict',
      priority: 8,
      detect: (insights) => this.detectOverlappingThresholds(insights),
      resolve: (conflicting) => this.resolveOverlappingThresholds(conflicting)
    });

    // Rule 4: Team Goals vs Total Goals Conflicts (Kept for completeness)
    this.conflictRules.push({
      id: 'team-total-goals',
      name: 'Team Goals vs Total Goals Conflict',
      priority: 7,
      detect: (insights) => this.detectTeamTotalGoalsConflicts(insights),
      resolve: (conflicting) => this.resolveTeamTotalGoalsConflict(conflicting)
    });

    // Rule 5: Redundant Similar Bets
    this.conflictRules.push({
      id: 'redundant-similar',
      name: 'Redundant Similar Bets',
      priority: 6,
      detect: (insights) => this.detectRedundantSimilarBets(insights),
      resolve: (conflicting) => this.resolveRedundantSimilarBets(conflicting)
    });
    
    // 🏆 Rule 6: Most Cards vs. Team Card Threshold Conflict (NEW for Cards logic)
    this.conflictRules.push({
      id: 'most-cards-threshold',
      name: 'Most Cards vs Team Card Threshold Conflict',
      priority: 5,
      detect: (insights) => this.detectMostCardsThresholdConflicts(insights),
      resolve: (conflicting) => this.resolveMostCardsThresholdConflict(conflicting)
    });
  }

  /**
   * Main method: Resolve all conflicts in insights
   */
  public resolveConflicts(insights: AIInsight[]): {
    resolvedInsights: AIInsight[];
    resolutions: ConflictResolution[];
    summary: string;
  } {
    console.log(`[ConflictResolver] 🔍 Analyzing ${insights.length} insights for conflicts...`);
    
    let workingInsights = [...insights];
    const resolutions: ConflictResolution[] = [];

    // Apply each conflict rule in priority order
    for (const rule of this.conflictRules.sort((a, b) => b.priority - a.priority)) {
      const conflicts = rule.detect(workingInsights);
      
      if (conflicts.length > 0) {
        console.log(`[ConflictResolver] ⚠️ Found ${conflicts.length} ${rule.name} conflicts`);
        
        // Use a set to track IDs that have already been processed in a group
        const processedIds = new Set<string>();
        
        for (const conflictGroup of conflicts) {
            // Only process if the group hasn't been handled by a previous conflict check
            if (conflictGroup.every(i => !processedIds.has(i.id))) {
                const resolution = this.applyConflictRule(rule, conflictGroup);
                resolutions.push(resolution);
                
                // Update working insights based on resolution
                workingInsights = this.applyResolution(workingInsights, resolution);
                
                // Mark all conflicting insights as processed
                conflictGroup.forEach(i => processedIds.add(i.id));
            }
        }
      }
    }

    const summary = this.generateResolutionSummary(insights.length, workingInsights.length, resolutions);
    
    console.log(`[ConflictResolver] ✅ Conflict resolution complete: ${insights.length} → ${workingInsights.length} insights`);
    
    return {
      resolvedInsights: workingInsights,
      resolutions,
      summary
    };
  }

  /**
   * Apply a specific conflict rule to a group of conflicting insights
   */
  private applyConflictRule(rule: ConflictRule, conflictingInsights: AIInsight[]): ConflictResolution {
    const resolvedInsight = rule.resolve(conflictingInsights);
    
    let action: ConflictResolution['action'] = 'keep_best';
    let reasoning = '';

    if (resolvedInsight) {
      // Check if the resolved insight is one of the originals or a new merged one
      const isOriginal = conflictingInsights.some(i => i.id === resolvedInsight.id);
      
      if (isOriginal) {
        action = 'keep_best';
        reasoning = `Kept highest confidence insight: ${resolvedInsight.title}`;
      } else {
        action = 'merge';
        reasoning = `Merged/Created optimal insight: ${resolvedInsight.title}`;
      }
    } else {
      action = 'remove_all';
      reasoning = `Removed all conflicting insights due to irreconcilable differences or severe contradiction`;
    }

    return {
      conflictId: `${rule.id}-${Date.now()}`,
      conflictType: rule.name,
      conflictingInsights,
      resolvedInsight,
      reasoning,
      action
    };
  }

  /**
   * Apply resolution to the working insights list
   */
  private applyResolution(insights: AIInsight[], resolution: ConflictResolution): AIInsight[] {
    // Filter out all conflicting insights
    let result = insights.filter(insight => 
      !resolution.conflictingInsights.some(conflicting => conflicting.id === insight.id)
    );

    // Add the resolved insight (if one exists)
    if (resolution.resolvedInsight) {
      // Ensure the resolved insight is not already in the list (e.g., if it was an original kept one)
      if (!result.some(i => i.id === resolution.resolvedInsight!.id)) {
          result.push(resolution.resolvedInsight);
      }
    }

    return result;
  }

  /**
   * CONFLICT DETECTION METHODS
   */

  /**
   * Detect direct over/under conflicts (same threshold, opposite bet types)
   */
  private detectDirectOverUnderConflicts(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    
    for (let i = 0; i < insights.length; i++) {
      for (let j = i + 1; j < insights.length; j++) {
        const insight1 = insights[i];
        const insight2 = insights[j];
        
        if (this.isDirectOverUnderConflict(insight1, insight2)) {
          conflicts.push([insight1, insight2]);
        }
      }
    }
    
    return conflicts;
  }

  private isDirectOverUnderConflict(insight1: AIInsight, insight2: AIInsight): boolean {
    const market1 = insight1.market?.toLowerCase() || '';
    const market2 = insight2.market?.toLowerCase() || '';
    
    const threshold1 = this.extractThreshold(market1);
    const threshold2 = this.extractThreshold(market2);
    
    if (threshold1 === null || threshold2 === null || threshold1 !== threshold2) {
      return false;
    }
    
    const baseMarket1 = market1.replace(/(over|under)\s+[\d.]+/g, '').trim();
    const baseMarket2 = market2.replace(/(over|under)\s+[\d.]+/g, '').trim();
    
    if (baseMarket1 !== baseMarket2) {
      return false;
    }
    
    const isOver1 = market1.includes('over');
    const isOver2 = market2.includes('over');
    
    return isOver1 !== isOver2; // One is over, one is under
  }

  /**
   * Detect BTTS vs Team Goals conflicts (General logic, kept)
   */
  private detectBTTSTeamGoalsConflicts(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    const bttsInsights = insights.filter(i => i.market?.toLowerCase().includes('both teams to score'));
    const teamGoalInsights = insights.filter(i => 
      i.market?.toLowerCase().includes('team goals') && i.market?.toLowerCase().includes('under 0.5')
    );
    
    for (const btts of bttsInsights) {
      for (const teamGoal of teamGoalInsights) {
        if (btts.market?.toLowerCase().includes('yes') && teamGoal.market?.toLowerCase().includes('under 0.5')) {
          conflicts.push([btts, teamGoal]);
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Detect overlapping threshold conflicts
   */
  private detectOverlappingThresholds(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    
    const marketGroups = this.groupInsightsByBaseMarket(insights);
    
    for (const [baseMarket, groupInsights] of marketGroups) {
      
      const overBets = groupInsights.filter(i => i.market?.toLowerCase().includes('over'));
      const underBets = groupInsights.filter(i => i.market?.toLowerCase().includes('under'));

      // 1. Check for Severe Contradictions (e.g., Over 10.5 and Under 9.5)
      for (const over of overBets) {
        const overThreshold = this.extractThreshold(over.market || '');
        if (!overThreshold) continue;

        for (const under of underBets) {
          const underThreshold = this.extractThreshold(under.market || '');
          if (!underThreshold) continue;
          
          // Severe conflict if: Over X AND Under Y where X >= Y 
          if (overThreshold >= underThreshold) {
            conflicts.push([over, under]);
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Detect team goals vs total goals conflicts (General logic, kept)
   */
  private detectTeamTotalGoalsConflicts(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    
    const totalGoalsInsights = insights.filter(i => i.market?.toLowerCase().includes('total goals'));
    const teamGoalsInsights = insights.filter(i => i.market?.toLowerCase().includes('team goals'));
    
    for (const total of totalGoalsInsights) {
      for (const team of teamGoalsInsights) {
        if (this.isTeamTotalGoalConflict(total, team)) {
          conflicts.push([total, team]);
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Detect redundant similar bets (handles threshold and general redundancy)
   */
  private detectRedundantSimilarBets(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    const marketGroups = this.groupInsightsByBaseMarket(insights);
    
    const uniqueConflicts: AIInsight[][] = [];
    const conflictSet = new Set<string>();

    for (const [baseMarket, groupInsights] of marketGroups) {
      if (groupInsights.length < 2) continue;

      // 1. Check for **Threshold Redundancy** within the same base market
      if (baseMarket.includes('over') || baseMarket.includes('under')) {
        const overBets = groupInsights.filter(i => i.market?.toLowerCase().includes('over'));
        const underBets = groupInsights.filter(i => i.market?.toLowerCase().includes('under'));

        // Redundancy exists among multiple 'Over' bets for the same base market
        if (overBets.length > 1) {
            conflicts.push([...overBets]); 
        }
        // Redundancy exists among multiple 'Under' bets for the same base market
        if (underBets.length > 1) {
            conflicts.push([...underBets]); 
        }
      } 
      
      // 2. Check for **Other Market Redundancy** (General similarity check)
      else {
          const processedIndices = new Set<number>();
          
          for (let i = 0; i < groupInsights.length; i++) {
              if (processedIndices.has(i)) continue;
              
              const similar: AIInsight[] = [groupInsights[i]];
              
              for (let j = i + 1; j < groupInsights.length; j++) {
                  // Use the general similarity check for non-threshold markets
                  if (this.areSimilarBets(groupInsights[i], groupInsights[j])) {
                      similar.push(groupInsights[j]);
                      processedIndices.add(j);
                  }
              }
              
              if (similar.length > 1) {
                  conflicts.push(similar);
                  similar.forEach(s => processedIndices.add(groupInsights.indexOf(s)));
              }
          }
      }
    }
    
    // De-duplicate conflicts
    for (const conflictGroup of conflicts) {
        const sortedIds = conflictGroup.map(i => i.id).sort().join('-');
        if (!conflictSet.has(sortedIds)) {
            conflictSet.add(sortedIds);
            uniqueConflicts.push(conflictGroup);
        }
    }

    return uniqueConflicts;
  }

  /**
   * 🏆 NEW: Detect logical conflicts between Most Cards and specific Team Card Over/Under bets.
   * Conflict Example: Most Cards - Away (Away team gets more cards) AND Home Team Cards Over 4.5
   * (If the Home team gets 5 cards, it's highly unlikely the Away team gets *more* cards than that).
   */
  private detectMostCardsThresholdConflicts(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    
    const mostCards = insights.filter(i => i.market?.toLowerCase().includes('most cards'));
    const teamCards = insights.filter(i => i.market?.toLowerCase().includes('team cards'));

    const HOME_REGEX = /(home|team a)/i;
    const AWAY_REGEX = /(away|team b)/i;

    for (const most of mostCards) {
      const mostMarket = most.market?.toLowerCase() || '';
      
      const mostIsHome = mostMarket.includes('home');
      const mostIsAway = mostMarket.includes('away');
      
      if (!mostIsHome && !mostIsAway) continue; // Ignore 'Draw' for this rule

      for (const team of teamCards) {
        const teamMarket = team.market?.toLowerCase() || '';
        const teamThreshold = this.extractThreshold(teamMarket);

        if (!teamThreshold || teamThreshold < 3.5) continue; // Only relevant for higher thresholds (e.g., 3.5+)

        const teamIsOver = teamMarket.includes('over');
        
        // Logical Conflict:
        // Case 1: Most Cards is AWAY, but Home Team Cards OVER a high threshold (e.g., 4.5)
        const isConflict1 = mostIsAway && teamIsOver && HOME_REGEX.test(teamMarket) && teamThreshold >= 4.5;

        // Case 2: Most Cards is HOME, but Away Team Cards OVER a high threshold (e.g., 4.5)
        const isConflict2 = mostIsHome && teamIsOver && AWAY_REGEX.test(teamMarket) && teamThreshold >= 4.5;
        
        if (isConflict1 || isConflict2) {
          conflicts.push([most, team]);
        }
      }
    }
    
    return conflicts;
  }

  /**
   * CONFLICT RESOLUTION METHODS
   */

  /**
   * Resolve direct over/under conflict by keeping the highest value bet
   */
  private resolveDirectOverUnderConflict(conflicting: AIInsight[]): AIInsight | null {
    if (conflicting.length !== 2) return null;
    
    const [insight1, insight2] = conflicting;
    const value1 = insight1.valueScore || 0;
    const value2 = insight2.valueScore || 0;
    const confidence1 = this.getConfidenceScore(insight1.confidence);
    const confidence2 = this.getConfidenceScore(insight2.confidence);
    
    // Prioritize value score, then confidence
    if (value1 === value2) {
        return confidence1 > confidence2 ? insight1 : insight2;
    }
    
    const winner = value1 > value2 ? insight1 : insight2;
    return {
      ...winner,
      description: `${winner.description} [Chosen over conflicting ${winner === insight1 ? insight2.title : insight1.title}]`,
      conflictScore: 1
    };
  }

  /**
   * Resolve BTTS vs Team Goals conflict (General logic, kept)
   */
  private resolveBTTSTeamGoalsConflict(conflicting: AIInsight[]): AIInsight | null {
    const btts = conflicting.find(i => i.market?.toLowerCase().includes('both teams to score'));
    const teamGoal = conflicting.find(i => i.market?.toLowerCase().includes('team goals'));
    
    if (!btts || !teamGoal) return null;
    
    const bttsValue = btts.valueScore || 0;
    const teamValue = teamGoal.valueScore || 0;
    
    const winner = bttsValue >= teamValue ? btts : teamGoal;
    
    return {
      ...winner,
      description: `${winner.description} [Chosen due to stronger value in logical conflict]`,
      conflictScore: 1
    };
  }

  /**
   * Resolve overlapping thresholds by keeping the most optimal one
   */
  private resolveOverlappingThresholds(conflicting: AIInsight[]): AIInsight | null {
    if (conflicting.length === 0) return null;
    
    const getScore = (insight: AIInsight) => this.getConfidenceScore(insight.confidence);

    // 1. Check for Severe Contradiction 
    const severeContradictions = conflicting.filter(i => {
        const otherInsights = conflicting.filter(o => o.id !== i.id);
        const isOver = i.market?.toLowerCase().includes('over');
        const threshold = this.extractThreshold(i.market || '');
        
        return otherInsights.some(other => {
            const otherIsUnder = other.market?.toLowerCase().includes('under');
            const otherIsOver = other.market?.toLowerCase().includes('over');
            const otherThreshold = this.extractThreshold(other.market || '');

            if (!threshold || !otherThreshold) return false;

            return (isOver && otherIsUnder && threshold >= otherThreshold) || 
                   (!isOver && otherIsOver && otherThreshold >= threshold);
        });
    });

    if (severeContradictions.length > 0) {
        const highestValue = severeContradictions.reduce((best, current) => 
            (current.valueScore || 0) > (best.valueScore || 0) ? current : best
        );
        
        // If there's a unique winner by value, keep it. Otherwise, remove all.
        const isUnique = severeContradictions.filter(i => (i.valueScore || 0) === (highestValue.valueScore || 0)).length === 1;

        if (isUnique) {
            return { 
                ...highestValue, 
                conflictScore: conflicting.length,
                description: `${highestValue.description} [Chosen over severe contradiction (Highest Value)]`
            };
        } else {
            return null; // Irreconcilable: remove all
        }
    }

    return null;
  }

  /**
   * Resolve team vs total goals conflict (General logic, kept)
   */
  private resolveTeamTotalGoalsConflict(conflicting: AIInsight[]): AIInsight | null {
    const totalGoal = conflicting.find(i => i.market?.toLowerCase().includes('total goals'));
    const teamGoal = conflicting.find(i => i.market?.toLowerCase().includes('team goals'));
    
    if (!totalGoal || !teamGoal) return null;
    
    if (this.areCompatibleTeamTotalGoals(totalGoal, teamGoal)) {
      return null;
    }
    
    const totalValue = totalGoal.valueScore || 0;
    const teamValue = teamGoal.valueScore || 0;
    
    const winner = totalValue >= teamValue ? totalGoal : teamGoal;
    return {
      ...winner,
      description: `${winner.description} [Chosen due to stronger value in conflict with other goal market]`,
      conflictScore: 1
    };
  }

  /**
   * Resolve redundant similar bets by keeping the best one based on valueScore and optimality
   */
  private resolveRedundantSimilarBets(conflicting: AIInsight[]): AIInsight | null {
    if (conflicting.length === 0) return null;
    
    // Sort by ValueScore first, then by confidence, then by optimal threshold.
    const sorted = conflicting.sort((a, b) => {
        // 1. Prioritize higher value score
        const valueA = a.valueScore || 0;
        const valueB = b.valueScore || 0;
        if (valueA !== valueB) {
            return valueB - valueA;
        }

        // 2. Fallback to confidence score
        const confA = this.getConfidenceScore(a.confidence);
        const confB = this.getConfidenceScore(b.confidence);
        if (confA !== confB) {
            return confB - confA;
        }
        
        // 3. Fallback to optimal threshold (higher 'Over' is better, lower 'Under' is better)
        const thresholdA = this.extractThreshold(a.market?.toLowerCase() || '');
        const thresholdB = this.extractThreshold(b.market?.toLowerCase() || '');
        
        if (thresholdA && thresholdB) {
            const isOverA = a.market?.toLowerCase().includes('over');
            const isOverB = b.market?.toLowerCase().includes('over');
            
            if (isOverA && isOverB) {
                return thresholdB - thresholdA; // For Over bets, higher threshold is better (more value)
            } else if (!isOverA && !isOverB) {
                return thresholdA - thresholdB; // For Under bets, lower threshold is better (more value)
            }
        }
        
        return 0;
    });
    
    const winner = sorted[0];
    const alternatives = sorted.slice(1).map(i => i.title).join(', ');

    return {
      ...winner,
      description: `${winner.description} [Chosen as the best value/confidence from redundant bets: ${alternatives}]`,
      conflictScore: conflicting.length - 1
    };
  }

  /**
   * 🏆 NEW: Resolve Most Cards vs. Team Card Threshold conflict
   */
  private resolveMostCardsThresholdConflict(conflicting: AIInsight[]): AIInsight | null {
    if (conflicting.length !== 2) return null;

    // Fix 1: Handle possibly undefined 'valueScore' during sorting
    const [most, team] = conflicting.sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0));

    // Ensure both have a value score before proceeding with difference check
    const mostValue = most.valueScore ?? 0;
    const teamValue = team.valueScore ?? 0;

    // Fix 2: Handle possibly undefined 'valueScore' in the difference check
    if (Math.abs(mostValue - teamValue) > 500) {
        return {
            ...most,
            description: `${most.description} [Kept due to significantly higher value score in logical conflict]`
        };
    }
    
    // Fix 3: Handle possibly undefined 'market' property before checking for inclusion
    if (team.market?.includes('cards over')) {
        return {
            ...team,
            description: `${team.description} [Kept due to being the more specific bet in a tied logical conflict]`
        };
    }

    // Fallback: Remove both as the contradiction is high and scores are close
    return null; 
  }


  /**
   * HELPER METHODS
   */

  private extractThreshold(market: string): number | null {
    const match = market.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  }

  private getConfidenceScore(confidence: string): number {
    switch (confidence.toLowerCase()) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private extractPercentageFromDescription(description: string): number {
    const match = description.match(/([\d.]+)%/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Groups insights by their market *without* the over/under and threshold part.
   */
  private groupInsightsByBaseMarket(insights: AIInsight[]): Map<string, AIInsight[]> {
    const groups = new Map<string, AIInsight[]>();
    
    for (const insight of insights) {
      const baseMarket = this.getBaseMarket(insight.market || '');
      if (!groups.has(baseMarket)) {
        groups.set(baseMarket, []);
      }
      groups.get(baseMarket)!.push(insight);
    }
    
    return groups;
  }

  private getBaseMarket(market: string): string {
    return market
      .toLowerCase()
      .replace(/(over|under)\s+[\d.]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private isTeamTotalGoalConflict(totalGoal: AIInsight, teamGoal: AIInsight): boolean {
    const totalThreshold = this.extractThreshold(totalGoal.market?.toLowerCase() || '');
    const teamThreshold = this.extractThreshold(teamGoal.market?.toLowerCase() || '');
    
    if (!totalThreshold || !teamThreshold) return false;
  
    const totalIsUnder = totalGoal.market?.toLowerCase().includes('under') ?? false; 
    const teamIsOver = teamGoal.market?.toLowerCase().includes('over') ?? false;
    
    // Simple logical conflict check: If Total Under X and Team Over Y, where Y makes X impossible/very unlikely
    return totalIsUnder && teamIsOver && teamThreshold >= totalThreshold;
  }

  private areSimilarBets(insight1: AIInsight, insight2: AIInsight): boolean {
    // This function checks for redundancy in non-threshold markets (e.g., Home Win vs AH 0)
    const market1 = insight1.market?.toLowerCase() || '';
    const market2 = insight2.market?.toLowerCase() || '';
    
    // Remove all numeric/threshold words
    const cleanMarket1 = market1.replace(/[\d.]+/g, '').replace(/(over|under)/g, '').trim();
    const cleanMarket2 = market2.replace(/[\d.]+/g, '').replace(/(over|under)/g, '').trim();

    const words1 = cleanMarket1.split(/\s+/).filter(w => w.length > 2);
    const words2 = cleanMarket2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return market1 === market2;

    const commonWords = words1.filter(word => words2.includes(word));
    
    const similarity = commonWords.length / Math.min(words1.length, words2.length);
    
    return similarity > 0.6;
  }

  private areCompatibleTeamTotalGoals(totalGoal: AIInsight, teamGoal: AIInsight): boolean {
    return !this.isTeamTotalGoalConflict(totalGoal, teamGoal);
  }

  private generateResolutionSummary(originalCount: number, finalCount: number, resolutions: ConflictResolution[]): string {
    const removed = originalCount - finalCount;
    const conflictTypes = [...new Set(resolutions.map(r => r.conflictType))];
    
    return `Resolved ${resolutions.length} conflicts (${conflictTypes.join(', ')}). Reduced ${originalCount} insights to ${finalCount} (removed ${removed}).`;
  }

  public analyzeConflicts(insights: AIInsight[]): any {
    const result = this.resolveConflicts(insights);
    
    const conflictsByType = result.resolutions.reduce((acc, resolution) => {
      acc[resolution.conflictType] = (acc[resolution.conflictType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const severity = result.resolutions.length > 3 ? 'High' : 
                     result.resolutions.length > 1 ? 'Medium' : 'Low';
    
    const recommendations: string[] = [];
    if (conflictsByType['Direct Over/Under Conflict']) {
      recommendations.push('Consider improving threshold selection logic to avoid direct contradictions.');
    }
    if (conflictsByType['BTTS vs Team Goals Conflict']) {
      recommendations.push('Review logical compatibility checks between BTTS and Team Goals constraints.');
    }
    if (conflictsByType['Redundant Similar Bets']) {
      recommendations.push('High redundancy detected - evaluate insight generators to produce unique/optimal thresholds only.');
    }
    if (result.resolutions.length > insights.length * 0.3) {
      recommendations.push('High overall conflict rate - review primary insight generation logic for systematic issues.');
    }
    
    return {
      totalConflicts: result.resolutions.length,
      conflictsByType,
      severityAnalysis: `${severity} conflict severity (${result.resolutions.length} conflicts for ${insights.length} insights)`,
      recommendations
    };
  }
}

export const conflictResolverService = new ConflictResolverService();
