// ═══════════════════════════════════════════════════════════════
// MATCH NOTES  —  Twitter-style banter per match, scoped to a league
// 140 chars max. Replies (flat, no nesting). Likes.
// Anyone in your league can post; readable by all league-mates.
// ═══════════════════════════════════════════════════════════════

// State: cache of notes loaded per match
// notesState[matchId] = { open: true, notes: [...], loading: false, groupId: '...' }
var notesState = {};

// Find which league-context to use for a given match's notes.
// If user is in multiple leagues, use the first one for now (UI shows a picker).
// We'll track per-match selected group in notesState[matchId].groupId.
function defaultGroupForNotes() {
  return myGroups.length ? myGroups[0].id : null;
}

// Toggle the notes panel for a match
function toggleNotes(matchId) {
  var state = notesState[matchId];
  if (!state) {
    state = notesState[matchId] = { open: true, notes: [], loading: false, groupId: defaultGroupForNotes() };
  } else {
    state.open = !state.open;
  }
  var panel = document.getElementById('notes-panel-' + matchId);
  if (panel) panel.style.display = state.open ? '' : 'none';
  if (state.open && !state.notes.length && !state.loading) {
    loadNotesForMatch(matchId);
  } else {
    renderNotesPanel(matchId);
  }
}

function loadNotesForMatch(matchId) {
  var state = notesState[matchId];
  if (!state || !state.groupId) {
    renderNotesPanel(matchId);
    return;
  }
  state.loading = true;
  renderNotesPanel(matchId);

  // Load notes for this match in this group, plus replies and likes for each note
  sb.from('match_notes')
    .select('id,user_id,body,created_at,target_user_id,profiles!match_notes_user_id_fkey(display_name),target:profiles!match_notes_target_user_id_fkey(display_name)')
    .eq('match_id', matchId)
    .eq('group_id', state.groupId)
    .order('created_at', { ascending: false })
    .then(function(r) {
      if (r.error) {
        // The named-FK join syntax above may fail on older Supabase setups.
        // Fall back to two simpler queries.
        loadNotesFallback(matchId);
        return;
      }
      finishLoadNotes(matchId, r.data || []);
    });
}

// Fallback if the named-FK join isn't available — just fetch without target name
function loadNotesFallback(matchId) {
  var state = notesState[matchId];
  sb.from('match_notes')
    .select('id,user_id,body,created_at,target_user_id,profiles(display_name)')
    .eq('match_id', matchId)
    .eq('group_id', state.groupId)
    .order('created_at', { ascending: false })
    .then(function(r) {
      if (r.error) {
        state.loading = false;
        state.notes = [];
        renderNotesPanel(matchId);
        toast('Failed to load notes', 'err');
        return;
      }
      // Resolve target display names manually from league members
      var notes = r.data || [];
      var targetIds = [...new Set(notes.filter(function(n){return n.target_user_id;}).map(function(n){return n.target_user_id;}))];
      if (!targetIds.length) { finishLoadNotes(matchId, notes); return; }
      sb.from('profiles').select('id,display_name').in('id', targetIds).then(function(pr) {
        var byId = {};
        (pr.data||[]).forEach(function(p){ byId[p.id] = p.display_name; });
        notes.forEach(function(n) {
          if (n.target_user_id) n.target = { display_name: byId[n.target_user_id] || 'Player' };
        });
        finishLoadNotes(matchId, notes);
      });
    });
}

