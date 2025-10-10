import requests
import pandas as pd
import time
from supabase import create_client, Client
import os
from datetime import datetime

# Get environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


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
        Extract match ID from FBref URL
        
        Args:
            url: FBref match URL like https://fbref.com/en/matches/abc123/...
            
        Returns:
            str: 8-character match ID
        """
        if not url or 'matches/' not in url:
            return None
        
        parts = url.split('/')
        matches_idx = parts.index('matches')
        if matches_idx + 1 < len(parts):
            return parts[matches_idx + 1]
        return None
    
    def check_if_scraped(self, match_url):
        """Check if match data already exists in database"""
        try:
            response = supabase.table('scraped_matches').select('match_url').eq('match_url', match_url).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error checking scraped status: {e}")
            return False
    
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
        """
        Get all player stats for a match using FBR API
        
        Args:
            match_id: 8-character match ID from FBref
            
        Returns:
            dict: Player stats for both teams
        """
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
        
        Args:
            match_data: List of team data from API
            match_url: Original match URL
            fixture_id: Fixture ID from database
            
        Returns:
            pd.DataFrame: Parsed player statistics
        """
        all_players = []
        
        for team in match_data:
            team_name = team.get('team_name')
            home_away = team.get('home_away')
            
            for player_entry in team.get('players', []):
                meta = player_entry.get('meta_data', {})
                stats = player_entry.get('stats', {})
                
                # Flatten all stat categories
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
                
                # Add all stat categories
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
        """Main method to process all unscraped matches"""
        try:
            # Get all fixtures with match URLs
            response = supabase.table('fixtures').select('id, matchurl').execute()
            fixtures = [(row['id'], row['matchurl']) for row in response.data if row.get('matchurl')]
            
            print(f"Found {len(fixtures)} fixtures in database")
            
            scraped_count = 0
            skipped_count = 0
            failed_count = 0
            
            for fixture_id, url in fixtures:
                # Check if already scraped
                if self.check_if_scraped(url):
                    skipped_count += 1
                    continue
                
                # Extract match ID from URL
                match_id = self.extract_match_id_from_url(url)
                if not match_id:
                    print(f"Could not extract match ID from: {url}")
                    failed_count += 1
                    continue
                
                print(f"Scraping fixture {fixture_id}, match ID: {match_id}")
                
                # Get player stats from API
                match_data = self.get_match_players_stats(match_id)
                
                if match_data:
                    # Parse into DataFrame
                    df = self.parse_match_data(match_data, url, fixture_id)
                    
                    if df is not None and not df.empty:
                        self.save_to_supabase(df)
                        self.mark_as_scraped(url)
                        scraped_count += 1
                        print(f"✅ Successfully scraped {len(df)} player records for fixture {fixture_id}")
                    else:
                        print(f"⚠️ No player data found for fixture {fixture_id}")
                        failed_count += 1
                else:
                    print(f"❌ Failed to fetch data for fixture {fixture_id}")
                    failed_count += 1
            
            print(f"\n{'='*50}")
            print(f"Scraping complete!")
            print(f"✅ Newly scraped: {scraped_count}")
            print(f"⏭️  Skipped (already scraped): {skipped_count}")
            print(f"❌ Failed: {failed_count}")
            print(f"{'='*50}")
            
        except Exception as e:
            print(f"Error in process_all_matches: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    # Check if API key exists
    if not FBR_API_KEY:
        print("❌ No FBR_API_KEY found in environment variables!")
        print("\n🔑 Generating a new API key for you...\n")
        
        # Generate API key
        try:
            response = requests.post('https://fbrapi.com/generate_api_key')
            if response.ok:
                api_key = response.json().get('api_key')
                print(f"✅ Your FBR API Key: {api_key}")
                print("\nAdd this to your .env file:")
                print(f"FBR_API_KEY={api_key}")
                print("\nThen run this script again.")
            else:
                print(f"❌ Error generating API key: {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        exit(1)
    
    # Get delay from environment variable or use default
    delay = int(os.getenv('SCRAPER_DELAY', 3))
    print(f"Using FBR API with {delay} second delay between requests")
    
    scraper = FBRAPIScraper(api_key=FBR_API_KEY, delay=delay)
    scraper.process_all_matches()
