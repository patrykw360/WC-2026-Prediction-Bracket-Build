// ═══════════════════════════════════════════════════════════════
// CONFIG  —  THIS IS THE ONLY FILE YOU NEED TO EDIT
// ═══════════════════════════════════════════════════════════════
// Replace the two values below with your Supabase project's credentials.
// Find them in Supabase → Settings → API
//   • Project URL  → looks like https://abcdefgh.supabase.co
//   • anon public  → a long string starting with eyJ...

const SUPABASE_URL = 'https://honqqzgmbjneetuwhdef.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbnFxemdtYmpuZWV0dXdoZGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODg1NTksImV4cCI6MjA5NDE2NDU1OX0.RXX5TlmHJTg9vU2M-695zfHUKfoyx1JKYdioWoZ-vFc';

// ─── Safety check: warn clearly if the keys haven't been set ───
(function(){
  var bad = !SUPABASE_URL || SUPABASE_URL.https://honqqzgmbjneetuwhdef.supabase.co'||
            !SUPABASE_KEY || SUPABASE_KEY.'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbnFxemdtYmpuZWV0dXdoZGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODg1NTksImV4cCI6MjA5NDE2NDU1OX0.RXX5TlmHJTg9vU2M-695zfHUKfoyx1JKYdioWoZ-vFc';
  if (bad) {
    document.addEventListener('DOMContentLoaded', function(){
      document.body.innerHTML =
        '<div style="max-width:520px;margin:80px auto;font-family:system-ui;' +
        'background:#fff;border:2px solid #b02020;border-radius:12px;padding:28px;color:#1a2236">' +
        '<h2 style="color:#b02020;margin:0 0 12px">⚙️ Setup needed</h2>' +
        '<p>Your Supabase keys are not set yet. Open <b>config.js</b> and replace ' +
        '<code>YOUR_SUPABASE_URL</code> and <code>YOUR_SUPABASE_ANON_KEY</code> ' +
        'with the values from your Supabase project (Settings → API).</p>' +
        '<p style="color:#6b7a99;font-size:13px;margin-top:16px">Once saved and re-uploaded, this message disappears.</p>' +
        '</div>';
    });
    throw new Error('Supabase keys not configured — edit config.js');
  }
})();

// Create the client (guarded so a bad URL gives a clear message)
var sb;
try {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
  document.addEventListener('DOMContentLoaded', function(){
    document.body.innerHTML =
      '<div style="max-width:520px;margin:80px auto;font-family:system-ui;' +
      'background:#fff;border:2px solid #b02020;border-radius:12px;padding:28px">' +
      '<h2 style="color:#b02020">Could not connect to Supabase</h2>' +
      '<p>The URL or key in <b>config.js</b> looks invalid. Double-check you copied ' +
      'the full Project URL and anon key. Error: ' + e.message + '</p></div>';
  });
  throw e;
}