function finishLoadNotes(matchId, notes) {
  var state = notesState[matchId];
  if (!notes.length) {
    state.notes = [];
    state.loading = false;
    renderNotesPanel(matchId);
    return;
  }
  var noteIds = notes.map(function(n) { return n.id; });
  Promise.all([
    sb.from('note_replies').select('id,note_id,user_id,body,created_at,profiles(display_name)').in('note_id', noteIds).order('created_at'),
    sb.from('note_likes').select('note_id,user_id').in('note_id', noteIds)
  ]).then(function(rs) {
    var replies = rs[0].data || [];
    var likes = rs[1].data || [];
    notes.forEach(function(n) {
      n.replies = replies.filter(function(rp) { return rp.note_id === n.id; });
      var noteLikes = likes.filter(function(l) { return l.note_id === n.id; });
      n.likeCount = noteLikes.length;
      n.likedByMe = noteLikes.some(function(l) { return l.user_id === me.id; });
    });
    state.notes = notes;
    state.loading = false;
    renderNotesPanel(matchId);
  }).catch(function() {
    state.loading = false;
    renderNotesPanel(matchId);
  });
}

function renderNotesPanel(matchId) {
  var panel = document.getElementById('notes-panel-' + matchId);
  if (!panel) return;
  var state = notesState[matchId] || { open: false, notes: [], loading: false, groupId: null };

  if (!myGroups.length) {
    panel.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:var(--muted);text-align:center;font-style:italic">Join a league to post notes on matches.</div>';
    return;
  }

  var html = '';

  // League picker (if user is in multiple leagues)
  if (myGroups.length > 1) {
    html += '<div style="padding:8px 14px;background:#f8f9fc;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">';
    html += '<span style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">League:</span>';
    html += '<select onchange="switchNotesGroup(\''+matchId+'\', this.value)" style="font-size:12px;padding:3px 6px;border:1px solid var(--border);border-radius:5px;background:#fff;outline:none">';
    myGroups.forEach(function(g) {
      html += '<option value="'+g.id+'"'+(g.id===state.groupId?' selected':'')+'>'+esc(g.name)+'</option>';
    });
    html += '</select>';
    html += '</div>';
  }

  // Compose box
  var targetUid = state.composeTarget || null;
  var targetName = state.composeTargetName || null;
  html += '<div style="padding:10px 14px;background:#f8f9fc;border-bottom:1px solid var(--border)">';
  if (targetUid && targetName) {
    html += '<div style="background:#fff8e1;border:1px solid #ffd54f;border-radius:6px;padding:5px 10px;margin-bottom:6px;font-size:11px;color:#856404;display:flex;align-items:center;justify-content:space-between">';
    html += '<span>💬 Commenting on <strong>'+esc(targetName)+'</strong>\'s pick</span>';
    html += '<button onclick="clearComposeTarget(\''+matchId+'\')" style="background:none;border:none;cursor:pointer;color:#856404;font-size:14px;line-height:1;padding:0 4px" title="Cancel">×</button>';
    html += '</div>';
  }
  var placeholder = targetUid ? 'Comment on '+targetName+'\'s pick...' : 'Say something about this match...';
  html += '<textarea id="note-input-'+matchId+'" placeholder="'+esc(placeholder)+'" maxlength="140" rows="2" oninput="updateNoteCharCount(\''+matchId+'\')" ';
  html += 'style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:7px;font-family:var(--fb);font-size:13px;resize:vertical;outline:none;background:#fff;line-height:1.4"></textarea>';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">';
  html += '<span id="note-char-'+matchId+'" style="font-size:11px;color:var(--muted)">140</span>';
  html += '<button onclick="postNote(\''+matchId+'\')" style="font-family:var(--fh);font-size:12px;font-weight:700;padding:5px 14px;background:'+(targetUid?'#c9a227':'var(--navy)')+';color:#fff;border:none;border-radius:6px;cursor:pointer">'+(targetUid?'Post comment':'Post')+'</button>';
  html += '</div>';
  html += '</div>';

  // Notes feed
  if (state.loading) {
    html += '<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px"><div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle"></div> Loading notes...</div>';
  } else if (!state.notes.length) {
    html += '<div style="padding:18px 14px;text-align:center;color:var(--muted);font-size:12px;font-style:italic">No notes yet. Be the first to post.</div>';
  } else {
    state.notes.forEach(function(n) {
      var authorName = (n.profiles && n.profiles.display_name) || 'Player';
      var initials = authorName.slice(0, 2).toUpperCase();
      var isMine = n.user_id === me.id;
      var when = fmtNoteTime(n.created_at);
      html += '<div style="padding:10px 14px;border-bottom:1px solid #f0f2f6;background:'+(isMine?'#fffef5':'#fff')+'">';
      html += '<div style="display:flex;gap:10px;align-items:flex-start">';
      html += '<div style="width:30px;height:30px;border-radius:50%;background:var(--navy2);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:11px;font-weight:700;flex-shrink:0">'+initials+'</div>';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:12px;margin-bottom:3px"><strong>'+esc(authorName)+'</strong>'+(isMine?' <span style="color:var(--muted);font-size:10px">(you)</span>':'')+' <span style="color:var(--muted);font-size:10px">· '+when+'</span></div>';
      if (n.target_user_id) {
        var targetDisplay = (n.target && n.target.display_name) || 'a league-mate';
        var targetIsMe = n.target_user_id === me.id;
        html += '<div style="display:inline-block;background:#fff3cd;border:1px solid #ffd54f;border-radius:4px;padding:1px 6px;font-size:10px;color:#856404;margin-bottom:4px">→ on '+esc(targetDisplay)+(targetIsMe?' (you)':'')+'\'s pick</div>';
      }
      html += '<div style="font-size:13px;line-height:1.4;color:var(--text);word-wrap:break-word">'+esc(n.body)+'</div>';
      html += '<div style="display:flex;gap:14px;margin-top:6px;font-size:11px;color:var(--muted)">';
      html += '<button onclick="toggleLike(\''+n.id+'\', \''+matchId+'\')" style="background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:0;font-size:11px;color:'+(n.likedByMe?'#e74c3c':'var(--muted)')+';font-weight:'+(n.likedByMe?'600':'400')+'">'+(n.likedByMe?'♥':'♡')+' '+(n.likeCount || 0)+'</button>';
      html += '<button onclick="toggleReplyBox(\''+n.id+'\', \''+matchId+'\')" style="background:none;border:none;cursor:pointer;padding:0;font-size:11px;color:var(--muted)">↩ Reply</button>';
      if (isMine) {
        html += '<button onclick="deleteNote(\''+n.id+'\', \''+matchId+'\')" style="background:none;border:none;cursor:pointer;padding:0;font-size:11px;color:var(--muted);margin-left:auto">Delete</button>';
      }
      html += '</div>';
      // Reply box (hidden by default)
      html += '<div id="reply-box-'+n.id+'" style="display:none;margin-top:8px">';
      html += '<textarea id="reply-input-'+n.id+'" placeholder="Reply..." maxlength="140" rows="2" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-family:var(--fb);font-size:12px;resize:vertical;outline:none;background:#fff"></textarea>';
      html += '<div style="margin-top:4px;text-align:right"><button onclick="postReply(\''+n.id+'\', \''+matchId+'\')" style="font-family:var(--fh);font-size:11px;font-weight:700;padding:4px 12px;background:var(--blue);color:#fff;border:none;border-radius:5px;cursor:pointer">Reply</button></div>';
      html += '</div>';
      // Replies
      if (n.replies && n.replies.length) {
        n.replies.forEach(function(rp) {
          var rAuthor = (rp.profiles && rp.profiles.display_name) || 'Player';
          var rInit = rAuthor.slice(0, 2).toUpperCase();
          var rMine = rp.user_id === me.id;
          html += '<div style="margin-top:8px;padding:8px 10px;background:#f8f9fc;border-radius:6px;display:flex;gap:8px;align-items:flex-start">';
          html += '<div style="width:22px;height:22px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--fh);font-size:9px;font-weight:700;flex-shrink:0">'+rInit+'</div>';
          html += '<div style="flex:1;min-width:0">';
          html += '<div style="font-size:11px;margin-bottom:2px"><strong>'+esc(rAuthor)+'</strong>'+(rMine?' <span style="color:var(--muted);font-size:9px">(you)</span>':'')+' <span style="color:var(--muted);font-size:9px">· '+fmtNoteTime(rp.created_at)+'</span></div>';
          html += '<div style="font-size:12px;line-height:1.35;word-wrap:break-word">'+esc(rp.body)+'</div>';
          if (rMine) {
            html += '<button onclick="deleteReply(\''+rp.id+'\', \''+matchId+'\')" style="background:none;border:none;cursor:pointer;padding:0;font-size:10px;color:var(--muted);margin-top:3px">Delete</button>';
          }
          html += '</div></div>';
        });
      }
      html += '</div>'; // /flex-1
      html += '</div>'; // /flex
      html += '</div>'; // /note
    });
  }

  panel.innerHTML = html;
}

