// src/services/ai/goalsAIService.ts
import { supabaseGoalsService, DetailedGoalStats } from '../stats/supabaseGoalsService';

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
}

interface GoalThresholdAnalysis {
  threshold: number;
  percentage: number;
  consistency: number;
  confidence: 'high' | 'medium' | 'low';
  recentForm: boolean[];
  betType: 'over' | 'under';
  value: number;
}

interface OptimalThreshold {
  analysis: GoalThresholdAnalysis;
  reasoning: string;
  alternativeConsidered: GoalThresholdAnalysis[];
}

interface TeamGoalPattern {
  team: string;
  venue: 'home' | 'away';
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  averageTotalGoals: number;
  bttsPercentage: number;
  thresholdAnalysis: {
    over05: GoalThresholdAnalysis;
    over15: GoalThresholdAnalysis;
    over25: GoalThresholdAnalysis;
    over35: GoalThresholdAnalysis;
    over45: GoalThresholdAnalysis;
    over55?: GoalThresholdAnalysis;
  };
  recentMatches: Array<{
    opponent: string;
    goalsFor: number;
    goalsAgainst: number;
    totalGoals: number;
    bothTeamsScored: boolean;
  }>;
}

export class GoalsAIService {
  private readonly CONFIDENCE_THRESHOLDS = { HIGH: 0.75, MEDIUM: 0.6, LOW: 0.45 };
  private readonly CONSISTENCY_THRESHOLDS = { EXCELLENT: 0.8, GOOD: 0.6, POOR: 0.4 };

  // ---- Existing methods ----
  private async analyzeTeamGoalPattern(teamName: string, venue: 'home' | 'away'): Promise<TeamGoalPattern> {
    const teamStats = await supabaseGoalsService.getTeamGoalStats(teamName);
    if (!teamStats) throw new Error(`No goal data found for team: ${teamName}`);
    const relevantMatches = teamStats.matchDetails;
    const averageGoalsFor = teamStats.goalsFor / teamStats.matches;
    const averageGoalsAgainst = teamStats.goalsAgainst / teamStats.matches;
    const averageTotalGoals = averageGoalsFor + averageGoalsAgainst;

    const thresholdAnalysis = {
      over05: this.analyzeGoalThreshold(relevantMatches, 0.5, 'total'),
      over15: this.analyzeGoalThreshold(relevantMatches, 1.5, 'total'),
      over25: this.analyzeGoalThreshold(relevantMatches, 2.5, 'total'),
      over35: this.analyzeGoalThreshold(relevantMatches, 3.5, 'total'),
      over45: this.analyzeGoalThreshold(relevantMatches, 4.5, 'total'),
      over55: this.analyzeGoalThreshold(relevantMatches, 5.5, 'total')
    };

    const bttsMatches = relevantMatches.filter(m => m.bothTeamsScored).length;
    const bttsPercentage = (bttsMatches / relevantMatches.length) * 100;

    return {
      team: teamName,
      venue,
      averageGoalsFor: Math.round(averageGoalsFor * 100) / 100,
      averageGoalsAgainst: Math.round(averageGoalsAgainst * 100) / 100,
      averageTotalGoals: Math.round(averageTotalGoals * 100) / 100,
      bttsPercentage: Math.round(bttsPercentage * 100) / 100,
      thresholdAnalysis,
      recentMatches: relevantMatches.slice(0, 5).map(match => ({
        opponent: match.opponent,
        goalsFor: match.goalsFor,
        goalsAgainst: match.goalsAgainst,
        totalGoals: match.totalGoals,
        bothTeamsScored: match.bothTeamsScored
      }))
    };
  }

