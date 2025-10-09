import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from supabase import create_client, Client
import os
from datetime import datetime
import random
import re

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

class FBrefScraper:
    def __init__(self, delay=3):
        """
        Initialize scraper with rate limiting
        
        Args:
            delay: Seconds to wait between requests (FBref asks for 3+ seconds)
        """
        self.delay = delay
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.retry_count = 0
        self.max_retries = 3
    
    def check_if_scraped(self, match_url):
        """
        Check if match data already exists in database
        
        Args:
            match_url: The match report URL
            
        Returns:
            bool: True if already scraped, False otherwise
        """
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
    
    def scrape_match_page(self, url, retry_attempt=0):
        """
        Scrape player stats from a match report URL
        
        Args:
            url: FBref match report URL
            retry_attempt: Current retry attempt number
            
        Returns:
            dict: Contains home/away player stats and goalkeeper stats
        """
        # Skip invalid/dummy URLs
        if not url or url == 'null' or 'YYYY-MM-DD' in url:
            print(f"Skipping invalid/dummy URL: {url}")
            return None
        
        # Check if URL ends with just a date (dummy URL pattern)
        date_pattern = r'/matches/\d{4}-\d{2}-\d{2}/?$'
        if re.search(date_pattern, url):
            print(f"Skipping date-only dummy URL: {url}")
            return None
        
        # Check if URL is too short (valid URLs have match ID and team names)
        url_parts = url.rstrip('/').split('/')
        if len(url_parts) <= 5:
            print(f"Skipping incomplete URL: {url}")
            return None
        
        # Add random jitter to delay to appear more human
        wait_time = self.delay + random.uniform(0.5, 2.0)
        time.sleep(wait_time)
        
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            data = {
                'home_players': None,
                'away_players': None,
                'home_gk': None,
                'away_gk': None
            }
            
            # Find all stat tables
            tables = soup.find_all('table')
            print(f"Found {len(tables)} tables on the page")
            
            # Track which team we're processing
            home_summary_found = False
            home_gk_found = False
            
            for table in tables:
                table_id = table.get('id', '')
                
                # Player summary stats (both teams)
                if '_summary' in table_id and table_id.startswith('stats_'):
                    if not home_summary_found:
                        print(f"Found home team summary stats: {table_id}")
                        data['home_players'] = self._parse_table(table, url, 'home')
                        home_summary_found = True
                    else:
                        print(f"Found away team summary stats: {table_id}")
                        data['away_players'] = self._parse_table(table, url, 'away')
                
                # Goalkeeper stats (both teams)
                elif 'keeper_stats_' in table_id:
                    if not home_gk_found:
                        print(f"Found home goalkeeper stats: {table_id}")
                        data['home_gk'] = self._parse_table(table, url, 'home', is_gk=True)
                        home_gk_found = True
                    else:
                        print(f"Found away goalkeeper stats: {table_id}")
                        data['away_gk'] = self._parse_table(table, url, 'away', is_gk=True)
            
            return data
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 403:
                print(f"403 Forbidden for {url}")
                
                # Retry with exponential backoff
                if retry_attempt < self.max_retries:
                    wait_time = (2 ** retry_attempt) * 5 + random.uniform(1, 5)
                    print(f"Retrying in {wait_time:.1f} seconds... (attempt {retry_attempt + 1}/{self.max_retries})")
                    time.sleep(wait_time)
                    return self.scrape_match_page(url, retry_attempt + 1)
                else:
                    print(f"Max retries reached for {url}. Skipping.")
                    return None
            else:
                print(f"HTTP Error {e.response.status_code} for {url}: {e}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Request error for {url}: {e}")
            return None
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _parse_table(self, table, match_url, team_side, is_gk=False):
        """
        Parse HTML table into pandas DataFrame
        
        Args:
            table: BeautifulSoup table element
            match_url: URL of the match for reference
            team_side: 'home' or 'away'
            is_gk: Boolean indicating if this is goalkeeper stats
            
        Returns:
            pd.DataFrame: Parsed player statistics
        """
        rows = []
        headers = []
        
        # Extract headers
        thead = table.find('thead')
        if thead:
            header_rows = thead.find_all('tr')
            # Get the last header row (most specific)
            if header_rows:
                for th in header_rows[-1].find_all('th'):
                    headers.append(th.get('data-stat', th.text.strip()))
        
        # Extract data rows
        tbody = table.find('tbody')
        if tbody:
            for tr in tbody.find_all('tr'):
                # Skip header rows within tbody
                if tr.get('class') and 'thead' in tr.get('class'):
                    continue
                    
                row_data = {}
                for td in tr.find_all(['th', 'td']):
                    stat = td.get('data-stat', '')
                    if stat:
                        # Get player link if available
                        if stat == 'player':
                            link = td.find('a')
                            if link:
                                row_data['player_id'] = link.get('href', '').split('/')[-2]
                        row_data[stat] = td.text.strip()
                
                if row_data:
                    row_data['match_url'] = match_url
                    row_data['team_side'] = team_side
                    row_data['is_goalkeeper'] = is_gk
                    rows.append(row_data)
        
        return pd.DataFrame(rows) if rows else None
    
    def save_to_supabase(self, df, table_name='player_match_stats'):
        """
        Save DataFrame to Supabase
        
        Args:
            df: pandas DataFrame with player stats
            table_name: Name of the Supabase table
        """
        if df is None or df.empty:
            return
        
        try:
            # Convert DataFrame to list of dicts
            records = df.to_dict('records')
            
            # Insert in batches to avoid timeouts
            batch_size = 100
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                supabase.table(table_name).insert(batch).execute()
                print(f"Inserted batch {i//batch_size + 1} ({len(batch)} records)")
                
        except Exception as e:
            print(f"Error saving to Supabase: {e}")
    
    def process_all_matches(self):
        """
        Main method to process all unscraped matches from database
        """
        try:
            # Get all match URLs and IDs from fixtures table
            response = supabase.table('fixtures').select('id, matchurl').execute()
            fixtures = [(row['id'], row['matchurl']) for row in response.data if row.get('matchurl')]
            
            print(f"Found {len(fixtures)} fixtures in database")
            
            scraped_count = 0
            skipped_count = 0
            
            for fixture_id, url in fixtures:
                # Check if already scraped
                if self.check_if_scraped(url):
                    print(f"Skipping already scraped: {url}")
                    skipped_count += 1
                    continue
                
                print(f"Scraping fixture {fixture_id}: {url}")
                data = self.scrape_match_page(url)
                
                if data:
                    # Combine all dataframes and add fixture_id
                    all_dfs = []
                    for key, df in data.items():
                        if df is not None and not df.empty:
                            df['fixture_id'] = fixture_id
                            all_dfs.append(df)
                    
                    if all_dfs:
                        combined_df = pd.concat(all_dfs, ignore_index=True)
                        self.save_to_supabase(combined_df)
                        self.mark_as_scraped(url)
                        scraped_count += 1
                        print(f"Successfully scraped and saved fixture {fixture_id}")
                    else:
                        print(f"No data found for fixture {fixture_id}: {url}")
                else:
                    print(f"Failed to scrape fixture {fixture_id}: {url}")
            
            print(f"\nScraping complete!")
            print(f"Newly scraped: {scraped_count}")
            print(f"Skipped (already scraped): {skipped_count}")
            
        except Exception as e:
            print(f"Error in process_all_matches: {e}")


# Usage example
if __name__ == "__main__":
    # Get delay from environment variable or use default
    delay = int(os.getenv('SCRAPER_DELAY', 5))
    print(f"Using delay of {delay} seconds between requests")
    
    scraper = FBrefScraper(delay=delay)
    scraper.process_all_matches()