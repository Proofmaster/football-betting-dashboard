console.log("Dashboard script starting...");

async function loadPredictions() {
  try {
    console.log("Fetching predictions.json...");
    const response = await fetch('https://raw.githubusercontent.com/Proofmaster/football-betting-dashboard/main/data/predictions.json');
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const matches = await response.json();
    console.log(`Loaded ${matches.length} matches`);

    const container = document.getElementById('matches');
    container.innerHTML = '';

    if (matches.length === 0) {
      container.innerHTML = '<p class="text-gray-400 text-center py-12 text-xl">No upcoming matches right now.</p>';
      return;
    }

    // Summary
    const total = matches.length;
    const valueCount = matches.filter(m => Math.max(m.value_home || 0, m.value_draw || 0, m.value_away || 0) > 0).length;
    document.getElementById('summary').innerHTML = `
      <div class="bg-gray-900 p-6 rounded-2xl text-center">
        <div class="text-emerald-400 text-sm">MATCHES</div>
        <div class="text-5xl font-bold">${total}</div>
      </div>
      <div class="bg-gray-900 p-6 rounded-2xl text-center">
        <div class="text-emerald-400 text-sm">VALUE BETS</div>
        <div class="text-5xl font-bold text-emerald-400">${valueCount}</div>
      </div>
      <div class="bg-gray-900 p-6 rounded-2xl text-center">
        <div class="text-emerald-400 text-sm">AVG HOME xG</div>
        <div class="text-5xl font-bold">${(matches.reduce((s, m) => s + (m.home_xg || 1.5), 0) / total).toFixed(1)}</div>
      </div>
      <div class="bg-gray-900 p-6 rounded-2xl text-center">
        <div class="text-emerald-400 text-sm">OVER 2.5 AVG</div>
        <div class="text-5xl font-bold">${(matches.reduce((s, m) => s + (m.over_25_prob || 0.5), 0) / total * 100).toFixed(0)}%</div>
      </div>
    `;

    matches.forEach(match => {
      const hasValue = Math.max(match.value_home || 0, match.value_draw || 0, match.value_away || 0) > 0;
      const card = document.createElement('div');
      card.className = `bg-gray-900 rounded-3xl p-6 cursor-pointer hover:border-emerald-500 border border-gray-700 hover:scale-[1.02] transition-all`;

      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <span class="px-3 py-1 bg-gray-800 text-xs rounded-full">${match.league}</span>
            <div class="text-xl font-semibold mt-3">${match.home_team} vs ${match.away_team}</div>
            <div class="text-sm text-gray-400">${match.date}</div>
          </div>
          <div class="text-right">
            <div class="text-emerald-400 font-bold">${match.home_xg} – ${match.away_xg} xG</div>
            ${hasValue ? `<div class="text-xs bg-emerald-500 text-black px-3 py-1 rounded-full inline-block mt-2">+${(Math.max(match.value_home||0, match.value_draw||0, match.value_away||0)*100).toFixed(1)}% EDGE</div>` : ''}
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4 mt-6 text-center text-sm">
          <div><div class="text-emerald-400">${(match.home_win_prob*100).toFixed(0)}%</div><div class="text-xs text-gray-400">HOME</div></div>
          <div><div>${(match.draw_prob*100).toFixed(0)}%</div><div class="text-xs text-gray-400">DRAW</div></div>
          <div><div class="text-red-400">${(match.away_win_prob*100).toFixed(0)}%</div><div class="text-xs text-gray-400">AWAY</div></div>
        </div>
      `;

      card.addEventListener('click', () => showDetailModal(match));
      container.appendChild(card);
    });

    console.log("Dashboard rendered successfully");

  } catch (e) {
    console.error("Load error:", e);
    document.getElementById('matches').innerHTML = `<p class="text-red-400 text-center py-12">Failed to load data.<br>Run the GitHub Action again.</p>`;
  }
}

function showDetailModal(match) {
  const modal = document.getElementById('modal');
  const header = document.getElementById('modal-header');
  const content = document.getElementById('modal-content');

  header.innerHTML = `${match.home_team} <span class="text-emerald-400">vs</span> ${match.away_team}`;

  const html = `
    <div class="text-sm text-gray-400 mb-6">${match.date} • ${match.league}</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 class="font-semibold mb-4">xG Preview</h3>
        <div class="bg-gray-800 p-6 rounded-2xl space-y-4">
          <div class="flex justify-between"><span>Home xG</span><span class="font-mono text-2xl text-emerald-400">${match.home_xg}</span></div>
          <div class="flex justify-between"><span>Away xG</span><span class="font-mono text-2xl">${match.away_xg}</span></div>
          <div class="pt-4 border-t border-gray-700 grid grid-cols-3 text-center">
            <div class="text-emerald-400 font-bold">${(match.home_win_prob*100).toFixed(0)}% HOME</div>
            <div class="font-bold">${(match.draw_prob*100).toFixed(0)}% DRAW</div>
            <div class="text-red-400 font-bold">${(match.away_win_prob*100).toFixed(0)}% AWAY</div>
          </div>
        </div>
      </div>
      <div>
        <h3 class="font-semibold mb-4">Value Bets</h3>
        <div class="space-y-3">
          ${(match.value_home || 0) > 0 ? `<div class="bg-emerald-500 text-black p-5 rounded-2xl font-semibold">HOME +${(match.value_home*100).toFixed(1)}% EDGE</div>` : ''}
          ${(match.value_draw || 0) > 0 ? `<div class="bg-emerald-500 text-black p-5 rounded-2xl font-semibold">DRAW +${(match.value_draw*100).toFixed(1)}% EDGE</div>` : ''}
          ${(match.value_away || 0) > 0 ? `<div class="bg-emerald-500 text-black p-5 rounded-2xl font-semibold">AWAY +${(match.value_away*100).toFixed(1)}% EDGE</div>` : ''}
        </div>
      </div>
    </div>
    <div class="mt-10 text-center text-gray-400">
      <p>Full historical H2H and form data is being loaded from multiple seasons in the backend.</p>
    </div>
  `;

  content.innerHTML = html;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

loadPredictions();
