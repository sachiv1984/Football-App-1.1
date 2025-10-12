"""
Utility script to generate the complete list of database columns
needed for the player_match_stats table based on FBR API documentation.

Run this to see all required columns WITHOUT connecting to Supabase.
"""

def get_expected_columns():
    """
    Returns the complete list of columns needed for player_match_stats table.
    Based on the actual /all-players-match-stats API endpoint structure.
    """
    # Base metadata columns from meta_data object
    base_columns = [
        'fixture_id',           # Your local fixture ID
        'match_url',            # Your match URL
        'team_name',            # From API response team level
        'team_side',            # home_away from API (home/away)
        'player_id',            # From meta_data
        'player_name',          # From meta_data
        'player_country',       # player_country_code from meta_data
        'player_number',        # From meta_data
        'age',                  # From meta_data (can be decimal like "26")
        'is_goalkeeper'         # Calculated from positions field
    ]
    
    # SUMMARY stats (appears in all matches)
    summary_columns = [
        'summary_positions',     # e.g. "FW", "MF", "GK"
        'summary_min',          # Minutes played (can be string like "69")
        'summary_gls',          # Goals
        'summary_sh',           # Shots
        'summary_sot',          # Shots on target
        'summary_xg',           # Expected goals
        'summary_non_pen_xg',   # Non-penalty xG
        'summary_ast',          # Assists
        'summary_xag',          # Expected assisted goals
        'summary_pass_cmp',     # Passes completed
        'summary_pass_att',     # Passes attempted
        'summary_pct_pass_cmp', # Pass completion %
        'summary_pass_prog',    # Progressive passes
        'summary_sca',          # Shot creating actions
        'summary_gca',          # Goal creating actions
        'summary_touches',      # Touches
        'summary_carries',      # Carries
        'summary_carries_prog', # Progressive carries
        'summary_take_on_att',  # Take-on attempts
        'summary_take_on_suc',  # Successful take-ons
        'summary_tkl',          # Tackles
        'summary_int',          # Interceptions
        'summary_blocks',       # Blocks
        'summary_yellow_cards', # Yellow cards
        'summary_red_cards',    # Red cards
        'summary_pk_made',      # Penalties made
        'summary_pk_att'        # Penalties attempted
    ]
    
    # PASSING stats
    passing_columns = [
        'passing_pass_ttl_dist',        # Total pass distance
        'passing_pass_prog_ttl_dist',   # Progressive pass distance
        'passing_pass_cmp_s',            # Short passes completed
        'passing_pass_att_s',            # Short passes attempted
        'passing_pct_pass_cmp_s',        # Short pass completion %
        'passing_pass_cmp_m',            # Medium passes completed
        'passing_pass_att_m',            # Medium passes attempted
        'passing_pct_pass_cmp_m',        # Medium pass completion %
        'passing_pass_cmp_l',            # Long passes completed
        'passing_pass_att_l',            # Long passes attempted
        'passing_pct_pass_cmp_l',        # Long pass completion %
        'passing_xa',                    # Expected assists
        'passing_key_passes',            # Key passes
        'passing_pass_fthird',           # Passes into final third
        'passing_pass_opp_box',          # Passes into penalty area
        'passing_cross_opp_box'          # Crosses into penalty area
    ]
    
    # PASSING TYPES stats
    passing_types_columns = [
        'passing_types_pass_live',      # Live-ball passes
        'passing_types_pass_dead',      # Dead-ball passes
        'passing_types_pass_fk',        # Free kicks
        'passing_types_through_balls',  # Through balls
        'passing_types_switches',       # Switches
        'passing_types_crosses',        # Crosses
        'passing_types_pass_offside',   # Offsides
        'passing_types_pass_blocked',   # Passes blocked
        'passing_types_throw_ins',      # Throw ins
        'passing_types_ck',             # Corner kicks
        'passing_types_ck_in_swinger',  # Inswinging corners
        'passing_types_ck_out_swinger', # Outswinging corners
        'passing_types_ck_straight'     # Straight corners
    ]
    
    # GOAL & SHOT CREATION (GCA) stats
    gca_columns = [
        'gca_ttl_sca',          # Total shot-creating actions
        'gca_pass_live_sca',    # SCA from live-ball passes
        'gca_pass_dead_sca',    # SCA from dead-ball passes
        'gca_take_on_sca',      # SCA from take-ons
        'gca_sh_sca',           # SCA from shots
        'gca_fld_sca',          # SCA from fouls drawn
        'gca_def_sca',          # SCA from defensive actions
        'gca_pass_live_gca',    # GCA from live-ball passes
        'gca_pass_dead_gca',    # GCA from dead-ball passes
        'gca_take_on_gca',      # GCA from take-ons
        'gca_sh_gca',           # GCA from shots
        'gca_fld_gca',          # GCA from fouls drawn
        'gca_def_gca'           # GCA from defensive actions
    ]
    
    # DEFENSE stats
    defense_columns = [
        'defense_tkl_won',          # Tackles won
        'defense_tkl_def_third',    # Tackles in defensive third
        'defense_tkl_mid_third',    # Tackles in middle third
        'defense_tkl_att_third',    # Tackles in attacking third
        'defense_tkl_drb',          # Dribblers tackled
        'defense_tkl_drb_att',      # Dribbles contested
        'defense_pct_tkl_drb_suc',  # % of dribblers tackled
        'defense_sh_blocked',       # Shots blocked
        'defense_tkl_plus_int',     # Tackles + Interceptions
        'defense_clearances',       # Clearances
        'defense_def_error'         # Errors leading to shot
    ]
    
    # POSSESSION stats
    possession_columns = [
        'possession_touch_def_box',         # Touches in defensive box
        'possession_touch_def_third',       # Touches in defensive third
        'possession_touch_mid_third',       # Touches in middle third
        'possession_touch_fthird',          # Touches in final third
        'possession_touch_opp_box',         # Touches in attacking box
        'possession_touch_live',            # Live-ball touches
        'possession_pct_take_on_suc',       # Successful take-on %
        'possession_take_on_tkld',          # Times tackled during take-on
        'possession_pct_take_on_tkld',      # % of take-ons tackled
        'possession_ttl_carries_dist',      # Total carrying distance
        'possession_ttl_carries_prog_dist', # Progressive carrying distance
        'possession_carries_fthird',        # Carries into final third
        'possession_carries_opp_box',       # Carries into penalty area
        'possession_carries_miscontrolled', # Miscontrols
        'possession_carries_dispossessed',  # Dispossessed
        'possession_pass_recvd',            # Passes received
        'possession_pass_prog_rcvd'         # Progressive passes received
    ]
    
    # MISCELLANEOUS stats
    misc_columns = [
        'misc_second_yellow_cards', # Second yellow cards
        'misc_fls_com',             # Fouls committed
        'misc_fls_drawn',           # Fouls drawn
        'misc_offside',             # Offsides
        'misc_pk_won',              # Penalty kicks won
        'misc_pk_conceded',         # Penalty kicks conceded
        'misc_og',                  # Own goals
        'misc_ball_recov',          # Ball recoveries
        'misc_air_dual_won',        # Aerial duels won
        'misc_air_dual_lost',       # Aerial duels lost
        'misc_pct_air_dual_won'     # % of aerial duels won
    ]
    
    # Combine all columns
    all_columns = (base_columns + summary_columns + passing_columns + 
                   passing_types_columns + gca_columns + defense_columns + 
                   possession_columns + misc_columns)
    
    return sorted(list(set(all_columns)))


