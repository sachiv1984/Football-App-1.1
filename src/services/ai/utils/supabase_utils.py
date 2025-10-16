"""
Shared utilities for fetching data from Supabase with proper pagination and deduplication.
"""

import pandas as pd
import logging

logger = logging.getLogger(__name__)


def fetch_with_deduplication(supabase_client, table_name: str, select_columns: str = "*", order_by: str = "id") -> pd.DataFrame:
    """
    Fetch all data from a Supabase table with pagination and automatic deduplication.
    
    This prevents the pagination overlap bug where the same records can be fetched
    multiple times due to range() behavior.
    
    Args:
        supabase_client: Initialized Supabase client
        table_name: Name of the table to fetch from
        select_columns: Comma-separated string of columns to select (default: "*")
        order_by: Column to order by (default: "id")
    
    Returns:
        pandas.DataFrame with deduplicated data
    """
    logger.info(f"Fetching data from {table_name}...")
    
    all_data = []
    seen_ids = set()
    offset = 0
    limit = 1000
    
    # Ensure 'id' column is included for deduplication
    select_columns_list = [c.strip() for c in select_columns.split(",") if c.strip()]
    if select_columns != "*" and "id" not in [c.lower() for c in select_columns_list]:
        select_columns_list.insert(0, "id")
        select_columns = ", ".join(select_columns_list)
    
    while True:
        try:
            response = (
                supabase_client.table(table_name)
                .select(select_columns)
                .order(order_by, desc=False)
                .range(offset, offset + limit - 1)
                .execute()
            )
        except Exception as e:
            logger.error(f"Error fetching from {table_name} at offset {offset}: {e}")
            break
        
        data = response.data or []
        if not data:
            break
        
        # Deduplicate by ID to prevent pagination overlap
        new_records = 0
        for record in data:
            record_id = record.get("id")
            
            if record_id is None:
                # If no ID field, add anyway (shouldn't happen for most tables)
                all_data.append(record)
                new_records += 1
            elif record_id not in seen_ids:
                all_data.append(record)
                seen_ids.add(record_id)
                new_records += 1
            # else: Skip duplicate
        
        # Stop if we've reached the end
        if len(data) < limit or new_records == 0:
            break
        
        offset += limit
    
    df = pd.DataFrame(all_data)
    logger.info(f"  ✅ Fetched {len(df)} unique rows from {table_name}")
    return df