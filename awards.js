// ═══════════════════════════════════════════════════════════════
// AWARDS  —  Golden Ball, Golden Boot, Golden Glove predictions
// Each pick is worth 8 points if exact, 0 otherwise.
// Picks lock at 2026-06-11 19:00 UTC (first match kickoff).
// ═══════════════════════════════════════════════════════════════

var awardsState = {
  players: [],            // [{id, team, name, position, jersey_num}]
  predictions: {},        // { golden_ball: player_id, golden_boot: player_id, golden_glove: player_id }
  results: {},            // { golden_ball: player_id, ... }  (admin enters after tournament)
  loaded: false,
  loading: false
};

var AWARD_DEFS = [
  { key: 'golden_ball',  label: 'Golden Ball',  sub: 'Best player of the tournament',  icon: '⚽', filter: null,  color: '#c9a227' },
  { key: 'golden_boot',  label: 'Golden Boot',  sub: 'Top goal scorer',                icon: '👟', filter: null,  color: '#cd7f32' },
  { key: 'golden_glove', label: 'Golden Glove', sub: 'Best goalkeeper',                icon: '🧤', filter: 'GK',  color: '#8a9bb0' }
];

function loadAwards() {
  if (awardsState.loaded || awardsState.loading) {
    renderAwards();
    return;
  }
  awardsState.loading = true;
  document.getElementById('panel-awards').innerHTML =
    '<div class="panel-load"><div class="spinner"></div> Loading awards...</div>';

  Promise.all([
    sb.from('players').select('id,team,name,position,jersey_num').order('team').order('name').range(0, 4999),
    sb.from('award_predictions').select('award,player_id').eq('user_id', me.id),
    sb.from('award_results').select('award,player_id')
  ]).then(function(rs) {
    awardsState.players = rs[0].data || [];
    awardsState.predictions = {};
    (rs[1].data || []).forEach(function(p) { awardsState.predictions[p.award] = p.player_id; });
    awardsState.results = {};
    (rs[2].data || []).forEach(function(r) { awardsState.results[r.award] = r.player_id; });
    awardsState.loaded = true;
    awardsState.loading = false;
    renderAwards();
  }).catch(function(e) {
    awardsState.loading = false;
    document.getElementById('panel-awards').innerHTML =
      '<div class="empty-state" style="color:var(--red)">Failed to load awards: ' + esc(e.message || e) + '</div>';
  });
}

