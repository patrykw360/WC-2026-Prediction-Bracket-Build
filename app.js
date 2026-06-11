// ═══════════════════════════════════════════════════════════════
// APP LOGIC  —  state, rendering, saving, leaderboard, groups, admin
// Depends on: config.js (sb), data.js (GROUP_MATCHES, KO_MATCHES, ...)
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
var me, myProfile;
var myPreds={}, allResults={};
var myPredsR2={};                 // Round 2 predictions (official knockouts)
var viewedUid=null, viewedPreds={}, viewedPredsR2={}, viewedName='';
var lbData=[], lbOffset=0, lbMode='global', lbGroupId=null;
var myGroups=[];
var tournamentState={round2_open:false, group_results_entered:0, group_matches_total:72};
var appLoaded=false, realtimeSetup=false;
var savingSet={}, saveTimers={};
var srchCache={};
var currentAdmTab='group';
var LB_PAGE=25;
var authMode='signin';

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
function esc(s){var d=document.createElement('div');d.textContent=String(s||'');return d.innerHTML;}
function fmtPts(n){var v=Number(n);return v%1===0?String(v):v.toFixed(2);}
function toast(msg,type){
  var el=document.getElementById('toast');
  el.textContent=msg; el.className=''; if(type)el.classList.add(type); el.classList.add('show');
  setTimeout(function(){el.classList.remove('show');},3000);
}
function show(id){
  ['screen-loading','screen-auth','screen-app'].forEach(function(s){
    var el=document.getElementById(s);
    el.style.display=(s===id)?(s==='screen-app'?'flex':''):'none';
  });
}
function scoreP(pa,pb,ra,rb){
  if(pa===null||pb===null||ra===null||rb===null)return null;
  if(pa===ra&&pb===rb)return 4;
  if((pa-pb)===(ra-rb))return 3;
  if(Math.sign(pa-pb)===Math.sign(ra-rb))return 2;
  return 0;
}
function tend(a,b){if(a===null||b===null)return '';if(a>b)return 'A';if(a===b)return 'D';return 'B';}
// Set to true to lock every R1 prediction across the board (tournament has started).
// Round 2 picks (made after group stage ends, against real matchups) are unaffected.
function isLocked(ko){
  // Global lock: once flipped to true, ALL round-1 predictions are locked
  // regardless of individual match kickoff. Set this when the tournament starts
  // to freeze every user's R1 picks. Round 2 saves use a separate path.
  if (R1_GLOBAL_LOCK) return true;
  return ko && new Date(ko) < new Date();
}
function fmtKO(iso){
  if(!iso)return '';
  var d=new Date(iso);
  return d.toLocaleDateString('nl-NL',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'});
}
function dismissWelcome(){
  try{ localStorage.setItem('wc26_welcome_dismissed','1'); }catch(e){}
  var el=document.getElementById('welcome-banner');
  if(el)el.style.display='none';
}
function notesRowHtml(matchId, isMe){
  // Render the collapsed "💬 Notes" toggle + the (hidden) panel.
  // Only show if user is in at least one league.
  if(!isMe || !myGroups.length) return '';
  return '<div class="notes-row" style="border-bottom:1px solid #f0f2f6;background:#fcfcfd">' +
           '<button onclick="toggleNotes(\''+matchId+'\')" style="width:100%;text-align:left;padding:6px 14px;background:none;border:none;font-size:11px;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:6px;font-family:var(--fb)">' +
             '<span style="color:var(--blue);font-weight:600">💬 Notes</span>' +
             '<span style="color:#bbb;font-size:10px">(click to open / post for your league)</span>' +
           '</button>' +
           '<div id="notes-panel-'+matchId+'" style="display:none;border-top:1px solid var(--border)"></div>' +
         '</div>';
}
// When VIEWING a league-mate's predictions, show a "Comment on this pick" button on matches
// where they actually have a prediction. Clicking it opens the notes panel in compose-target mode.
function commentButtonHtml(matchId, hasPrediction){
  if (viewedUid === null) return '';        // not browsing someone else
  if (!hasPrediction) return '';            // no pick to comment on
  if (!myGroups.length) return '';          // not in any league
  // Build the panel container too — same id pattern as notesRowHtml so the notes module can target it.
  // The escaped viewedName comes from the global; we look it up at click time via the document.
  var nameAttr = (typeof viewedName !== 'undefined' && viewedName) ? viewedName.replace(/'/g, "\\'") : 'this player';
  return '<div class="notes-row" style="border-bottom:1px solid #f0f2f6;background:#fcfcfd">' +
           '<button onclick="openPredictionComment(\''+matchId+'\', \''+viewedUid+'\', \''+nameAttr+'\')" style="width:100%;text-align:left;padding:6px 14px;background:none;border:none;font-size:11px;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:6px;font-family:var(--fb)">' +
             '<span style="color:#c9a227;font-weight:600">💬 Comment on this pick</span>' +
             '<span style="color:#bbb;font-size:10px">(visible to your league)</span>' +
           '</button>' +
           '<div id="notes-panel-'+matchId+'" style="display:none;border-top:1px solid var(--border)"></div>' +
         '</div>';
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────
function toggleMode(){
  authMode=authMode==='signin'?'signup':'signin';
  var s=authMode==='signin';
  document.getElementById('btn-auth').textContent=s?'Sign in':'Create account';
  document.getElementById('tog-txt').textContent=s?'No account?':'Have an account?';
  document.querySelector('.auth-toggle a').textContent=s?' Sign up':' Sign in';
  document.getElementById('auth-name-row').style.display=s?'none':'block';
  setMsg('','');
}
function setMsg(msg,type){
  var el=document.getElementById('auth-msg');
  el.textContent=msg; el.className='auth-msg'+(type?' '+type:'');
}
function doAuth(){
  var email=document.getElementById('auth-email').value.trim();
  var pass=document.getElementById('auth-pass').value;
  if(!email||!pass){setMsg('Enter email and password.','err');return;}
  var btn=document.getElementById('btn-auth');
  btn.disabled=true; btn.textContent='...';
  if(authMode==='signup'){
    var name=document.getElementById('auth-name').value.trim()||email.split('@')[0];
    sb.auth.signUp({email:email,password:pass,options:{data:{full_name:name}}}).then(function(r){
      btn.disabled=false; btn.textContent='Create account';
      if(r.error){setMsg(r.error.message,'err');return;}
      setMsg('Account created! Check your email to confirm, then sign in.','info');
    });
  } else {
    sb.auth.signInWithPassword({email:email,password:pass}).then(function(r){
      btn.disabled=false; btn.textContent='Sign in';
      if(r.error)setMsg(r.error.message,'err');
    });
  }
}
function signOut(){sb.auth.signOut().then(function(){location.reload();});}
document.getElementById('auth-pass').addEventListener('keydown',function(e){if(e.key==='Enter')doAuth();});

// ─────────────────────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────────────────────
function init(){
  sb.auth.onAuthStateChange(function(event,session){
    if(event==='SIGNED_OUT'){appLoaded=false;realtimeSetup=false;show('screen-auth');return;}
    if(session&&session.user&&!appLoaded){appLoaded=true;me=session.user;loadApp();}
  });
  sb.auth.getSession().then(function(r){if(!r.data.session)show('screen-auth');});
}

function loadApp(){
  show('screen-loading');
  Promise.all([
    // Round 1 predictions
    sb.from('predictions').select('match_id,goals_a,goals_b,winner').eq('user_id',me.id).eq('round',1),
    sb.from('results').select('match_id,goals_a,goals_b,multiplier'),
    sb.from('profiles').select('id,display_name,is_admin').eq('id',me.id).single(),
    sb.from('group_members').select('group_id,groups(id,name,code)').eq('user_id',me.id),
    // Round 2 predictions
    sb.from('predictions').select('match_id,goals_a,goals_b,winner').eq('user_id',me.id).eq('round',2),
    // Tournament state (round2_open flag)
    sb.from('tournament_state').select('*').single()
  ]).then(function(rs){
    myPreds={};
    (rs[0].data||[]).forEach(function(p){myPreds[p.match_id]={a:p.goals_a,b:p.goals_b,w:p.winner};});
    allResults={};
    (rs[1].data||[]).forEach(function(r){allResults[r.match_id]=r;});
    myProfile=rs[2].data||null;
    myGroups=[];
    (rs[3].data||[]).forEach(function(gm){if(gm.groups)myGroups.push(gm.groups);});
    myPredsR2={};
    (rs[4].data||[]).forEach(function(p){myPredsR2[p.match_id]={a:p.goals_a,b:p.goals_b,w:p.winner};});
    if (rs[5] && rs[5].data) tournamentState = rs[5].data;
    var name=(myProfile&&myProfile.display_name)||me.email.split('@')[0];
    document.getElementById('hdr-name').textContent=name;
    document.getElementById('viewer-name').textContent=name;
    // Admin tab removed from UI — guard remains in case it's re-added
    var adminTabEl = document.getElementById('tab-admin');
    if(adminTabEl && myProfile && myProfile.is_admin) adminTabEl.style.display='';
    renderPredict();
    renderRules();
    setupRealtime();
    show('screen-app');
  }).catch(function(e){setMsg('Load failed: '+(e.message||e),'err');show('screen-auth');});
}

function setupRealtime(){
  if(realtimeSetup)return; realtimeSetup=true;
  sb.channel('live').on('postgres_changes',{event:'*',schema:'public',table:'results'},function(p){
    if(p.new&&p.new.match_id)allResults[p.new.match_id]=p.new;
    // Refresh tournament state — may have just flipped to Round 2 open
    sb.from('tournament_state').select('*').single().then(function(r){
      if(r&&r.data)tournamentState=r.data;
      renderPredict();
      // If user is currently looking at the Results tab, refresh it too
      var resultsTabActive = document.querySelector('.tab.active[data-tab=results]');
      if (resultsTabActive) renderResults();
    });
    if(lbData.length){lbData=[];lbOffset=0;if(document.querySelector('.tab.active[data-tab=leaderboard]'))loadAndRenderLb();}
  }).subscribe();
}

// ─────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────
function switchTab(el){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
  var tab=el.dataset.tab;
  ['predict','leaderboard','awards','results','groups','admin','rules'].forEach(function(t){
    var p=document.getElementById('panel-'+t);
    if(p)p.style.display=t===tab?'':'none';
  });
  var vb=document.getElementById('viewer-bar');
  var vp=document.getElementById('viewer-prog');
  vb.style.display=tab==='predict'?'':'none';
  vp.style.display=tab==='predict'?'':'none';
  if(tab==='leaderboard'){lbData=[];lbOffset=0;loadAndRenderLb();}
  if(tab==='groups')renderGroups();
  if(tab==='awards')loadAwards();
  if(tab==='results')renderResults();
  if(tab==='admin'&&myProfile&&myProfile.is_admin)renderAdmin();
}

// ─────────────────────────────────────────────────────────────
// RENDER PREDICTIONS
// ─────────────────────────────────────────────────────────────
function renderPredict(){
  var rawPreds=viewedUid===null?myPreds:viewedPreds;
  var isMe=viewedUid===null;
  var html='';
  var filled=0, pts=0;

  // ── LATE-JOINER PRE-FILL ──
  // For any locked match where the user has no prediction but a real result exists,
  // treat the actual result as their prediction. This gives them the real knockout
  // bracket (because `buildBracket` now sees actual winners) without awarding points
  // (handled below — auto-filled rows are flagged and skipped from scoring).
  // We don't mutate `rawPreds` (which is the canonical state) — we build an overlay.
  var preds = {};
  var autoFilled = {};   // matchId -> true  (rows that came from actual results, not user input)
  Object.keys(rawPreds).forEach(function(k){ preds[k] = rawPreds[k]; });
  var allMatches = GROUP_MATCHES.concat(KO_MATCHES);
  allMatches.forEach(function(m) {
    var r = allResults[m.id];
    var existing = preds[m.id];
    var hasExisting = existing && existing.a !== null && existing.a !== undefined && existing.b !== null && existing.b !== undefined;
    if (isLocked(m.ko) && !hasExisting && r && r.goals_a !== null && r.goals_a !== undefined && r.goals_b !== null && r.goals_b !== undefined) {
      // Carry the AET winner if the result has one — needed for knockout chaining on draws
      preds[m.id] = { a: r.goals_a, b: r.goals_b, w: r.winner || null };
      autoFilled[m.id] = true;
    }
  });

  // Build the auto-advanced bracket from this player's (overlaid) predictions
  var bracket = buildBracket(preds);

  // ── Welcome message (dismissable, only shown to self, only once per browser) ──
  if (isMe) {
    var dismissed = false;
    try { dismissed = localStorage.getItem('wc26_welcome_dismissed') === '1'; } catch(e){}
    if (!dismissed) {
      html +=
        '<div id="welcome-banner" style="background:linear-gradient(135deg,#0d1f3c 0%,#1e3a6e 100%);color:#fff;padding:16px 18px;margin:0;position:relative">' +
          '<button onclick="dismissWelcome()" style="position:absolute;top:8px;right:10px;background:rgba(255,255,255,.15);border:none;color:#fff;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1" title="Dismiss">×</button>' +
          '<div style="font-family:var(--fh);font-size:16px;font-weight:800;margin-bottom:8px;letter-spacing:.3px">Welcome to WC 2026 Predictions 🏆</div>' +
          '<div style="font-size:13px;line-height:1.6;opacity:.92">' +
            '<strong>1.</strong> Predict the final score of every match below — start with the 48 group games.<br>' +
            '<strong>2.</strong> Once you finish the group stage, your Round of 32 will fill in based on YOUR predicted standings.<br>' +
            '<strong>3.</strong> Keep predicting each knockout round — winners chain into the next round.<br>' +
            '<strong>4.</strong> Picks save automatically. The green Save button at the bottom of each round is a backup.<br>' +
            '<strong>5.</strong> Predictions lock at kickoff. Visit the Standings tab to track how you stack up.<br>' +
            '<strong>6.</strong> <em>Late to the party?</em> No problem — past matches show the actual result (no points), and your knockout bracket uses real teams. You can still predict any upcoming match.' +
          '</div>' +
        '</div>';
    }
  }

  // Count filled group predictions for completion message
  var groupFilled = GROUP_MATCHES.filter(function(m){
    var p = preds[m.id];
    return p && p.a !== null && p.a !== undefined && p.b !== null && p.b !== undefined;
  }).length;

    }

  // ── Group stage completion banner ──
  if (isMe && groupFilled === GROUP_MATCHES.length) {
    html += '<div style="background:#e6f4ec;border-bottom:1px solid #70c090;padding:12px 18px;color:#0d4a2a;font-size:13px;line-height:1.5">' +
              '<strong style="font-family:var(--fh);font-size:14px">✓ Group stage picks are locked in.</strong> ' +
              'All 48 predictions saved. Scroll down to predict the knockout rounds — your bracket has been built from your group-stage picks.' +
            '</div>';
  }

  // ── Group stage ──
  html+='<div class="stage-hdr"><span class="stage-hdr-title">Group Stage</span><span class="stage-hdr-sub">48 matches · Jun 11 – Jun 27</span></div>';
  var groups=Object.keys(GROUP_TEAMS).sort();
  groups.forEach(function(g){
    var gms=GROUP_MATCHES.filter(function(m){return m.g===g;}).sort(function(a,b){return a.s-b.s;});
    html+='<div class="group-hdr">GROUP '+g+' <span class="group-teams">'+GROUP_TEAMS[g].join(' · ')+'</span></div>';
    gms.forEach(function(m){
      var pred=preds[m.id]||null;
      var res=allResults[m.id]||null;
      var locked=isLocked(m.ko);
      var pa=pred?pred.a:null, pb=pred?pred.b:null;
      var hasPred=pa!==null&&pb!==null;
      var isAuto = !!autoFilled[m.id];
      if(hasPred)filled++;
      // Auto-filled rows: no points awarded, no scoring badge
      var bp=(hasPred&&res&&!isAuto)?scoreP(pa,pb,res.goals_a,res.goals_b):null;
      var mult=res?Number(res.multiplier||1):1;
      var fp=bp!==null?Math.round(bp*mult*100)/100:null;
      if(fp!==null)pts+=fp;
      var t=tend(pa,pb);
      // Late-joiner support: distinguish "you didn't predict" vs "auto-filled with actual result"
      var lockedNoPred = locked && !hasPred;
      // Auto-filled rows get a faded look too (it's not really YOUR pick)
      var rc='match-row'+(bp===4?' sc-4':bp===3?' sc-3':bp===2?' sc-2':bp===0&&res?' sc-0':hasPred&&!isAuto?' has-p':'')+(lockedNoPred||isAuto?' locked-no-pred':'');
      var canEdit=isMe&&!locked;
      var dis=canEdit?'':' disabled';
      var ev=canEdit?' oninput="onInp(\''+m.id+'\',this.closest(\'.match-row\'))"':'';
      html+='<div class="'+rc+'" data-mid="'+m.id+'">';
      html+='<div class="team home">'+esc(m.a)+'</div>';
      html+='<div class="sc-cell">';
      html+='<input type="number" min="0" max="20" value="'+(pa!==null?pa:'')+'" class="s-inp'+(pa!==null?' filled':'')+(locked?' locked':'')+'" placeholder="-" data-side="a"'+dis+ev+'>';
      html+='<span class="sep">:</span>';
      html+='<input type="number" min="0" max="20" value="'+(pb!==null?pb:'')+'" class="s-inp'+(pb!==null?' filled':'')+(locked?' locked':'')+'" placeholder="-" data-side="b"'+dis+ev+'>';
      html+='<span class="rb rb-'+(t||'')+'">'+(t||'?')+'</span>';
      if(res)html+='<span class="act-sc">'+res.goals_a+':'+res.goals_b+'</span>';
      if(fp!==null)html+='<span class="pc pc-'+bp+'">'+fmtPts(fp)+'</span>';
      if(mult>1&&bp>0)html+='<span class="mx-tag">×'+mult.toFixed(2)+'</span>';
      if(isAuto) html+='<span class="locked-badge" title="You joined after kickoff. Real result shown; no points awarded.">🕒 Auto · 0 pts</span>';
      else if(lockedNoPred) html+='<span class="locked-badge" title="Kickoff: '+esc(fmtKO(m.ko))+'">🔒 '+esc(fmtKO(m.ko))+'</span>';
      else if(locked&&!res)html+='<span style="font-size:10px;color:#ccc;flex-shrink:0">🔒</span>';
      if(savingSet[m.id])html+='<span class="sv-dot"></span>';
      html+='</div>';
      html+='<div class="team">'+esc(m.b)+'</div>';
      html+='</div>';
      html+=notesRowHtml(m.id, isMe);
      html+=commentButtonHtml(m.id, hasPred);
    });
  });

  // Save button for the whole group stage
  if(isMe){
    html+='<div class="round-save-bar">';
    html+='<span class="round-save-status" id="status-group"></span>';
    html+='<button class="btn-round-save" id="btn-save-group" onclick="saveRound(\'group\')">Save group stage</button>';
    html+='</div>';
  }

  // ── Knockout stages ──
  // Status banner explaining auto-advancement
  if (!bracket.complete.group) {
    html += '<div style="background:#fff8e1;border:1px solid #ffd54f;border-radius:8px;padding:10px 14px;margin:12px 14px 0;font-size:12px;color:#856404">' +
            '<strong>Knockout matchups appear once you finish the group stage.</strong> ' +
            'Predict all 48 group games above to see who YOU think will face who in the Round of 32.' +
            '</div>';
  } else {
    html += '<div style="background:#e6f4ec;border:1px solid #70c090;border-radius:8px;padding:10px 14px;margin:12px 14px 0;font-size:12px;color:#0d4a2a">' +
            '<strong>Bracket built from your group-stage picks.</strong> ' +
            'As you predict each knockout round, the next round\'s matchups update automatically. Predict draws? Pick the AET winner so the bracket can continue.' +
            '</div>';
  }
  var stages=['r32','r16','qf','sf','3rd','final'];
  stages.forEach(function(stage){
    var ms=KO_MATCHES.filter(function(m){return m.stage===stage;}).sort(function(a,b){return a.s-b.s;});
    if(!ms.length)return;
    html+='<div class="stage-hdr"><span class="stage-hdr-title">'+STAGE_LABELS[stage]+'</span>';
    if(STAGE_DATES[stage])html+='<span class="stage-hdr-sub">'+STAGE_DATES[stage]+'</span>';
    var first=ms[0],last=ms[ms.length-1];
    html+='<span class="stage-hdr-badge">M'+(first.s-100)+(ms.length>1?'–M'+(last.s-100):'')+'</span>';
    html+='</div>';
    ms.forEach(function(m){
      var pred=preds[m.id]||null;
      var res=allResults[m.id]||null;
      var locked=isLocked(m.ko);
      var pa=pred?pred.a:null, pb=pred?pred.b:null, pw=pred?pred.w:'';
      var hasPred=pa!==null&&pb!==null;
      var isAuto = !!autoFilled[m.id];
      if(hasPred)filled++;
      // Auto-filled: no points awarded
      var bp=(hasPred&&res&&!isAuto)?scoreP(pa,pb,res.goals_a,res.goals_b):null;
      var fp=bp!==null?Number(bp):null;
      if(fp!==null)pts+=fp;
      var lockedNoPred = locked && !hasPred;
      var rc='ko-match-row'+(bp===4?' sc-4':bp===3?' sc-3':bp===2?' sc-2':bp===0&&res?' sc-0':hasPred&&!isAuto?' has-p':'')+(lockedNoPred||isAuto?' locked-no-pred':'');
      var canEdit=isMe&&!locked;
      var dis=canEdit?'':' disabled';
      var ev=canEdit?' oninput="onKoInp(\''+m.id+'\',this.closest(\'.ko-match-row\'))"':'';
      // Use real team names from result if available, else from bracket prediction, else slot description
      var brTeams = bracket.koTeams[m.id] || {};
      var teamA = res && res.team_a ? res.team_a : (brTeams.a || m.a);
      var teamB = res && res.team_b ? res.team_b : (brTeams.b || m.b);
      html+='<div class="'+rc+'" data-mid="'+m.id+'">';
      html+='<div class="team home">'+esc(teamA)+'</div>';
      html+='<div class="ko-sc-cell">';
      html+='<div class="ko-main-row">';
      html+='<input type="number" min="0" max="20" value="'+(pa!==null?pa:'')+'" class="s-inp'+(pa!==null?' filled':'')+(locked?' locked':'')+'" placeholder="-" data-side="a"'+dis+ev+'>';
      html+='<span class="sep">:</span>';
      html+='<input type="number" min="0" max="20" value="'+(pb!==null?pb:'')+'" class="s-inp'+(pb!==null?' filled':'')+(locked?' locked':'')+'" placeholder="-" data-side="b"'+dis+ev+'>';
      if(res)html+='<span class="act-sc">'+res.goals_a+':'+res.goals_b+'</span>';
      if(fp!==null)html+='<span class="pc pc-'+bp+'">'+fmtPts(fp)+'</span>';
      if(isAuto)html+='<span class="locked-badge" title="You joined after kickoff. Real result shown; no points awarded.">🕒 Auto · 0 pts</span>';
      else if(lockedNoPred)html+='<span class="locked-badge">🔒 Missed</span>';
      else if(locked&&!res)html+='<span style="font-size:10px;color:#ccc;flex-shrink:0">🔒</span>';
      if(savingSet[m.id])html+='<span class="sv-dot"></span>';
      html+='</div>';
      // Winner pick shown only when prediction is a draw (knockout needs AET winner)
      if(hasPred&&pa===pb){
        if(canEdit){
          html+='<div class="ko-winner-row">After extra time: ';
          html+='<select class="winner-sel" onchange="onKoWinner(\''+m.id+'\',this.value)">';
          html+='<option value="">Pick winner</option>';
          html+='<option value="A"'+(pw==='A'?' selected':'')+'>'+esc(teamA)+'</option>';
          html+='<option value="B"'+(pw==='B'?' selected':'')+'>'+esc(teamB)+'</option>';
          html+='</select></div>';
        } else if(pw){
          html+='<div class="ko-winner-row"><span class="winner-locked">→ '+esc(pw==='A'?teamA:teamB)+'</span></div>';
        } else {
          html+='<div class="ko-winner-row" style="color:#ddd;font-size:10px">Pick winner (draw)</div>';
        }
      }
      html+='<div class="kickoff-time">'+fmtKO(m.ko)+'</div>';
      html+='</div>';
      html+='<div class="team">'+esc(teamB)+'</div>';
      html+='</div>';
      html+=notesRowHtml(m.id, isMe);
      html+=commentButtonHtml(m.id, hasPred);
    });
    // Save button for this knockout round
    if(isMe){
      html+='<div class="round-save-bar">';
      html+='<span class="round-save-status" id="status-'+stage+'"></span>';
      html+='<button class="btn-round-save" id="btn-save-'+stage+'" onclick="saveRound(\''+stage+'\')">Save '+STAGE_LABELS[stage].toLowerCase()+'</button>';
      html+='</div>';
    }
  });

  // ── ROUND 2: Official knockout predictions (only once group stage results are all in) ──
  if (tournamentState.round2_open) {
    html += renderRound2Section(isMe);
  } else if (isMe && bracket.complete.group) {
    // Group stage complete in user's predictions, but Round 2 not open yet
    html += '<div style="background:#f4f6fb;border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin:18px 14px 0;font-size:13px;color:var(--muted);text-align:center">' +
              '<strong style="color:var(--navy);font-family:var(--fh);font-size:14px;display:block;margin-bottom:6px">Round 2 unlocks when group stage ends</strong>' +
              'After the real group-stage results are entered (all 72 matches), a second prediction round opens for the official Round of 32 onwards. Your Round 2 points stack on top of Round 1.' +
            '</div>';
  }

  document.getElementById('panel-predict').innerHTML=html;

  // Stats bar
  var r2Filled = 0;
  if (tournamentState.round2_open) {
    r2Filled = KO_MATCHES.filter(function(m){
      var p = myPredsR2[m.id];
      return p && p.a !== null && p.a !== undefined && p.b !== null && p.b !== undefined;
    }).length;
  }
  var totalR1=104;
  document.getElementById('s-filled').textContent = filled + (r2Filled ? ' + ' + r2Filled : '');
  document.getElementById('s-pts').textContent=pts>0?fmtPts(pts):'-';
  var pct=Math.round(filled/totalR1*100);
  document.getElementById('prog-fill').style.width=pct+'%';
  document.getElementById('prog-text').textContent = filled + ' / 104 Round 1' +
    (tournamentState.round2_open ? ' · ' + r2Filled + ' / 32 Round 2' : '');
  document.getElementById('viewer-prog').style.display='';
}

// ─────────────────────────────────────────────────────────────
// ROUND 2 SECTION — renders the official knockout bracket
// using the real results from `allResults` (not the user's
// Round 1 predictions). User makes a FRESH set of picks here.
// ─────────────────────────────────────────────────────────────
function renderRound2Section(isMe) {
  // Compute the official bracket from real results (admin-entered)
  // by feeding allResults to bracket.js (which expects {a,b,w} shape)
  var resultsAsPreds = {};
  Object.keys(allResults).forEach(function(id){
    var r = allResults[id];
    if (r && r.goals_a !== null && r.goals_b !== null) {
      // For knockout, the actual winner column on results is from admin-entered
      resultsAsPreds[id] = { a: r.goals_a, b: r.goals_b, w: r.winner || null };
    }
  });
  var officialBracket = buildBracket(resultsAsPreds);

  // Use Round 2 predictions for what the user submitted
  var preds = isMe ? myPredsR2 : viewedPredsR2;

  var html = '';
  // Header banner explaining Round 2
  html += '<div style="background:linear-gradient(135deg,#1a7a4a 0%,#0d4a2a 100%);color:#fff;padding:14px 18px;margin:24px 14px 0;border-radius:8px">' +
            '<div style="font-family:var(--fh);font-size:16px;font-weight:800;letter-spacing:.3px;margin-bottom:6px">🏆 ROUND 2 — Official Knockouts</div>' +
            '<div style="font-size:13px;line-height:1.5;opacity:.95">' +
              'The real Round of 32 is set. Make fresh predictions for the official matchups — these score independently and stack on top of Round 1.' +
            '</div>' +
          '</div>';

  var stages = ['r32','r16','qf','sf','3rd','final'];
  stages.forEach(function(stage) {
    var ms = KO_MATCHES.filter(function(m){return m.stage===stage;}).sort(function(a,b){return a.s-b.s;});
    if (!ms.length) return;

    html += '<div class="stage-hdr" style="background:linear-gradient(90deg,#1a7a4a 0%,#0d4a2a 100%)"><span class="stage-hdr-title">R2: '+STAGE_LABELS[stage]+'</span>';
    if (STAGE_DATES[stage]) html += '<span class="stage-hdr-sub">'+STAGE_DATES[stage]+'</span>';
    html += '</div>';

    ms.forEach(function(m) {
      var pred = preds[m.id] || null;
      var res = allResults[m.id] || null;
      var locked = isLocked(m.ko);
      var pa = pred ? pred.a : null;
      var pb = pred ? pred.b : null;
      var pw = pred ? pred.w : '';
      var hasPred = pa !== null && pb !== null;
      var bp = (hasPred && res) ? scoreP(pa, pb, res.goals_a, res.goals_b) : null;
      var fp = bp !== null ? Number(bp) : null;
      var rc = 'ko-match-row' + (bp===4?' sc-4':bp===3?' sc-3':bp===2?' sc-2':bp===0&&res?' sc-0':hasPred?' has-p':'');
      var canEdit = isMe && !locked;
      var dis = canEdit ? '' : ' disabled';
      var ev = canEdit ? ' oninput="onR2KoInp(\''+m.id+'\',this.closest(\'.ko-match-row\'))"' : '';

      // Real team names from official bracket (or result if entered)
      var brTeams = officialBracket.koTeams[m.id] || {};
      var teamA = res && res.team_a ? res.team_a : (brTeams.a || m.a);
      var teamB = res && res.team_b ? res.team_b : (brTeams.b || m.b);

      html += '<div class="'+rc+'" data-mid="'+m.id+'-r2">';
      html += '<div class="team home">'+esc(teamA)+'</div>';
      html += '<div class="ko-sc-cell">';
      html += '<div class="ko-main-row">';
      html += '<input type="number" min="0" max="20" value="'+(pa!==null?pa:'')+'" class="s-inp'+(pa!==null?' filled':'')+(locked?' locked':'')+'" placeholder="-" data-side="a"'+dis+ev+'>';
      html += '<span class="sep">:</span>';
      html += '<input type="number" min="0" max="20" value="'+(pb!==null?pb:'')+'" class="s-inp'+(pb!==null?' filled':'')+(locked?' locked':'')+'" placeholder="-" data-side="b"'+dis+ev+'>';
      if (res) html += '<span class="act-sc">'+res.goals_a+':'+res.goals_b+'</span>';
      if (fp !== null) html += '<span class="pc pc-'+bp+'">'+fmtPts(fp)+'</span>';
      if (locked && !res) html += '<span style="font-size:10px;color:#ccc;flex-shrink:0">🔒</span>';
      if (savingSet['r2_'+m.id]) html += '<span class="sv-dot"></span>';
      html += '</div>';
      if (hasPred && pa === pb) {
        if (canEdit) {
          html += '<div class="ko-winner-row">After extra time: ';
          html += '<select class="winner-sel" onchange="onR2KoWinner(\''+m.id+'\',this.value)">';
          html += '<option value="">Pick winner</option>';
          html += '<option value="A"'+(pw==='A'?' selected':'')+'>'+esc(teamA)+'</option>';
          html += '<option value="B"'+(pw==='B'?' selected':'')+'>'+esc(teamB)+'</option>';
          html += '</select></div>';
        } else if (pw) {
          html += '<div class="ko-winner-row"><span class="winner-locked">→ '+esc(pw==='A'?teamA:teamB)+'</span></div>';
        }
      }
      html += '<div class="kickoff-time">'+fmtKO(m.ko)+'</div>';
      html += '</div>';
      html += '<div class="team">'+esc(teamB)+'</div>';
      html += '</div>';
    });

    if (isMe) {
      html += '<div class="round-save-bar">';
      html += '<span class="round-save-status" id="status-r2-'+stage+'"></span>';
      html += '<button class="btn-round-save" id="btn-save-r2-'+stage+'" onclick="saveR2Round(\''+stage+'\')">Save R2 '+STAGE_LABELS[stage].toLowerCase()+'</button>';
      html += '</div>';
    }
  });

  return html;
}

// ─── Round 2 save handlers ───────────────────────────────────────────────
function onR2KoInp(matchId, rowEl) {
  var aEl = rowEl.querySelector('[data-side="a"]');
  var bEl = rowEl.querySelector('[data-side="b"]');
  var a = aEl.value !== '' ? parseInt(aEl.value, 10) : null;
  var b = bEl.value !== '' ? parseInt(bEl.value, 10) : null;
  aEl.classList.toggle('filled', aEl.value !== '');
  bEl.classList.toggle('filled', bEl.value !== '');
  if (a === null || b === null) return;
  var existing = myPredsR2[matchId] || {};
  clearTimeout(saveTimers['r2_'+matchId]);
  savingSet['r2_'+matchId] = true;
  saveTimers['r2_'+matchId] = setTimeout(function() {
    sb.from('predictions').upsert(
      {user_id:me.id, match_id:matchId, goals_a:a, goals_b:b, winner:existing.w||null, round:2, updated_at:new Date().toISOString()},
      {onConflict:'user_id,match_id,round'}
    ).then(function(r) {
      delete savingSet['r2_'+matchId];
      if (r.error) { toast('Save failed', 'err'); return; }
      myPredsR2[matchId] = {a:a, b:b, w:existing.w||null};
      renderPredict(); // re-render to show/hide winner dropdown
    });
  }, 800);
}

function onR2KoWinner(matchId, winner) {
  var existing = myPredsR2[matchId] || {};
  sb.from('predictions').upsert(
    {user_id:me.id, match_id:matchId, goals_a:existing.a, goals_b:existing.b, winner:winner, round:2, updated_at:new Date().toISOString()},
    {onConflict:'user_id,match_id,round'}
  ).then(function(r) {
    if (r.error) { toast('Save failed', 'err'); return; }
    myPredsR2[matchId] = {a:existing.a, b:existing.b, w:winner};
    toast('R2 winner saved', 'ok');
  });
}

function saveR2Round(stage) {
  var ids = KO_MATCHES.filter(function(m){return m.stage===stage;}).map(function(m){return m.id;});
  var btn = document.getElementById('btn-save-r2-'+stage);
  var status = document.getElementById('status-r2-'+stage);

  ids.forEach(function(id) {
    if (saveTimers['r2_'+id]) { clearTimeout(saveTimers['r2_'+id]); delete saveTimers['r2_'+id]; }
  });

  var payload = [];
  var incomplete = 0;
  ids.forEach(function(id) {
    var row = document.querySelector('#panel-predict [data-mid="'+id+'-r2"]');
    if (!row) return;
    var aEl = row.querySelector('[data-side="a"]');
    var bEl = row.querySelector('[data-side="b"]');
    if (!aEl || !bEl) return;
    var a = aEl.value !== '' ? parseInt(aEl.value, 10) : null;
    var b = bEl.value !== '' ? parseInt(bEl.value, 10) : null;
    if (a !== null && b !== null && !isNaN(a) && !isNaN(b)) {
      var w = (myPredsR2[id] && myPredsR2[id].w) ? myPredsR2[id].w : null;
      payload.push({user_id:me.id, match_id:id, goals_a:a, goals_b:b, winner:w, round:2, updated_at:new Date().toISOString()});
    } else {
      incomplete++;
    }
  });

  if (!payload.length) {
    if (status) { status.className='round-save-status'; status.textContent='Nothing to save yet.'; }
    return;
  }

  if (btn) { btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Saving...'; }
  if (status) { status.className='round-save-status pending'; status.textContent='Saving '+payload.length+'...'; }

  sb.from('predictions').upsert(payload, {onConflict:'user_id,match_id,round'}).then(function(r) {
    if (btn) { btn.disabled=false; btn.textContent='Save R2 '+STAGE_LABELS[stage].toLowerCase(); }
    if (r.error) {
      if (status) { status.className='round-save-status'; status.style.color='var(--red)'; status.textContent='Save failed: '+r.error.message; }
      toast('Save failed', 'err');
      return;
    }
    payload.forEach(function(p){ myPredsR2[p.match_id] = {a:p.goals_a, b:p.goals_b, w:p.winner}; });
    var msg = payload.length + ' R2 saved';
    if (incomplete > 0) msg += ' · ' + incomplete + ' still blank';
    if (status) { status.className='round-save-status ok'; status.style.color=''; status.textContent='✓ '+msg; }
    toast('R2 round saved ('+payload.length+')', 'ok');
  });
}

// ─────────────────────────────────────────────────────────────
// SAVE – GROUP STAGE
// ─────────────────────────────────────────────────────────────
function onInp(matchId,rowEl){
  var aEl=rowEl.querySelector('[data-side="a"]');
  var bEl=rowEl.querySelector('[data-side="b"]');
  var a=aEl.value!==''?parseInt(aEl.value,10):null;
  var b=bEl.value!==''?parseInt(bEl.value,10):null;
  var t=tend(a,b);
  var rb=rowEl.querySelector('.rb');
  if(rb){rb.className='rb rb-'+(t||'');rb.textContent=t||'?';}
  aEl.classList.toggle('filled',aEl.value!=='');
  bEl.classList.toggle('filled',bEl.value!=='');
  if(a===null||b===null)return;
  clearTimeout(saveTimers[matchId]);
  savingSet[matchId]=true;
  saveTimers[matchId]=setTimeout(function(){
    sb.from('predictions').upsert(
      {user_id:me.id,match_id:matchId,goals_a:a,goals_b:b,round:1,updated_at:new Date().toISOString()},
      {onConflict:'user_id,match_id,round'}
    ).then(function(r){
      delete savingSet[matchId];
      if(r.error){toast('Save failed','err');return;}
      myPreds[matchId]={a:a,b:b,w:myPreds[matchId]?myPreds[matchId].w:null};
    });
  },800);
}

// ─────────────────────────────────────────────────────────────
// SAVE – KNOCKOUT
// ─────────────────────────────────────────────────────────────
function onKoInp(matchId,rowEl){
  var aEl=rowEl.querySelector('[data-side="a"]');
  var bEl=rowEl.querySelector('[data-side="b"]');
  var a=aEl.value!==''?parseInt(aEl.value,10):null;
  var b=bEl.value!==''?parseInt(bEl.value,10):null;
  aEl.classList.toggle('filled',aEl.value!=='');
  bEl.classList.toggle('filled',bEl.value!=='');
  if(a===null||b===null)return;
  var existing=myPreds[matchId]||{};
  clearTimeout(saveTimers['ko_'+matchId]);
  savingSet[matchId]=true;
  saveTimers['ko_'+matchId]=setTimeout(function(){
    sb.from('predictions').upsert(
      {user_id:me.id,match_id:matchId,goals_a:a,goals_b:b,winner:existing.w||null,round:1,updated_at:new Date().toISOString()},
      {onConflict:'user_id,match_id,round'}
    ).then(function(r){
      delete savingSet[matchId];
      if(r.error){toast('Save failed','err');return;}
      myPreds[matchId]={a:a,b:b,w:existing.w||null};
      renderPredict(); // re-render to show/hide winner dropdown
    });
  },800);
}

function onKoWinner(matchId,winner){
  var existing=myPreds[matchId]||{};
  sb.from('predictions').upsert(
    {user_id:me.id,match_id:matchId,goals_a:existing.a,goals_b:existing.b,winner:winner,round:1,updated_at:new Date().toISOString()},
    {onConflict:'user_id,match_id,round'}
  ).then(function(r){
    if(r.error){toast('Save failed','err');return;}
    myPreds[matchId]={a:existing.a,b:existing.b,w:winner};
    toast('Winner saved','ok');
  });
}

// ─────────────────────────────────────────────────────────────
// SAVE A WHOLE ROUND AT ONCE  (manual Save button)
// Reads every input currently on screen for the given stage,
// cancels any pending auto-save timers, and upserts in one batch.
// ─────────────────────────────────────────────────────────────
function matchesForStage(stage){
  if(stage==='group')return GROUP_MATCHES.map(function(m){return m.id;});
  return KO_MATCHES.filter(function(m){return m.stage===stage;}).map(function(m){return m.id;});
}

function saveRound(stage){
  var ids=matchesForStage(stage);
  var btn=document.getElementById('btn-save-'+stage);
  var status=document.getElementById('status-'+stage);

  // Cancel pending auto-save timers for this round (we're saving now instead)
  ids.forEach(function(id){
    if(saveTimers[id]){clearTimeout(saveTimers[id]);delete saveTimers[id];}
    if(saveTimers['ko_'+id]){clearTimeout(saveTimers['ko_'+id]);delete saveTimers['ko_'+id];}
  });

  // Read live values straight from the inputs on screen, so we catch anything
  // typed in the last fraction of a second before the auto-save fired.
  var payload=[];
  var incomplete=0;
  ids.forEach(function(id){
    var row=document.querySelector('#panel-predict [data-mid="'+id+'"]');
    if(!row)return;
    var aEl=row.querySelector('[data-side="a"]');
    var bEl=row.querySelector('[data-side="b"]');
    if(!aEl||!bEl)return; // locked rows have no inputs
    var a=aEl.value!==''?parseInt(aEl.value,10):null;
    var b=bEl.value!==''?parseInt(bEl.value,10):null;
    if(a!==null&&b!==null&&!isNaN(a)&&!isNaN(b)){
      // preserve any AET winner already chosen
      var w=(myPreds[id]&&myPreds[id].w)?myPreds[id].w:null;
      payload.push({user_id:me.id,match_id:id,goals_a:a,goals_b:b,winner:w,round:1,updated_at:new Date().toISOString()});
    } else {
      incomplete++;
    }
  });

  if(!payload.length){
    if(status){status.className='round-save-status';status.textContent='Nothing to save yet — fill in some scores first.';}
    return;
  }

  if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Saving...';}
  if(status){status.className='round-save-status pending';status.textContent='Saving '+payload.length+' prediction'+(payload.length===1?'':'s')+'...';}

  sb.from('predictions').upsert(payload,{onConflict:'user_id,match_id,round'}).then(function(r){
    if(btn){btn.disabled=false;btn.textContent='Save '+(stage==='group'?'group stage':STAGE_LABELS[stage].toLowerCase());}
    if(r.error){
      if(status){status.className='round-save-status';status.style.color='var(--red)';status.textContent='Save failed: '+r.error.message;}
      toast('Save failed','err');
      return;
    }
    payload.forEach(function(p){myPreds[p.match_id]={a:p.goals_a,b:p.goals_b,w:p.winner};});
    var msg=payload.length+' saved';
    if(incomplete>0)msg+=' · '+incomplete+' still blank';
    if(status){status.className='round-save-status ok';status.style.color='';status.textContent='✓ '+msg;}
    toast('Round saved ('+payload.length+')','ok');
  });
}

// ─────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────
function loadAndRenderLb(){
  document.getElementById('panel-leaderboard').innerHTML=buildLbTabsHtml()+'<div class="panel-load"><div class="spinner"></div> Loading standings...</div>';
  if(lbMode==='group'&&lbGroupId){
    sb.from('group_members').select('user_id').eq('group_id',lbGroupId).then(function(r){
      var uids=(r.data||[]).map(function(x){return x.user_id;});
      if(!uids.length){lbData=[];renderLb();return;}
      sb.from('leaderboard').select('*').in('user_id',uids)
        .order('total_pts',{ascending:false}).order('exact_scores',{ascending:false})
        .then(function(r2){lbData=r2.data||[];lbOffset=lbData.length;renderLb();});
    });
  } else {
    sb.from('leaderboard').select('*')
      .order('total_pts',{ascending:false}).order('exact_scores',{ascending:false})
      .range(0,LB_PAGE-1)
      .then(function(r){lbData=r.data||[];lbOffset=lbData.length;renderLb();});
  }
}
function setLbMode(mode,gid){lbMode=mode;lbGroupId=gid||null;lbData=[];lbOffset=0;loadAndRenderLb();}
function buildLbTabsHtml(){
  var h='<div class="lb-tabs"><div class="lb-tab'+(lbMode==='global'?' active':'')+'" onclick="setLbMode(\'global\')">🌍 Global</div>';
  myGroups.forEach(function(g){
    h+='<div class="lb-tab'+(lbMode==='group'&&lbGroupId===g.id?' active':'')+'" onclick="setLbMode(\'group\',\''+g.id+'\')">'+esc(g.name)+'</div>';
  });
  return h+'</div>';
}
function renderLb(){
  var rkCls=['r1','r2','r3'];
  var html=buildLbTabsHtml();
  if(!lbData.length){html+='<div class="empty-state">No scored predictions yet.</div>';document.getElementById('panel-leaderboard').innerHTML=html;return;}
  html+='<div class="lb-wrap"><table class="lb-table">';
  html+='<tr class="lb-th"><td></td><td>Player</td><td style="text-align:center">Done</td><td style="text-align:center" title="Exact score">4pts</td><td style="text-align:center" title="Correct GD">3pts</td><td style="text-align:center" title="Correct tendency">2pts</td><td style="text-align:right">Points</td></tr>';
  lbData.forEach(function(r,i){
    var isMe2=r.user_id===me.id;
    var bonus=Number(r.bonus_pts)||0;
    html+='<tr class="lb-tr'+(isMe2?' me':'')+'">';
    html+='<td class="lb-rk '+(rkCls[i]||'')+'">'+(i+1)+'</td>';
    html+='<td><div class="lb-nm">'+esc(r.display_name||'Player')+(isMe2?' <span style="color:var(--muted);font-size:11px">(me)</span>':'')+'</div></td>';
    html+='<td class="lb-n">'+(r.scored_matches||0)+'</td>';
    html+='<td class="lb-n" style="color:#2ecc71">'+(r.exact_scores||0)+'</td>';
    html+='<td class="lb-n" style="color:var(--gold)">'+(r.correct_gd||0)+'</td>';
    html+='<td class="lb-n" style="color:#e67e22">'+(r.correct_tendency||0)+'</td>';
    html+='<td><div class="lb-pts">'+fmtPts(r.total_pts||0)+'</div>'+(bonus>0?'<div class="lb-bns">+'+fmtPts(bonus)+' bonus</div>':'')+'</td>';
    html+='</tr>';
  });
  html+='</table></div>';
  if(lbMode==='global'&&lbData.length===LB_PAGE){
    html+='<div class="lb-more" onclick="loadMoreLb()">Load more ↓</div>';
  }
  document.getElementById('panel-leaderboard').innerHTML=html;
}
function loadMoreLb(){
  sb.from('leaderboard').select('*')
    .order('total_pts',{ascending:false}).order('exact_scores',{ascending:false})
    .range(lbOffset,lbOffset+LB_PAGE-1)
    .then(function(r){lbData=lbData.concat(r.data||[]);lbOffset=lbData.length;renderLb();});
}

// ─────────────────────────────────────────────────────────────
// GROUPS
// ─────────────────────────────────────────────────────────────
function renderGroups(){
  var html='<div class="groups-panel">';
  html+='<div class="create-group-form"><h3>Create a New Group</h3>';
  html+='<p style="font-size:13px;color:var(--muted);margin-bottom:12px">2–20 players. Share the 6-letter code so friends can join.</p>';
  html+='<div class="form-row"><input class="form-inp" id="new-group-name" placeholder="e.g. Office League" maxlength="40"><button class="btn-sm btn-primary" onclick="createGroup()">Create</button></div></div>';
  html+='<div class="join-area"><h3>Join a Group</h3>';
  html+='<div class="form-row"><input class="form-inp" id="join-code-inp" placeholder="Enter 6-letter code" maxlength="8" style="text-transform:uppercase"><button class="btn-sm btn-primary" onclick="joinGroup()">Join</button></div></div>';
  if(myGroups.length){
    html+='<h3 style="font-family:var(--fh);font-size:15px;font-weight:700;color:var(--navy);margin-bottom:14px">My Groups</h3>';
    html+='<div class="groups-grid">';
    myGroups.forEach(function(g){
      html+='<div class="group-card"><div class="gc-header"><span class="gc-name">'+esc(g.name)+'</span><span class="gc-code">Code: <strong>'+esc(g.code)+'</strong></span></div>';
      html+='<div class="gc-body"><div class="gc-stat" id="gc-stat-'+g.id+'">Loading...</div>';
      html+='<div class="gc-members" id="gc-members-'+g.id+'"></div>';
      html+='<div class="gc-actions">';
      html+='<button class="btn-sm btn-outline" onclick="goGroupLb(\''+g.id+'\')">View Standings</button>';
      html+='<button class="btn-sm btn-danger" onclick="leaveGroup(\''+g.id+'\')">Leave</button>';
      html+='</div></div></div>';
      loadGroupMembers(g.id);
    });
    html+='</div>';
  } else {
    html+='<div class="empty-state" style="border:1px dashed var(--border);border-radius:10px">No groups yet. Create one or enter a join code.</div>';
  }
  html+='</div>';
  document.getElementById('panel-groups').innerHTML=html;
}
function goGroupLb(gid){
  setLbMode('group',gid);
  switchTab(document.querySelector('[data-tab="leaderboard"]'));
}
function loadGroupMembers(gid){
  sb.from('group_members').select('user_id,profiles(display_name)').eq('group_id',gid).then(function(r){
    var ms=r.data||[];
    var st=document.getElementById('gc-stat-'+gid);
    var ml=document.getElementById('gc-members-'+gid);
    if(st)st.textContent=ms.length+' member'+(ms.length===1?'':'s');
    if(ml)ml.innerHTML=ms.slice(0,8).map(function(m){
      var n=(m.profiles&&m.profiles.display_name)||'Player';
      return '<span style="display:inline-block;background:#f0f2f6;border-radius:4px;padding:2px 8px;font-size:11px;margin:2px 2px 2px 0">'+esc(n)+(m.user_id===me.id?' (me)':'')+'</span>';
    }).join('')+(ms.length>8?' <span style="font-size:11px;color:var(--muted)">+'+( ms.length-8)+' more</span>':'');
  });
}
function createGroup(){
  var name=document.getElementById('new-group-name').value.trim();
  if(!name){toast('Enter a group name','err');return;}
  var code=Math.random().toString(36).substring(2,8).toUpperCase();
  sb.from('groups').insert({name:name,code:code,created_by:me.id}).select().single().then(function(r){
    if(r.error){toast('Error: '+r.error.message,'err');return;}
    var grp=r.data;
    sb.from('group_members').insert({group_id:grp.id,user_id:me.id}).then(function(){
      myGroups.push(grp);
      srchCache = {};
      toast('Group created! Code: '+grp.code,'ok');
      renderGroups();
    });
  });
}
function joinGroup(){
  var code=document.getElementById('join-code-inp').value.trim().toUpperCase();
  if(!code){toast('Enter a code','err');return;}
  sb.from('groups').select('*').eq('code',code).single().then(function(r){
    if(r.error||!r.data){toast('Group not found','err');return;}
    var grp=r.data;
    if(myGroups.find(function(g){return g.id===grp.id;})){toast('Already in this group','err');return;}
    sb.from('group_members').insert({group_id:grp.id,user_id:me.id}).then(function(r2){
      if(r2.error){toast('Error: '+r2.error.message,'err');return;}
      myGroups.push(grp);
      srchCache = {};
      toast('Joined "'+grp.name+'"!','ok');
      renderGroups();
    });
  });
}
function leaveGroup(gid){
  if(!confirm('Leave this group?'))return;
  sb.from('group_members').delete().eq('group_id',gid).eq('user_id',me.id).then(function(r){
    if(r.error){toast('Error','err');return;}
    myGroups=myGroups.filter(function(g){return g.id!==gid;});
    srchCache = {};
    toast('Left group','ok');
    renderGroups();
  });
}

// ─────────────────────────────────────────────────────────────
// BROWSE MODAL
// ─────────────────────────────────────────────────────────────
function openModal(){
  document.getElementById('modal-bg').style.display='flex';
  document.getElementById('srch-inp').value='';
  searchUsers('');
  setTimeout(function(){document.getElementById('srch-inp').focus();},50);
}
function closeModal(){document.getElementById('modal-bg').style.display='none';}
function searchUsers(q){
  var key=q.trim().toLowerCase();
  if(srchCache[key]){renderSrch(srchCache[key]);return;}
  // Only show users who share at least one league with me.
  // Step 1: get all member rows for my groups.
  if (!myGroups.length) {
    // No leagues yet → empty result with a friendly hint shown by renderSrch
    srchCache[key] = [];
    renderSrch([]);
    return;
  }
  var myGroupIds = myGroups.map(function(g){return g.id;});
  sb.from('group_members').select('user_id,profiles(id,display_name)')
    .in('group_id', myGroupIds)
    .then(function(r){
      if (r.error) { renderSrch([]); return; }
      // Deduplicate by user_id
      var seen = {};
      var users = [];
      (r.data||[]).forEach(function(row){
        var p = row.profiles;
        if (!p || seen[p.id]) return;
        seen[p.id] = true;
        if (!key || (p.display_name||'').toLowerCase().indexOf(key) !== -1) {
          users.push({id: p.id, display_name: p.display_name});
        }
      });
      users.sort(function(a,b){return (a.display_name||'').localeCompare(b.display_name||'');});
      srchCache[key] = users;
      renderSrch(users);
    });
}
function renderSrch(users){
  var el=document.getElementById('srch-list');
  if(!users.length){
    if (!myGroups.length) {
      el.innerHTML='<div class="modal-empty"><strong>You\'re not in any leagues yet.</strong><br><br>Go to the Groups tab to create or join a league. Then you can browse your league-mates\' picks here.</div>';
    } else {
      el.innerHTML='<div class="modal-empty">No league-mates match your search.</div>';
    }
    return;
  }
  el.innerHTML=users.map(function(u){
    var n=u.display_name||u.id;
    return '<div class="modal-item" onclick="selectUser(\''+u.id+'\',\''+esc(n)+'\')"><div class="m-av">'+n.slice(0,2).toUpperCase()+'</div><span class="m-nm">'+esc(n)+(u.id===me.id?' (me)':'')+'</span></div>';
  }).join('');
}
function selectUser(uid,name){
  closeModal();
  if(uid===me.id){
    viewedUid=null;
    viewedName='';
    var myName=(myProfile&&myProfile.display_name)||me.email.split('@')[0];
    document.getElementById('viewer-name').textContent=myName;
    renderPredict();return;
  }
  viewedUid=uid;
  viewedName=name;
  document.getElementById('viewer-name').textContent=name;
  document.getElementById('panel-predict').innerHTML='<div class="panel-load"><div class="spinner"></div> Loading predictions...</div>';
  Promise.all([
    sb.from('predictions').select('match_id,goals_a,goals_b,winner').eq('user_id',uid).eq('round',1),
    sb.from('predictions').select('match_id,goals_a,goals_b,winner').eq('user_id',uid).eq('round',2)
  ]).then(function(rs){
    viewedPreds={};
    (rs[0].data||[]).forEach(function(p){viewedPreds[p.match_id]={a:p.goals_a,b:p.goals_b,w:p.winner};});
    viewedPredsR2={};
    (rs[1].data||[]).forEach(function(p){viewedPredsR2[p.match_id]={a:p.goals_a,b:p.goals_b,w:p.winner};});
    renderPredict();
  });
}

// ─────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────
function renderAdmin(){
  var html='<div class="adm-tabs">';
  html+='<div class="adm-tab'+(currentAdmTab==='group'?' active':'')+'" onclick="setAdmTab(\'group\')">Group Stage</div>';
  html+='<div class="adm-tab'+(currentAdmTab==='ko'?' active':'')+'" onclick="setAdmTab(\'ko\')">Knockout</div>';
  html+='</div>';
  if(currentAdmTab==='group'){
    html+='<div class="adm-hdr">GROUP STAGE RESULTS — Enter final score after 90 minutes</div>';
    var groups=Object.keys(GROUP_TEAMS).sort();
    groups.forEach(function(g){
      var gms=GROUP_MATCHES.filter(function(m){return m.g===g;}).sort(function(a,b){return a.s-b.s;});
      html+='<div class="group-hdr">GROUP '+g+'</div>';
      gms.forEach(function(m){
        var res=allResults[m.id]||null;
        html+='<div class="adm-row" data-mid="'+m.id+'">';
        html+='<div class="team" style="text-align:right;font-size:13px">'+esc(m.a)+'</div>';
        html+='<div class="sc-cell">';
        if(res){
          html+='<span class="res-done">'+res.goals_a+' : '+res.goals_b+'</span>';
          if(res.multiplier)html+='<span class="mx-pill" style="margin-left:4px">×'+Number(res.multiplier).toFixed(2)+'</span>';
        } else {
          html+='<input type="number" min="0" max="20" id="ra_'+m.id+'_a" class="s-inp" placeholder="-" style="background:#fff">';
          html+='<span class="sep">:</span>';
          html+='<input type="number" min="0" max="20" id="ra_'+m.id+'_b" class="s-inp" placeholder="-" style="background:#fff">';
        }
        html+='</div>';
        html+='<div class="team" style="font-size:13px">'+esc(m.b)+'</div>';
        html+='<div style="text-align:right">';
        if(!res)html+='<button class="btn-sr" onclick="enterResult(\''+m.id+'\')">Save</button>';
        html+='</div></div>';
      });
    });
  } else {
    html+='<div class="adm-hdr">KNOCKOUT RESULTS — Enter 90-min score. If draw, pick AET winner.</div>';
    var stages=['r32','r16','qf','sf','3rd','final'];
    stages.forEach(function(stage){
      var ms=KO_MATCHES.filter(function(m){return m.stage===stage;}).sort(function(a,b){return a.s-b.s;});
      if(!ms.length)return;
      html+='<div class="stage-hdr" style="margin:0"><span class="stage-hdr-title">'+STAGE_LABELS[stage]+'</span></div>';
      ms.forEach(function(m){
        var res=allResults[m.id]||null;
        var teamA=res&&res.team_a?res.team_a:m.a;
        var teamB=res&&res.team_b?res.team_b:m.b;
        html+='<div class="adm-row" data-mid="'+m.id+'">';
        html+='<div class="team" style="text-align:right;font-size:12px">'+esc(teamA)+'</div>';
        html+='<div class="sc-cell">';
        if(res){
          html+='<span class="res-done">'+res.goals_a+' : '+res.goals_b+(res.winner?' ('+res.winner+')':'')+'</span>';
        } else {
          html+='<input type="number" min="0" max="20" id="ra_'+m.id+'_a" class="s-inp" placeholder="-" style="background:#fff;width:30px">';
          html+='<span class="sep">:</span>';
          html+='<input type="number" min="0" max="20" id="ra_'+m.id+'_b" class="s-inp" placeholder="-" style="background:#fff;width:30px">';
          html+='<select id="ra_'+m.id+'_w" style="font-size:11px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;margin-left:6px">';
          html+='<option value="">AET winner?</option>';
          html+='<option value="A">'+esc(teamA)+'</option>';
          html+='<option value="B">'+esc(teamB)+'</option>';
          html+='</select>';
        }
        html+='</div>';
        html+='<div class="team" style="font-size:12px">'+esc(teamB)+'</div>';
        html+='<div style="text-align:right">';
        if(!res)html+='<button class="btn-sr" onclick="enterKoResult(\''+m.id+'\',\''+esc(teamA)+'\',\''+esc(teamB)+'\')">Save</button>';
        html+='</div></div>';
      });
    });
  }
  document.getElementById('panel-admin').innerHTML=html;
}
function setAdmTab(tab){currentAdmTab=tab;renderAdmin();}

function enterResult(matchId){
  var a=parseInt((document.getElementById('ra_'+matchId+'_a')||{}).value,10);
  var b=parseInt((document.getElementById('ra_'+matchId+'_b')||{}).value,10);
  if(isNaN(a)||isNaN(b)){toast('Enter both scores','err');return;}
  var btn=document.querySelector('.adm-row[data-mid="'+matchId+'"] .btn-sr');
  if(btn){btn.disabled=true;btn.textContent='...';}
  sb.from('results').upsert(
    {match_id:matchId,goals_a:a,goals_b:b,entered_by:me.id,entered_at:new Date().toISOString()},
    {onConflict:'match_id'}
  ).then(function(r){
    if(r.error){toast('Error: '+r.error.message,'err');if(btn){btn.disabled=false;btn.textContent='Save';}return;}
    // Compute multiplier after saving result
    sb.rpc('compute_multiplier',{p_match_id:matchId}).then(function(){
      sb.from('results').select('*').eq('match_id',matchId).single().then(function(r2){
        if(r2.data)allResults[matchId]=r2.data;
        renderAdmin();renderPredict();
        toast('Result saved: '+a+'-'+b+' (multiplier calculated)','ok');
      });
    });
  });
}

function enterKoResult(matchId,teamA,teamB){
  var a=parseInt((document.getElementById('ra_'+matchId+'_a')||{}).value,10);
  var b=parseInt((document.getElementById('ra_'+matchId+'_b')||{}).value,10);
  var w=(document.getElementById('ra_'+matchId+'_w')||{}).value||'';
  if(isNaN(a)||isNaN(b)){toast('Enter both scores','err');return;}
  if(a===b&&!w){toast('Scores are level — pick the AET winner','err');return;}
  var btn=document.querySelector('.adm-row[data-mid="'+matchId+'"] .btn-sr');
  if(btn){btn.disabled=true;btn.textContent='...';}
  // Knockout results go into the same results table (matches table already has these rows)
  sb.from('results').upsert(
    {match_id:matchId,goals_a:a,goals_b:b,entered_by:me.id,entered_at:new Date().toISOString()},
    {onConflict:'match_id'}
  ).then(function(r){
    if(r.error){toast('Error: '+r.error.message,'err');if(btn){btn.disabled=false;btn.textContent='Save';}return;}
    allResults[matchId]={match_id:matchId,goals_a:a,goals_b:b,winner:w,team_a:teamA,team_b:teamB};
    renderAdmin();renderPredict();
    toast('KO result saved','ok');
  });
}

// ─────────────────────────────────────────────────────────────
// RULES
// ─────────────────────────────────────────────────────────────
function renderRules(){
  document.getElementById('panel-rules').innerHTML=[
    '<div class="rules-wrap">',
    '<div class="rules-sec"><h3>Two prediction rounds</h3>',
    '<p class="rules-note"><strong>Round 1</strong> — before the tournament. Predict all 104 matches (48 group + 56 knockout). Your knockout picks are scored against the bracket YOU predicted from group standings.</p>',
    '<p class="rules-note"><strong>Round 2</strong> — opens automatically once all 72 real group-stage results are entered. Make fresh predictions for the official Round of 32 onwards. Round 2 picks are scored against the real matchups. <strong>Both rounds stack toward your total.</strong></p></div>',
    '<div class="rules-sec"><h3>Kicktipp Scoring — every match</h3>',
    '<table class="rt"><thead><tr><th>What you get right</th><th>Points</th><th>Example</th></tr></thead><tbody>',
    '<tr><td><strong>Exact scoreline</strong></td><td><span class="bdg" style="background:#2ecc71">4</span></td><td style="color:#999">Predict 2-1, result 2-1</td></tr>',
    '<tr><td><strong>Correct goal difference</strong></td><td><span class="bdg" style="background:var(--gold)">3</span></td><td style="color:#999">Predict 2-0, result 3-1</td></tr>',
    '<tr><td><strong>Correct tendency (W/D/L)</strong></td><td><span class="bdg" style="background:#e67e22">2</span></td><td style="color:#999">Predict 2-0, result 3-0 (different GD)</td></tr>',
    '<tr><td><strong>Wrong tendency</strong></td><td><span class="bdg" style="background:#bdc3c7">0</span></td><td style="color:#999">Predict 1-0, result 0-1</td></tr>',
    '</tbody></table></div>',
    '<div class="rules-sec"><h3>When do points appear on the leaderboard?</h3>',
    '<p class="rules-note">Results are entered as matches finish, but they don\'t show on the leaderboard immediately. Instead, all points from a given day drop together <strong>at midnight Pacific Time</strong> (Los Angeles). So if matches happen across June 14 (LA time), those points appear on June 15. This keeps the standings clean and avoids constant live updates during games.</p></div>',
    '<div class="rules-sec"><h3>Contrarian Multiplier</h3>',
    '<p class="rules-note">After kickoff, points are multiplied based on how many players picked the same winner. Going against the majority and being right earns extra points.</p>',
    '<table class="rt"><thead><tr><th>% who picked the winning tendency</th><th>Multiplier</th></tr></thead><tbody>',
    '<tr><td>100% (everyone agreed)</td><td>×1.00</td></tr>',
    '<tr><td>75%</td><td>×1.25</td></tr>',
    '<tr><td>50%</td><td>×1.50</td></tr>',
    '<tr><td>25% (brave contrarian)</td><td>×1.75</td></tr>',
    '</tbody></table></div>',
    '<div class="rules-sec"><h3>Knockout Rounds</h3>',
    '<p class="rules-note">Predict the scoreline after 90 minutes for every knockout match. If you predict a draw, a dropdown appears to pick who you think wins after extra time / penalties. This counts as a bonus tiebreaker but does <strong>not</strong> affect your 4/3/2/0 score (which is always based on 90 minutes).</p></div>',
    '<div class="rules-sec"><h3>Prediction Lock</h3>',
    '<p class="rules-note">All inputs lock automatically at scheduled kickoff. League-mates can see each other\'s picks anytime; users outside your league can\'t.</p></div>',
    '<div class="rules-sec"><h3>Joining late</h3>',
    '<p class="rules-note">You can sign up and start predicting at any point during the tournament. For matches that already kicked off, the site shows the actual result in your predictions list (marked "🕒 Auto · 0 pts") — these earn no points but DO carry through to your knockout bracket, so you get the real R16/QF/etc. matchups. Any upcoming match is fully open for you to predict and score normally.</p></div>',
    '<div class="rules-sec"><h3>Tiebreaker</h3>',
    '<p class="rules-note">Equal points → most exact scores wins. Still tied → most correct goal differences.</p></div>',
    '<div class="rules-sec"><h3>Tournament Awards (NEW)</h3>',
    '<p class="rules-note">Predict the three big individual awards: <strong>Golden Ball</strong> (best player), <strong>Golden Boot</strong> (top scorer), and <strong>Golden Glove</strong> (best goalkeeper). Each correct pick is worth <strong>8 points</strong> and stacks on top of your match points. Award picks lock when the tournament starts on June 11. Player rosters are loaded after FIFA confirms the final 26-man squads (~5 days before kickoff).</p></div>',
    '<div class="rules-sec"><h3>Match Notes (NEW)</h3>',
    '<p class="rules-note">Each match has a notes section under the score. Drop a 140-character take ("Ronaldo for a hat-trick" / "Brazil collapse incoming") that\'s visible to your league-mates only. They can reply and like. Notes stay open before, during, and after the match.</p></div>',
    '<div class="rules-sec"><h3>Leagues</h3>',
    '<p class="rules-note">Create a private league and share the 6-letter join code with friends. You appear on both your league\'s leaderboard and the global leaderboard. Leagues support 2–20 players.</p></div>',
    '</div>'
  ].join('');
}

// ─────────────────────────────────────────────────────────────
// RESULTS TAB — read-only feed of every match's result + status
// Sorted: completed matches (most recent first) → upcoming by kickoff
// ─────────────────────────────────────────────────────────────
function renderResults(){
  var allMatches = GROUP_MATCHES.concat(KO_MATCHES);

  // Annotate each match with status + sort key
  var enriched = allMatches.map(function(m){
    var r = allResults[m.id];
    var hasResult = r && r.goals_a !== null && r.goals_a !== undefined && r.goals_b !== null && r.goals_b !== undefined;
    var locked = m.ko && new Date(m.ko) < new Date();
    var status;
    if (hasResult) status = 'done';
    else if (locked) status = 'live';        // kicked off but no result entered yet
    else status = 'upcoming';
    var koTime = m.ko ? new Date(m.ko).getTime() : 0;
    var sortKey;
    // Order: live first, then completed (most recent kickoff first), then upcoming (soonest first)
    if (status === 'live')      sortKey = -1000000000000 + (Date.now() - koTime);
    else if (status === 'done') sortKey = -koTime;            // most-recent kickoff first
    else                        sortKey =  koTime;            // soonest upcoming first
    return { m: m, r: r, status: status, hasResult: hasResult, sortKey: sortKey, koTime: koTime };
  });

  enriched.sort(function(a, b){ return a.sortKey - b.sortKey; });

  // Stage label for the row's small label
  var stageLabelOf = function(m){
    if (m.g) return 'Group ' + m.g;
    if (m.stage && STAGE_LABELS[m.stage]) return STAGE_LABELS[m.stage];
    return '';
  };

  // For knockout matches without entered team names yet, fall back to slot label
  var displayName = function(m, r, side) {
    if (r && r['team_'+side]) return r['team_'+side];
    return side === 'a' ? m.a : m.b;
  };

  // Tally for the summary at top
  var doneCount    = enriched.filter(function(e){return e.status==='done';}).length;
  var liveCount    = enriched.filter(function(e){return e.status==='live';}).length;
  var upcomingCount = enriched.filter(function(e){return e.status==='upcoming';}).length;

  var html = '';
  // Summary header
  html += '<div style="background:linear-gradient(135deg,#0d1f3c 0%,#1e3a6e 100%);color:#fff;padding:16px 18px">';
  html += '<div style="font-family:var(--fh);font-size:16px;font-weight:800;letter-spacing:.3px;margin-bottom:6px">📺 Live Results</div>';
  html += '<div style="font-size:13px;line-height:1.5;opacity:.95">';
  html += '<strong>'+doneCount+'</strong> completed';
  if (liveCount > 0) html += ' · <strong style="color:#ffd54f">'+liveCount+'</strong> in progress';
  html += ' · <strong>'+upcomingCount+'</strong> upcoming. Sorted most recent first.';
  html += '</div>';
  html += '</div>';

  // List
  enriched.forEach(function(e){
    var m = e.m, r = e.r;
    var teamA = displayName(m, r, 'a');
    var teamB = displayName(m, r, 'b');

    var bgColor, badge, scoreHtml;
    if (e.status === 'done') {
      bgColor = '#fff';
      badge   = '<span style="background:#e6f4ec;color:#0d4a2a;border:1px solid #70c090;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:.3px">Final</span>';
      var aetSuffix = r.winner ? ' <span style="font-size:11px;color:var(--muted);font-weight:400">(AET → '+esc(r.winner==='A'?teamA:teamB)+')</span>' : '';
      scoreHtml = '<span style="font-family:var(--fh);font-size:22px;font-weight:900;color:var(--navy)">'+r.goals_a+' : '+r.goals_b+'</span>' + aetSuffix;
      if (r.multiplier && Number(r.multiplier) > 1) {
        scoreHtml += ' <span style="font-size:11px;background:var(--gold);color:#fff;padding:2px 6px;border-radius:8px;font-weight:700">×'+Number(r.multiplier).toFixed(2)+'</span>';
      }
    } else if (e.status === 'live') {
      bgColor = '#fff8e1';
      badge   = '<span style="background:#fff3cd;color:#856404;border:1px solid #ffd54f;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:.3px">⚽ Live / Awaiting</span>';
      scoreHtml = '<span style="font-family:var(--fh);font-size:18px;font-weight:700;color:#856404">— : —</span> <span style="font-size:11px;color:var(--muted)">(result pending)</span>';
    } else {
      bgColor = '#fafafa';
      badge   = '<span style="background:#f0f2f6;color:var(--muted);border:1px solid var(--border);font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:.3px">Upcoming</span>';
      scoreHtml = '<span style="font-size:13px;color:var(--muted)">Kicks off '+esc(fmtKO(m.ko))+'</span>';
    }

    html += '<div style="background:'+bgColor+';border-bottom:1px solid #f0f2f6;padding:12px 16px">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
    html += '<span style="font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.4px">'+esc(stageLabelOf(m))+'</span>';
    html += badge;
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center">';
    html += '<div style="text-align:right;font-weight:600;color:var(--navy);font-size:14px">'+esc(teamA)+'</div>';
    html += '<div style="text-align:center">'+scoreHtml+'</div>';
    html += '<div style="text-align:left;font-weight:600;color:var(--navy);font-size:14px">'+esc(teamB)+'</div>';
    html += '</div>';
    if (e.status === 'done' && m.ko) {
      html += '<div style="text-align:center;font-size:10px;color:var(--muted);margin-top:6px">'+esc(fmtKO(m.ko))+'</div>';
    }
    html += '</div>';
  });

  document.getElementById('panel-results').innerHTML = html;
}

init();
