// src/hooks/useAIBettingInsights.ts
import { useState, useEffect, useCallback, useRef } from 'react';
// 👇 NEW: Import the single Orchestrator Service
import { aiOptionService } from '../services/ai/AIOptionService'; 

// Local type definitions to avoid import conflicts
// 👇 FIX 1: Export the AIInsight interface
export interface AIInsight {
  id: string;
  title: string;
  description: string;
  market?: string;
  confidence: 'high' | 'medium' | 'low';
  odds?: string;
  supportingData?: string;
  source?: string;
  // 👇 NEW: Added fields from conflictResolverService for completeness
  conflictScore?: number; 
  valueScore?: number;
}

// Service interfaces for future extensibility (kept for structure, but the primary 
// hook logic now uses the Orchestrator which implements this concept internally)
interface AIService {
  generateInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]>;
}

interface AIServiceRegistry {
  orchestrator?: AIService; // We now rely on one service for all
}

interface UseAIBettingInsightsOptions {
  enabled?: boolean;
  refreshInterval?: number; // Auto-refresh interval in ms
  maxRetries?: number;
  retryDelay?: number;
  cacheTimeout?: number; // Cache timeout in ms
  // 👇 REMOVED: The 'services' option is now redundant as we always use the orchestrator
  // services?: (keyof AIServiceRegistry)[]; 
}

interface AIInsightError {
  service: string;
  error: Error;
  timestamp: number;
}

interface AIInsightsState {
  insights: AIInsight[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  serviceErrors: AIInsightError[];
  isRefreshing: boolean;
}

interface CachedInsights {
  insights: AIInsight[];
  timestamp: number;
  homeTeam: string;
  awayTeam: string;
}

export const useAIBettingInsights = (
  homeTeam: string,
  awayTeam: string,
  options: UseAIBettingInsightsOptions = {}
) => {
  const {
    enabled = true,
    refreshInterval = 0, // No auto-refresh by default
    maxRetries = 3,
    retryDelay = 2000,
    cacheTimeout = 10 * 60 * 1000, // 10 minutes default cache
    // services = ['goals', 'corners'] // Removed as we use the orchestrator
  } = options;

  // State
  const [state, setState] = useState<AIInsightsState>({
    insights: [],
    loading: false,
    error: null,
    lastUpdated: null,
    serviceErrors: [],
    isRefreshing: false
  });

  // State to gate the initial data fetch until services are loaded
  const [servicesReady, setServicesReady] = useState(false);

  // Refs for cleanup and persistence
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, CachedInsights>>(new Map());

  // 👇 LOOP FIX: Ref to track the key inputs since the last actual load, 
  const lastLoadRef = useRef<string | null>(null);

  // Service registry (simplified: holds the one orchestrator)
  const serviceRegistry = useRef<AIServiceRegistry>({});

  /**
   * Register AI services dynamically (simplified to only register the orchestrator)
   */
  const registerService = useCallback((serviceName: keyof AIServiceRegistry, service: AIService) => {
    serviceRegistry.current[serviceName] = service;
    console.log(`[AI Hook] Orchestrator Service '${serviceName}' registered.`);
  }, []);

  /**
   * Generate cache key for the current match
   */
  const getCacheKey = useCallback((home: string, away: string): string => {
    return `${home.toLowerCase().replace(/\s+/g, '-')}-vs-${away.toLowerCase().replace(/\s+/g, '-')}`;
  }, []);

  /**
   * Check if cached insights are still valid
   */
  const isCacheValid = useCallback((cached: CachedInsights): boolean => {
    return Date.now() - cached.timestamp < cacheTimeout;
  }, [cacheTimeout]);

  /**
   * Get insights from cache if available and valid
   */
  const getCachedInsights = useCallback((home: string, away: string): AIInsight[] | null => {
    const cacheKey = getCacheKey(home, away);
    const cached = cacheRef.current.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      console.log(`[AI Hook] Using valid cached insights for ${cacheKey}. Timestamp: ${new Date(cached.timestamp).toLocaleTimeString()}`);
      return cached.insights;
    }
    
    if (cached) {
      console.log(`[AI Hook] Cache expired for ${cacheKey}. Cache time: ${new Date(cached.timestamp).toLocaleTimeString()}.`);
    } else {
      console.log(`[AI Hook] No cache found for ${cacheKey}.`);
    }
    
    return null;
  }, [getCacheKey, isCacheValid]);