function renderAwards() {
  var locked = tournamentState.awards_locked;
  var rosterCount = awardsState.players.length;

  var html = '';

  // Intro banner
  if (locked) {
    html += '<div style="background:#f4f6fb;border-bottom:1px solid var(--border);padding:14px 18px;font-size:13px;color:var(--muted)">' +
              '<strong style="color:var(--navy);font-family:var(--fh);font-size:14px;display:block;margin-bottom:4px">🏆 Award picks are locked</strong>' +
              'The tournament has started. Your award predictions are final.' +
            '</div>';
  } else {
    html += '<div style="background:linear-gradient(135deg,#c9a227 0%,#856404 100%);color:#fff;padding:16px 18px">' +
              '<div style="font-family:var(--fh);font-size:16px;font-weight:800;letter-spacing:.3px;margin-bottom:6px">🏆 Tournament Awards</div>' +
              '<div style="font-size:13px;line-height:1.5;opacity:.95">' +
                'Predict the winners of the three big individual awards. <strong>8 points each</strong> if you get it exactly right. Picks lock when the tournament starts (June 11).' +
              '</div>' +
            '</div>';
  }

  // No roster loaded yet
  if (rosterCount === 0) {
    html += '<div style="padding:32px 24px;text-align:center;color:var(--muted)">' +
              '<div style="font-size:48px;margin-bottom:12px">📋</div>' +
              '<div style="font-family:var(--fh);font-size:16px;font-weight:700;color:var(--navy);margin-bottom:6px">Squad rosters not yet entered</div>' +
              '<div style="font-size:13px;max-width:380px;margin:0 auto;line-height:1.5">FIFA confirms final 26-man rosters about 5 days before the tournament starts. Award predictions open once the rosters are loaded — check back closer to June 11.</div>' +
            '</div>';
    document.getElementById('panel-awards').innerHTML = html;
    return;
  }

  // Three award cards
  AWARD_DEFS.forEach(function(a) {
    var currentPick = awardsState.predictions[a.key] || '';
    var actualResult = awardsState.results[a.key] || null;
    var got = currentPick && actualResult && currentPick === actualResult;
    var wrong = currentPick && actualResult && currentPick !== actualResult;
    var cardBorder = got ? '#2ecc71' : (wrong ? '#e74c3c' : 'var(--border)');
    var cardBg = got ? '#e6f4ec' : (wrong ? '#fdf0f0' : '#fff');

    html += '<div style="border:1.5px solid '+cardBorder+';background:'+cardBg+';border-radius:10px;padding:16px 18px;margin:18px 14px">';
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">';
    html += '<div style="font-size:32px">'+a.icon+'</div>';
    html += '<div>';
    html += '<div style="font-family:var(--fh);font-size:18px;font-weight:800;color:'+a.color+';letter-spacing:.3px">'+a.label+'</div>';
    html += '<div style="font-size:12px;color:var(--muted)">'+a.sub+' · <strong>8 pts if correct</strong></div>';
    html += '</div>';
    if (got) html += '<div style="margin-left:auto;background:#2ecc71;color:#fff;font-family:var(--fh);font-size:12px;font-weight:700;padding:4px 10px;border-radius:14px">✓ +8 pts</div>';
    if (wrong) html += '<div style="margin-left:auto;background:#bdc3c7;color:#fff;font-family:var(--fh);font-size:12px;font-weight:700;padding:4px 10px;border-radius:14px">+0 pts</div>';
    html += '</div>';

    // Picker (or locked display)
    if (locked) {
      // Show pick + result
      var pickedPlayer = currentPick ? awardsState.players.find(function(p){return p.id === currentPick;}) : null;
      var resultPlayer = actualResult ? awardsState.players.find(function(p){return p.id === actualResult;}) : null;
      html += '<div style="font-size:13px;color:var(--text)">';
      html += '<div style="margin-bottom:6px"><span style="color:var(--muted)">Your pick:</span> <strong>'+(pickedPlayer ? esc(pickedPlayer.name)+' <span style="color:var(--muted);font-size:11px">('+esc(pickedPlayer.team)+')</span>' : '<em style="color:var(--muted)">No pick made</em>')+'</strong></div>';
      if (resultPlayer) {
        html += '<div><span style="color:var(--muted)">Winner:</span> <strong>'+esc(resultPlayer.name)+' <span style="color:var(--muted);font-size:11px">('+esc(resultPlayer.team)+')</span></strong></div>';
      } else {
        html += '<div style="color:var(--muted);font-style:italic">Winner not yet announced</div>';
      }
      html += '</div>';
    } else {
      // Dropdown picker — split into team + player
      var filteredPlayers = a.filter ? awardsState.players.filter(function(p){return p.position === a.filter;}) : awardsState.players;
      var pickedPlayer = currentPick ? awardsState.players.find(function(p){return p.id === currentPick;}) : null;
      // Group players by team for an optgroup-style dropdown
      var byTeam = {};
      filteredPlayers.forEach(function(p) {
        if (!byTeam[p.team]) byTeam[p.team] = [];
        byTeam[p.team].push(p);
      });
      var teamNames = Object.keys(byTeam).sort();

      html += '<select onchange="onAwardPick(\''+a.key+'\', this.value)" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:var(--fb);background:#fff;outline:none;cursor:pointer">';
      html += '<option value="">— Select a player —</option>';
      teamNames.forEach(function(team) {
        html += '<optgroup label="'+esc(team)+'">';
        byTeam[team].forEach(function(p) {
          var label = p.name + (p.jersey_num ? ' #'+p.jersey_num : '') + (p.position && !a.filter ? ' ('+p.position+')' : '');
          html += '<option value="'+p.id+'"'+(p.id===currentPick?' selected':'')+'>'+esc(label)+'</option>';
        });
        html += '</optgroup>';
      });
      html += '</select>';
      if (pickedPlayer) {
        html += '<div style="font-size:12px;color:var(--muted);margin-top:6px">Your pick: <strong style="color:'+a.color+'">'+esc(pickedPlayer.name)+'</strong> ('+esc(pickedPlayer.team)+')</div>';
      }
    }

    html += '</div>';
  });

  document.getElementById('panel-awards').innerHTML = html;
}

function onAwardPick(award, playerId) {
  var payload = {
    user_id:    me.id,
    award:      award,
    player_id:  playerId || null,
    updated_at: new Date().toISOString()
  };
  sb.from('award_predictions').upsert(payload, {onConflict: 'user_id,award'}).then(function(r) {
    if (r.error) { toast('Save failed: ' + r.error.message, 'err'); return; }
    awardsState.predictions[award] = playerId || null;
    toast('Pick saved', 'ok');
  });
}
