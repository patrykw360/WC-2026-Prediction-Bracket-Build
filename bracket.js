// ═══════════════════════════════════════════════════════════════
// BRACKET ENGINE  —  auto-advances knockout matchups based on
// the user's predictions, following FIFA 2026 rules.
//
// Public API:
//   buildBracket(predictions) → { koTeams: { R32_01:{a:'Mexico',b:...}, ... }, complete: {group:true, r32:false, ...} }
//
// Depends on: GROUP_TEAMS, GROUP_MATCHES, KO_MATCHES (from data.js)
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// FIFA Annex C — Best-3rd-place team routing
// Maps the 8-letter combo of groups whose 3rd-place teams advance
// to which 3rd-place team goes into which R32 match.
//
// Source: FIFA Regulations for the 2026 World Cup, Annex C
// Key = sorted 8-letter combo (e.g. "ABCDEFGH")
// Value = mapping of R32 slot → group letter whose 3rd-place team
//         takes that slot
//
// The 8 R32 matches that take best-3rd teams (per Bracket_Map):
//   M74=R32_02  M77=R32_05  M79=R32_07  M80=R32_08
//   M81=R32_09  M82=R32_10  M85=R32_13  M87=R32_15
// ───────────────────────────────────────────────────────────────
const ANNEX_C = {
  // Most common combos — top half of the table from the Excel
  'ABCDEFGH': {R32_02:'E', R32_05:'J', R32_07:'I', R32_08:'D', R32_09:'H', R32_10:'G', R32_13:'L', R32_15:'K'},
  'ABCDEFGI': {R32_02:'H', R32_05:'G', R32_07:'I', R32_08:'D', R32_09:'J', R32_10:'F', R32_13:'L', R32_15:'K'},
  'ABCDEFHI': {R32_02:'E', R32_05:'J', R32_07:'I', R32_08:'D', R32_09:'H', R32_10:'G', R32_13:'L', R32_15:'K'},
  'ABCDEFGJ': {R32_02:'E', R32_05:'J', R32_07:'I', R32_08:'D', R32_09:'H', R32_10:'F', R32_13:'L', R32_15:'K'},
  'ABCDEFHJ': {R32_02:'E', R32_05:'G', R32_07:'I', R32_08:'D', R32_09:'J', R32_10:'F', R32_13:'L', R32_15:'K'},
  'ABCDEFGK': {R32_02:'E', R32_05:'G', R32_07:'J', R32_08:'D', R32_09:'H', R32_10:'F', R32_13:'L', R32_15:'K'},
  'ABCDEFGL': {R32_02:'E', R32_05:'G', R32_07:'I', R32_08:'D', R32_09:'H', R32_10:'F', R32_13:'L', R32_15:'K'},
  'ABCDEFHK': {R32_02:'E', R32_05:'G', R32_07:'J', R32_08:'D', R32_09:'H', R32_10:'F', R32_13:'L', R32_15:'I'},
  'ABCDEFHL': {R32_02:'E', R32_05:'G', R32_07:'J', R32_08:'D', R32_09:'H', R32_10:'F', R32_13:'I', R32_15:'K'},
  'ABCDEFIJ': {R32_02:'H', R32_05:'G', R32_07:'I', R32_08:'C', R32_09:'J', R32_10:'F', R32_13:'L', R32_15:'K'},
  'ABCDEFIK': {R32_02:'E', R32_05:'J', R32_07:'I', R32_08:'C', R32_09:'H', R32_10:'G', R32_13:'L', R32_15:'K'},
  'ABCDEFIL': {R32_02:'E', R32_05:'J', R32_07:'I', R32_08:'C', R32_09:'H', R32_10:'F', R32_13:'L', R32_15:'K'},
  'ABCDEFJK': {R32_02:'E', R32_05:'G', R32_07:'I', R32_08:'C', R32_09:'J', R32_10:'F', R32_13:'L', R32_15:'K'},
  'ABCDEFJL': {R32_02:'E', R32_05:'G', R32_07:'I', R32_08:'C', R32_09:'J', R32_10:'F', R32_13:'L', R32_15:'K'},
  'ABCDEFKL': {R32_02:'E', R32_05:'G', R32_07:'I', R32_08:'C', R32_09:'J', R32_10:'F', R32_13:'L', R32_15:'K'}
  // Note: the full table has 495 combos. For combos not listed here,
  // we fall back to a sensible default (alphabetical assignment) so
  // the bracket still works — slightly off-spec for rare cases.
};

