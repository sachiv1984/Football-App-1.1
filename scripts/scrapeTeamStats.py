import requests
import pandas as pd
import numpy as np
import time
from supabase import create_client, Client
import os
from datetime import datetime
import sys

# Get environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
FBR_API_KEY = os.getenv("FBR_API_KEY")
# --- NEW: Get optional target team ID for single-team scrape ---
TARGET_TEAM_ID = os.getenv("TARGET_TEAM_ID")

# Validate required environment variables
if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable is required")
if not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")
if not FBR_API_KEY:
    raise ValueError("FBR_API_KEY environment variable is required")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# FBR API Configuration
FBR_API_BASE = "https://fbrapi.com"
SEASON = os.getenv("SEASON", "2024-2025") # Use SEASON from environment
LEAGUE_ID = 9  # Premier League

# Team Configuration (Only the list structure is shown for brevity)
# ... [TEAMS list remains the same] ...
# Team Configuration
TEAMS = [
    {'id': 'arsenal', 'name': 'Arsenal', 'fbref_id': '18bb7c10'},
    {'id': 'aston-villa', 'name': 'Aston Villa', 'fbref_id': '8602292d'},
    {'id': 'bournemouth', 'name': 'Bournemouth', 'fbref_id': '4ba7cbea'},
    {'id': 'brentford', 'name': 'Brentford', 'fbref_id': 'cd051869'},
    {'id': 'brighton', 'name': 'Brighton & Hove Albion', 'fbref_id': 'd07537b9'},
    {'id': 'chelsea', 'name': 'Chelsea', 'fbref_id': 'cff3d9bb'},
    {'id': 'crystal-palace', 'name': 'Crystal Palace', 'fbref_id': '47c64c55'},
    {'id': 'everton', 'name': 'Everton', 'fbref_id': 'd3fd31cc'},
    {'id': 'fulham', 'name': 'Fulham', 'fbref_id': 'fd962109'},
    {'id': 'liverpool', 'name': 'Liverpool', 'fbref_id': '822bd0ba'},
    {'id': 'manchester-city', 'name': 'Manchester City', 'fbref_id': 'b8fd03ef'},
    {'id': 'manchester-united', 'name': 'Manchester United', 'fbref_id': '19538871'},
    {'id': 'newcastle-united', 'name': 'Newcastle United', 'fbref_id': 'b2b47a98'},
    {'id': 'nottingham-forest', 'name': 'Nottingham Forest', 'fbref_id': 'e4a775cb'},
    {'id': 'tottenham', 'name': 'Tottenham Hotspur', 'fbref_id': '361ca564'},
    {'id': 'west-ham', 'name': 'West Ham United', 'fbref_id': '7c21e445'},
    {'id': 'wolves', 'name': 'Wolverhampton Wanderers', 'fbref_id': '8cec06e1'},
    {'id': 'ipswich', 'name': 'Ipswich Town', 'fbref_id': 'b74092de'},
    {'id': 'leicester', 'name': 'Leicester City', 'fbref_id': 'a2d435b3'},
    {'id': 'southampton', 'name': 'Southampton', 'fbref_id': '33c895d4'}
]
# ... [TABLE_CONFIGS dictionary remains the same] ...
TABLE_CONFIGS = {
    'shooting': {
        'table_name': 'team_shooting_stats',
        'api_category': 'shooting',
        'team_mappings': {
            'gls': 'team_goals',
            'sh': 'team_shots',
            'sot': 'team_shots_on_target',
            'pct_sot': 'team_shot_on_target_pct',
            'gls_per_sh': 'team_goals_per_shot',
            'gls_per_sot': 'team_goals_per_shot_on_target',
            'avg_sh_dist': 'team_avg_shot_distance',
            'fk_sh': 'team_free_kick_shots',
            'pk_made': 'team_penalty_kicks',
            'pk_att': 'team_penalty_attempts'
        },
        'opponent_mappings': {
            'gls': 'opp_goals',
            'sh': 'opp_shots',
            'sot': 'opp_shots_on_target',
            'pct_sot': 'opp_shot_on_target_pct',
            'gls_per_sh': 'opp_goals_per_shot',
            'gls_per_sot': 'opp_goals_per_shot_on_target',
            'avg_sh_dist': 'opp_avg_shot_distance',
            'fk_sh': 'opp_free_kick_shots',
            'pk_made': 'opp_penalty_kicks',
            'pk_att': 'opp_penalty_attempts'
        }
    },
    'passing': {
        'table_name': 'team_passing_stats',
        'api_category': 'passing',
        'team_mappings': {
            'pass_cmp': 'team_passes_completed',
            'pass_att': 'team_passes_attempted',
            'pct_pass_cmp': 'team_pass_completion_pct',
            'pass_ttl_dist': 'team_total_pass_distance',
            'pass_prog_ttl_dist': 'team_progressive_pass_distance',
            'pass_cmp_s': 'team_short_passes_completed',
            'pass_cmp_m': 'team_medium_passes_completed',
            'pass_cmp_l': 'team_long_passes_completed',
            'ast': 'team_assists',
            'xag': 'team_expected_assisted_goals',
            'xa': 'team_expected_assists',
            'key_passes': 'team_key_passes',
            'pass_fthird': 'team_passes_into_final_third',
            'pass_opp_box': 'team_passes_into_penalty_area',
            'cross_opp_box': 'team_crosses_into_penalty_area',
            'pass_prog': 'team_progressive_passes'
        },
        'opponent_mappings': {
            'pass_cmp': 'opp_passes_completed',
            'pass_att': 'opp_passes_attempted',
            'pct_pass_cmp': 'opp_pass_completion_pct',
            'pass_ttl_dist': 'opp_total_pass_distance',
            'pass_prog_ttl_dist': 'opp_progressive_pass_distance',
            'pass_cmp_s': 'opp_short_passes_completed',
            'pass_cmp_m': 'opp_medium_passes_completed',
            'pass_cmp_l': 'opp_long_passes_completed',
            'ast': 'opp_assists',
            'xag': 'opp_expected_assisted_goals',
            'xa': 'opp_expected_assists',
            'key_passes': 'opp_key_passes',
            'pass_fthird': 'opp_passes_into_final_third',
            'pass_opp_box': 'opp_passes_into_penalty_area',
            'cross_opp_box': 'opp_crosses_into_penalty_area',
            'pass_prog': 'opp_progressive_passes'
        }
    },
    'passing_types': {
        'table_name': 'team_passing_types_stats',
        'api_category': 'passing_types',
        'team_mappings': {
            'pass_att': 'team_passes_attempted',
            'pass_live': 'team_live_passes',
            'pass_dead': 'team_dead_passes',
            'pass_fk': 'team_free_kick_passes',
            'through_balls': 'team_through_balls',
            'switches': 'team_switches',
            'crosses': 'team_crosses',
            'throw_ins': 'team_throw_ins',
            'ck': 'team_corner_kicks',
            'ck_in_swinger': 'team_inswinging_corners',
            'ck_out_swinger': 'team_outswinging_corners',
            'ck_straight': 'team_straight_corners',
            'pass_cmp': 'team_passes_completed',
            'pass_offside': 'team_passes_offside',
            'pass_blocked': 'team_passes_blocked'
        },
        'opponent_mappings': {
            'pass_att': 'opp_passes_attempted',
            'pass_live': 'opp_live_passes',
            'pass_dead': 'opp_dead_passes',
            'pass_fk': 'opp_free_kick_passes',
            'through_balls': 'opp_through_balls',
            'switches': 'opp_switches',
            'crosses': 'opp_crosses',
            'throw_ins': 'opp_throw_ins',
            'ck': 'opp_corner_kicks',
            'ck_in_swinger': 'opp_inswinging_corners',
            'ck_out_swinger': 'opp_outswinging_corners',
            'ck_straight': 'opp_straight_corners',
            'pass_cmp': 'opp_passes_completed',
            'pass_offside': 'opp_passes_offside',
            'pass_blocked': 'opp_passes_blocked'
        }
    },
    'gca': {
        'table_name': 'team_gca_stats',
        'api_category': 'gca',
        'team_mappings': {
            'sca': 'team_shot_creating_actions',
            'pass_live_sca': 'team_sca_pass_live',
            'pass_dead_sca': 'team_sca_pass_dead',
            'take_on_sca': 'team_sca_take_ons',
            'sh_sca': 'team_sca_shots',
            'fld_sca': 'team_sca_fouled',
            'def_sca': 'team_sca_defensive_actions',
            'gca': 'team_goal_creating_actions',
            'pass_live_gca': 'team_gca_pass_live',
            'pass_dead_gca': 'team_gca_pass_dead',
            'take_on_gca': 'team_gca_take_ons',
            'sh_gca': 'team_gca_shots',
            'fld_gca': 'team_gca_fouled',
            'def_gca': 'team_gca_defensive_actions'
        },
        'opponent_mappings': {
            'sca': 'opp_shot_creating_actions',
            'pass_live_sca': 'opp_sca_pass_live',
            'pass_dead_sca': 'opp_sca_pass_dead',
            'take_on_sca': 'opp_sca_take_ons',
            'sh_sca': 'opp_sca_shots',
            'fld_sca': 'opp_sca_fouled',
            'def_sca': 'opp_sca_defensive_actions',
            'gca': 'opp_goal_creating_actions',
            'pass_live_gca': 'opp_gca_pass_live',
            'pass_dead_gca': 'opp_gca_pass_dead',
            'take_on_gca': 'opp_gca_take_ons',
            'sh_gca': 'opp_gca_shots',
            'fld_gca': 'opp_gca_fouled',
            'def_gca': 'opp_gca_defensive_actions'
        }
    },
    'defense': {
        'table_name': 'team_defense_stats',
        'api_category': 'defense',
        'team_mappings': {
            'tkl': 'team_tackles',
            'tkl_won': 'team_tackles_won',
            'tkl_def_third': 'team_tackles_def_3rd',
            'tkl_mid_third': 'team_tackles_mid_3rd',
            'tkl_att_third': 'team_tackles_att_3rd',
            'tkl_drb': 'team_dribblers_tackled',
            'tkl_drb_att': 'team_dribbles_contested',
            'pct_tkl_drb_suc': 'team_tackle_pct',
            'blocks': 'team_blocks',
            'sh_blocked': 'team_shots_blocked',
            'int': 'team_interceptions',
            'tkl_plus_int': 'team_tackles_interceptions',
            'clearances': 'team_clearances',
            'def_error': 'team_errors'
        },
        'opponent_mappings': {
            'tkl': 'opp_tackles',
            'tkl_won': 'opp_tackles_won',
            'tkl_def_third': 'opp_tackles_def_3rd',
            'tkl_mid_third': 'opp_tackles_mid_3rd',
            'tkl_att_third': 'opp_tackles_att_third',
            'tkl_drb': 'opp_dribblers_tackled',
            'tkl_drb_att': 'opp_dribbles_contested',
            'pct_tkl_drb_suc': 'opp_tackle_pct',
            'blocks': 'opp_blocks',
            'sh_blocked': 'opp_shots_blocked',
            'int': 'opp_interceptions',
            'tkl_plus_int': 'opp_tackles_interceptions',
            'clearances': 'opp_clearances',
            'def_error': 'opp_errors'
        }
    },
    'keeper': {
        'table_name': 'team_keeper_stats',
        'api_category': 'keeper',
        'team_mappings': {
            'gls_ag': 'team_goals_against_gk',
            'sot_ag': 'team_shots_on_target_against',
            'saves': 'team_saves',
            'save_pct': 'team_save_percentage',
            'clean_sheets': 'team_clean_sheets',
            'pk_att': 'team_penalty_kicks_against',
            'pk_saved': 'team_penalty_saves',
            'pk_miss_ag': 'team_penalty_misses',
            'psxg': 'team_post_shot_expected_goals_against'
        },
        'opponent_mappings': {
            'gls_ag': 'opp_goals_against_gk',
            'sot_ag': 'opp_shots_on_target_against',
            'saves': 'opp_saves',
            'save_pct': 'opp_save_percentage',
            'clean_sheets': 'opp_clean_sheets',
            'pk_att': 'opp_penalty_kicks_against',
            'pk_saved': 'opp_penalty_saves',
            'pk_miss_ag': 'opp_penalty_misses',
            'psxg': 'opp_post_shot_expected_goals_against'
        }
    },
    'misc': {
        'table_name': 'team_misc_stats',
        'api_category': 'misc',
        'team_mappings': {
            'yellow_cards': 'team_yellow_cards',
            'red_cards': 'team_red_cards',
            'second_yellow_cards': 'team_second_yellow_cards',
            'fls_com': 'team_fouls',
            'fls_drawn': 'team_fouled',
            'offside': 'team_offsides',
            'crosses': 'team_crosses',
            'ball_recov': 'team_ball_recoveries',
            'air_dual_won': 'team_aerial_duels_won',
            'air_dual_lost': 'team_aerial_duels_lost',
            'pct_air_dual_won': 'team_aerial_duels_won_pct'
        },
        'opponent_mappings': {
            'yellow_cards': 'opp_yellow_cards',
            'red_cards': 'opp_red_cards',
            'second_yellow_cards': 'opp_second_yellow_cards',
            'fls_com': 'opp_fouls',
            'fls_drawn': 'opp_fouled',
            'offside': 'opp_offsides',
            'crosses': 'opp_crosses',
            'ball_recov': 'opp_ball_recoveries',
            'air_dual_won': 'opp_aerial_duels_won',
            'air_dual_lost': 'opp_aerial_duels_lost',
            'pct_air_dual_won': 'opp_aerial_duels_won_pct'
        }
    }
}


