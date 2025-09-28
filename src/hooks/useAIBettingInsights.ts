// src/hooks/useAIBettingInsights.ts
import { useState, useEffect, useCallback, useRef } from 'react';

// Local type definitions to avoid import conflicts
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

  // New state to track if essential services have been registered.
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
    console.log(`[AI Hook] Service '${serviceName}' registered.`); // 👈 ADDED LOG
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
    const isValid = Date.now() - cached.timestamp < cacheTimeout;
    // console.log(`[AI Hook] Cache check: Valid=${isValid}`); // Too verbose, omit
    return isValid;
  }, [cacheTimeout]);

  /**
   * Get insights from cache if available and valid
   */
  const getCachedInsights = useCallback((home: string, away: string): AIInsight[] | null => {
    const cacheKey = getCacheKey(home, away);
    const cached = cacheRef.current.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      console.log(`[AI Hook] Using valid cached insights for ${cacheKey}. Timestamp: ${new Date(cached.timestamp).toLocaleTimeString()}`); // 👈 IMPROVED LOG
      return cached.insights;
    }

    if (cached) {
      console.log(`[AI Hook] Cache expired for ${cacheKey}. Cache time: ${new Date(cached.timestamp).toLocaleTimeString()}.`); // 👈 ADDED LOG for expired cache
    } else {
      console.log(`[AI Hook] No cache found for ${cacheKey}.`); // 👈 ADDED LOG for no cache
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
    
    console.log(`[AI Hook] Cached insights stored for ${cacheKey} (${insights.length} insights). Timestamp: ${new Date().toLocaleTimeString()}`); // 👈 IMPROVED LOG
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
    console.log(`[AI Hook] 🔄 Starting insight generation for ${home} vs ${away} (Attempt ${retryCount + 1}/${maxRetries + 1})`); // 👈 IMPROVED LOG
    
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
        console.log(`[AI Hook] ⚙️ Calling ${serviceName} service...`); // 👈 IMPROVED LOG
        const serviceInsights = await service.generateInsights(home, away);
        
        // Add service identifier to insights
        const taggedInsights = serviceInsights.map(insight => ({
          ...insight,
          id: `${serviceName}-${insight.id}`,
          source: serviceName
        }));
        
        allInsights.push(...taggedInsights);
        console.log(`[AI Hook] ✅ ${serviceName} service returned ${serviceInsights.length} insights`); // 👈 IMPROVED LOG
        
      } catch (error) {
        console.error(`[AI Hook] ❌ Error in ${serviceName} service:`, error);
        errors.push({
          service: serviceName,
          error: error as Error,
          timestamp: Date.now()
        });
      }
    }
    
    // 👇 ADDED LOG for clarity on execution outcome
    console.log(`[AI Hook] Generation summary: ${servicesAttempted} services attempted. ${allInsights.length} total insights generated. ${errors.length} service errors.`); 

    // Handle errors
    if (allInsights.length === 0 && errors.length > 0) {
      // All services failed
      if (retryCount < maxRetries) {
        console.log(`[AI Hook] 🛑 All services failed, retrying in ${retryDelay}ms...`); // 👈 IMPROVED LOG
        
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
    // 👇 ADDED LOG with reason for exit
    if (!enabled) { console.log('[AI Hook] 🛑 loadInsights: Disabled by options.'); return; }
    if (!homeTeam || !awayTeam) { console.log('[AI Hook] 🛑 loadInsights: Missing team names.'); return; }
    if (!servicesReady) { console.log('[AI Hook] 🛑 loadInsights: Services not yet ready.'); return; }
    
    console.log(`[AI Hook] 🚀 loadInsights: Triggered (Force: ${forceRefresh}) for ${homeTeam} vs ${awayTeam}`); // 👈 IMPROVED LOG

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
        // 👇 ADDED LOG to indicate successful cache exit
        console.log('[AI Hook] ➡️ loadInsights: Exiting after successful cache hit.'); 
        return;
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log('[AI Hook] 🗑️ loadInsights: Aborted previous request.'); // 👈 ADDED LOG
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

      console.log(`[AI Hook] 🎉 Successfully loaded and finished (Total: ${insights.length} insights)`); // 👈 IMPROVED LOG

    } catch (error) {
      console.error('[AI Hook] 💔 Failed to load insights:', error); // 👈 IMPROVED LOG
      
      setState(prev => ({
        ...prev,
        loading: false,
        isRefreshing: false,
        error: (error as Error).message,
      }));
    }
  }, [enabled, homeTeam, awayTeam, generateInsights, getCachedInsights, setCachedInsights, servicesReady]); 

  /**
   * Refresh insights manually
   */
  const refresh = useCallback(() => {
    console.log('[AI Hook] 🔄 Manual refresh requested.'); // 👈 ADDED LOG
    loadInsights(true);
  }, [loadInsights]);

  /**
   * Retry after error
   */
  const retry = useCallback(() => {
    console.log('[AI Hook] 🔄 Retry requested.'); // 👈 ADDED LOG
    setState(prev => ({
      ...prev,
      error: null,
      serviceErrors: []
    }));
    loadInsights(false);
  }, [loadInsights]);

  // Effect: Load insights when teams change or services become ready
  useEffect(() => {
    console.log(`[AI Hook] 💡 useEffect[loadInsights]: Running. Teams: ${homeTeam} vs ${awayTeam}. Services Ready: ${servicesReady}`); // 👈 ADDED LOG
    loadInsights(false);
  }, [loadInsights, homeTeam, awayTeam, servicesReady]); // Added homeTeam/awayTeam to dependency array for clarity

  // Effect: Set up auto-refresh if enabled
  useEffect(() => {
    if (refreshInterval > 0 && enabled && servicesReady) {
      console.log(`[AI Hook] ⏱️ Auto-refresh enabled: Interval ${refreshInterval}ms`); // 👈 ADDED LOG
      refreshIntervalRef.current = setInterval(() => {
        console.log('[AI Hook] 🔄 Auto-refreshing insights...');
        loadInsights(true);
      }, refreshInterval);

      return () => {
        console.log('[AI Hook] 🆑 Clearing auto-refresh interval.'); // 👈 ADDED LOG
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    } else {
        console.log('[AI Hook] ⏱️ Auto-refresh disabled or waiting for services.'); // 👈 ADDED LOG
    }
  }, [refreshInterval, enabled, loadInsights, servicesReady]);

  // ... (Cleanup and utility effects omitted for brevity, no logs added there)

  // Auto-register goals service when available
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Dynamic import to avoid circular dependencies
        const { goalsAIService } = await import('../services/ai/goalsAIService');
        registerService('goals', {
          generateInsights: goalsAIService.generateGoalInsights.bind(goalsAIService)
        });
      } catch (error) {
        console.error('[AI Hook] ❌ Failed to register goals service:', error);
      } finally {
        // Crucial change. Mark services as ready after registration attempt.
        setServicesReady(true);
        console.log('[AI Hook] ⚙️ All initial services processed. servicesReady set to true.'); // 👈 ADDED LOG
      }
    };

    initializeServices();
  }, [registerService]);

  return {
    // ... (return object is unchanged)
  };
};
