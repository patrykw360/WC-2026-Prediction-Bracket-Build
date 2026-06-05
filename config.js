// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://honqqzgmbjneetuwhdef.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbnFxemdtYmpuZWV0dXdoZGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODg1NTksImV4cCI6MjA5NDE2NDU1OX0.RXX5TlmHJTg9vU2M-695zfHUKfoyx1JKYdioWoZ-vFc';

// Safety check: warn clearly if the keys have not been set
(function () {
  var bad =
    !SUPABASE_URL ||
    !SUPABASE_KEY ||
    SUPABASE_URL === 'https://honqqzgmbjneetuwhdef.supabase.co' ||
    SUPABASE_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbnFxemdtYmpuZWV0dXdoZGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1ODg1NTksImV4cCI6MjA5NDE2NDU1OX0.RXX5TlmHJTg9vU2M-695zfHUKfoyx1JKYdioWoZ-vFc' ||
    SUPABASE_URL.includes('/rest/v1');

  if (bad) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML =
        '<div style="max-width:520px;margin:80px auto;font-family:system-ui;' +
        'background:#fff;border:2px solid #b02020;border-radius:12px;padding:28px;color:#1a2236">' +
        '<h2 style="color:#b02020;margin:0 0 12px">⚙️ Setup needed</h2>' +
        '<p>Your Supabase keys are not set correctly. Open <b>config.js</b> and use the Project URL, not the REST API URL.</p>' +
        '<p><b>Correct URL format:</b><br><code>https://honqqzgmbjneetuwhdef.supabase.co</code></p>' +
        '<p><b>Wrong URL format:</b><br><code>https://honqqzgmbjneetuwhdef.supabase.co/rest/v1/</code></p>' +
        '</div>';
    });
    throw new Error('Supabase config invalid — check config.js');
  }
})();

var sb;
try {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
  document.addEventListener('DOMContentLoaded', function () {
    document.body.innerHTML =
      '<div style="max-width:520px;margin:80px auto;font-family:system-ui;' +
      'background:#fff;border:2px solid #b02020;border-radius:12px;padding:28px">' +
      '<h2 style="color:#b02020">Could not connect to Supabase</h2>' +
      '<p>The URL or key in <b>config.js</b> looks invalid. Error: ' + e.message + '</p></div>';
  });
  throw e;
}