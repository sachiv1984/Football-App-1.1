// src/services/ai/conflictResolverService.ts

// Local type definition
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
   * 💡 Note: Rule 3 and Rule 5 are the primary targets for corner conflicts.
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

    // Rule 2: Logical BTTS Conflicts (Goals-specific, but fine to keep)
    this.conflictRules.push({
      id: 'btts-team-goals',
      name: 'BTTS vs Team Goals Conflict',
      priority: 9,
      detect: (insights) => this.detectBTTSTeamGoalsConflicts(insights),
      resolve: (conflicting) => this.resolveBTTSTeamGoalsConflict(conflicting)
    });

    // 🏆 RULE 3: MAJOR UPGRADE for Overlapping Thresholds (e.g., corners)
    this.conflictRules.push({
      id: 'overlapping-thresholds',
      name: 'Overlapping/Contradictory Threshold Conflict',
      priority: 8,
      detect: (insights) => this.detectOverlappingThresholds(insights),
      resolve: (conflicting) => this.resolveOverlappingThresholds(conflicting)
    });

    // Rule 4: Team Goals vs Total Goals Conflicts (Goals-specific)
    this.conflictRules.push({
      id: 'team-total-goals',
      name: 'Team Goals vs Total Goals Conflict',
      priority: 7,
      detect: (insights) => this.detectTeamTotalGoalsConflicts(insights),
      resolve: (conflicting) => this.resolveTeamTotalGoalsConflict(conflicting)
    });

    // Rule 5: Redundant Similar Bets (Minor update for specificity)
    this.conflictRules.push({
      id: 'redundant-similar',
      name: 'Redundant Similar Bets',
      priority: 6,
      detect: (insights) => this.detectRedundantSimilarBets(insights),
      resolve: (conflicting) => this.resolveRedundantSimilarBets(conflicting)
    });
  }

  // --- Main Conflict Resolution Logic (No change needed here) ---

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

  private applyConflictRule(rule: ConflictRule, conflictingInsights: AIInsight[]): ConflictResolution {
    // ... (logic remains the same)
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
  
  // --- CONFLICT DETECTION METHODS (UPDATED) ---

  // ... (detectDirectOverUnderConflicts, detectBTTSTeamGoalsConflicts, detectTeamTotalGoalsConflicts remain the same)

  /**
   * 🏆 UPDATED: Detect overlapping/contradictory threshold conflicts
   * Now explicitly looks for severe conflicts (e.g., Over X and Under Y where X and Y are close)
   */
  private detectOverlappingThresholds(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    const marketGroups = this.groupInsightsByBaseMarket(insights);
    
    for (const [, groupInsights] of marketGroups) {
      
      // 1. Group Over and Under bets
      const overBets = groupInsights.filter(i => i.market?.toLowerCase().includes('over'));
      const underBets = groupInsights.filter(i => i.market?.toLowerCase().includes('under'));

      // 2. Check for Severe Contradictions (e.g., Over 10.5 and Under 9.5 corners)
      for (const over of overBets) {
        const overThreshold = this.extractThreshold(over.market || '');
        if (!overThreshold) continue;

        for (const under of underBets) {
          const underThreshold = this.extractThreshold(under.market || '');
          if (!underThreshold) continue;
          
          // Severe conflict if: Over X AND Under Y where X >= Y 
          // (e.g., Over 10.5 and Under 10.5, or Over 11.5 and Under 9.5)
          if (overThreshold >= underThreshold) {
            console.log(`[ConflictResolver] 🚨 Severe Contradiction Detected: ${over.title} vs ${under.title}`);
            conflicts.push([over, under]);
          }
        }
      }
      
      // 3. Check for Redundancy (If Over 9.5 and Over 10.5 exist, this is a soft conflict)
      if (overBets.length > 1) {
          this.findRedundantThresholds(overBets).forEach(group => conflicts.push(group));
      }
      if (underBets.length > 1) {
          this.findRedundantThresholds(underBets).forEach(group => conflicts.push(group));
      }
    }
    
    return conflicts;
  }

  /**
   * Helper to find redundant thresholds (e.g. Over 9.5 and Over 10.5) within the same direction
   */
  private findRedundantThresholds(insights: AIInsight[]): AIInsight[][] {
      const conflicts: AIInsight[][] = [];
      if (insights.length < 2) return conflicts;

      // Sort by threshold
      insights.sort((a, b) => {
          const tA = this.extractThreshold(a.market || '') || 0;
          const tB = this.extractThreshold(b.market || '') || 0;
          return tA - tB;
      });

      // Simple redundancy check: group all insights on the same market direction
      // and let the resolver pick the best one.
      conflicts.push([...insights]); 
      
      return conflicts;
  }

  /**
   * UPDATED: Detect redundant similar bets
   */
  private detectRedundantSimilarBets(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    
    // Use a Set to ensure we only push one unique group per iteration
    const processedIndices = new Set<number>();
    
    for (let i = 0; i < insights.length; i++) {
      if (processedIndices.has(i)) continue;
      
      const similar: AIInsight[] = [insights[i]];
      
      for (let j = i + 1; j < insights.length; j++) {
        if (this.areSimilarBets(insights[i], insights[j])) {
          similar.push(insights[j]);
          processedIndices.add(j);
        }
      }
      
      if (similar.length > 1) {
        conflicts.push(similar);
        processedIndices.add(i);
      }
    }
    
    return conflicts;
  }

  // --- CONFLICT RESOLUTION METHODS (UPDATED) ---
  
  // ... (resolveDirectOverUnderConflict, resolveBTTSTeamGoalsConflict, resolveTeamTotalGoalsConflict remain the same)


  /**
   * 🏆 UPDATED: Resolve overlapping/contradictory thresholds
   */
  private resolveOverlappingThresholds(conflicting: AIInsight[]): AIInsight | null {
    if (conflicting.length === 0) return null;
    
    // Helper to score based on confidence
    const getScore = (insight: AIInsight) => this.getConfidenceScore(insight.confidence);

    // 1. Check for Severe Contradiction (e.g., Over 10.5 vs Under 9.5)
    const severeContradictions = conflicting.filter(i => {
        const otherInsights = conflicting.filter(o => o.id !== i.id);
        const isOver = i.market?.toLowerCase().includes('over');
        const threshold = this.extractThreshold(i.market || '');
        
        // If there's any opposing bet with a threshold that creates a logical impossibility
        return otherInsights.some(other => {
            const otherIsUnder = other.market?.toLowerCase().includes('under');
            const otherIsOver = other.market?.toLowerCase().includes('over');
            const otherThreshold = this.extractThreshold(other.market || '');

            if (!threshold || !otherThreshold) return false;

            // Conflict if Over X and Under Y where X >= Y
            return (isOver && otherIsUnder && threshold >= otherThreshold) || 
                   (!isOver && otherIsOver && otherThreshold >= threshold);
        });
    });

    if (severeContradictions.length > 0) {
        // If a severe conflict exists, keep the single highest confidence one.
        // If confidence is equal, remove all as irreconcilable.
        const highestConfidence = severeContradictions.reduce((best, current) => 
            getScore(current) > getScore(best) ? current : best
        );
        
        // Check if the highest confidence is unique
        const isUnique = severeContradictions.filter(i => getScore(i) === getScore(highestConfidence)).length === 1;

        if (isUnique) {
            console.log(`[ConflictResolver] 🥇 Severe conflict resolved by confidence: Kept ${highestConfidence.title}`);
            return { 
                ...highestConfidence, 
                conflictScore: conflicting.length,
                description: `${highestConfidence.description} [Chosen over severe contradiction]`
            };
        } else {
            console.log(`[ConflictResolver] 💣 Severe conflict IRRECONCILABLE: Removing all.`);
            return null; // Irreconcilable: remove all
        }
    }

    // 2. If no severe contradiction (i.e., just redundancy like Over 9.5 vs Over 10.5)
    
    // Sort by confidence first, then by threshold optimality
    const sorted = conflicting.sort((a, b) => {
      const confA = getScore(a);
      const confB = getScore(b);
      
      if (confA !== confB) {
        return confB - confA; // 1. Higher confidence first
      }
      
      // 2. Same confidence - prefer the more specific/optimal bet
      const thresholdA = this.extractThreshold(a.market?.toLowerCase() || '');
      const thresholdB = this.extractThreshold(b.market?.toLowerCase() || '');
      
      if (thresholdA && thresholdB) {
        const isOverA = a.market?.toLowerCase().includes('over');
        
        // For 'Over' bets, a HIGHER threshold is more specific (Over 11.5 > Over 10.5)
        // For 'Under' bets, a LOWER threshold is more specific (Under 8.5 < Under 9.5)
        return isOverA ? thresholdB - thresholdA : thresholdA - thresholdB;
      }
      
      return 0;
    });
    
    const winner = sorted[0];
    const alternatives = sorted.slice(1).map(i => i.title).join(', ');
    
    return {
      ...winner,
      description: `${winner.description} [Optimal bet chosen over redundant alternatives: ${alternatives}]`,
      conflictScore: conflicting.length - 1
    };
  }

  /**
   * Resolve redundant similar bets by keeping the best one
   */
  private resolveRedundantSimilarBets(conflicting: AIInsight[]): AIInsight | null {
    if (conflicting.length === 0) return null;
    
    // Sort by confidence, then by specificity
    const sorted = conflicting.sort((a, b) => {
      const confA = this.getConfidenceScore(a.confidence);
      const confB = this.getConfidenceScore(b.confidence);
      
      if (confA !== confB) {
        return confB - confA; // 1. Higher confidence first
      }
      
      // 2. Prefer more specific markets (longer market string generally means more specific)
      const specificityA = (a.market?.length || 0);
      const specificityB = (b.market?.length || 0);
      
      return specificityB - specificityA;
    });
    
    const winner = sorted[0];
    const alternatives = sorted.slice(1).map(i => i.title).join(', ');

    return {
      ...winner,
      description: `${winner.description} [Kept best insight from redundant group: ${alternatives}]`,
      conflictScore: conflicting.length - 1
    };
  }
  
  // ... (All other helper methods remain the same)
  private extractThreshold(market: string): number | null { /* ... */ }
  private getConfidenceScore(confidence: string): number { /* ... */ }
  private extractPercentageFromDescription(description: string): number { /* ... */ }
  private groupInsightsByBaseMarket(insights: AIInsight[]): Map<string, AIInsight[]> { /* ... */ }
  private getBaseMarket(market: string): string { /* ... */ }
  private findOverlappingThresholds(insights: AIInsight[]): AIInsight[][] { /* ... */ }
  private hasOverlappingThreshold(insight1: AIInsight, insight2: AIInsight): boolean { /* ... */ }
  private isTeamTotalGoalConflict(totalGoal: AIInsight, teamGoal: AIInsight): boolean { /* ... */ }
  private areSimilarBets(insight1: AIInsight, insight2: AIInsight): boolean { /* ... */ }
  private areCompatibleTeamTotalGoals(totalGoal: AIInsight, teamGoal: AIInsight): boolean { /* ... */ }
  private generateResolutionSummary(originalCount: number, finalCount: number, resolutions: ConflictResolution[]): string { /* ... */ }
  public analyzeConflicts(insights: AIInsight[]): any { /* ... */ }
}

export const conflictResolverService = new ConflictResolverService();
