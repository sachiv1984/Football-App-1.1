import requests
import pandas as pd
import numpy as np
import time
from supabase import create_client, Client
import os
from datetime import datetime
import re
import sys 

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

    def extract_match_id_from_url(self, url):
        """Extract match ID (8-character alphanumeric string) from FBref URL"""
        if not url:
            return None
        
        match = re.search(r'/matches/([a-z0-9]{8})', url)
        if match:
            return match.group(1)
        return None
    
    def is_valid_fbref_match_url(self, url):
        """Checks if the URL is a valid FBref match URL"""
        if not url or not url.startswith('https://fbref.com/'):
            return False
        return self.extract_match_id_from_url(url) is not None
    
    # 🚨 UPDATED: Added match metadata to the insertion
    def mark_as_scraped(self, match_url, datetime_str, hometeam, awayteam, venue):
        """Mark a match as scraped in the database"""
        try:
            supabase.table('scraped_matches').insert({
                'match_url': match_url,
                'match_datetime': datetime_str,
                'home_team': hometeam,
                'away_team': awayteam,
                'venue': venue,
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
    
    # 🚨 UPDATED: New arguments added to the method signature
    def parse_match_data(self, match_data, match_url, fixture_id, datetime_str, hometeam, awayteam, venue):
        """Parse API response into DataFrame, including match metadata"""
        all_players = []
        
        for team in match_data:
            team_name = team.get('team_name')
            home_away = team.get('home_away')
            
            for player_entry in team.get('players', []):
                meta = player_entry.get('meta_data', {})
                stats = player_entry.get('stats', {})
                
                # Base metadata - 🚨 UPDATED: Added new metadata fields
                player_data = {
                    'fixture_id': fixture_id,
                    'match_url': match_url,
                    'match_datetime': datetime_str,  # New field
                    'home_team': hometeam,           # New field
                    'away_team': awayteam,           # New field
                    'venue': venue,                  # New field
                    'team_name': team_name,
                    'team_side': home_away,
                    'player_id': meta.get('player_id'),
                    'player_name': meta.get('player_name'),
                    'player_country': meta.get('player_country_code'),
                    'player_number': meta.get('player_number'),
                    'age': meta.get('age'), 
                }
                
                # Add all flattened stat categories
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
        """Save DataFrame to Supabase with proper NaN handling"""
        if df is None or df.empty:
            print("⚠️ No data to save")
            return
        
        try:
            # CRITICAL: Replace NaN values with None (NULL in database)
            # Use 'fillna' for better compatibility with mixed types before converting to records
            df = df.replace({pd.NA: None, float('nan'): None, np.nan: None})
            
            # Convert DataFrame to records
            records = df.to_dict('records')
            
            print(f"Preparing to insert {len(records)} player records...")
            
            # Insert in batches
            batch_size = 100
            successful_inserts = 0
            
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                
                try:
                    supabase.table(table_name).insert(batch).execute()
                    successful_inserts += len(batch)
                    print(f"✅ Batch {i//batch_size + 1}: {len(batch)} records (Total: {successful_inserts}/{len(records)})")
                except Exception as batch_error:
                    print(f"❌ Error in batch {i//batch_size + 1}: {batch_error}")
                    
                    # Try inserting one by one to find problematic record
                    print(f"Attempting individual inserts...")
                    for record in batch:
                        try:
                            supabase.table(table_name).insert([record]).execute()
                            successful_inserts += 1
                        except Exception as single_error:
                            # Note: Supabase error messages are often long. Keep the print concise.
                            error_summary = str(single_error).split('\n')[0].strip()
                            print(f"❌ Failed: {record.get('player_name', 'Unknown')} - {error_summary}")
            
            print(f"\n{'='*50}")
            print(f"✅ Successfully inserted {successful_inserts}/{len(records)} records")
            print(f"{'='*50}\n")
                    
        except Exception as e:
            print(f"❌ Error saving to Supabase: {e}")
            import traceback
            traceback.print_exc()
    
    def process_all_matches(self):
        """Main method to process all unscraped matches"""
        try:
            print("="*50)
            
            # 🚨 UPDATED: Selects new metadata fields
            response = supabase.table('fixtures').select(
                'id, matchurl, datetime, hometeam, awayteam, venue'
            ).execute()
            
            # Store all required fields from fixtures table
            all_fixtures = [
                (
                    row['id'], 
                    row['matchurl'], 
                    row.get('datetime'), 
                    row.get('hometeam'), 
                    row.get('awayteam'), 
                    row.get('venue')
                )
                for row in response.data 
                if row.get('matchurl')
            ]
            print(f"Step 1: Found {len(all_fixtures)} fixtures with URLs")

            # Step 2: Filter valid FBref URLs
            valid_fixtures = [
                (fid, url, dt, home, away, venue) 
                for fid, url, dt, home, away, venue in all_fixtures 
                if self.is_valid_fbref_match_url(url)
            ]
            print(f"Step 2: {len(valid_fixtures)} valid FBref match URLs")

            if not valid_fixtures:
                print("No valid match URLs found. Exiting.")
                return

            # Step 3: Check which are already scraped
            scraped_response = supabase.table('scraped_matches').select('match_url').execute()
            scraped_urls = {row['match_url'] for row in scraped_response.data}
            
            # Only include fixtures not yet scraped
            to_scrape = [
                (fid, url, dt, home, away, venue) 
                for fid, url, dt, home, away, venue in valid_fixtures 
                if url not in scraped_urls
            ]
            
            print(f"Step 3: {len(scraped_urls)} already scraped")
            print(f"Step 4: Planning to scrape {len(to_scrape)} fixtures")
            print("="*50)
            
            if not to_scrape:
                print("✅ All fixtures already scraped!")
                return

            # Step 4: Scrape remaining fixtures
            scraped_success = 0
            failed = 0
            
            # 🚨 UPDATED: Unpack all 6 fields from the to_scrape list
            for fixture_id, url, datetime_str, hometeam, awayteam, venue in to_scrape:
                match_id = self.extract_match_id_from_url(url)
                print(f"\nScraping fixture {fixture_id}, match ID: {match_id}")
                
                match_data = self.get_match_players_stats(match_id)
                
                if match_data:
                    # 🚨 UPDATED: Pass all new fields to the parse_match_data method
                    df = self.parse_match_data(
                        match_data, 
                        url, 
                        fixture_id,
                        datetime_str, 
                        hometeam, 
                        awayteam, 
                        venue
                    )
                    
                    if df is not None and not df.empty:
                        self.save_to_supabase(df)
                        # 🚨 UPDATED: Pass all new fields to the mark_as_scraped method
                        self.mark_as_scraped(url, datetime_str, hometeam, awayteam, venue)
                        scraped_success += 1
                        print(f"✅ Success: {len(df)} players for fixture {fixture_id}")
                    else:
                        print(f"⚠️ No player data for fixture {fixture_id}")
                        failed += 1
                else:
                    print(f"❌ API call failed for fixture {fixture_id}")
                    failed += 1
            
            print(f"\n{'='*50}")
            print(f"SCRAPING COMPLETE")
            print(f"✅ Newly scraped: {scraped_success}")
            print(f"⏭️  Already scraped: {len(scraped_urls)}")
            print(f"❌ Failed: {failed}")
            print(f"{'='*50}")
            
        except Exception as e:
            print(f"Error in process_all_matches: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    # Check if API key exists
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
    
    # Get delay from environment or use default
    delay = int(os.getenv('SCRAPER_DELAY', 3))
    print(f"Using {delay} second delay between API requests\n")
    
    scraper = FBRAPIScraper(api_key=FBR_API_KEY, delay=delay)
    scraper.process_all_matches()
