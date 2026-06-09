// ═══════════════════════════════════════════════════════════════
// AWARDS  —  Golden Ball, Golden Boot, Golden Glove predictions
// Each pick is worth 8 points if exact, 0 otherwise.
// Picks lock at 2026-06-11 19:00 UTC (first match kickoff).
// UX: pick country first, then pick player from that country.
// ═══════════════════════════════════════════════════════════════

var awardsState = {
  players: [],                  // [{id, team, name, position, jersey_num}]
  predictions: {},              // { golden_ball: player_id, ... }
  results: {},                  // { golden_ball: player_id, ... }
  selectedTeam: {},             // { golden_ball: 'Brazil', ... } — UI-only
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

  // Fetch players paginated (Supabase caps at 1000 rows per query by default)
  function fetchAllPlayers() {
    var PAGE = 1000;
    var collected = [];
    function next(offset) {
      return sb.from('players').select('id,team,name,position,jersey_num')
        .order('team').order('name')
        .range(offset, offset + PAGE - 1)
        .then(function(r) {
          if (r.error) throw r.error;
          var batch = r.data || [];
          collected = collected.concat(batch);
          if (batch.length === PAGE) return next(offset + PAGE);
          return collected;
        });
    }
    return next(0);
  }

  Promise.all([
    fetchAllPlayers(),
    sb.from('award_predictions').select('award,player_id').eq('user_id', me.id),
    sb.from('award_results').select('award,player_id')
  ]).then(function(rs) {
    awardsState.players = rs[0] || [];
    awardsState.predictions = {};
    (rs[1].data || []).forEach(function(p) { awardsState.predictions[p.award] = p.player_id; });
    awardsState.results = {};
    (rs[2].data || []).forEach(function(r) { awardsState.results[r.award] = r.player_id; });

    // Pre-select the team of any existing pick
    AWARD_DEFS.forEach(function(a) {
      var pickedId = awardsState.predictions[a.key];
      if (pickedId) {
        var picked = awardsState.players.find(function(p){ return p.id === pickedId; });
        if (picked) awardsState.selectedTeam[a.key] = picked.team;
      }
    });

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

  if (rosterCount === 0) {
    html += '<div style="padding:32px 24px;text-align:center;color:var(--muted)">' +
              '<div style="font-size:48px;margin-bottom:12px">📋</div>' +
              '<div style="font-family:var(--fh);font-size:16px;font-weight:700;color:var(--navy);margin-bottom:6px">Squad rosters not yet entered</div>' +
              '<div style="font-size:13px;max-width:380px;margin:0 auto;line-height:1.5">FIFA confirms final 26-man rosters about 5 days before the tournament starts. Award predictions open once the rosters are loaded — check back closer to June 11.</div>' +
            '</div>';
    document.getElementById('panel-awards').innerHTML = html;
    return;
  }

  AWARD_DEFS.forEach(function(a) {
    var currentPickId = awardsState.predictions[a.key] || '';
    var currentPickPlayer = currentPickId ? awardsState.players.find(function(p){ return p.id === currentPickId; }) : null;
    var actualResult = awardsState.results[a.key] || null;
    var got = currentPickId && actualResult && currentPickId === actualResult;
    var wrong = currentPickId && actualResult && currentPickId !== actualResult;
    var cardBorder = got ? '#2ecc71' : (wrong ? '#e74c3c' : 'var(--border)');
    var cardBg = got ? '#e6f4ec' : (wrong ? '#fdf0f0' : '#fff');

    html += '<div style="border:1.5px solid '+cardBorder+';background:'+cardBg+';border-radius:10px;padding:16px 18px;margin:18px 14px">';

    // Header row
    html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">';
    html += '<div style="font-size:32px;flex-shrink:0">'+a.icon+'</div>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-family:var(--fh);font-size:18px;font-weight:800;color:'+a.color+';letter-spacing:.3px">'+a.label+'</div>';
    html += '<div style="font-size:12px;color:var(--muted)">'+a.sub+' · <strong>8 pts if correct</strong></div>';
    html += '</div>';
    if (got) html += '<div style="background:#2ecc71;color:#fff;font-family:var(--fh);font-size:12px;font-weight:700;padding:4px 10px;border-radius:14px;flex-shrink:0">✓ +8 pts</div>';
    if (wrong) html += '<div style="background:#bdc3c7;color:#fff;font-family:var(--fh);font-size:12px;font-weight:700;padding:4px 10px;border-radius:14px;flex-shrink:0">+0 pts</div>';
    html += '</div>';

    // Current pick display
    if (currentPickPlayer) {
      html += '<div style="background:rgba(13,31,60,0.04);border-left:3px solid '+a.color+';border-radius:4px;padding:8px 12px;margin-bottom:14px">';
      html += '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-bottom:2px">Your pick</div>';
      html += '<div style="font-size:15px;font-weight:600;color:var(--navy)">'+esc(currentPickPlayer.name);
      if (currentPickPlayer.jersey_num) html += ' <span style="font-size:11px;color:var(--muted)">#'+currentPickPlayer.jersey_num+'</span>';
      html += ' <span style="font-size:12px;color:var(--muted);font-weight:400">— '+esc(currentPickPlayer.team)+'</span></div>';
      html += '</div>';
    }

    if (locked) {
      var resultPlayer = actualResult ? awardsState.players.find(function(p){return p.id === actualResult;}) : null;
      if (!currentPickPlayer) {
        html += '<div style="font-size:13px;color:var(--muted);font-style:italic;margin-bottom:10px">No pick made before lock.</div>';
      }
      if (resultPlayer) {
        html += '<div style="font-size:13px"><span style="color:var(--muted)">Actual winner:</span> <strong>'+esc(resultPlayer.name)+' <span style="color:var(--muted);font-size:11px;font-weight:400">— '+esc(resultPlayer.team)+'</span></strong></div>';
      } else {
        html += '<div style="font-size:13px;color:var(--muted);font-style:italic">Winner not yet announced</div>';
      }
      html += '</div>';
      return;
    }

    // Two-step picker: country, then player
    var filteredPlayers = a.filter ? awardsState.players.filter(function(p){return p.position === a.filter;}) : awardsState.players;
    var teamsWithPlayers = {};
    filteredPlayers.forEach(function(p){ teamsWithPlayers[p.team] = (teamsWithPlayers[p.team] || 0) + 1; });
    var teamNames = Object.keys(teamsWithPlayers).sort();
    var selectedTeam = awardsState.selectedTeam[a.key] || '';

    html += '<div style="margin-bottom:10px">';
    html += '<label style="display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-bottom:5px">1. Select country</label>';
    html += '<select onchange="onAwardSelectTeam(\''+a.key+'\', this.value)" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:14px;font-family:var(--fb);background:#fff;outline:none;cursor:pointer">';
    html += '<option value="">— Choose a country —</option>';
    teamNames.forEach(function(t) {
      html += '<option value="'+esc(t)+'"'+(t===selectedTeam?' selected':'')+'>'+esc(t)+' ('+teamsWithPlayers[t]+' player'+(teamsWithPlayers[t]===1?'':'s')+')</option>';
    });
    html += '</select></div>';

    if (selectedTeam) {
      var teamPlayers = filteredPlayers.filter(function(p){ return p.team === selectedTeam; });
      var posOrder = {GK:1, DF:2, MF:3, FW:4};
      teamPlayers.sort(function(x, y) {
        var ox = posOrder[x.position] || 5;
        var oy = posOrder[y.position] || 5;
        if (ox !== oy) return ox - oy;
        return x.name.localeCompare(y.name);
      });

      html += '<div>';
      html += '<label style="display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-bottom:5px">2. Select player from '+esc(selectedTeam)+'</label>';
      html += '<select onchange="onAwardPick(\''+a.key+'\', this.value)" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:14px;font-family:var(--fb);background:#fff;outline:none;cursor:pointer">';
      html += '<option value="">— Choose a player —</option>';
      teamPlayers.forEach(function(p) {
        var label = p.name + (p.jersey_num ? ' #'+p.jersey_num : '') + (p.position && !a.filter ? ' ('+p.position+')' : '');
        html += '<option value="'+p.id+'"'+(p.id===currentPickId?' selected':'')+'>'+esc(label)+'</option>';
      });
      html += '</select>';
      if (teamPlayers.length === 0) {
        html += '<div style="font-size:12px;color:var(--muted);font-style:italic;margin-top:6px">No '+(a.filter==='GK'?'goalkeepers':'players')+' loaded for this team yet.</div>';
      }
      html += '</div>';
    } else {
      html += '<div>';
      html += '<label style="display:block;font-size:11px;color:#ccc;text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-bottom:5px">2. Select player</label>';
      html += '<div style="padding:9px 12px;border:1.5px dashed #ddd;border-radius:7px;font-size:13px;color:#bbb;font-style:italic;background:#fafafa">Pick a country first</div>';
      html += '</div>';
    }

    if (currentPickId) {
      html += '<div style="margin-top:10px;text-align:right">';
      html += '<button onclick="clearAwardPick(\''+a.key+'\')" style="font-size:11px;color:var(--muted);background:none;border:none;cursor:pointer;text-decoration:underline">Clear pick</button>';
      html += '</div>';
    }

    html += '</div>';
  });

  document.getElementById('panel-awards').innerHTML = html;
}

function onAwardSelectTeam(award, team) {
  awardsState.selectedTeam[award] = team;
  renderAwards();
}

function onAwardPick(award, playerId) {
  if (!playerId) return;
  var payload = {
    user_id:    me.id,
    award:      award,
    player_id:  playerId,
    updated_at: new Date().toISOString()
  };
  sb.from('award_predictions').upsert(payload, {onConflict: 'user_id,award'}).then(function(r) {
    if (r.error) { toast('Save failed: ' + r.error.message, 'err'); return; }
    awardsState.predictions[award] = playerId;
    toast('Pick saved', 'ok');
    renderAwards();
  });
}

function clearAwardPick(award) {
  sb.from('award_predictions').delete().eq('user_id', me.id).eq('award', award).then(function(r) {
    if (r.error) { toast('Clear failed', 'err'); return; }
    delete awardsState.predictions[award];
    delete awardsState.selectedTeam[award];
    toast('Pick cleared', 'ok');
    renderAwards();
  });
}
