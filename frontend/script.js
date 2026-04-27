async function loadPredictions() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/Proofmaster/football-betting-dashboard/main/data/predictions.json');
    const matches = await response.json();
    
    const container = document.getElementById('matches');
    const summaryDiv = document.getElementById('summary');
    container.innerHTML = '';

    if (matches.length === 0) {
      container.innerHTML = '<p class="text-gray-400 text-center py-12 text-xl">No upcoming matches with odds right now (common during CL breaks). Check back soon!</p>';
      return;
    }

    // Summary stats
    const totalMatches = matches.length;
    const valueBets = matches.filter(m => m.value_home > 0 || m.value_draw > 0 || m.value_away > 0).length;
    const avgHomeProb = (matches.reduce((sum, m) => sum + m.home_win_prob, 0) / totalMatches * 100).toFixed(1);

    summaryDiv.innerHTML = `
      <div class="bg-gray-900 rounded-2xl p-6">
        <div class="text-emerald-400 text-sm">TOTAL MATCHES</div>
        <div class="text-5xl font-bold">${totalMatches}</div>
      </div>
      <div class="bg-gray-900 rounded-2xl p-6">
        <div class="text-emerald-400 text-sm">VALUE BETS FOUND</div>
        <div class="text-5xl font-bold text-emerald-400">${valueBets}</div>
      </div>
      <div class="bg-gray-900 rounded-2xl p-6">
        <div class="text-emerald-400 text-sm">AVG HOME WIN PROB</div>
        <div class="text-5xl font-bold">${avgHomeProb}%</div>
      </div>
    `;

    // Sort and filter logic
    function renderMatches(filteredMatches) {
      container.innerHTML = '';
      filteredMatches.forEach(match => {
        const hasValue = match.value_home > 0 || match.value_draw > 0 || match.value_away > 0;
        const edgeMax = Math.max(match.value_home, match.value_draw, match.value_away);

        const card = document.createElement('div');
        card.className = `match-card bg-gray-900 rounded-3xl p-6 border ${hasValue ? 'border-emerald-500' : 'border-gray-800'}`;

        card.innerHTML = `
          <div class="flex justify-between items-start mb-4">
            <div>
              <span class="inline-block px-3 py-1 bg-gray-800 text-xs rounded-full">${match.league || 'UNK'}</span>
              <div class="text-xl font-semibold mt-2">${match.home_team} vs ${match.away_team}</div>
              <div class="text-sm text-gray-400">${match.date}</div>
            </div>
            ${edgeMax > 0 ? `<div class="value-positive text-lg">+${(edgeMax*100).toFixed(1)}% EDGE</div>` : ''}
          </div>

          <div class="grid grid-cols-3 gap-6 text-center">
            <div>
              <div class="text-xs text-gray-400 mb-1">HOME WIN</div>
              <div class="text-4xl font-bold text-emerald-400">${(match.home_win_prob * 100).toFixed(0)}%</div>
              <div class="text-sm mt-1">${match.home_odds.toFixed(2)}</div>
              ${match.value_home > 0 ? `<div class="value-positive text-xs mt-2 inline-block">+${(match.value_home*100).toFixed(1)}%</div>` : ''}
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">DRAW</div>
              <div class="text-4xl font-bold">${(match.draw_prob * 100).toFixed(0)}%</div>
              <div class="text-sm mt-1">${match.draw_odds.toFixed(2)}</div>
              ${match.value_draw > 0 ? `<div class="value-positive text-xs mt-2 inline-block">+${(match.value_draw*100).toFixed(1)}%</div>` : ''}
            </div>
            <div>
              <div class="text-xs text-gray-400 mb-1">AWAY WIN</div>
              <div class="text-4xl font-bold text-red-400">${(match.away_win_prob * 100).toFixed(0)}%</div>
              <div class="text-sm mt-1">${match.away_odds.toFixed(2)}</div>
              ${match.value_away > 0 ? `<div class="value-positive text-xs mt-2 inline-block">+${(match.value_away*100).toFixed(1)}%</div>` : ''}
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    }

    // Initial render + event listeners
    let currentMatches = [...matches];
    renderMatches(currentMatches);

    document.getElementById('search').addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = matches.filter(m => 
        m.home_team.toLowerCase().includes(term) || 
        m.away_team.toLowerCase().includes(term) ||
        (m.league || '').toLowerCase().includes(term)
      );
      renderMatches(filtered);
    });

    document.getElementById('sort').addEventListener('change', (e) => {
      let sorted = [...matches];
      if (e.target.value === 'edge') {
        sorted.sort((a, b) => Math.max(b.value_home, b.value_draw, b.value_away) - Math.max(a.value_home, a.value_draw, a.value_away));
      } else if (e.target.value === 'date') {
        sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
      } else if (e.target.value === 'prob') {
        sorted.sort((a, b) => b.home_win_prob - a.home_win_prob);
      }
      renderMatches(sorted);
    });

    // Last updated
    document.getElementById('last-updated').textContent = new Date().toLocaleString();

  } catch (e) {
    console.error(e);
    document.getElementById('matches').innerHTML = '<p class="text-red-400 text-center py-12">Failed to load predictions. Make sure the latest workflow has run.</p>';
  }
}

loadPredictions();
