import pandas as pd
import numpy as np
from scipy.stats import poisson
from datetime import datetime
import json
import os

# ========================= CONFIG =========================
# All leagues available on football-data.co.uk (exactly like the original repos)
LEAGUES = ["E0","E1","E2","E3","EC","SP1","SP2","I1","I2","F1","F2","D1","D2","P1","N1","B1","G1","T1","SC0","SC1","SC2","SC3"]
MIN_EDGE = 0.05        # 5% edge for value bet
# =======================================================

print("Fetching latest fixtures from football-data.co.uk...")

url = "https://www.football-data.co.uk/fixtures.csv"
df = pd.read_csv(url, dtype=str)

# Convert Date properly
df['Date'] = pd.to_datetime(df['Date'], format='mixed', dayfirst=True, errors='coerce')
today = datetime.now().date()

print(f"Total rows: {len(df)}")
print(f"Leagues found: {sorted(df['Div'].unique())}")

# Filter upcoming matches across ALL chosen leagues
upcoming = df[
    (df['Div'].isin(LEAGUES)) & 
    (df['Date'].dt.date > today) &
    (pd.to_numeric(df.get('AvgH', 0), errors='coerce') > 1)
].copy()

print(f"Found {len(upcoming)} upcoming matches across {len(upcoming['Div'].unique())} leagues!")

if upcoming.empty:
    print("⚠️ No upcoming matches right now.")
    results = []
else:
    # Simple Poisson (same as before — we can upgrade to the full ML models from the original repos later)
    avg_home_goals = 1.48
    avg_away_goals = 1.22

    def calculate_probabilities(home_odds, draw_odds, away_odds):
        try:
            home_odds = float(home_odds)
            draw_odds = float(draw_odds)
            away_odds = float(away_odds)
        except:
            return {"home_win_prob": 0.0, "draw_prob": 0.0, "away_win_prob": 0.0,
                    "value_home": 0.0, "value_draw": 0.0, "value_away": 0.0}

        home_lambda = avg_home_goals
        away_lambda = avg_away_goals

        max_goals = 6
        home_probs = [poisson.pmf(i, home_lambda) for i in range(max_goals + 1)]
        away_probs = [poisson.pmf(i, away_lambda) for i in range(max_goals + 1)]

        home_win = draw = away_win = 0.0
        for h in range(max_goals + 1):
            for a in range(max_goals + 1):
                prob = home_probs[h] * away_probs[a]
                if h > a: home_win += prob
                elif h == a: draw += prob
                else: away_win += prob

        total = home_win + draw + away_win
        if total > 0:
            home_win /= total
            draw /= total
            away_win /= total

        imp_home = 1 / home_odds if home_odds > 1 else 0
        imp_draw = 1 / draw_odds if draw_odds > 1 else 0
        imp_away = 1 / away_odds if away_odds > 1 else 0

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

    results = []
    for _, row in upcoming.iterrows():
        probs = calculate_probabilities(
            row.get('AvgH', 2.0),
            row.get('AvgD', 3.5),
            row.get('AvgA', 3.0)
        )

        match = {
            "league": str(row.get('Div', 'UNK')),
            "date": row['Date'].strftime('%Y-%m-%d %H:%M') if pd.notna(row['Date']) else "TBD",
            "home_team": str(row.get('HomeTeam', 'Unknown')),
            "away_team": str(row.get('AwayTeam', 'Unknown')),
            "home_odds": float(row.get('AvgH', 0) or 0),
            "draw_odds": float(row.get('AvgD', 0) or 0),
            "away_odds": float(row.get('AvgA', 0) or 0),
            **probs
        }
        results.append(match)

    print(f"Generated predictions for {len(results)} matches.")

# Always create the file
os.makedirs("data", exist_ok=True)
with open("data/predictions.json", "w") as f:
    json.dump(results, f, indent=2)

print("✅ predictions.json created successfully with multiple leagues!")
