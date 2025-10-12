import pandas as pd
import os
from sqlalchemy import create_engine
from urllib.parse import urlparse

# --- 1. Load Environment Variables ---
# Assumes these are set in your environment (or .env file)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def create_supabase_engine():
    """
    Constructs the PostgreSQL connection string using the Supabase URL and Service Role Key.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set.")
    
    # Supabase URL format: https://[PROJECT_REF].supabase.co
    # We need to extract the host (e.g., db.[PROJECT_REF].supabase.co)
    parsed_url = urlparse(SUPABASE_URL)
    
    # The Supabase host name is usually the main host for the REST API
    # The direct Postgres host is typically 'db.' + host (you may need to confirm this)
    # The default Supabase public host is often sufficient when using the service_role key.
    
    # We will use the common PostgreSQL connection format for SQLAlchemy:
    # postgresql://[user]:[password]@[host]:[port]/[database]
    
    # In Supabase:
    # - user: 'postgres' (the default admin user)
    # - password: SUPABASE_SERVICE_ROLE_KEY (used as the password for the service_role key)
    # - host: The host from the SUPABASE_URL (e.g., abcdefghijklm.supabase.co)
    # - port: 5432 (default Postgres port)
    # - database: 'postgres' (default database name)

    # Note: We are using the SERVICE ROLE KEY as the password for full access.
    
    # This format is safer for direct database access via Service Role Key
    # Replace 'rest' with 'db' or use the default host depending on your setup.
    # We'll use the host directly from the parsed URL for max compatibility.
    host = parsed_url.netloc
    
    # Construct the DSN (Data Source Name / Connection String)
    DSN = (
        f"postgresql://postgres:{SUPABASE_SERVICE_ROLE_KEY}@{host}:5432/postgres"
    )
    
    print("Connecting directly to Supabase PostgreSQL...")
    return create_engine(DSN)

def load_data_for_backtest():
    """Fetches all necessary raw data from Supabase into Pandas DataFrames."""
    
    try:
        engine = create_supabase_engine()
    except ValueError as e:
        print(f"Error during engine creation: {e}")
        return None, None
    except Exception as e:
        print(f"Could not connect to database: {e}")
        return None, None

    # --- 2. Player Stats (P-Factors) ---
    # Need: Player ID, Team Name, Opponent Name, Match Date, SOT, Mins
    sql_player = """
    SELECT 
        id, -- Primary key for player match record
        player_id, 
        team_name, 
        opponent, 
        match_date, 
        summary_sot, 
        summary_min,
        -- Add any other base player stats you might need later
        summary_sh,
        fixture_id,
        venue
    FROM 
        player_match_stats -- ASSUMED TABLE NAME
    ORDER BY 
        match_date ASC
    """
    df_player = pd.read_sql(sql_player, engine)
    
    # --- 3. Team Defense Stats (O-Factors) ---
    # Need: Team Name, Match Date, SOT Conceded, Att 3rd Tackles
    sql_team_def = """
    SELECT
        fixture_id,
        team_name,
        match_date,
        -- SOT Conceded (opp_shots_on_target from shooting table)
        opp_shots_on_target AS sot_conceded, 
        -- Tackles in Attacking Third (tackles_att_3rd from misc table)
        tackles_att_3rd 
    FROM
        team_misc_stats -- ASSUMED TABLE NAME (or join multiple team tables here if needed)
    ORDER BY
        match_date ASC
    """
    df_team_def = pd.read_sql(sql_team_def, engine)
    
    # --- 4. Post-Load Cleaning (Standardization) ---
    # Apply your 'normalizeTeamName' logic here in Python if team names are inconsistent
    # Example: df_player['team_name'] = df_player['team_name'].str.title() 

    print(f"✅ Successfully loaded {len(df_player)} player match records.")
    print(f"✅ Successfully loaded {len(df_team_def)} team defense records.")
    
    return df_player, df_team_def

if __name__ == '__main__':
    # Add os.environ loading here if you use a .env file (e.g., using python-dotenv)
    # import dotenv; dotenv.load_dotenv() 
    
    df_player, df_team_def = load_data_for_backtest()
    if df_player is not None:
        print("\nPlayer Data Head:")
        print(df_player.head())
        print("\nTeam Defense Data Head:")
        print(df_team_def.head())