def print_column_table():
    """Print formatted table of all columns with suggested data types."""
    columns = get_expected_columns()
    
    print(f"\n{'='*80}")
    print(f"PLAYER_MATCH_STATS TABLE - REQUIRED COLUMNS ({len(columns)} total)")
    print(f"{'='*80}\n")
    
    print(f"{'Column Name':<40} {'PostgreSQL Type':<20} {'Notes'}")
    print(f"{'-'*40} {'-'*20} {'-'*20}")
    
    for col in columns:
        # Determine appropriate data type
        if col in ['fixture_id', 'player_number', 'summary_yellow_cards', 
                   'summary_red_cards', 'misc_second_yellow_cards']:
            pg_type = 'INTEGER'
            notes = 'Whole numbers'
        elif col in ['player_id']:
            pg_type = 'TEXT'
            notes = '8-char ID'
        elif col in ['match_url', 'team_name', 'team_side', 'player_name', 
                     'player_country', 'summary_positions']:
            pg_type = 'TEXT'
            notes = ''
        elif col == 'is_goalkeeper':
            pg_type = 'BOOLEAN'
            notes = ''
        elif col == 'summary_min':
            pg_type = 'TEXT'
            notes = 'Can be "69" or "90"'
        else:
            # All stats can be decimal (NULL for DNP)
            pg_type = 'NUMERIC'
            notes = 'Can be NULL'
            
        print(f"{col:<40} {pg_type:<20} {notes}")
    
    print(f"\n{'='*80}\n")


