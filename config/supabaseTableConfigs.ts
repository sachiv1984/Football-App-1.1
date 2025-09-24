// config/supabaseTableConfigs.ts
/**
 * Configuration file for Supabase table mappings
 * This file defines how FBref stats map to Supabase database tables
 */

export interface SupabaseTableConfig {
  tableName: string;
  fieldMappings: {
    // Common fields that exist in all tables
    common: Record<string, string>;
    // Team-specific stat fields
    team: Record<string, string>;
    // Opponent-specific stat fields  
    opponent: Record<string, string>;
  };
}

export const SUPABASE_CONFIGS: Record<string, SupabaseTableConfig> = {
  shooting: {
    tableName: 'team_shooting_stats',
    fieldMappings: {
      common: {
        'Date': 'match_date',
        'Time': 'match_time', 
        'Venue': 'venue',
        'Result': 'result',
        'GF': 'goals_for',
        'GA': 'goals_against',
        'Opponent': 'opponent',
      },
      team: {
        'Gls': 'team_goals',
        'Sh': 'team_shots',
        'SoT': 'team_shots_on_target',
        'SoT%': 'team_shot_on_target_pct',
        'G/Sh': 'team_goals_per_shot',
        'G/SoT': 'team_goals_per_shot_on_target',
        'Dist': 'team_avg_shot_distance',
        'FK': 'team_free_kick_shots',
        'PK': 'team_penalty_kicks',
        'PKatt': 'team_penalty_attempts'
      },
      opponent: {
        'Gls': 'opp_goals',
        'Sh': 'opp_shots', 
        'SoT': 'opp_shots_on_target',
        'SoT%': 'opp_shot_on_target_pct',
        'G/Sh': 'opp_goals_per_shot',
        'G/SoT': 'opp_goals_per_shot_on_target',
        'Dist': 'opp_avg_shot_distance',
        'FK': 'opp_free_kick_shots',
        'PK': 'opp_penalty_kicks',
        'PKatt': 'opp_penalty_attempts'
      }
    }
  },

  gca: {
    tableName: 'team_gca_stats',
    fieldMappings: {
      common: {
        'Date': 'match_date',
        'Time': 'match_time',
        'Venue': 'venue',
        'Result': 'result',
        'GF': 'goals_for',
        'GA': 'goals_against',
        'Opponent': 'opponent',
      },
      team: {
        'SCA': 'team_shot_creating_actions',
        'SCA90': 'team_sca_per_90',
        'PassLive': 'team_sca_pass_live',
        'PassDead': 'team_sca_pass_dead',
        'TO': 'team_sca_take_ons',
        'Sh': 'team_sca_shots',
        'Fld': 'team_sca_fouled',
        'Def': 'team_sca_defensive_actions',
        'GCA': 'team_goal_creating_actions',
        'GCA90': 'team_gca_per_90',
        'PassLive.1': 'team_gca_pass_live',
        'PassDead.1': 'team_gca_pass_dead',
        'TO.1': 'team_gca_take_ons',
        'Sh.1': 'team_gca_shots',
        'Fld.1': 'team_gca_fouled',
        'Def.1': 'team_gca_defensive_actions'
      },
      opponent: {
        'SCA': 'opp_shot_creating_actions',
        'SCA90': 'opp_sca_per_90',
        'PassLive': 'opp_sca_pass_live',
        'PassDead': 'opp_sca_pass_dead',
        'TO': 'opp_sca_take_ons',
        'Sh': 'opp_sca_shots',
        'Fld': 'opp_sca_fouled',
        'Def': 'opp_sca_defensive_actions',
        'GCA': 'opp_goal_creating_actions',
        'GCA90': 'opp_gca_per_90',
        'PassLive.1': 'opp_gca_pass_live',
        'PassDead.1': 'opp_gca_pass_dead',
        'TO.1': 'opp_gca_take_ons',
        'Sh.1': 'opp_gca_shots',
        'Fld.1': 'opp_gca_fouled',
        'Def.1': 'opp_gca_defensive_actions'
      }
    }
  },

  passing_types: {
    tableName: 'team_passing_types_stats',
    fieldMappings: {
      common: {
        'Date': 'match_date',
        'Time': 'match_time',
        'Venue': 'venue',
        'Result': 'result',
        'GF': 'goals_for',
        'GA': 'goals_against',
        'Opponent': 'opponent',
        'Poss': 'possession'
      },
      team: {
        'Att': 'team_passes_attempted',
        'Live': 'team_live_passes',
        'Dead': 'team_dead_passes',
        'FK': 'team_free_kick_passes',
        'TB': 'team_through_balls',
        'Sw': 'team_switches',
        'Crs': 'team_crosses',
        'TI': 'team_throw_ins',
        'CK': 'team_corner_kicks',
        'In': 'team_inswinging_corners',
        'Out': 'team_outswinging_corners',
        'Str': 'team_straight_corners',
        'Cmp': 'team_passes_completed',
        'Off': 'team_passes_offside',
        'Blocks': 'team_passes_blocked'
      },
      opponent: {
        'Att': 'opp_passes_attempted',
        'Live': 'opp_live_passes',
        'Dead': 'opp_dead_passes',
        'FK': 'opp_free_kick_passes',
        'TB': 'opp_through_balls',
        'Sw': 'opp_switches',
        'Crs': 'opp_crosses',
        'TI': 'opp_throw_ins',
        'CK': 'opp_corner_kicks',
        'In': 'opp_inswinging_corners',
        'Out': 'opp_outswinging_corners',
        'Str': 'opp_straight_corners',
        'Cmp': 'opp_passes_completed',
        'Off': 'opp_passes_offside',
        'Blocks': 'opp_passes_blocked'
      }
    }
  },
  
  passing: {
    tableName: 'team_passing_stats',
    fieldMappings: {
      common: {
        'Date': 'match_date',
        'Time': 'match_time',
        'Venue': 'venue', 
        'Result': 'result',
        'GF': 'goals_for',
        'GA': 'goals_against',
        'Opponent': 'opponent',
        'Poss': 'possession'
      },
      team: {
        'Cmp': 'team_passes_completed',
        'Att': 'team_passes_attempted', 
        'Cmp%': 'team_pass_completion_pct',
        'TotDist': 'team_total_pass_distance',
        'PrgDist': 'team_progressive_pass_distance',
        'Short': 'team_short_passes_completed',
        'Medium': 'team_medium_passes_completed',
        'Long': 'team_long_passes_completed',
        'Ast': 'team_assists',
        'xAG': 'team_expected_assisted_goals',
        'xA': 'team_expected_assists',
        'A-xAG': 'team_assists_minus_xag',
        'KP': 'team_key_passes',
        '1/3': 'team_passes_into_final_third',
        'PPA': 'team_passes_into_penalty_area',
        'CrsPA': 'team_crosses_into_penalty_area',
        'PrgP': 'team_progressive_passes'
      },
      opponent: {
        'Cmp': 'opp_passes_completed',
        'Att': 'opp_passes_attempted',
        'Cmp%': 'opp_pass_completion_pct', 
        'TotDist': 'opp_total_pass_distance',
        'PrgDist': 'opp_progressive_pass_distance',
        'Short': 'opp_short_passes_completed',
        'Medium': 'opp_medium_passes_completed',
        'Long': 'opp_long_passes_completed',
        'Ast': 'opp_assists',
        'xAG': 'opp_expected_assisted_goals',
        'xA': 'opp_expected_assists',
        'A-xAG': 'opp_assists_minus_xag',
        'KP': 'opp_key_passes',
        '1/3': 'opp_passes_into_final_third',
        'PPA': 'opp_passes_into_penalty_area',
        'CrsPA': 'opp_crosses_into_penalty_area',
        'PrgP': 'opp_progressive_passes'
      }
    }
  },

  keeper: {
    tableName: 'team_keeper_stats',
    fieldMappings: {
      common: {
        'Date': 'match_date',
        'Time': 'match_time',
        'Venue': 'venue',
        'Result': 'result', 
        'GF': 'goals_for',
        'GA': 'goals_against',
        'Opponent': 'opponent',
        'Poss': 'possession'
      },
      team: {
        'GA': 'team_goals_against_gk',
        'SoTA': 'team_shots_on_target_against',
        'Saves': 'team_saves',
        'Save%': 'team_save_percentage',
        'CS': 'team_clean_sheets',
        'PKA': 'team_penalty_kicks_against',
        'PKsv': 'team_penalty_saves',
        'PKm': 'team_penalty_misses',
        'PSxG': 'team_post_shot_expected_goals_against'
      },
      opponent: {
        'GA': 'opp_goals_against_gk',
        'SoTA': 'opp_shots_on_target_against', 
        'Saves': 'opp_saves',
        'Save%': 'opp_save_percentage',
        'CS': 'opp_clean_sheets',
        'PKA': 'opp_penalty_kicks_against',
        'PKsv': 'opp_penalty_saves',
        'PKm': 'opp_penalty_misses',
        'PSxG': 'opp_post_shot_expected_goals_against'
      }
    }
  },

  defense: {
    tableName: 'team_defense_stats',
    fieldMappings: {
      common: {
        'Date': 'match_date',
        'Time': 'match_time',
        'Venue': 'venue',
        'Result': 'result',
        'GF': 'goals_for',
        'GA': 'goals_against',
        'Opponent': 'opponent',
        'Poss': 'possession'
      },
      team: {
        'Tkl': 'team_tackles',
        'TklW': 'team_tackles_won',
        'Def 3rd': 'team_tackles_def_3rd',
        'Mid 3rd': 'team_tackles_mid_3rd',
        'Att 3rd': 'team_tackles_att_3rd',
        'Tkl+': 'team_dribblers_tackled',
        'Att': 'team_dribbles_contested',
        'Tkl%': 'team_tackle_pct',
        'Lost': 'team_tackles_lost',
        'Blocks': 'team_blocks',
        'Sh': 'team_shots_blocked',
        'Pass': 'team_passes_blocked',
        'Int': 'team_interceptions',
        'Tkl+Int': 'team_tackles_interceptions',
        'Clr': 'team_clearances',
        'Err': 'team_errors'
      },
      opponent: {
        'Tkl': 'opp_tackles',
        'TklW': 'opp_tackles_won',
        'Def 3rd': 'opp_tackles_def_3rd',
        'Mid 3rd': 'opp_tackles_mid_3rd',
        'Att 3rd': 'opp_tackles_att_3rd',
        'Tkl+': 'opp_dribblers_tackled',
        'Att': 'opp_dribbles_contested',
        'Tkl%': 'opp_tackle_pct',
        'Lost': 'opp_tackles_lost',
        'Blocks': 'opp_blocks',
        'Sh': 'opp_shots_blocked',
        'Pass': 'opp_passes_blocked',
        'Int': 'opp_interceptions',
        'Tkl+Int': 'opp_tackles_interceptions',
        'Clr': 'opp_clearances',
        'Err': 'opp_errors'
      }
    }
  },

  misc: {
    tableName: 'team_misc_stats',
    fieldMappings: {
      common: {
        'Date': 'match_date',
        'Time': 'match_time',
        'Venue': 'venue',
        'Result': 'result',
        'GF': 'goals_for',
        'GA': 'goals_against',
        'Opponent': 'opponent',
        'Poss': 'possession'
      },
      team: {
        'CrdY': 'team_yellow_cards',
        'CrdR': 'team_red_cards',
        '2CrdY': 'team_second_yellow_cards',
        'Fls': 'team_fouls',
        'Fld': 'team_fouled',
        'Off': 'team_offsides',
        'Crs': 'team_crosses',
        'TklW': 'team_tackles_won',
        'Int': 'team_interceptions',
        'OG': 'team_own_goals',
        'PKwon': 'team_penalty_kicks_won',
        'PKcon': 'team_penalty_kicks_conceded',
        'Recov': 'team_ball_recoveries',
        'Won': 'team_aerial_duels_won',
        'Lost': 'team_aerial_duels_lost',
        'Won%': 'team_aerial_duels_won_pct'
      },
      opponent: {
        'CrdY': 'opp_yellow_cards',
        'CrdR': 'opp_red_cards',
        '2CrdY': 'opp_second_yellow_cards',
        'Fls': 'opp_fouls',
        'Fld': 'opp_fouled',
        'Off': 'opp_offsides',
        'Crs': 'opp_crosses',
        'TklW': 'opp_tackles_won',
        'Int': 'opp_interceptions',
        'OG': 'opp_own_goals',
        'PKwon': 'opp_penalty_kicks_won',
        'PKcon': 'opp_penalty_kicks_conceded',
        'Recov': 'opp_ball_recoveries',
        'Won': 'opp_aerial_duels_won',
        'Lost': 'opp_aerial_duels_lost',
        'Won%': 'opp_aerial_duels_won_pct'
      }
    }
  }
};
