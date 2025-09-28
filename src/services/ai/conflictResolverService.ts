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

    // Rule 3: Overlapping Threshold Conflicts
    this.conflictRules.push({
      id: 'overlapping-thresholds',
      name: 'Overlapping Threshold Conflict',
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
        
        for (const conflictGroup of conflicts) {
          const resolution = this.applyConflictRule(rule, conflictGroup);
          resolutions.push(resolution);
          
          // Update working insights based on resolution
          workingInsights = this.applyResolution(workingInsights, resolution);
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
      if (resolvedInsight.id === conflictingInsights[0].id) {
        action = 'keep_best';
        reasoning = `Kept highest confidence insight: ${resolvedInsight.title}`;
      } else {
        action = 'merge';
        reasoning = `Merged conflicting insights into: ${resolvedInsight.title}`;
      }
    } else {
      action = 'remove_all';
      reasoning = `Removed all conflicting insights due to irreconcilable differences`;
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
    let result = insights.filter(insight => 
      !resolution.conflictingInsights.some(conflicting => conflicting.id === insight.id)
    );

    if (resolution.resolvedInsight) {
      result.push(resolution.resolvedInsight);
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
    
    return conflicts;
  }

  /**
   * Detect overlapping threshold conflicts
   */
  private detectOverlappingThresholds(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    
    // Group insights by base market type
    const marketGroups = this.groupInsightsByBaseMarket(insights);
    
    for (const [baseMarket, groupInsights] of marketGroups) {
      // Check for overlapping thresholds within each market group
      const overlapping = this.findOverlappingThresholds(groupInsights);
      conflicts.push(...overlapping);
    }
    
    return conflicts;
  }

  /**
   * Detect team goals vs total goals conflicts
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
   * Detect redundant similar bets
   */
  private detectRedundantSimilarBets(insights: AIInsight[]): AIInsight[][] {
    const conflicts: AIInsight[][] = [];
    
    for (let i = 0; i < insights.length; i++) {
      const similar: AIInsight[] = [insights[i]];
      
      for (let j = i + 1; j < insights.length; j++) {
        if (this.areSimilarBets(insights[i], insights[j])) {
          similar.push(insights[j]);
        }
      }
      
      if (similar.length > 1) {
        conflicts.push(similar);
      }
    }
    
    return conflicts;
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
    
    // Sort by confidence first, then by threshold optimality
    const sorted = conflicting.sort((a, b) => {
      const confA = this.getConfidenceScore(a.confidence);
      const confB = this.getConfidenceScore(b.confidence);
      
      if (confA !== confB) {
        return confB - confA; // Higher confidence first
      }
      
      // Same confidence - prefer more specific (higher) thresholds for over bets
      const thresholdA = this.extractThreshold(a.market?.toLowerCase() || '');
      const thresholdB = this.extractThreshold(b.market?.toLowerCase() || '');
      
      if (thresholdA && thresholdB) {
        const isOverA = a.market?.toLowerCase().includes('over');
        return isOverA ? thresholdB - thresholdA : thresholdA - thresholdB;
      }
      
      return 0;
    });
    
    const winner = sorted[0];
    const alternatives = sorted.slice(1).map(i => i.title).join(', ');
    
    return {
      ...winner,
      description: `${winner.description} [Optimal threshold chosen over: ${alternatives}]`,
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

  private findOverlappingThresholds(insights: AIInsight[]): AIInsight[][] {
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
    
    return conflicts;
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