def generate_sql_create_statement():
    """Generate SQL CREATE TABLE statement for Supabase."""
    columns = get_expected_columns()
    
    print("SQL CREATE TABLE Statement:")
    print("="*80)
    print("CREATE TABLE player_match_stats (")
    print("    id SERIAL PRIMARY KEY,  -- Auto-incrementing ID")
    
    sql_lines = []
    for col in columns:
        if col in ['fixture_id', 'player_number', 'summary_yellow_cards', 
                   'summary_red_cards', 'misc_second_yellow_cards']:
            pg_type = 'INTEGER'
        elif col in ['player_id']:
            pg_type = 'TEXT'
        elif col in ['match_url', 'team_name', 'team_side', 'player_name', 
                     'player_country', 'summary_positions']:
            pg_type = 'TEXT'
        elif col == 'is_goalkeeper':
            pg_type = 'BOOLEAN DEFAULT FALSE'
        elif col == 'summary_min':
            pg_type = 'TEXT'
        else:
            pg_type = 'NUMERIC'
        
        sql_lines.append(f"    {col} {pg_type}")
    
    print(",\n".join(sql_lines))
    print(");\n")
    
    # Add useful indexes
    print("-- Recommended indexes for performance:")
    print("CREATE INDEX idx_player_match_fixture ON player_match_stats(fixture_id);")
    print("CREATE INDEX idx_player_match_player ON player_match_stats(player_id);")
    print("CREATE INDEX idx_player_match_team ON player_match_stats(team_name);")
    print("="*80 + "\n")


def generate_csv_column_list():
    """Generate comma-separated list for easy copying."""
    columns = get_expected_columns()
    print("\nComma-separated column list (for spreadsheets):")
    print("="*80)
    print(", ".join(columns))
    print("="*80 + "\n")


def check_script_compatibility():
    """Check what needs to be updated in the scraper script."""
    print("\n" + "="*80)
    print("IMPORTANT NOTES ABOUT YOUR SCRIPT:")
    print("="*80)
    print("""
Your script's get_expected_columns() function needs to be updated to match
the actual API response structure. The main differences are:

1. FIELD NAMING: The API uses different names than your script expects:
   - API uses: 'min', 'gls', 'sh', 'sot', 'xg', etc.
   - Your script flattens to: 'summary_min', 'summary_gls', etc.

2. STATS STRUCTURE: The API returns stats grouped by category:
   - stats.summary.*
   - stats.passing.*
   - stats.passing_types.*
   - stats.gca.*
   - stats.defense.*
   - stats.possession.*
   - stats.misc.*

3. KEY OBSERVATIONS:
   - 'minutes' is actually 'min' in the API
   - Some fields might be missing (NULL) for substitutes
   - Percentages can be NULL if denominator is 0
   - GCA (Goal & Shot Creation) is a separate category, not "goal_shot_creation"

Your parse_match_data() function correctly flattens these with:
    player_data[f"{category}_{stat_name}"] = stat_value

So the column generator above should match what your script actually creates!
""")
    print("="*80 + "\n")


if __name__ == "__main__":
    print("\n🔍 FBR API PLAYER MATCH STATS - COLUMN GENERATOR\n")
    
    # Check script compatibility first
    check_script_compatibility()
    
    # Option 1: Formatted table view
    print_column_table()
    
    # Option 2: SQL CREATE statement
    print("\n" + "="*80)
    print("COPY THIS SQL TO CREATE THE TABLE IN SUPABASE:")
    print("="*80)
    generate_sql_create_statement()
    
    # Option 3: CSV list
    print("\nALTERNATIVE: Comma-separated list:")
    generate_csv_column_list()
    
    print("✅ Done! Use the SQL statement above to set up your Supabase table.\n")
    print("⚠️  Remember: Your scraper script's column list should match this exactly!\n")