function switchNotesGroup(matchId, groupId) {
  if (!notesState[matchId]) notesState[matchId] = { open: true, notes: [], loading: false };
  notesState[matchId].groupId = groupId;
  notesState[matchId].notes = [];
  loadNotesForMatch(matchId);
}

function updateNoteCharCount(matchId) {
  var ta = document.getElementById('note-input-' + matchId);
  var lbl = document.getElementById('note-char-' + matchId);
  if (!ta || !lbl) return;
  var remaining = 140 - ta.value.length;
  lbl.textContent = remaining;
  lbl.style.color = remaining < 20 ? (remaining < 0 ? 'var(--red)' : 'var(--gold)') : 'var(--muted)';
}

function postNote(matchId) {
  var ta = document.getElementById('note-input-' + matchId);
  if (!ta) return;
  var body = ta.value.trim();
  if (!body) { toast('Write something first', 'err'); return; }
  if (body.length > 140) { toast('Note too long (140 max)', 'err'); return; }
  var state = notesState[matchId];
  if (!state || !state.groupId) { toast('Pick a league first', 'err'); return; }

  var payload = {
    match_id: matchId,
    group_id: state.groupId,
    user_id:  me.id,
    body:     body
  };
  if (state.composeTarget && state.composeTarget !== me.id) {
    payload.target_user_id = state.composeTarget;
  }

  sb.from('match_notes').insert(payload)
    .select('id,user_id,body,created_at,target_user_id,profiles(display_name)')
    .single()
    .then(function(r) {
      if (r.error) { toast('Post failed: ' + r.error.message, 'err'); return; }
      var newNote = r.data;
      newNote.replies = [];
      newNote.likeCount = 0;
      newNote.likedByMe = false;
      // Attach target name if compose was targeted
      if (newNote.target_user_id && state.composeTargetName) {
        newNote.target = { display_name: state.composeTargetName };
      }
      state.notes.unshift(newNote);
      ta.value = '';
      // Clear compose target after posting — next post defaults to general
      state.composeTarget = null;
      state.composeTargetName = null;
      updateNoteCharCount(matchId);
      renderNotesPanel(matchId);
      toast(payload.target_user_id ? 'Comment posted' : 'Posted', 'ok');
    });
}

