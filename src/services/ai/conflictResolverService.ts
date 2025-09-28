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

    // Rule 2: Logical BTTS Conflicts
    this.conflictRules.push({
      id: 'btts-team-goals',
      name: 'BTTS vs Team Goals Conflict',
      priority: 9,
      detect: (insights) => this.detectBTTSTeamGoalsConflicts(insights),
      resolve: (conflicting) => this.resolveBTTSTeamGoalsConflict(conflicting)
    });

    // 🏆 Rule 3: Overlapping/Contradictory Threshold Conflicts (CRITICAL for corners)
    this.conflictRules.push({
      id: 'overlapping-thresholds',
      name: 'Overlapping/Contradictory Threshold Conflict',
      priority: 8,
      detect: (insights) => this.detectOverlappingThresholds(insights),
      resolve: (conflicting) => this.resolveOverlappingThresholds(conflicting)
    });

    // Rule 4: Team Goals vs Total Goals Conflicts
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
   * 💡 FIX: Added explicit return
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
    
    return conflicts; // Explicit return
  }

  private isDirectOverUnderConflict(insight1: AIInsight, insight2: AIInsight): boolean {
    const market1 = insight1.market?.toLowerCase() || '';
    const market2 = insight2.market?.toLowerCase() || '';
    
    // Extract threshold from market strings (e.g., "Over 2.5" vs "Under 2.5")
    const threshold1 = this.extractThreshold(market1);
    const threshold2 = this.extractThreshold(market2);
    
    if (threshold1 === null || threshold2 === null || threshold1 !== threshold2) {
      return false;
    }
    
    // Check if same base market but opposite directions
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
   * Detect BTTS vs Team Goals conflicts
   * 💡 FIX: Added explicit return
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
          // BTTS-YES conflicts with any team Under 0.5 goals
          conflicts.push([btts, teamGoal]);
        }
      }
    }
    
    return conflicts; // Explicit return
  }

  /**
   * Detect overlapping threshold conflicts
   * 💡 FIX: Added explicit return
   */
  private detectOverlappingThresholds(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    
    // Group insights by base market type
    const marketGroups = this.groupInsightsByBaseMarket(insights);
    
    for (const [baseMarket, groupInsights] of marketGroups) {
      
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
          if (overThreshold >= underThreshold) {
            console.log(`[ConflictResolver] 🚨 Severe Contradiction Detected: ${over.title} vs ${under.title}`);
            conflicts.push([over, under]);
          }
        }
      }
      
      // 3. Check for Redundancy 
      if (overBets.length > 1) {
          this.findRedundantThresholds(overBets).forEach(group => conflicts.push(group));
      }
      if (underBets.length > 1) {
          this.findRedundantThresholds(underBets).forEach(group => conflicts.push(group));
      }
    }
    
    return conflicts; // Explicit return
  }

  /**
   * Detect team goals vs total goals conflicts
   * 💡 FIX: Added explicit return
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
    
    return conflicts; // Explicit return
  }

  /**
   * Detect redundant similar bets
   * 💡 FIX: Added explicit return
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
    
    return conflicts; // Explicit return
  }

  /**
   * CONFLICT RESOLUTION METHODS
   */

  /**
   * Resolve direct over/under conflict by keeping the higher confidence bet
   */
  private resolveDirectOverUnderConflict(conflicting: AIInsight[]): AIInsight | null {
    if (conflicting.length !== 2) return null;
    
    const [insight1, insight2] = conflicting;
    const confidence1 = this.getConfidenceScore(insight1.confidence);
    const confidence2 = this.getConfidenceScore(insight2.confidence);
    
    if (confidence1 === confidence2) {
      // Same confidence - prefer the one with better supporting data or higher percentage
      const percentage1 = this.extractPercentageFromDescription(insight1.description);
      const percentage2 = this.extractPercentageFromDescription(insight2.description);
      
      if (percentage1 > percentage2) {
        return { ...insight1, conflictScore: 1 };
      } else {
        return { ...insight2, conflictScore: 1 };
      }
    }
    
    // Different confidence - keep higher confidence
    const winner = confidence1 > confidence2 ? insight1 : insight2;
    return {
      ...winner,
      description: `${winner.description} [Chosen over conflicting ${confidence1 > confidence2 ? insight2.title : insight1.title}]`,
      conflictScore: Math.abs(confidence1 - confidence2)
    };
  }

  /**
   * Resolve BTTS vs Team Goals conflict
   */
  private resolveBTTSTeamGoalsConflict(conflicting: AIInsight[]): AIInsight | null {
    const btts = conflicting.find(i => i.market?.toLowerCase().includes('both teams to score'));
    const teamGoal = conflicting.find(i => i.market?.toLowerCase().includes('team goals'));
    
    if (!btts || !teamGoal) return null;
    
    // BTTS-YES is incompatible with Under 0.5 team goals
    // Keep the higher confidence bet
    const bttsConfidence = this.getConfidenceScore(btts.confidence);
    const teamConfidence = this.getConfidenceScore(teamGoal.confidence);
    
    if (bttsConfidence >= teamConfidence) {
      return {
        ...btts,
        description: `${btts.description} [Logical priority over team goal constraint]`,
        conflictScore: 1
      };
    } else {
      return {
        ...teamGoal,
        description: `${teamGoal.description} [Overrides BTTS due to stronger confidence]`,
        conflictScore: 1
      };
    }
  }

  /**
   * Resolve overlapping thresholds by keeping the most optimal one
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
        const highestConfidence = severeContradictions.reduce((best, current) => 
            getScore(current) > getScore(best) ? current : best
        );
        
        // Check if the highest confidence is unique
        const isUnique = severeContradictions.filter(i => getScore(i) === getScore(highestConfidence)).length === 1;

        if (isUnique) {
            return { 
                ...highestConfidence, 
                conflictScore: conflicting.length,
                description: `${highestConfidence.description} [Chosen over severe contradiction]`
            };
        } else {
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
   * Resolve team vs total goals conflict
   */
  private resolveTeamTotalGoalsConflict(conflicting: AIInsight[]): AIInsight | null {
    // Generally prefer total goals insights as they're more straightforward
    const totalGoal = conflicting.find(i => i.market?.toLowerCase().includes('total goals'));
    const teamGoal = conflicting.find(i => i.market?.toLowerCase().includes('team goals'));
    
    if (!totalGoal || !teamGoal) return null;
    
    // Keep both if they're compatible, otherwise prefer higher confidence
    if (this.areCompatibleTeamTotalGoals(totalGoal, teamGoal)) {
      return null; // No conflict actually
    }
    
    const totalConf = this.getConfidenceScore(totalGoal.confidence);
    const teamConf = this.getConfidenceScore(teamGoal.confidence);
    
    return totalConf >= teamConf ? totalGoal : teamGoal;
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
        return confB - confA;
      }
      
      // Prefer more specific markets
      const specificityA = (a.market?.length || 0) + (a.supportingData?.length || 0);
      const specificityB = (b.market?.length || 0) + (b.supportingData?.length || 0);
      
      return specificityB - specificityA;
    });
    
    return sorted[0];
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
   * 💡 FIX: Added explicit return
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
    
    return groups; // Explicit return
  }

  private getBaseMarket(market: string): string {
    return market
      .toLowerCase()
      .replace(/(over|under)\s+[\d.]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
      
      return conflicts; // Explicit return
  }

  /**
   * 💡 FIX: This original function was likely problematic; returning the fixed redundant version
   */
  private findOverlappingThresholds(insights: AIInsight[]): AIInsight[][] {
    // This is now handled by the logic inside detectOverlappingThresholds, 
    // but needs to return an empty array if called directly or if the function signature is required.
    const conflicts: AIInsight[][] = [];
    
    for (let i = 0; i < insights.length; i++) {
      const overlapping: AIInsight[] = [insights[i]];
      
      for (let j = i + 1; j < insights.length; j++) {
        if (this.hasOverlappingThreshold(insights[i], insights[j])) {
          overlapping.push(insights[j]);
        }
      }
      
      if (overlapping.length > 1) {
        conflicts.push(overlapping);
      }
    }
    
    return conflicts; // Explicit return
  }

  private hasOverlappingThreshold(insight1: AIInsight, insight2: AIInsight): boolean {
    const threshold1 = this.extractThreshold(insight1.market?.toLowerCase() || '');
    const threshold2 = this.extractThreshold(insight2.market?.toLowerCase() || '');
    
    if (!threshold1 || !threshold2) return false;
    
    // If thresholds are very close (within 1.0), they might be overlapping
    return Math.abs(threshold1 - threshold2) <= 1.0;
  }

  private isTeamTotalGoalConflict(totalGoal: AIInsight, teamGoal: AIInsight): boolean {
    // Simple heuristic: if total goals is under 1.5 and team goal is over 1.5, that's a conflict
    const totalThreshold = this.extractThreshold(totalGoal.market?.toLowerCase() || '');
    const teamThreshold = this.extractThreshold(teamGoal.market?.toLowerCase() || '');
    
    if (!totalThreshold || !teamThreshold) return false;
  
    const totalIsUnder = totalGoal.market?.toLowerCase().includes('under') ?? false; 
    const teamIsOver = teamGoal.market?.toLowerCase().includes('over') ?? false;
    
    // Conflict if total under X and team over Y where Y approaches X
    return totalIsUnder && teamIsOver && teamThreshold >= totalThreshold * 0.7;
  }

  private areSimilarBets(insight1: AIInsight, insight2: AIInsight): boolean {
    const market1 = insight1.market?.toLowerCase() || '';
    const market2 = insight2.market?.toLowerCase() || '';
    
    // Calculate similarity score
    const words1 = market1.split(' ');
    const words2 = market2.split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    
    return similarity > 0.6; // 60% word overlap = similar
  }

  private areCompatibleTeamTotalGoals(totalGoal: AIInsight, teamGoal: AIInsight): boolean {
    // Check if the team goal and total goal can both be true
    // This is a simplified check - could be more sophisticated
    return !this.isTeamTotalGoalConflict(totalGoal, teamGoal);
  }

  private generateResolutionSummary(originalCount: number, finalCount: number, resolutions: ConflictResolution[]): string {
    const removed = originalCount - finalCount;
    const conflictTypes = [...new Set(resolutions.map(r => r.conflictType))];
    
    return `Resolved ${resolutions.length} conflicts (${conflictTypes.join(', ')}). Reduced ${originalCount} insights to ${finalCount} (removed ${removed}).`;
  }

  /**
   * Get detailed conflict analysis for debugging
   */
  public analyzeConflicts(insights: AIInsight[]): {
    totalConflicts: number;
    conflictsByType: Record<string, number>;
    severityAnalysis: string;
    recommendations: string[];
  } {
    const result = this.resolveConflicts(insights);
    
    const conflictsByType = result.resolutions.reduce((acc, resolution) => {
      acc[resolution.conflictType] = (acc[resolution.conflictType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const severity = result.resolutions.length > 3 ? 'High' : 
                     result.resolutions.length > 1 ? 'Medium' : 'Low';
    
    const recommendations: string[] = [];
    if (conflictsByType['Direct Over/Under Conflict']) {
      recommendations.push('Consider improving threshold selection logic');
    }
    if (conflictsByType['BTTS vs Team Goals Conflict']) {
      recommendations.push('Review logical compatibility checks');
    }
    if (result.resolutions.length > insights.length * 0.3) {
      recommendations.push('High conflict rate - review insight generation logic');
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
