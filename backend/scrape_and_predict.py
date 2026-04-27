import pandas as pd
import numpy as np
from scipy.stats import poisson
from datetime import datetime
import json
import os

# ========================= CONFIG =========================
LEAGUE = "E0"  # Premier League (change to B1, D1, etc. if you want other leagues)
MIN_EDGE = 0.05  # 5%+ edge for value bet
# =======================================================

print("Fetching latest fixtures + odds...")

# Download latest fixtures (includes upcoming matches + betting odds)
url = "https://www.football-data.co.uk/fixtures.csv"
df = pd.read_csv(url)

# Clean date
df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%Y', errors='coerce')
today = datetime.now().date()

# Filter upcoming matches for chosen league
upcoming = df[(df['Div'] == LEAGUE) & (df['Date'].dt.date > today)].copy()

if upcoming.empty:
    print("No upcoming matches found.")
    upcoming = pd.DataFrame()
else:
    print(f"Found {len(upcoming)} upcoming {LEAGUE} matches.")

    # Simple Poisson model using typical Premier League averages
    # (You can later replace with full historical training from the original repos)
    avg_home_goals = 1.48
    avg_away_goals = 1.22

    def calculate_probabilities(home_odds, draw_odds, away_odds):
        # Expected goals (simple)
        home_lambda = avg_home_goals
        away_lambda = avg_away_goals

        # Probabilities for 0-6 goals
        max_goals = 6
        home_probs = [poisson.pmf(i, home_lambda) for i in range(max_goals + 1)]
        away_probs = [poisson.pmf(i, away_lambda) for i in range(max_goals + 1)]

        # Win / Draw / Loss
        home_win = 0
        draw = 0
        away_win = 0

        for h in range(max_goals + 1):
            for a in range(max_goals + 1):
                prob = home_probs[h] * away_probs[a]
                if h > a:
                    home_win += prob
                elif h == a:
                    draw += prob
                else:
                    away_win += prob

        # Normalize (in case of rounding)
        total = home_win + draw + away_win
        home_win /= total
        draw /= total
        away_win /= total

        # Implied probabilities from average odds (with overround adjustment)
        imp_home = 1 / home_odds if home_odds > 1 else 0
        imp_draw = 1 / draw_odds if draw_odds > 1 else 0
        imp_away = 1 / away_odds if away_odds > 1 else 0

        # Value detection
        value_home = home_win - imp_home if home_win > imp_home + MIN_EDGE else 0
        value_draw = draw - imp_draw if draw > imp_draw + MIN_EDGE else 0
        value_away = away_win - imp_away if away_win > imp_away + MIN_EDGE else 0

        return {
            "home_win_prob": round(home_win, 4),
            "draw_prob": round(draw, 4),
            "away_win_prob": round(away_win, 4),
            "value_home": round(value_home, 4),
            "value_draw": round(value_draw, 4),
            "value_away": round(value_away, 4)
        }

    # Add predictions to each match
    results = []
    for _, row in upcoming.iterrows():
        probs = calculate_probabilities(
            row.get('AvgH', 2.0),
            row.get('AvgD', 3.5),
            row.get('AvgA', 3.0)
        )

        match = {
            "date": row['Date'].strftime('%Y-%m-%d %H:%M'),
            "home_team": row['HomeTeam'],
            "away_team": row['AwayTeam'],
            "home_odds": float(row.get('AvgH', 0)),
            "draw_odds": float(row.get('AvgD', 0)),
            "away_odds": float(row.get('AvgA', 0)),
            **probs
        }
        results.append(match)

    # Save to data folder
    os.makedirs("data", exist_ok=True)
    with open("data/predictions.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"Saved {len(results)} predictions to data/predictions.json")

print("✅ Script finished successfully!")