function clearComposeTarget(matchId) {
  var state = notesState[matchId];
  if (!state) return;
  state.composeTarget = null;
  state.composeTargetName = null;
  renderNotesPanel(matchId);
}

// Public API: open the notes panel on a match, pre-set to comment on a specific user's pick.
// Called from the league-mate predictions view when you click the "Comment on this pick" button.
function openPredictionComment(matchId, targetUid, targetName, groupId) {
  if (!notesState[matchId]) {
    notesState[matchId] = { open: true, notes: [], loading: false, groupId: groupId || defaultGroupForNotes() };
  }
  var state = notesState[matchId];
  state.open = true;
  state.composeTarget = targetUid;
  state.composeTargetName = targetName;
  // If a group is specified, use it (e.g. when commenting from inside a league context)
  if (groupId) state.groupId = groupId;

  // Make the panel visible
  var panel = document.getElementById('notes-panel-' + matchId);
  if (panel) panel.style.display = '';

  // Load notes (or re-render if already loaded)
  if (!state.notes.length && !state.loading) {
    loadNotesForMatch(matchId);
  } else {
    renderNotesPanel(matchId);
  }

  // Scroll into view + focus textarea
  setTimeout(function() {
    var p = document.getElementById('notes-panel-' + matchId);
    if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var ta = document.getElementById('note-input-' + matchId);
    if (ta) ta.focus();
  }, 80);
}