  /**
   * Store insights in cache
   */
  const setCachedInsights = useCallback((home: string, away: string, insights: AIInsight[]) => {
    const cacheKey = getCacheKey(home, away);
    cacheRef.current.set(cacheKey, {
      insights,
      timestamp: Date.now(),
      homeTeam: home,
      awayTeam: away
    });
    
    console.log(`[AI Hook] Cached insights stored for ${cacheKey} (${insights.length} insights). Timestamp: ${new Date().toLocaleTimeString()}`);
  }, [getCacheKey]);

  /**
   * Clear cache (useful for debugging or forced refresh)
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    console.log('[AI Hook] Cache cleared');
  }, []);

  /**
   * Generate insights from the Orchestrator Service
   * 🏆 CRITICAL FIX: Only call the aiOptionService.generateMatchInsights
   */
  const generateInsights = useCallback(async (
    home: string, 
    away: string, 
    retryCount = 0
  ): Promise<AIInsight[]> => {
    const orchestratorService = serviceRegistry.current.orchestrator;
    const serviceName = 'orchestrator';
    
    if (!orchestratorService) {
        throw new Error("AI Orchestrator service not ready or registered.");
    }
    
    console.log(`[AI Hook] 🔄 Starting insight generation via ORCHESTRATOR for ${home} vs ${away} (Attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
        // 🎯 THE CORE CHANGE: Call the single orchestrator method
        const serviceInsights = await orchestratorService.generateInsights(home, away);
        
        // No need for conflict resolution or complex sorting here, as the orchestrator already did it.
        // Just add the source tag (which should be 'orchestrator' or already present)
        const taggedInsights = serviceInsights.map(insight => ({
            ...insight,
            source: insight.source || serviceName // Use existing source if present, or tag as orchestrator
        }));

        console.log(`[AI Hook] ✅ ORCHESTRATOR service returned ${taggedInsights.length} final insights`);
        
        return taggedInsights;
        
    } catch (error) {
        console.error(`[AI Hook] ❌ Error in ORCHESTRATOR service:`, error);
        
        const errors: AIInsightError[] = [{
            service: serviceName,
            error: error as Error,
            timestamp: Date.now()
        }];

        if (retryCount < maxRetries) {
            console.log(`[AI Hook] 🛑 Orchestrator failed, retrying in ${retryDelay}ms...`);
            
            setState(prev => ({
                ...prev,
                serviceErrors: errors
            }));

            return new Promise((resolve, reject) => {
                retryTimeoutRef.current = setTimeout(async () => {
                    try {
                        const result = await generateInsights(home, away, retryCount + 1);
                        resolve(result);
                    } catch (err) {
                        reject(err);
                    }
                }, retryDelay);
            });
        } else {
            setState(prev => ({
                ...prev,
                serviceErrors: errors
            }));
            throw new Error(`AI Orchestrator failed after ${maxRetries} retries: ${(error as Error).message}`);
        }
    }
  }, [maxRetries, retryDelay]);

  /**
   * Load insights (main function)
   */
  const loadInsights = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCachedInsights(homeTeam, awayTeam);
      if (cached) {
        setState(prev => ({
          ...prev,
          insights: cached,
          loading: false,
          error: null,
          lastUpdated: Date.now()
        }));
        console.log('[AI Hook] ➡️ loadInsights: Exiting after successful cache hit.'); 
        return;
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log('[AI Hook] 🗑️ loadInsights: Aborted previous request.');
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      loading: !forceRefresh ? true : prev.loading,
      isRefreshing: forceRefresh,
      error: null,
      serviceErrors: []
    }));

    try {
      const insights = await generateInsights(homeTeam, awayTeam);
      
      // Cache the results
      setCachedInsights(homeTeam, awayTeam, insights);
      
      setState(prev => ({
        ...prev,
        insights,
        loading: false,
        isRefreshing: false,
        error: null,
        lastUpdated: Date.now()
      }));

      console.log(`[AI Hook] 🎉 Successfully loaded and finished (Total: ${insights.length} insights)`);

    } catch (error) {
      console.error('[AI Hook] 💔 Failed to load insights:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        isRefreshing: false,
        error: (error as Error).message, 
      }));
    }
  }, [homeTeam, awayTeam, generateInsights, getCachedInsights, setCachedInsights]); 

  /**
   * Refresh insights manually
   */
  const refresh = useCallback(() => {
    console.log('[AI Hook] 🔄 Manual refresh requested.');
    lastLoadRef.current = null; 
    loadInsights(true);
  }, [loadInsights]);

  /**
   * Retry after error
   */
  const retry = useCallback(() => {
    console.log('[AI Hook] 🔄 Retry requested.');
    lastLoadRef.current = null; 
    setState(prev => ({
      ...prev,
      error: null,
      serviceErrors: []
    }));
    loadInsights(false);
  }, [loadInsights]);

  /**
   * Get insights for specific service (Now uses the 'source' tag from the insights)
   */
  const getInsightsByService = useCallback((serviceName: string): AIInsight[] => {
    return state.insights.filter(insight => insight.source === serviceName);
  }, [state.insights]);

  /**
   * Get insights by confidence level
   */
  const getInsightsByConfidence = useCallback((confidence: 'high' | 'medium' | 'low'): AIInsight[] => {
    return state.insights.filter(insight => insight.confidence === confidence);
  }, [state.insights]);

  // 👇 LOOP FIX: Use a single, gated useEffect to trigger the load.
  useEffect(() => {
    const currentKey = `${homeTeam}-${awayTeam}-${servicesReady}-${enabled}`;

    if (!enabled || !homeTeam || !awayTeam || !servicesReady) {
        console.log(`[AI Hook] 🛑 Gated load: Enabled=${enabled}, Teams=${!!homeTeam && !!awayTeam}, Ready=${servicesReady}`);
        return;
    }

    if (lastLoadRef.current === currentKey) {
        console.log(`[AI Hook] 🛑 Skipping redundant load: Key ${currentKey} is unchanged.`);
        return;
    }

    console.log(`[AI Hook] 💡 Initial/Team/Ready Load Triggered: Key ${currentKey}`);
    lastLoadRef.current = currentKey; 
    
    loadInsights(false);
    
  }, [enabled, homeTeam, awayTeam, servicesReady, loadInsights]); 


  // Effect 2: Set up auto-refresh if enabled
  useEffect(() => {
    if (refreshInterval > 0 && enabled && servicesReady) {
      console.log(`[AI Hook] ⏱️ Auto-refresh enabled: Interval ${refreshInterval}ms`);
      refreshIntervalRef.current = setInterval(() => {
        console.log('[AI Hook] 🔄 Auto-refreshing insights...');
        loadInsights(true);
      }, refreshInterval);

      return () => {
        console.log('[AI Hook] 🆑 Clearing auto-refresh interval.');
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    } else {
        console.log('[AI Hook] ⏱️ Auto-refresh disabled or waiting for services.');
    }
  }, [refreshInterval, enabled, loadInsights, servicesReady]);

  // Effect: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // 🏆 CRITICAL: Only register the single AI Orchestrator service
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Dynamic import of the single entry point
        const { aiOptionService } = await import('../services/ai/AIOptionService');
        
        registerService('orchestrator', {
          generateInsights: aiOptionService.generateMatchInsights.bind(aiOptionService)
        });
        
      } catch (error) {
        console.error('[AI Hook] ❌ Failed to register ORCHESTRATOR service:', error);
      } finally {
        setServicesReady(true);
        console.log('[AI Hook] ⚙️ Orchestrator service registered. servicesReady set to true.');
      }
    };

    initializeServices();
  }, [registerService]);

  return {
    // Core state
    insights: state.insights,
    loading: state.loading,
    error: state.error,
    isRefreshing: state.isRefreshing,
    lastUpdated: state.lastUpdated,
    
    // Service errors for debugging
    serviceErrors: state.serviceErrors,
    
    // Actions
    refresh,
    retry,
    clearCache,
    registerService,
    
    // Utility functions
    getInsightsByService,
    getInsightsByConfidence,
    
    // Cache info
    cacheStatus: {
      size: cacheRef.current.size,
      keys: Array.from(cacheRef.current.keys())
    },
    
    // Stats
    stats: {
      totalInsights: state.insights.length,
      highConfidence: state.insights.filter(i => i.confidence === 'high').length,
      mediumConfidence: state.insights.filter(i => i.confidence === 'medium').length,
      lowConfidence: state.insights.filter(i => i.confidence === 'low').length,
      // The concept of 'services' is simplified, but we keep a count of the primary one
      services: serviceRegistry.current.orchestrator ? 1 : 0
    }
  };
};

// Type exports for use in components
export type AIBettingHookReturn = ReturnType<typeof useAIBettingInsights>;
