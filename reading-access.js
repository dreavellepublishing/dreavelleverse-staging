/* Public browsing remains available. Only story-reading links require sign-in. */
(() => {
  'use strict';
  const db = window.supabaseClient;
  if (!db) return;
  const allowedPath = /^(?:read-story|read-chapter|public-profile)\.html$/i;
  const safeDestination = value => {
    if (!value) return null;
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin || !allowedPath.test(url.pathname.split('/').pop())) return null;
      return url.pathname + url.search + url.hash;
    } catch (_) { return null; }
  };
  const currentPage = location.pathname.split('/').pop().toLowerCase();
  if (currentPage === 'login.html') {
    const destination = safeDestination(new URLSearchParams(location.search).get('next'));
    if (destination) {
      const signUpLink = document.querySelector('.signup-login-text a[href="signup.html"]');
      if (signUpLink) signUpLink.href = 'signup.html?next=' + encodeURIComponent(destination);
      // Login form in script.js redirects to index.html after success. Capture its successful
      // auth state and preserve the destination without modifying existing authentication.
      db.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => location.replace(destination), 0);
        }
      });
    }
    return;
  }
  if (currentPage === 'signup.html') {
    const destination = safeDestination(new URLSearchParams(location.search).get('next'));
    if (destination) {
      const loginLink = document.querySelector('.signup-login-text a[href="login.html"]');
      if (loginLink) loginLink.href = 'login.html?next=' + encodeURIComponent(destination);
      const message = document.getElementById('signup-message');
      if (message) new MutationObserver(() => {
        if (message.textContent.includes('Account created successfully')) {
          const link = document.createElement('a');
          link.href = 'login.html?next=' + encodeURIComponent(destination);
          link.textContent = ' Log in to continue to your story';
          if (!message.querySelector('a')) message.append(link);
        }
      }).observe(message, { childList: true, subtree: false });
    }
    return;
  }
  if (currentPage !== 'index.html' && currentPage !== 'discover.html' && currentPage !== '') return;

  const overlay = document.createElement('div');
  overlay.className = 'dv-reading-gate';
  overlay.hidden = true;
  overlay.innerHTML = `<div class="dv-reading-dialog" role="dialog" aria-modal="true" aria-labelledby="dv-reading-title">
    <button type="button" class="dv-reading-close" aria-label="Close dialog">×</button>
    <div class="dv-reading-icon" aria-hidden="true">📖</div>
    <h2 id="dv-reading-title">Your Next Story Awaits!</h2>
    <p>Log in or create your free DreavelleVerse account to start reading this story.</p>
    <div class="dv-reading-actions"><a class="dv-reading-login" href="login.html">Log In</a><a class="dv-reading-signup" href="signup.html">Sign Up</a></div>
    <small>Free to join · Continue to your chosen story after signing in</small>
  </div>`;
  document.body.append(overlay);
  const dialog = overlay.querySelector('.dv-reading-dialog');
  const close = () => { overlay.hidden = true; document.body.classList.remove('dv-reading-modal-open'); };
  overlay.querySelector('.dv-reading-close').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !overlay.hidden) close(); });
  document.addEventListener('click', async event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const destination = safeDestination(anchor.href);
    if (!destination) return;
    const isProfile = /public-profile\.html$/i.test(new URL(anchor.href).pathname);
    if (isProfile && !anchor.closest('#dv-suggest-people, #discover-users-results')) return;
    event.preventDefault();
    try {
      const { data: { session }, error } = await db.auth.getSession();
      if (error) throw error;
      if (session?.user) { location.assign(destination); return; }
    } catch (error) { console.warn('Reading sign-in check:', error); }
    overlay.querySelector('#dv-reading-title').textContent = isProfile ? 'Connect with DreavelleVerse Members!' : 'Your Next Story Awaits!';
    overlay.querySelector('.dv-reading-dialog > p').textContent = isProfile ? 'Log in or create your free DreavelleVerse account to view this profile and follow other members.' : 'Log in or create your free DreavelleVerse account to start reading this story.';
    overlay.querySelector('.dv-reading-dialog > small').textContent = isProfile ? 'Free to join · Continue to the selected profile after signing in' : 'Free to join · Continue to your chosen story after signing in';
    const next = encodeURIComponent(destination);
    overlay.querySelector('.dv-reading-login').href = 'login.html?next=' + next;
    overlay.querySelector('.dv-reading-signup').href = 'signup.html?next=' + next;
    overlay.hidden = false;
    document.body.classList.add('dv-reading-modal-open');
    dialog.querySelector('.dv-reading-close').focus();
  }, true);
})();
