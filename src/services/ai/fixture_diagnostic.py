import pandas as pd
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

load_dotenv() 

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Environment variables not set")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def diagnose_fixtures():
    """Diagnose what's actually in the fixtures table."""
    
    logger.info("=" * 70)
    logger.info("FIXTURES TABLE DIAGNOSTIC")
    logger.info("=" * 70)
    
    # Fetch ALL fixtures
    response = supabase.from_("fixtures").select("*").order("matchweek", desc=False).execute()
    
    if not response.data:
        logger.error("❌ No data returned from fixtures table")
        return
    
    df = pd.DataFrame(response.data)
    
    logger.info(f"\n✅ Total fixtures in database: {len(df)}")
    logger.info(f"Columns: {list(df.columns)}")
    
    # Check status column
    if 'status' in df.columns:
        logger.info("\n--- STATUS VALUES ---")
        status_counts = df['status'].value_counts()
        for status, count in status_counts.items():
            logger.info(f"  '{status}': {count} fixtures")
        
        # Show unique status values (raw)
        logger.info(f"\nUnique status values (raw): {df['status'].unique().tolist()}")
    else:
        logger.warning("⚠️ No 'status' column found!")
    
    # Check matchweek distribution
    if 'matchweek' in df.columns:
        logger.info("\n--- MATCHWEEK DISTRIBUTION ---")
        mw_counts = df['matchweek'].value_counts().sort_index()
        for mw, count in mw_counts.head(10).items():
            logger.info(f"  Matchweek {mw}: {count} fixtures")
    
    # Check datetime
    if 'datetime' in df.columns:
        df['datetime'] = pd.to_datetime(df['datetime'])
        logger.info("\n--- DATETIME RANGE ---")
        logger.info(f"  Earliest: {df['datetime'].min()}")
        logger.info(f"  Latest: {df['datetime'].max()}")
        logger.info(f"  Today: {pd.Timestamp.now()}")
        
        # Find future fixtures
        now = pd.Timestamp.now()
        future = df[df['datetime'] > now]
        logger.info(f"\n  Future fixtures (datetime > now): {len(future)}")
        
        if len(future) > 0:
            logger.info(f"  Next matchweek with future games: {future['matchweek'].min()}")
    
    # Show sample of future fixtures
    logger.info("\n--- SAMPLE FUTURE FIXTURES (First 5) ---")
    if 'datetime' in df.columns:
        future_sample = df[df['datetime'] > pd.Timestamp.now()].head(5)
        if not future_sample.empty:
            for _, row in future_sample.iterrows():
                logger.info(f"  MW{row.get('matchweek', '?')}: {row.get('hometeam', '?')} vs {row.get('awayteam', '?')} - Status: '{row.get('status', '?')}' - {row['datetime']}")
        else:
            logger.warning("  No future fixtures found!")
    
    # Show sample of all fixtures
    logger.info("\n--- ALL FIXTURES SAMPLE (First 10 rows) ---")
    display_cols = ['matchweek', 'datetime', 'hometeam', 'awayteam', 'status']
    available_cols = [col for col in display_cols if col in df.columns]
    logger.info(df[available_cols].head(10).to_string(index=False))
    
    logger.info("\n" + "=" * 70)

if __name__ == "__main__":
    diagnose_fixtures()