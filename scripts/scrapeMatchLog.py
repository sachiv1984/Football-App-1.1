import requests
import pandas as pd
import time
from supabase import create_client, Client
import os
from datetime import datetime
import re
import sys # Added for graceful exit

# Get environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
FBR_API_KEY = os.getenv("FBR_API_KEY")

# Validate required environment variables
if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL environment variable is required")
if not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# FBR API Configuration
FBR_API_BASE = "https://fbrapi.com"

class FBRAPIScraper:
    def __init__(self, api_key, delay=3):
        """
        Initialize FBR API scraper
        
        Args:
            api_key: Your FBR API key
            delay: Seconds to wait between requests (API requires 3+ seconds)
        """
        self.api_key = api_key
        self.delay = delay
        self.headers = {"X-API-Key": self.api_key}
        self.base_url = FBR_API_BASE
    
    @staticmethod
    def get_expected_columns():
        """
        Defines and returns the canonical list of all expected database columns.
        This list must match the keys created in parse_match_data.
        
        NOTE: This list contains common columns and must be manually verified 
              against the full FBR API response for accuracy.
        """
        # Base metadata columns
        base_columns = [
            'fixture_id', 'match_url', 'team_name', 'team_side', 
            'player_id', 'player_name', 'player_country', 'player_number', 
            'age', 'is_goalkeeper'
        ]
        
        # Example Stat Columns (based on common FBR API structure)
        # Type Recommendation: NUMERIC for all stats, TEXT for positions.
        stat_columns = [
            'summary_minutes', 'summary_positions', 'summary_shots', 'summary_tackles', 
            'passing_cmp', 'passing_att', 'passing_total_dist', 
            'defense_tackles', 'defense_tackles_won', 'defense_pressures', 
            'possession_touches', 'possession_carries', 
            'goals_and_shots_shots_total', 'goals_and_shots_shots_on_target',
            'misc_fouls', 'misc_cards_yellow', 'misc_cards_red'
        ]

        # Combine, remove duplicates, and return sorted list
        return sorted(list(set(base_columns + stat_columns)))

    def validate_supabase_schema(self, table_name='player_match_stats'):
        """
        Validates that all expected columns are present in the Supabase table 
        and prints the full expected list for type verification.
        
        Returns:
            bool: True if all expected columns are present (or table is empty), False otherwise.
        """
        expected_columns = self.get_expected_columns()
        
        print(f"\n--- Database Schema Validation for '{table_name}' ---")
        print(f"Expecting {len(expected_columns)} columns in total.")
        
        # Always print the expected list first for the user to verify data types
        print("\n✅ Expected Columns List (You must create these in Supabase):")
        print("----------------------------------------------------------------------")
        print("| Column Name         | Suggested PostgreSQL Type                      |")
        print("----------------------------------------------------------------------")
        for col in expected_columns:
            # Simple heuristic for type recommendation
            if 'id' in col or 'number' in col:
                type_str = 'INTEGER'
            elif col in ['match_url', 'team_name', 'team_side', 'player_name', 'player_country', 'summary_positions']:
                type_str = 'TEXT'
            elif col == 'is_goalkeeper':
                type_str = 'BOOLEAN'
            else:
                type_str = 'NUMERIC' # Safe choice for all stats and age
            print(f"| {col:<20}| {type_str:<45}|")
        print("----------------------------------------------------------------------")

        try:
            # Fetch one row to check the existing columns (relies on table having data)
            response = supabase.table(table_name).select('*').limit(1).execute()
            
            if not response.data:
                print(f"⚠️ Warning: '{table_name}' table is empty. Dynamic column check skipped.")
                return True 
                
            actual_columns = set(response.data[0].keys())
            missing_columns = [col for col in expected_columns if col not in actual_columns]
            
            if missing_columns:
                print(f"\n❌ Validation FAILED: Found {len(missing_columns)} missing columns.")
                print("Missing Columns Found in Your Database:")
                for col in missing_columns:
                    print(f"  - {col}")
                print("\n🛑 Please add these columns to the 'player_match_stats' table and ensure correct data types.")
                return False
            else:
                print(f"\n✅ Validation SUCCESS: All {len(expected_columns)} expected columns are present.")
                return True

        except Exception as e:
            print(f"\n❌ Error during schema validation: {e}")
            print("Could not connect or query table. Please check table name and permissions.")
            return False
            
    def generate_api_key(self):
        """Generate a new API key (run this once)"""
        response = requests.post(f"{self.base_url}/generate_api_key")
        if response.ok:
            api_key = response.json().get('api_key')
            print(f"Generated API Key: {api_key}")
            print("Save this to your .env file as FBR_API_KEY")
            return api_key
        else:
            print(f"Error generating API key: {response.status_code}")
            return None

    def extract_match_id_from_url(self, url):
        """
        Extract match ID (8-character alphanumeric string) from FBref URL
        """
        if not url:
            return None
        
        # Use regex to find the 8-character ID immediately following '/matches/'
        match = re.search(r'/matches/([a-z0-9]{8})', url)
        if match:
            return match.group(1)
        return None
    
    def is_valid_fbref_match_url(self, url):
        """Checks if the URL is a valid FBref match URL."""
        if not url or not url.startswith('https://fbref.com/'):
            return False
        return self.extract_match_id_from_url(url) is not None
    
    def mark_as_scraped(self, match_url):
        """Mark a match as scraped in the database"""
        try:
            supabase.table('scraped_matches').insert({
                'match_url': match_url,
                'scraped_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error marking as scraped: {e}")
    
    def get_match_players_stats(self, match_id):
        """Get all player stats for a match using FBR API"""
        time.sleep(self.delay)
        
        try:
            url = f"{self.base_url}/all-players-match-stats"
            params = {"match_id": match_id}
            
            response = requests.get(url, params=params, headers=self.headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            return data.get('data', [])
            
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error {e.response.status_code} for match {match_id}: {e}")
            return None
        except Exception as e:
            print(f"Error fetching match {match_id}: {e}")
            return None
    
    def parse_match_data(self, match_data, match_url, fixture_id):
        """
        Parse API response into DataFrame
        """
        all_players = []
        
        for team in match_data:
            team_name = team.get('team_name')
            home_away = team.get('home_away')
            
            for player_entry in team.get('players', []):
                meta = player_entry.get('meta_data', {})
                stats = player_entry.get('stats', {})
                
                # Base metadata (must match get_expected_columns)
                player_data = {
                    'fixture_id': fixture_id,
                    'match_url': match_url,
                    'team_name': team_name,
                    'team_side': home_away,
                    'player_id': meta.get('player_id'),
                    'player_name': meta.get('player_name'),
                    'player_country': meta.get('player_country_code'),
                    'player_number': meta.get('player_number'),
                    'age': meta.get('age'), 
                }
                
                # Add all flattened stat categories (must match get_expected_columns)
                for category, category_stats in stats.items():
                    if isinstance(category_stats, dict):
                        for stat_name, stat_value in category_stats.items():
                            player_data[f"{category}_{stat_name}"] = stat_value
                
                # Check if goalkeeper based on position
                position = player_data.get('summary_positions', '')
                player_data['is_goalkeeper'] = 'GK' in str(position)
                
                all_players.append(player_data)
        
        return pd.DataFrame(all_players) if all_players else None
    
    def save_to_supabase(self, df, table_name='player_match_stats'):
        """Save DataFrame to Supabase"""
        if df is None or df.empty:
            return
        
        try:
            records = df.to_dict('records')
            
            # Insert in batches
            batch_size = 100
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                supabase.table(table_name).insert(batch).execute()
                print(f"Inserted batch {i//batch_size + 1} ({len(batch)} records)")
                
        except Exception as e:
            print(f"Error saving to Supabase: {e}")
    
    def process_all_matches(self):
        """Main method to process all unscraped matches with upfront planning (4 Steps)."""
        try:
            print("="*50)
            
            # --- STEP 1: Review fixtures table for URLs ---
            response = supabase.table('fixtures').select('id, matchurl').execute()
            all_fixtures = [(row['id'], row['matchurl']) for row in response.data if row.get('matchurl')]
            total_fixtures = len(all_fixtures)
            print(f"Step 1: Found {total_fixtures} total fixtures with URLs in 'fixtures' table.")

            # --- STEP 2: How many are valid URLs? ---
            valid_fixtures = [
                (fid, url) for fid, url in all_fixtures 
                if self.is_valid_fbref_match_url(url)
            ]
            valid_count = len(valid_fixtures)
            invalid_count = total_fixtures - valid_count
            print(f"Step 2: Identified {valid_count} valid FBref match URLs. ({invalid_count} invalid/missing ID)")

            if not valid_fixtures:
                print("No valid match URLs found to process. Exiting.")
                return

            # --- STEP 3: Check scraped table to determine which URLs need scraping ---
            
            # Get a list of all match URLs that have already been scraped (efficient)
            scraped_response = supabase.table('scraped_matches').select('match_url').execute()
            scraped_urls = {row['match_url'] for row in scraped_response.data}
            
            # Filter the valid fixtures list to include only those not yet scraped
            to_scrape = [
                (fid, url) for fid, url in valid_fixtures 
                if url not in scraped_urls
            ]
            
            skipped_count = valid_count - len(to_scrape)
            scrape_count = len(to_scrape)
            
            print(f"Step 3: Found {skipped_count} already scraped in 'scraped_matches' table.")
            print(f"Step 4: Planning to scrape {scrape_count} fixtures.")
            print("="*50)
            
            if not to_scrape:
                print("All valid fixtures are already scraped. Job complete.")
                return

            # --- STEP 4: Scrape the remaining list of fixtures ---
            
            scraped_success_count = 0
            failed_count = 0
            
            for fixture_id, url in to_scrape:
                match_id = self.extract_match_id_from_url(url)
                
                print(f"Scraping fixture {fixture_id}, match ID: {match_id}")
                
                # Get player stats from API
                match_data = self.get_match_players_stats(match_id)
                
                if match_data:
                    # Parse into DataFrame
                    df = self.parse_match_data(match_data, url, fixture_id)
                    
                    if df is not None and not df.empty:
                        self.save_to_supabase(df)
                        self.mark_as_scraped(url)
                        scraped_success_count += 1
                        print(f"✅ Successfully scraped {len(df)} player records for fixture {fixture_id}")
                    else:
                        print(f"⚠️ No player data found for fixture {fixture_id}. Marking as failed.")
                        failed_count += 1
                else:
                    print(f"❌ Failed to fetch data for fixture {fixture_id}. API call failed.")
                    failed_count += 1
            
            print(f"\n{'='*50}")
            print(f"Scraping complete!")
            print(f"✅ Newly scraped: {scraped_success_count}")
            print(f"⏭️  Skipped (already scraped): {skipped_count}")
            print(f"❌ Failed during scraping: {failed_count}")
            print(f"{'='*50}")
            
        except Exception as e:
            print(f"Error in process_all_matches: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    # Check if API key exists
    if not FBR_API_KEY:
        print("❌ No FBR_API_KEY found in environment variables!")
        print("\n🔑 Attempting to generate a new API key for you...\n")
        
        # Generate API key
        try:
            response = requests.post('https://fbrapi.com/generate_api_key')
            if response.ok:
                api_key = response.json().get('api_key')
                print(f"✅ Your FBR API Key: {api_key}")
                print("\nAdd this to your .env file or GitHub Secrets:")
                print(f"FBR_API_KEY={api_key}")
                print("\nThen run this script again.")
            else:
                print(f"❌ Error generating API key: {response.status_code}")
        except Exception as e:
            print(f"❌ Error during API key generation: {e}")
        
        sys.exit(1) # Exit if key is missing

    
    # Get delay from environment variable or use default
    delay = int(os.getenv('SCRAPER_DELAY', 3))
    print(f"Using FBR API with {delay} second delay between requests")
    
    scraper = FBRAPIScraper(api_key=FBR_API_KEY, delay=delay)
    
    # --- SCHEMA VALIDATION CHECK ---
    if not scraper.validate_supabase_schema():
        print("\n🛑 FATAL ERROR: Database schema validation failed. Exiting script.")
        sys.exit(1) 

    # If validation passes, proceed with scraping
    scraper.process_all_matches()