function deleteNote(noteId, matchId) {
  if (!confirm('Delete this note?')) return;
  sb.from('match_notes').delete().eq('id', noteId).then(function(r) {
    if (r.error) { toast('Delete failed', 'err'); return; }
    var state = notesState[matchId];
    if (state) state.notes = state.notes.filter(function(n){ return n.id !== noteId; });
    renderNotesPanel(matchId);
    toast('Deleted', 'ok');
  });
}

function toggleReplyBox(noteId, matchId) {
  var box = document.getElementById('reply-box-' + noteId);
  if (!box) return;
  box.style.display = box.style.display === 'none' ? '' : 'none';
  if (box.style.display !== 'none') {
    var inp = document.getElementById('reply-input-' + noteId);
    if (inp) inp.focus();
  }
}

function postReply(noteId, matchId) {
  var ta = document.getElementById('reply-input-' + noteId);
  if (!ta) return;
  var body = ta.value.trim();
  if (!body) { toast('Write a reply', 'err'); return; }
  if (body.length > 140) { toast('Reply too long', 'err'); return; }

  sb.from('note_replies').insert({
    note_id: noteId,
    user_id: me.id,
    body:    body
  }).select('id,note_id,user_id,body,created_at,profiles(display_name)').single().then(function(r) {
    if (r.error) { toast('Reply failed: ' + r.error.message, 'err'); return; }
    var state = notesState[matchId];
    if (state) {
      var note = state.notes.find(function(n){ return n.id === noteId; });
      if (note) {
        if (!note.replies) note.replies = [];
        note.replies.push(r.data);
      }
    }
    renderNotesPanel(matchId);
    toast('Replied', 'ok');
  });
}

function deleteReply(replyId, matchId) {
  sb.from('note_replies').delete().eq('id', replyId).then(function(r) {
    if (r.error) { toast('Delete failed', 'err'); return; }
    var state = notesState[matchId];
    if (state) {
      state.notes.forEach(function(n) {
        if (n.replies) n.replies = n.replies.filter(function(rp){ return rp.id !== replyId; });
      });
    }
    renderNotesPanel(matchId);
  });
}

function toggleLike(noteId, matchId) {
  var state = notesState[matchId];
  if (!state) return;
  var note = state.notes.find(function(n){ return n.id === noteId; });
  if (!note) return;
  if (note.likedByMe) {
    // unlike
    sb.from('note_likes').delete().eq('note_id', noteId).eq('user_id', me.id).then(function(r) {
      if (r.error) { toast('Failed', 'err'); return; }
      note.likedByMe = false;
      note.likeCount = Math.max(0, (note.likeCount || 0) - 1);
      renderNotesPanel(matchId);
    });
  } else {
    sb.from('note_likes').insert({ note_id: noteId, user_id: me.id }).then(function(r) {
      if (r.error) { toast('Failed', 'err'); return; }
      note.likedByMe = true;
      note.likeCount = (note.likeCount || 0) + 1;
      renderNotesPanel(matchId);
    });
  }
}

function fmtNoteTime(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var now = new Date();
  var diff = (now - d) / 1000; // seconds
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm';
  if (diff < 86400) return Math.floor(diff/3600) + 'h';
  if (diff < 604800) return Math.floor(diff/86400) + 'd';
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
}
