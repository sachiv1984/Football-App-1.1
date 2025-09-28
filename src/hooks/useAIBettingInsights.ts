// src/hooks/useAIBettingInsights.ts
import { useState, useEffect, useCallback, useRef } from 'react';

// Local type definitions to avoid import conflicts
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
    services = ['goals'] // Default to just goals service
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

  // 👇 FIX 1: New state to track if essential services have been registered.
  const [servicesReady, setServicesReady] = useState(false);

  // Refs for cleanup and persistence
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, CachedInsights>>(new Map());

  // Service registry (will be populated as we add more services)
  const serviceRegistry = useRef<AIServiceRegistry>({});

  /**
   * Register AI services dynamically
   */
  const registerService = useCallback((serviceName: keyof AIServiceRegistry, service: AIService) => {
    serviceRegistry.current[serviceName] = service;
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
      console.log('[AI Hook] Using cached insights for', cacheKey);
      return cached.insights;
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
    
    console.log('[AI Hook] Cached insights for', cacheKey, `(${insights.length} insights)`);
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
    console.log(`[AI Hook] Generating insights for ${home} vs ${away} (attempt ${retryCount + 1})`);
    
    const allInsights: AIInsight[] = [];
    const errors: AIInsightError[] = [];

    // Process each enabled service
    for (const serviceName of services) {
      const service = serviceRegistry.current[serviceName];
      
      if (!service) {
        console.warn(`[AI Hook] Service '${serviceName}' not registered, skipping`);
        // Note: Skipping an unregistered service is fine, but if ALL required
        // services are unregistered on the first run, the retry logic below
        // will be triggered, which is the original issue.
        continue;
      }

      try {
        console.log(`[AI Hook] Calling ${serviceName} service...`);
        const serviceInsights = await service.generateInsights(home, away);
        
        // Add service identifier to insights
        const taggedInsights = serviceInsights.map(insight => ({
          ...insight,
          id: `${serviceName}-${insight.id}`,
          source: serviceName
        }));
        
        allInsights.push(...taggedInsights);
        console.log(`[AI Hook] ${serviceName} service returned ${serviceInsights.length} insights`);
        
      } catch (error) {
        console.error(`[AI Hook] Error in ${serviceName} service:`, error);
        errors.push({
          service: serviceName,
          error: error as Error,
          timestamp: Date.now()
        });
      }
    }

    // Handle errors
    if (allInsights.length === 0 && errors.length > 0) {
      // All services failed
      if (retryCount < maxRetries) {
        console.log(`[AI Hook] All services failed, retrying in ${retryDelay}ms...`);
        
        // 👇 FIX 3: Update state with service errors before retrying for better visibility
        setState(prev => ({
            ...prev,
            serviceErrors: errors
        }));

        return new Promise((resolve, reject) => {
          retryTimeoutRef.current = setTimeout(async () => {
            try {
              // The recursive call to generateInsights
              const result = await generateInsights(home, away, retryCount + 1);
              resolve(result);
            } catch (err) {
              reject(err);
            }
          }, retryDelay);
        });
      } else {
        // 👇 FIX 4: Update state with final service errors on maximum retry failure
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
  }, [services, maxRetries, retryDelay]); // Dependencies are correct

  /**
   * Load insights (main function)
   */
  const loadInsights = useCallback(async (forceRefresh = false) => {
    // 👇 FIX 2: Prevent loading if not enabled, or if teams are missing, OR IF SERVICES ARE NOT READY
    if (!enabled || !homeTeam || !awayTeam || !servicesReady) {
      // If we are waiting for services, don't run.
      // If `enabled` is false, it returns silently.
      return;
    }

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
        return;
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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

      console.log(`[AI Hook] Successfully loaded ${insights.length} insights`);

    } catch (error) {
      console.error('[AI Hook] Failed to load insights:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        isRefreshing: false,
        // The serviceErrors array is updated inside generateInsights, 
        // but ensure the main error is captured here too.
        error: (error as Error).message, 
        // serviceErrors: prev.serviceErrors (already updated or handled inside generateInsights)
      }));
    }
  }, [enabled, homeTeam, awayTeam, generateInsights, getCachedInsights, setCachedInsights, servicesReady]); // ADD servicesReady

  /**
   * Refresh insights manually
   */
  const refresh = useCallback(() => {
    loadInsights(true);
  }, [loadInsights]);

  /**
   * Retry after error
   */
  const retry = useCallback(() => {
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

  // Effect: Load insights when teams change
  useEffect(() => {
    // 👇 FIX 2: loadInsights is now gated by the servicesReady flag inside its body.
    loadInsights(false);
  }, [loadInsights]);

  // Effect: Set up auto-refresh if enabled
  useEffect(() => {
    // 👇 FIX 2: Also guard the auto-refresh until services are ready
    if (refreshInterval > 0 && enabled && servicesReady) {
      refreshIntervalRef.current = setInterval(() => {
        console.log('[AI Hook] Auto-refreshing insights...');
        loadInsights(true);
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval, enabled, loadInsights, servicesReady]); // ADD servicesReady

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

  // Auto-register goals service when available
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Dynamic import to avoid circular dependencies
        const { goalsAIService } = await import('../services/ai/goalsAIService');
        registerService('goals', {
          generateInsights: goalsAIService.generateGoalInsights.bind(goalsAIService)
        });
        console.log('[AI Hook] Goals service registered');
      } catch (error) {
        console.error('[AI Hook] Failed to register goals service:', error);
      } finally {
        // 👇 FIX 1: Crucial change. Mark services as ready after registration attempt, 
        // allowing loadInsights to run for the first time.
        setServicesReady(true);
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
export type { AIInsight };
