// src/services/stats/supabaseTeamService.ts 

import { supabase } from '../supabaseClient';
import { normalizeTeamName } from '../../utils/teamUtils';

export class SupabaseTeamService {
    // Cache stores only the normalized team names (Set provides fast O(1) lookup)
    private teamNamesCache: Set<string> = new Set();
    private cacheTime = 0;
    // Cache the full list of teams for 1 hour, as team lists rarely change mid-session
    private readonly cacheTimeout = 60 * 60 * 1000; 

    private isCacheValid(): boolean {
        return this.teamNamesCache.size > 0 && Date.now() - this.cacheTime < this.cacheTimeout;
    }

    /**
     * @private
     * Fetches all unique, normalized team names from the database efficiently.
     * This query is much lighter than fetching all statistical match data.
     */
    private async fetchAllTeamNames(): Promise<Set<string>> {
        console.log('[SupabaseTeam] 🔄 Fetching unique team names...');
        
        try {
            // OPTIMIZED QUERY: Select only the team_name column from a table known to 
            // hold all teams (like 'team_misc_stats').
            const { data, error } = await supabase
                .from('team_misc_stats') 
                .select('team_name'); 
                
            if (error) {
                console.error('[SupabaseTeam] ❌ Error fetching team list:', error);
                throw new Error(`Supabase Team List Error: ${error.message}`);
            }

            if (!data || data.length === 0) {
                 console.warn('[SupabaseTeam] ⚠️ No team names found in database');
                 return new Set();
            }

            // Normalize and store unique names in a Set for fast lookup
            const normalizedNames = new Set(
                data.map(row => normalizeTeamName(row.team_name))
            );

            console.log(`[SupabaseTeam] ✅ Cached ${normalizedNames.size} unique teams.`);
            return normalizedNames;

        } catch (err) {
            console.error('[SupabaseTeam] 💥 Error during team name fetch:', err);
            throw err;
        }
    }

    /**
     * Public method to check if a team name exists in the league dataset.
     * This replaces the inefficient multi-service call in MatchContextService.
     */
    public async teamExists(teamName: string): Promise<boolean> {
        const normalizedName = normalizeTeamName(teamName);

        // 1. Check local cache (Set lookup is O(1))
        if (this.isCacheValid()) {
            return this.teamNamesCache.has(normalizedName);
        }

        // 2. Cache miss: Refresh the entire team list (the only database call)
        try {
            this.teamNamesCache = await this.fetchAllTeamNames();
            this.cacheTime = Date.now();
        } catch (error) {
            // If the fetch fails, rely on the old (stale) cache if it exists,
            // or return false if the cache is empty, to prevent application errors.
            console.warn('[SupabaseTeam] Failed to refresh team list cache. Checking stale cache or returning false.');
            if (this.teamNamesCache.size > 0) {
                return this.teamNamesCache.has(normalizedName);
            }
            return false;
        }

        // 3. Final check against the newly populated cache
        return this.teamNamesCache.has(normalizedName);
    }
}

export const supabaseTeamService = new SupabaseTeamService();