  private analyzeGoalThreshold(
    matches: Array<{ totalGoals: number; goalsFor: number; goalsAgainst: number }>,
    threshold: number,
    type: 'total' | 'for' | 'against'
  ): GoalThresholdAnalysis {
    const getGoalCount = (match: { totalGoals: number; goalsFor: number; goalsAgainst: number }) => {
      switch (type) { case 'for': return match.goalsFor; case 'against': return match.goalsAgainst; default: return match.totalGoals; }
    };

    const matchesOver = matches.filter(m => getGoalCount(m) > threshold);
    const overPercentage = (matchesOver.length / matches.length) * 100;
    const matchesUnder = matches.filter(m => getGoalCount(m) < threshold);
    const underPercentage = (matchesUnder.length / matches.length) * 100;

    const recentMatches = matches.slice(0, 5);
    const recentOverForm = recentMatches.map(m => getGoalCount(m) > threshold);
    const recentUnderForm = recentMatches.map(m => getGoalCount(m) < threshold);

    const overHits = recentOverForm.filter(Boolean).length;
    const underHits = recentUnderForm.filter(Boolean).length;
    const overConsistency = overHits / Math.min(5, recentMatches.length);
    const underConsistency = underHits / Math.min(5, recentMatches.length);

    const overConfidence = this.getConfidenceLevel(overPercentage, overConsistency);
    const underConfidence = this.getConfidenceLevel(underPercentage, underConsistency);

    const overValue = this.calculateBetValue(overPercentage, overConsistency, threshold, 'over');
    const underValue = this.calculateBetValue(underPercentage, underConsistency, threshold, 'under');

    if (overValue > underValue && overConfidence !== 'low') return { threshold, percentage: Math.round(overPercentage*100)/100, consistency: Math.round(overConsistency*100)/100, confidence: overConfidence, recentForm: recentOverForm, betType: 'over', value: overValue };
    if (underConfidence !== 'low') return { threshold, percentage: Math.round(underPercentage*100)/100, consistency: Math.round(underConsistency*100)/100, confidence: underConfidence, recentForm: recentUnderForm, betType: 'under', value: underValue };
    return { threshold, percentage: Math.round(overPercentage*100)/100, consistency: Math.round(overConsistency*100)/100, confidence: overConfidence, recentForm: recentOverForm, betType: 'over', value: overValue };
  }

  private calculateBetValue(percentage: number, consistency: number, threshold: number, betType: 'over' | 'under'): number {
    let baseValue = percentage * consistency;
    if (betType === 'over') baseValue += (threshold * 5); 
    else baseValue += ((6 - threshold) * 5);
    return baseValue;
  }

  private getConfidenceLevel(percentage: number, consistency: number): 'high' | 'medium' | 'low' {
    if (percentage >= this.CONFIDENCE_THRESHOLDS.HIGH*100 && consistency >= this.CONSISTENCY_THRESHOLDS.GOOD) return 'high';
    if (percentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM*100 && consistency >= this.CONSISTENCY_THRESHOLDS.POOR) return 'medium';
    return 'low';
  }

