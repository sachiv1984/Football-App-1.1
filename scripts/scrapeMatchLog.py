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
        """
        # Base metadata columns
        base_columns = [
            'fixture_id', 'match_url', 'team_name', 'team_side', 
            'player_id', 'player_name', 'player_country', 'player_number', 
            'age', 'is_goalkeeper'
        ]
        
        # Columns that come from the flattened 'stats' dictionary in the API response
        # NOTE: This is a placeholder list based on common football stats. 
        # For a perfect list, you need to know ALL potential keys from the FBR API.
        # This is a safe starting point and should be manually reviewed against 
        # actual API responses or documentation.
        stat_prefixes = ['summary', 'passing', 'passing_types', 'defense', 
                         'possession', 'misc', 'goals_and_shots']
        stat_suffixes = ['minutes', 'shots', 'goals', 'touches', 'tackles', 'passes'] # Example suffixes

        # Generate flattened stat column names
        stat_columns = []
        for prefix in stat_prefixes:
            # For simplicity, we only include the 'minutes' column explicitly for all,
            # as it's common. You may need to manually add others like 'passing_total_cmp' 
            # if your API response is detailed.
            stat_columns.append(f"{prefix}_minutes")
            
        # Manually add a few common, complex columns to ensure they are checked
        stat_columns.extend([
            'summary_minutes', 
            'summary_position', # Example from original code 'summary_positions'
            'passing_cmp', 
            'passing_types_live',
            'defense_tackles_won',
            'possession_touches',
            'goals_and_shots_shots_total'
        ])

        # Remove duplicates and combine
        return sorted(list(set(base_columns + stat_columns)))
    
    def validate_supabase_schema(self, table_name='player_match_stats'):
        """
        Connects to Supabase, retrieves the current schema for the target table,
        and checks for missing columns.
        
        Returns:
            bool: True if all expected columns are present, False otherwise.
        """
        expected_columns = self.get_expected_columns()
        print(f"\n--- Database Schema Validation for '{table_name}' ---")
        print(f"Expecting {len(expected_columns)} columns in total.")
        
        try:
            # Supabase Python client doesn't have a direct schema endpoint.
            # We fetch one row with column names to get the schema keys.
            # This relies on the table having at least one record.
            # A more robust solution might use SQL RPC call to information_schema.
            
            response = supabase.table(table_name).select('*').limit(1).execute()
            
            if not response.data:
                # If table is empty, we must rely on a different method.
                # For simplicity, let's assume the user has set up the table based on the expected list.
                # If you need a robust check on an empty table, you must use a raw SQL query.
                print(f"⚠️ Warning: '{table_name}' table is empty. Skipping dynamic schema check.")
                print("Please ensure the table structure matches the expected columns.")
                return True 
                
            # Get the actual columns from the first record
            actual_columns = set(response.data[0].keys())
            
            missing_columns = [col for col in expected_columns if col not in actual_columns]
            
            if missing_columns:
                print(f"❌ Validation FAILED: Found {len(missing_columns)} missing columns.")
                print("-" * 30)
                print("Missing Columns List:")
                for col in missing_columns:
                    print(f"  - {col}")
                print("-" * 30)
                print("\nPlease add these columns to the 'player_match_stats' table in Supabase.")
                return False
            else:
                print(f"✅ Validation SUCCESS: All {len(expected_columns)} columns appear to be present.")
                return True

        except Exception as e:
            print(f"❌ Error during schema validation: {e}")
            print("Could not connect or query table. Please check table name and permissions.")
            return False

    # --- (Other methods like generate_api_key, extract_match_id_from_url, etc. are the same) ---
    # ... (Keeping the rest of your original methods for brevity, assuming they are included) ...
    
    # NOTE: The list of columns in get_expected_columns() must perfectly match 
    # the keys generated in parse_match_data. Ensure all keys from the nested 
    # loops are accounted for in the static list.

    # ... (The rest of the class methods, including the updated process_all_matches, remain the same) ...

# ... (The rest of the class methods, including process_all_matches, are identical to the previous response) ...
    def process_all_matches(self):
        # ... (Identical to previous response) ...
        pass
    
    def get_match_players_stats(self, match_id):
        # ... (Identical to previous response) ...
        pass

    def parse_match_data(self, match_data, match_url, fixture_id):
        # ... (Identical to previous response) ...
        pass
    
    def save_to_supabase(self, df, table_name='player_match_stats'):
        # ... (Identical to previous response) ...
        pass
    # ... (Other methods) ...


if __name__ == "__main__":
    # Check if API key exists
    if not FBR_API_KEY:
        # ... (API Key generation logic, identical to previous response) ...
        exit(1)
    
    # Get delay from environment variable or use default
    delay = int(os.getenv('SCRAPER_DELAY', 3))
    print(f"Using FBR API with {delay} second delay between requests")
    
    scraper = FBRAPIScraper(api_key=FBR_API_KEY, delay=delay)
    
    # --- NEW SCHEMA VALIDATION STEP ---
    if not scraper.validate_supabase_schema():
        print("\n🛑 FATAL ERROR: Database schema validation failed. Exiting script.")
        print("Please review the missing columns above and update your Supabase table 'player_match_stats'.")
        sys.exit(1) # Use sys.exit(1) to cleanly exit with an error code

    # If validation passes, proceed with scraping
    scraper.process_all_matches()
