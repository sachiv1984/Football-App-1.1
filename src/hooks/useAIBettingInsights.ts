// src/hooks/useAIBettingInsights.ts
import { useState, useEffect, useCallback, useRef } from 'react';

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
  aiEnhanced?: boolean;
  // 👇 NEW: Added fields from conflictResolverService for completeness
  conflictScore?: number; 
  valueScore?: number;
}

// Service interfaces for future extensibility
interface AIService {
  generateInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]>;
}

interface AIServiceRegistry {
  goals?: AIService;
  cards?: AIService;
  corners?: AIService;
  shots?: AIService;
  fouls?: AIService;
}

interface UseAIBettingInsightsOptions {
  enabled?: boolean;
  refreshInterval?: number; // Auto-refresh interval in ms
  maxRetries?: number;
  retryDelay?: number;
  cacheTimeout?: number; // Cache timeout in ms
  services?: (keyof AIServiceRegistry)[]; // Which services to use
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
    services = ['goals', 'corners'] // 👈 UPDATED: Default to goals and corners services
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
  // preventing redundant loads triggered by state updates.
  const lastLoadRef = useRef<string | null>(null);

  // Service registry (will be populated as we add more services)
  const serviceRegistry = useRef<AIServiceRegistry>({});

  /**
   * Register AI services dynamically
   */
  const registerService = useCallback((serviceName: keyof AIServiceRegistry, service: AIService) => {
    serviceRegistry.current[serviceName] = service;
    console.log(`[AI Hook] Service '${serviceName}' registered.`);
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
   * Generate insights from all enabled services
   */
  const generateInsights = useCallback(async (
    home: string, 
    away: string, 
    retryCount = 0
  ): Promise<AIInsight[]> => {
    console.log(`[AI Hook] 🔄 Starting insight generation for ${home} vs ${away} (Attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    const allInsights: AIInsight[] = [];
    const errors: AIInsightError[] = [];
    let servicesAttempted = 0;

    // Process each enabled service
    for (const serviceName of services) {
      const service = serviceRegistry.current[serviceName];
      
      if (!service) {
        console.warn(`[AI Hook] ⚠️ Service '${serviceName}' not registered, skipping`);
        continue;
      }
      servicesAttempted++;

      try {
        console.log(`[AI Hook] ⚙️ Calling ${serviceName} service...`);
        const serviceInsights = await service.generateInsights(home, away);
        
        // Add service identifier to insights
        const taggedInsights = serviceInsights.map(insight => ({
          ...insight,
          id: `${serviceName}-${insight.id}`,
          source: serviceName
        }));
        
        allInsights.push(...taggedInsights);
        console.log(`[AI Hook] ✅ ${serviceName} service returned ${serviceInsights.length} insights`);
        
      } catch (error) {
        console.error(`[AI Hook] ❌ Error in ${serviceName} service:`, error);
        errors.push({
          service: serviceName,
          error: error as Error,
          timestamp: Date.now()
        });
      }
    }
    
    console.log(`[AI Hook] Generation summary: ${servicesAttempted} services attempted. ${allInsights.length} total insights generated. ${errors.length} service errors.`); 

    // Handle errors
    if (allInsights.length === 0 && errors.length > 0) {
      // All services failed
      if (retryCount < maxRetries) {
        console.log(`[AI Hook] 🛑 All services failed, retrying in ${retryDelay}ms...`);
        
        // Update state with service errors before retrying
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
        // Update state with final service errors on maximum retry failure
        setState(prev => ({
            ...prev,
            serviceErrors: errors
        }));
        throw new Error(`All AI services failed after ${maxRetries} retries`);
      }
    }

    // Sort insights by confidence and limit results
    const sortedInsights = allInsights
      .sort((a, b) => {
        const confidenceOrder: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 };
        return (confidenceOrder[b.confidence] || 1) - (confidenceOrder[a.confidence] || 1);
      })
      .slice(0, 12); // Maximum 12 total insights

    return sortedInsights;
  }, [services, maxRetries, retryDelay]);

  /**
   * Load insights (main function)
   */
  const loadInsights = useCallback(async (forceRefresh = false) => {
    // Note: The main useEffect now handles the servicesReady/enabled/team checks
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCachedInsights(homeTeam, awayTeam);
      if (cached) {
        // This setState triggers a re-render
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
  // Removed 'enabled' and 'servicesReady' from dependency array here 
  // because the calling useEffect handles those checks, simplifying loadInsights.

  /**
   * Refresh insights manually
   */
  const refresh = useCallback(() => {
    console.log('[AI Hook] 🔄 Manual refresh requested.');
    
    // LOOP FIX: Clear the lastLoadRef on manual refresh so the load is forced.
    lastLoadRef.current = null; 
    
    loadInsights(true);
  }, [loadInsights]);

  /**
   * Retry after error
   */
  const retry = useCallback(() => {
    console.log('[AI Hook] 🔄 Retry requested.');
    
    // LOOP FIX: Clear the lastLoadRef on retry so the load is forced.
    lastLoadRef.current = null; 
    
    setState(prev => ({
      ...prev,
      error: null,
      serviceErrors: []
    }));
    loadInsights(false);
  }, [loadInsights]);

  /**
   * Get insights for specific service
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
    // Generate a unique identifier for the current combination of inputs
    const currentKey = `${homeTeam}-${awayTeam}-${servicesReady}-${enabled}`;

    // Prevent running if not enabled or teams are missing, and services aren't ready
    if (!enabled || !homeTeam || !awayTeam || !servicesReady) {
        console.log(`[AI Hook] 🛑 Gated load: Enabled=${enabled}, Teams=${!!homeTeam && !!awayTeam}, Ready=${servicesReady}`);
        // If we exit here, we might need to update the ref if an invalid state persists
        // For simplicity, we only check against the key when all conditions are met.
        return;
    }

    // Prevents redundant re-runs triggered by setState *after* a load is complete.
    if (lastLoadRef.current === currentKey) {
        console.log(`[AI Hook] 🛑 Skipping redundant load: Key ${currentKey} is unchanged.`);
        return;
    }

    console.log(`[AI Hook] 💡 Initial/Team/Ready Load Triggered: Key ${currentKey}`);
    lastLoadRef.current = currentKey; // Update ref BEFORE calling loadInsights
    
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

  // 👈 UPDATED: Auto-register goals and corners services when available
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Dynamic import to avoid circular dependencies
        const { goalsAIService } = await import('../services/ai/goalsAIService');
        const { cornersAIService } = await import('../services/ai/cornersAIService');
        
        registerService('goals', {
          generateInsights: goalsAIService.generateGoalInsights.bind(goalsAIService)
        });
        
        registerService('corners', {
          generateInsights: cornersAIService.generateCornerInsights.bind(cornersAIService)
        });
        
      } catch (error) {
        console.error('[AI Hook] ❌ Failed to register services:', error);
      } finally {
        // Crucial change. Mark services as ready after registration attempt.
        setServicesReady(true);
        console.log('[AI Hook] ⚙️ All initial services processed. servicesReady set to true.');
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
      services: services.length
    }
  };
};

// Type exports for use in components
export type AIBettingHookReturn = ReturnType<typeof useAIBettingInsights>;