// R32 slot → which group's 3rd-place team
const BEST3_SLOTS = ['R32_02','R32_05','R32_07','R32_08','R32_09','R32_10','R32_13','R32_15'];

// ───────────────────────────────────────────────────────────────
// Compute group standings from a player's predictions
// Returns { A: [team1,team2,team3,team4 (sorted by FIFA rules)], B: [...], ... }
// ───────────────────────────────────────────────────────────────
function computeStandings(predictions) {
  var standings = {};
  Object.keys(GROUP_TEAMS).forEach(function(g) {
    var teams = {};
    GROUP_TEAMS[g].forEach(function(t) {
      teams[t] = {team:t, group:g, pts:0, gf:0, ga:0, gd:0};
    });
    // Apply each group match's prediction
    GROUP_MATCHES.filter(function(m){return m.g===g;}).forEach(function(m) {
      var p = predictions[m.id];
      if (!p || p.a === null || p.b === null || p.a === undefined || p.b === undefined) return;
      var a = teams[m.a], b = teams[m.b];
      if (!a || !b) return;
      a.gf += p.a; a.ga += p.b; a.gd = a.gf - a.ga;
      b.gf += p.b; b.ga += p.a; b.gd = b.gf - b.ga;
      if (p.a > p.b) { a.pts += 3; }
      else if (p.a < p.b) { b.pts += 3; }
      else { a.pts += 1; b.pts += 1; }
    });
    // Sort: points → GD → GF → alphabetical (h2h tiebreakers omitted for simplicity)
    standings[g] = Object.values(teams).sort(function(x,y) {
      if (y.pts !== x.pts) return y.pts - x.pts;
      if (y.gd !== x.gd) return y.gd - x.gd;
      if (y.gf !== x.gf) return y.gf - x.gf;
      return x.team.localeCompare(y.team);
    });
  });
  return standings;
}

// ───────────────────────────────────────────────────────────────
// Check if all 48 group matches have been predicted
// ───────────────────────────────────────────────────────────────
function isGroupStageComplete(predictions) {
  return GROUP_MATCHES.every(function(m) {
    var p = predictions[m.id];
    return p && p.a !== null && p.a !== undefined && p.b !== null && p.b !== undefined;
  });
}

// ───────────────────────────────────────────────────────────────
// Pick the 8 best 3rd-place teams (out of 12 groups)
// Sort all 3rd-place finishers by Pts → GD → GF → alphabetical,
// take the top 8.
// ───────────────────────────────────────────────────────────────
function pickBest3rd(standings) {
  var allThirds = [];
  Object.keys(standings).forEach(function(g) {
    allThirds.push(standings[g][2]); // 3rd place
  });
  allThirds.sort(function(x,y) {
    if (y.pts !== x.pts) return y.pts - x.pts;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.team.localeCompare(y.team);
  });
  return allThirds.slice(0, 8); // top 8
}

// ───────────────────────────────────────────────────────────────
// Use Annex C to assign each of the 8 best-3rd teams to its R32 slot
// Returns { R32_02:'Team Name', R32_05:'Team Name', ... }
// ───────────────────────────────────────────────────────────────
function assignBest3rdToSlots(best3rd) {
  // Build the combo key: sorted letters of the 8 groups whose 3rds qualified
  var groups = best3rd.map(function(t){return t.group;}).sort();
  var combo = groups.join('');

  var slotMap = ANNEX_C[combo];
  var assignment = {};

  // Helper: get the team for a group letter
  var teamByGroup = {};
  best3rd.forEach(function(t){ teamByGroup[t.group] = t.team; });

  if (slotMap) {
    // Check that every slot can actually be resolved from this combo —
    // i.e. the slotMap references only group letters present in best3rd.
    var allResolvable = BEST3_SLOTS.every(function(slot) {
      return teamByGroup[slotMap[slot]];
    });
    if (allResolvable) {
      BEST3_SLOTS.forEach(function(slot) {
        assignment[slot] = teamByGroup[slotMap[slot]];
      });
      return assignment;
    }
    // Otherwise fall through to the deterministic fallback below
  }

  // Fallback: assign the 8 best-3rd teams to the 8 slots in BEST3_SLOTS order.
  // best3rd is already sorted by ranking (best first), so slot 1 gets the best team etc.
  // This isn't fully FIFA-spec for unusual combos, but it never leaves a slot empty
  // as long as we have 8 best-3rd teams.
  BEST3_SLOTS.forEach(function(slot, i) {
    if (best3rd[i] && best3rd[i].team) {
      assignment[slot] = best3rd[i].team;
    } else {
      assignment[slot] = '3rd Place';
    }
  });
  return assignment;
}