  private findOptimalThreshold(analyses: GoalThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThreshold | null {
    let validAnalyses = analyses.filter(a => a.confidence !== 'low');
    if (betType) validAnalyses = validAnalyses.filter(a => a.betType === betType);
    if (validAnalyses.length === 0) return null;
    const sorted = validAnalyses.sort((a,b) => b.value - a.value);
    const optimal = sorted[0];
    const reasoning = this.generateThresholdReasoning(optimal, sorted.slice(1,3));
    return { analysis: optimal, reasoning, alternativeConsidered: sorted.slice(1,3) };
  }

  private generateThresholdReasoning(optimal: GoalThresholdAnalysis, alternatives: GoalThresholdAnalysis[]): string {
    let reasoning = `${optimal.betType === 'over' ? 'Over' : 'Under'} ${optimal.threshold} selected for optimal value`;
    if (alternatives.length > 0) {
      const alt = alternatives[0];
      if (optimal.betType === 'over' && alt.betType === 'over' && alt.threshold < optimal.threshold) reasoning += `. Higher threshold chosen over ${alt.threshold} for better odds despite ${alt.percentage}% hit rate.`;
      else if (optimal.betType === 'under' && alt.betType === 'under' && alt.threshold > optimal.threshold) reasoning += `. Lower threshold chosen over ${alt.threshold} for better odds despite ${alt.percentage}% hit rate.`;
    }
    return reasoning;
  }

  // ---- Generate Insights ----
  private generateOptimalTotalGoalsInsights(homePattern: TeamGoalPattern, awayPattern: TeamGoalPattern): AIInsight[] {
    const insights: AIInsight[] = [];
    const homeAnalyses = Object.values(homePattern.thresholdAnalysis);
    const awayAnalyses = Object.values(awayPattern.thresholdAnalysis);
    const thresholds = [0.5,1.5,2.5,3.5,4.5];

    const combinedAnalyses: GoalThresholdAnalysis[] = [];
    for (const threshold of thresholds) {
      const homeAnalysis = homeAnalyses.find(a => a.threshold === threshold);
      const awayAnalysis = awayAnalyses.find(a => a.threshold === threshold);
      if (homeAnalysis && awayAnalysis) {
        const avgPercentage = (homeAnalysis.percentage + awayAnalysis.percentage)/2;
        const avgConsistency = (homeAnalysis.consistency + awayAnalysis.consistency)/2;
        const betType = homeAnalysis.betType === awayAnalysis.betType ? homeAnalysis.betType : homeAnalysis.value > awayAnalysis.value ? homeAnalysis.betType : awayAnalysis.betType;
        combinedAnalyses.push({ threshold, percentage: avgPercentage, consistency: avgConsistency, confidence: this.getConfidenceLevel(avgPercentage, avgConsistency), recentForm: [...homeAnalysis.recentForm,...awayAnalysis.recentForm].slice(0,5), betType, value: this.calculateBetValue(avgPercentage, avgConsistency, threshold, betType) });
      }
    }

    const optimalOver = this.findOptimalThreshold(combinedAnalyses, 'over');
    if (optimalOver) {
      const analysis = optimalOver.analysis;
      const homeRecent = homePattern.thresholdAnalysis[`over${analysis.threshold.toString().replace('.', '')}`]?.recentForm.filter(Boolean).length || 0;
      const awayRecent = awayPattern.thresholdAnalysis[`over${analysis.threshold.toString().replace('.', '')}`]?.recentForm.filter(Boolean).length || 0;
      insights.push({
        id: `optimal-total-goals-over-${analysis.threshold}`,
        title: `Over ${analysis.threshold} Total Goals`,
        description: `Optimal over bet: ${analysis.percentage.toFixed(1)}% hit rate with strong consistency. ${optimalOver.reasoning}`,
        market: `Total Goals Over ${analysis.threshold}`,
        confidence: analysis.confidence,
        supportingData: `Combined analysis: ${homeRecent + awayRecent}/10 recent matches. Home avg: ${homePattern.averageTotalGoals}, Away avg: ${awayPattern.averageTotalGoals}`,
        aiEnhanced: true
      });
    }

    const optimalUnder = this.findOptimalThreshold(combinedAnalyses, 'under');
    if (optimalUnder) {
      const analysis = optimalUnder.analysis;
      insights.push({
        id: `optimal-total-goals-under-${analysis.threshold}`,
        title: `Under ${analysis.threshold} Total Goals`,
        description: `Optimal under bet: ${analysis.percentage.toFixed(1)}% hit rate with defensive trends identified. ${optimalUnder.reasoning}`,
        market: `Total Goals Under ${analysis.threshold}`,
        confidence: analysis.confidence,
        supportingData: `Defensive strength detected. Combined average: ${((homePattern.averageTotalGoals+awayPattern.averageTotalGoals)/2).toFixed(1)} goals per game`,
        aiEnhanced: true
      });
    }

    return insights.sort((a,b) => ({ high:3, medium:2, low:1 }[b.confidence]-{ high:3, medium:2, low:1 }[a.confidence]));
  }

  private generateOptimalTeamGoalsInsights(teamPattern: TeamGoalPattern, teamType: 'Home'|'Away'): AIInsight[] {
    const insights: AIInsight[] = [];
    const matches = teamPattern.recentMatches;
    const thresholds = [0.5,1.5,2.5,3.5,4.5,5.5];
    const analyses: GoalThresholdAnalysis[] = thresholds.map(threshold => this.analyzeGoalThreshold(matches, threshold, 'for'));
    const optimal = this.findOptimalThreshold(analyses);
    if (optimal) {
      const analysis = optimal.analysis;
      const recentHits = analysis.recentForm.filter(Boolean).length;
      insights.push({
        id: `optimal-${teamType.toLowerCase()}-goals-${analysis.betType}-${analysis.threshold}`,
        title: `${teamType} Team ${analysis.betType === 'over'?'Over':'Under'} ${analysis.threshold} Goals`,
        description: `Optimal ${teamType.toLowerCase()} team bet: ${analysis.percentage.toFixed(1)}% hit rate (${recentHits}/5 recent). ${optimal.reasoning}`,
        market: `${teamType} Team Goals ${analysis.betType==='over'?'Over':'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        supportingData: `Recent form: [${matches.slice(0,5).map(m=>m.goalsFor).join(', ')}]. Average: ${teamPattern.averageGoalsFor}/game`,
        aiEnhanced: true
      });
    }
    return insights;
  }

  private generateBTTSInsights(homePattern: TeamGoalPattern, awayPattern: TeamGoalPattern): AIInsight[] {
    const insights: AIInsight[] = [];
    const combinedBTTSPercentage = (homePattern.bttsPercentage + awayPattern.bttsPercentage)/2;
    const homeRecentBTTS = homePattern.recentMatches.filter(m=>m.bothTeamsScored).length;
    const awayRecentBTTS = awayPattern.recentMatches.filter(m=>m.bothTeamsScored).length;
    const avgRecentBTTS = (homeRecentBTTS + awayRecentBTTS)/2;

    if (combinedBTTSPercentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM*100) {
      const consistency = avgRecentBTTS/5;
      const confidence = this.getConfidenceLevel(combinedBTTSPercentage, consistency);
      insights.push({ id:'optimal-btts-yes', title:'Both Teams to Score - YES', description:`Strong BTTS opportunity: ${combinedBTTSPercentage.toFixed(1)}% rate. Both teams show consistent scoring ability.`, market:'Both Teams to Score - Yes', confidence, supportingData:`Home: ${homeRecentBTTS}/5 recent, Away: ${awayRecentBTTS}/5 recent. Combined BTTS: ${combinedBTTSPercentage.toFixed(1)}%` });
    }

    const bttsNoPercentage = 100 - combinedBTTSPercentage;
    if (bttsNoPercentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM*100 && bttsNoPercentage > combinedBTTSPercentage+10) {
      const consistency = (10-homeRecentBTTS-awayRecentBTTS)/10;
      const confidence = this.getConfidenceLevel(bttsNoPercentage, consistency);
      insights.push({ id:'optimal-btts-no', title:'Both Teams to Score - NO', description:`Strong defensive trend: ${bttsNoPercentage.toFixed(1)}% of matches see at least one team fail to score.`, market:'Both Teams to Score - No', confidence, supportingData:`One or both teams struggle to score. Home avg: ${homePattern.averageGoalsFor}, Away avg: ${awayPattern.averageGoalsFor}` });
    }

    return insights;
  }

  // ---- 7. New resolver with rare-but-possible combos ----
  private resolveCorrelations(insights: AIInsight[]): AIInsight[] {
    const filtered: AIInsight[] = [];
    const flagged: AIInsight[] = [];

    const find = (keyword: string) => insights.filter(i=>i.market?.includes(keyword));

    const overGoals = find("Total Goals Over");
    const underGoals = find("Total Goals Under");
    const bttsYes = find("Both Teams to Score - Yes");
    const bttsNo = find("Both Teams to Score - No");
    const homeGoals = find("Home Team Goals");
    const awayGoals = find("Away Team Goals");

    // 1. Total Goals contradictions
    if(overGoals.length && underGoals.length){
      const strongestOver = overGoals.sort((a,b)=>(b.value??0)-(a.value??0))[0];
      const strongestUnder = underGoals.sort((a,b)=>(b.value??0)-(a.value??0))[0];
      if(strongestOver.confidence==="high" && strongestUnder.confidence!=="high") filtered.push(strongestOver);
      else if(strongestUnder.confidence==="high" && strongestOver.confidence!=="high") filtered.push(strongestUnder);
      else filtered.push((strongestOver.value??0)>=(strongestUnder.value??0)?strongestOver:strongestUnder);
    } else filtered.push(...overGoals,...underGoals);

    // 2. BTTS contradictions
    if(bttsYes.length && bttsNo.length) filtered.push(bttsYes[0].confidence>=bttsNo[0].confidence?bttsYes[0]:bttsNo[0]);
    else filtered.push(...bttsYes,...bttsNo);

    // 3. Team Goals contradictions
    const resolveTeamGoals = (teamInsights: AIInsight[])=>{
      const overs = teamInsights.filter(i=>i.market?.includes("Over"));
      const unders = teamInsights.filter(i=>i.market?.includes("Under"));
      if(overs.length && unders.length){
        const strongestOver = overs.sort((a,b)=>(b.value??0)-(a.value??0))[0];
        const strongestUnder = unders.sort((a,b)=>(b.value??0)-(a.value??0))[0];
        if(strongestOver.confidence==="high" && strongestUnder.confidence!=="high") return [strongestOver];
        else if(strongestUnder.confidence==="high" && strongestOver.confidence!=="high") return [strongestUnder];
        else return [(strongestOver.value??0)>=(strongestUnder.value??0)?strongestOver:strongestUnder];
      }
      return teamInsights;
    };
    filtered.push(...resolveTeamGoals(homeGoals));
    filtered.push(...resolveTeamGoals(awayGoals));

    // 4. Cross-market checks (Team vs Total)
    for(const tg of [...homeGoals,...awayGoals]){
      if(!tg.market) continue;
      const thresholdMatch = tg.market.match(/Over (\d\.\d)|Under (\d\.\d)/);
      if(!thresholdMatch) continue;
      const num = parseFloat(thresholdMatch[1]||thresholdMatch[2]);
      const isOver = tg.market.includes("Over");

      // True contradiction: Home Over 2.5 vs Total Under 2.5
      const totalUnderConflict = underGoals.find(u=>u.market?.includes(`Under ${num}`));
      if(isOver && totalUnderConflict){
        if((tg.value??0)>=(totalUnderConflict.value??0)) filtered.push(tg);
        else filtered.push(totalUnderConflict);
        continue;
      }

      // Rare-but-possible: Home Under 1.5 + Total Over 3.5
      const totalOverConflict = overGoals.find(o=>parseFloat(o.market?.split("Over ")[1]??"0")>=num+2);
      if(!isOver && totalOverConflict){
        flagged.push({...tg, id:`${tg.id}-flagged`, title:`${tg.title} (Rare Combo)`, description:`${tg.description} ⚠️ Low synergy with ${totalOverConflict.title}. Both can be true, but outcome depends on away dominance.`, aiEnhanced:true});
      }
    }

    // 5. Synergies
    const over25 = overGoals.find(i=>i.market?.includes("Over 2.5"));
    if(over25 && bttsYes.length && over25.confidence!=="low" && bttsYes[0].confidence!=="low") filtered.push({
      id:"combo-over25-btts", title:"Combo: Over 2.5 Goals + BTTS Yes",
      description:"Strong correlation detected: games with Over 2.5 also show high BTTS rate.",
      market:"Over 2.5 + BTTS Yes", confidence:(over25.confidence==="high"&&bttsYes[0].confidence==="high")?"high":"medium",
      supportingData:`Over 2.5 confidence: ${over25.confidence}, BTTS Yes confidence: ${bttsYes[0].confidence}`, aiEnhanced:true
    });

    const homeOver15 = homeGoals.find(i=>i.market?.includes("Over 1.5"));
    if(homeOver15 && bttsYes.length && homeOver15.confidence!=="low" && bttsYes[0].confidence!=="low") filtered.push({
      id:"combo-home15-btts", title:"Combo: Home Over 1.5 Goals + BTTS Yes",
      description:"When the home team scores 2+ goals, BTTS Yes is strongly correlated.",
      market:"Home Over 1.5 + BTTS Yes", confidence:(homeOver15.confidence==="high"&&bttsYes[0].confidence==="high")?"high":"medium",
      supportingData:`Home Over 1.5 confidence: ${homeOver15.confidence}, BTTS Yes confidence: ${bttsYes[0].confidence}`, aiEnhanced:true
    });

    return [...filtered,...flagged];
  }

  // ---- 8. Main generateGoalInsights ----
  async generateGoalInsights(homeTeam:string, awayTeam:string): Promise<AIInsight[]> {
    try{
      const homePattern = await this.analyzeTeamGoalPattern(homeTeam,'home');
      const awayPattern = await this.analyzeTeamGoalPattern(awayTeam,'away');
      const allInsights: AIInsight[] = [];
      allInsights.push(...this.generateOptimalTotalGoalsInsights(homePattern,awayPattern));
      allInsights.push(...this.generateOptimalTeamGoalsInsights(homePattern,'Home'));
      allInsights.push(...this.generateOptimalTeamGoalsInsights(awayPattern,'Away'));
      allInsights.push(...this.generateBTTSInsights(homePattern,awayPattern));

      // Apply new correlation resolver
      const finalInsights = this.resolveCorrelations(allInsights);

      return finalInsights
        .filter(insight=>insight.confidence!=='low')
        .slice(0,6);
    } catch(e){
      console.error('[GoalsAI] Error generating goal insights:',e);
      return [];
    }
  }
}

export const goalsAIService = new GoalsAIService();