class TeamStatsScraper:
    
    def __init__(self, api_key, delay=3, max_retries=5):
        self.api_key = api_key
        self.delay = delay
        self.max_retries = max_retries
        self.headers = {"X-API-Key": self.api_key}
        self.base_url = FBR_API_BASE
    
    def get_team_match_stats(self, team_id, league_id, season_id):
        """Get all match stats for a team using FBR API with exponential backoff retries"""
        
        for attempt in range(self.max_retries):
            
            # --- Enforce API rate limit BEFORE every request after the first one ---
            if attempt > 0:
                # Use the standard delay (e.g., 3s) for all retries after the first one.
                print(f"⏳ Waiting {self.delay} seconds to adhere to API rate limit before attempt {attempt + 1}/{self.max_retries}...")
                time.sleep(self.delay) 
            # -------------------------------------------------------------
            
            try:
                url = f"{self.base_url}/team-match-stats"
                params = {
                    "team_id": team_id,
                    "league_id": league_id,
                    "season_id": season_id
                }
                
                # Use a generous client timeout
                response = requests.get(url, params=params, headers=self.headers, timeout=60) 
                
                # Check for HTTP status codes that are errors (like 504)
                response.raise_for_status() 
                
                # If successful, return data
                data = response.json()
                return data.get('data', [])
                
            except requests.exceptions.HTTPError as e:
                
                # Only retry on 504 if we have attempts left
                if e.response.status_code == 504 and attempt < self.max_retries - 1:
                    
                    # Exponential backoff: 5s, 10s, 20s, 40s...
                    wait_time = 2 ** attempt * 5 
                    print(f"⚠️ HTTP Error 504 (Gateway Timeout) for team {team_id}. Applying EXPONENTIAL BACKOFF: waiting {wait_time} seconds (Attempt {attempt + 1}/{self.max_retries} failed).")
                    time.sleep(wait_time)
                    continue 
                
                # Log final 504 error or any other non-retriable error (like 4xx)
                print(f"❌ HTTP Error {e.response.status_code} for team {team_id}: {e}")
                return None
            
            except requests.exceptions.Timeout:
                # Handle client-side timeout the same way
                if attempt < self.max_retries - 1:
                    wait_time = 2 ** attempt * 5 
                    print(f"⚠️ Request timed out (Client Timeout) for team {team_id}. Applying EXPONENTIAL BACKOFF: waiting {wait_time} seconds (Attempt {attempt + 1}/{self.max_retries} failed).")
                    time.sleep(wait_time)
                    continue 
                
                print(f"❌ Request Timeout for team {team_id} after {self.max_retries} attempts.")
                return None
                
            except Exception as e:
                print(f"❌ Error fetching team {team_id}: {e}")
                return None
                
        return None # Return None if all attempts fail
    
    def transform_match_data(self, match_data, team_id, team_name, stat_type, config):
        """Transform API data to match database schema"""
        records = []
        
        for match in match_data:
            meta = match.get('meta_data', {})
            stats = match.get('stats', {})
            
            # Get the specific stat category
            schedule = stats.get('schedule', {})
            category_stats = stats.get(config['api_category'], {})
            
            # Base record with common fields
            record = {
                'id': f"{team_id}_{meta.get('date', '')}_{meta.get('opponent', 'unknown')}".replace(' ', '_'),
                'season': SEASON,
                'team_id': team_id,
                'team_name': team_name,
                'match_date': meta.get('date'),
                'match_time': schedule.get('time'),
                'venue': meta.get('home_away'),
                'result': schedule.get('result'),
                'goals_for': schedule.get('gls'),
                'goals_against': schedule.get('gls_ag'),
                'opponent': meta.get('opponent')
            }
            
            # Map team stats
            for api_field, db_field in config['team_mappings'].items():
                value = category_stats.get(api_field)
                record[db_field] = value if value not in [None, ''] else None
            
            # Map opponent stats (if available)
            for api_field, db_field in config['opponent_mappings'].items():
                value = category_stats.get(api_field)
                record[db_field] = value if value not in [None, ''] else None
            
            records.append(record)
        
        return records
    
    def save_to_supabase(self, records, table_name):
        """Save records to Supabase with NaN handling"""
        if not records:
            print("⚠️ No data to save")
            return False
        
        try:
            # Convert to DataFrame for NaN handling
            df = pd.DataFrame(records)
            df = df.replace({pd.NA: None, float('nan'): None, np.nan: None})
            clean_records = df.to_dict('records')
            
            print(f"📤 Upserting {len(clean_records)} records to {table_name}...")
            
            # Upsert with conflict resolution
            result = supabase.table(table_name).upsert(
                clean_records,
                on_conflict='id'
            ).execute()
            
            print(f"✅ Successfully upserted {len(clean_records)} records to {table_name}")
            return True
            
        except Exception as e:
            print(f"❌ Error saving to {table_name}: {e}")
            return False
    
    def scrape_team_all_stats(self, team):
        """Scrape all stat types for a single team"""
        print(f"\n{'='*60}")
        print(f"🏆 Scraping {team['name']} ({team['id']})")
        print(f"{'='*60}")
        
        # Fetch data once from API
        match_data = self.get_team_match_stats(
            team['fbref_id'],
            LEAGUE_ID,
            SEASON
        )
        
        if not match_data:
            print(f"❌ No data returned for {team['name']}")
            return {'team': team['name'], 'success': False, 'stats_saved': 0}
        
        print(f"✅ Fetched {len(match_data)} matches for {team['name']}")
        
        # Process each stat type
        stats_saved = 0
        for stat_type, config in TABLE_CONFIGS.items():
            print(f"\n📊 Processing {stat_type}...")
            
            records = self.transform_match_data(
                match_data,
                team['id'],
                team['name'],
                stat_type,
                config
            )
            
            if records:
                success = self.save_to_supabase(records, config['table_name'])
                if success:
                    stats_saved += 1
            else:
                print(f"⚠️ No records to save for {stat_type}")
        
        return {
            'team': team['name'],
            'success': True,
            'matches': len(match_data),
            'stats_saved': stats_saved,
            'total_stat_types': len(TABLE_CONFIGS)
        }
    
    def scrape_all_teams(self):
        """Scrape all teams for all stat types OR a single target team"""
        
        # --- NEW: Filter TEAMS list based on environment variable ---
        teams_to_scrape = TEAMS
        if TARGET_TEAM_ID:
            teams_to_scrape = [team for team in TEAMS if team['id'] == TARGET_TEAM_ID]
            if not teams_to_scrape:
                print(f"❌ Error: Team ID '{TARGET_TEAM_ID}' not found in the configuration.")
                return []
            print(f"🎯 Running in SINGLE-TEAM mode for: {teams_to_scrape[0]['name']}")
        # -------------------------------------------------------------
        
        print(f"\n{'='*60}")
        print(f"🚀 Starting Team Stats Scraper")
        print(f"Season: {SEASON} | League: Premier League")
        print(f"Teams: {len(teams_to_scrape)} | Stat Types: {len(TABLE_CONFIGS)}")
        print(f"{'='*60}")
        
        results = []
        
        # Use delay from environment variable or default
        delay = int(os.getenv('SCRAPER_DELAY', 3)) 

        for i, team in enumerate(teams_to_scrape, 1):
            print(f"\n[{i}/{len(teams_to_scrape)}] Processing {team['name']}...")
            result = self.scrape_team_all_stats(team)
            results.append(result)
            
            # Delay between teams only if scraping multiple teams
            if not TARGET_TEAM_ID and i < len(teams_to_scrape):
                print(f"\n⏳ Waiting {delay} seconds before next team (API rate limit)..")
                time.sleep(delay)
            # If in single-team mode, exit after the first loop. (The loop runs only once)
        
        # Summary
        print(f"\n{'='*60}")
        print(f"📊 SCRAPING SUMMARY")
        # ... [Summary logic remains the same] ...
        successful = sum(1 for r in results if r['success'])
        total_matches = sum(r.get('matches', 0) for r in results)
        total_saves = sum(r.get('stats_saved', 0) for r in results)
        
        print(f"✅ Successful teams: {successful}/{len(teams_to_scrape)}")
        print(f"📈 Total matches processed: {total_matches}")
        print(f"💾 Total stat types saved: {total_saves}/{len(teams_to_scrape) * len(TABLE_CONFIGS)}")
        print(f"{'='*60}")
        
        return results


if __name__ == "__main__":
    # Validate API key
    if not FBR_API_KEY:
        print("❌ No FBR_API_KEY found!")
        print("\n🔑 Generating a new API key...\n")
        
        try:
            response = requests.post('https://fbrapi.com/generate_api_key')
            if response.ok:
                api_key = response.json().get('api_key')
                print(f"✅ Your API Key: {api_key}")
                print(f"\nAdd to .env or GitHub Secrets: FBR_API_KEY={api_key}")
            else:
                print(f"❌ Error generating key: {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        sys.exit(1)
    
    # Get delay and max_retries from environment or use default
    delay = int(os.getenv('SCRAPER_DELAY', 3))
    max_retries = int(os.getenv('MAX_RETRIES', 5))
    
    scraper = TeamStatsScraper(api_key=FBR_API_KEY, delay=delay, max_retries=max_retries)
    scraper.scrape_all_teams()