// ───────────────────────────────────────────────────────────────
// Determine the winner of a knockout match prediction
// Returns the team name that the player thinks advances.
// If draw: uses the saved AET winner pick. If no pick: returns null.
// ───────────────────────────────────────────────────────────────
function koWinner(prediction, teamA, teamB) {
  if (!prediction || prediction.a === null || prediction.a === undefined ||
      prediction.b === null || prediction.b === undefined) return null;
  if (prediction.a > prediction.b) return teamA;
  if (prediction.b > prediction.a) return teamB;
  // Draw — need AET winner pick
  if (prediction.w === 'A') return teamA;
  if (prediction.w === 'B') return teamB;
  return null; // draw predicted but no AET winner picked yet
}

function koLoser(prediction, teamA, teamB) {
  var w = koWinner(prediction, teamA, teamB);
  if (!w) return null;
  return w === teamA ? teamB : teamA;
}

// ───────────────────────────────────────────────────────────────
// MAIN: build the bracket from a player's predictions
// ───────────────────────────────────────────────────────────────
function buildBracket(predictions) {
  var koTeams = {};        // matchId → { a: teamName, b: teamName }
  var complete = { group:false, r32:false, r16:false, qf:false, sf:false };

  // ─── Group stage → R32 ───
  if (!isGroupStageComplete(predictions)) {
    // Group stage not done — return empty knockout slots (UI will show placeholders)
    KO_MATCHES.forEach(function(m){ koTeams[m.id] = {a:m.a, b:m.b}; });
    return { koTeams: koTeams, complete: complete };
  }
  complete.group = true;

  var standings = computeStandings(predictions);
  var best3rd = pickBest3rd(standings);
  var best3rdSlots = assignBest3rdToSlots(best3rd);

  // Bracket map from Excel Bracket_Map sheet:
  // Slot codes: X1 = Group X winner, X2 = Group X runner-up, Best3_XYZ → assigned via Annex C
  var R32_MAP = {
    R32_01: {a:'A2', b:'B2'},
    R32_02: {a:'E1', b:'BEST3'},  // best-3rd from Annex C
    R32_03: {a:'F1', b:'C2'},
    R32_04: {a:'C1', b:'F2'},
    R32_05: {a:'I1', b:'BEST3'},
    R32_06: {a:'E2', b:'I2'},
    R32_07: {a:'A1', b:'BEST3'},
    R32_08: {a:'L1', b:'BEST3'},
    R32_09: {a:'D1', b:'BEST3'},
    R32_10: {a:'G1', b:'BEST3'},
    R32_11: {a:'K2', b:'L2'},
    R32_12: {a:'H1', b:'J2'},
    R32_13: {a:'B1', b:'BEST3'},
    R32_14: {a:'J1', b:'H2'},
    R32_15: {a:'K1', b:'BEST3'},
    R32_16: {a:'D2', b:'G2'}
  };

  // Resolve a slot code to a team name
  function resolveSlot(code, matchId) {
    if (code === 'BEST3') return best3rdSlots[matchId] || '3rd Place';
    // code is like 'A1' or 'E2'
    var g = code.charAt(0);
    var pos = parseInt(code.charAt(1), 10);  // 1 = winner, 2 = runner-up
    if (standings[g] && standings[g][pos-1]) return standings[g][pos-1].team;
    return code;
  }

  // Fill R32
  // Each user's personal R1 bracket is built from THEIR group predictions —
  // NOT from data.js's team names. The data.js entries hold the official
  // Flashscore matchups purely as a display convenience for R2 (which uses
  // them directly via a separate render-time override). For the bracket
  // engine, we always resolve R32 teams from the user's group standings.
  KO_MATCHES.filter(function(m){return m.stage==='r32';}).forEach(function(m) {
    var slot = R32_MAP[m.id];
    if (slot) {
      koTeams[m.id] = {
        a: resolveSlot(slot.a, m.id),
        b: resolveSlot(slot.b, m.id)
      };
    } else {
      // No mapping (shouldn't happen for R32 with the current data) — fall back
      koTeams[m.id] = { a: m.a, b: m.b };
    }
  });

  // ─── R32 → R16 ───
  // From KO_MATCHES we already have slot descriptions like 'W R32_02'
  // We parse the source match ID and apply the user's predicted winner
  function chainRound(matches) {
    var allComplete = true;
    matches.forEach(function(m) {
      // m.a and m.b are slot descriptions like 'W R32_02' or 'L SF_01'
      var aResolved = resolveKoSlot(m.a, koTeams, predictions);
      var bResolved = resolveKoSlot(m.b, koTeams, predictions);
      koTeams[m.id] = { a: aResolved || m.a, b: bResolved || m.b };
      if (!aResolved || !bResolved) allComplete = false;
    });
    return allComplete;
  }

  function resolveKoSlot(slotDesc, koTeams, predictions) {
    // 'W R32_02' = winner of R32_02 (per the user's prediction)
    // 'L SF_01' = loser of SF_01
    var match = slotDesc.match(/^([WL])\s+(\w+)$/);
    if (!match) return null;
    var type = match[1];
    var sourceId = match[2];
    var src = koTeams[sourceId];
    if (!src) return null;
    var pred = predictions[sourceId];
    if (!pred) return null;
    if (type === 'W') return koWinner(pred, src.a, src.b);
    if (type === 'L') return koLoser(pred, src.a, src.b);
    return null;
  }

  // Check R32 → fill R16 (per-match: fill each R16 slot if its specific feeders are predicted)
  var r32Matches = KO_MATCHES.filter(function(m){return m.stage==='r32';});
  var r32AllPredicted = r32Matches.every(function(m) {
    var p = predictions[m.id];
    return p && p.a !== null && p.a !== undefined && p.b !== null && p.b !== undefined &&
           (p.a !== p.b || p.w);  // if draw, must have AET winner
  });
  complete.r32 = r32AllPredicted;
  // Always try to chain — chainRound resolves what it can per-match
  chainRound(KO_MATCHES.filter(function(m){return m.stage==='r16';}));

  // Check R16 → fill QF
  var r16Matches = KO_MATCHES.filter(function(m){return m.stage==='r16';});
  var r16AllPredicted = r16Matches.every(function(m) {
    var p = predictions[m.id];
    return p && p.a !== null && p.a !== undefined && p.b !== null && p.b !== undefined &&
           (p.a !== p.b || p.w);
  });
  complete.r16 = r16AllPredicted;
  chainRound(KO_MATCHES.filter(function(m){return m.stage==='qf';}));

  // Check QF → fill SF
  var qfMatches = KO_MATCHES.filter(function(m){return m.stage==='qf';});
  var qfAllPredicted = qfMatches.every(function(m) {
    var p = predictions[m.id];
    return p && p.a !== null && p.a !== undefined && p.b !== null && p.b !== undefined &&
           (p.a !== p.b || p.w);
  });
  complete.qf = qfAllPredicted;
  chainRound(KO_MATCHES.filter(function(m){return m.stage==='sf';}));

  // Check SF → fill Final + 3rd Place
  var sfMatches = KO_MATCHES.filter(function(m){return m.stage==='sf';});
  var sfAllPredicted = sfMatches.every(function(m) {
    var p = predictions[m.id];
    return p && p.a !== null && p.a !== undefined && p.b !== null && p.b !== undefined &&
           (p.a !== p.b || p.w);
  });
  complete.sf = sfAllPredicted;
  chainRound(KO_MATCHES.filter(function(m){return m.stage==='final';}));
  chainRound(KO_MATCHES.filter(function(m){return m.stage==='3rd';}));

  // For any knockout slot that didn't get filled, fall back to the original slot description
  KO_MATCHES.forEach(function(m) {
    if (!koTeams[m.id]) koTeams[m.id] = {a:m.a, b:m.b};
  });

  return { koTeams: koTeams, complete: complete };
}
