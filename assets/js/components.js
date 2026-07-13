/**
 * UJSMS — Shared UI Components
 * Navigation, theme toggle, scroll animations, footer, comments UI
 */

// ── Theme ────────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('ujsms-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ujsms-theme', next);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

// ── Navigation ───────────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  // Scroll shadow
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Hamburger
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('navMobile');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', mobileMenu.classList.contains('open'));
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
      }
    });
  }

  // Mark active link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  updateThemeIcon();
}

// ── Scroll-reveal animations ─────────────────────────────────
function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
}

// ── Counter animation ────────────────────────────────────────
function animateCounter(el, target, duration = 1800) {
  const start = Date.now();
  const startVal = 0;
  const isDecimal = String(target).includes('.');

  function update() {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = startVal + (target - startVal) * eased;
    el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function initCounters() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        if (!isNaN(target)) animateCounter(el, target);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
}

// ── Article card renderer ────────────────────────────────────
function renderArticleCard(article) {
  const authors = Array.isArray(article.authors)
    ? article.authors.join(', ')
    : (article.authors || '');
  const date = window.formatDate ? formatDate(article.created_at) : '';
  const abstract = window.truncate ? truncate(article.abstract || '', 180) : '';

  return `
    <div class="card article-card" data-reveal>
      <div class="article-card-body">
        <div class="card-meta">
          <span class="tag tag-blue">${article.category || 'Article'}</span>
          <span class="tag tag-green">${date}</span>
        </div>
        <h3 class="article-card-title">${article.title || 'Untitled'}</h3>
        <p class="article-card-authors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;margin-right:4px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${authors}
        </p>
        <p class="article-card-abstract">${abstract}</p>
      </div>
      <div class="article-card-footer">
        <a href="article.html?id=${article.id}" class="btn btn-outline btn-sm">Read Article</a>
        ${article.pdf_url ? `<a href="${window.storageUrl ? storageUrl('pdfs', article.pdf_url) : '#'}" target="_blank" class="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          PDF
        </a>` : ''}
      </div>
    </div>`;
}

// ── Announcement card renderer ───────────────────────────────
function renderAnnouncementCard(item) {
  const icons = { 'call-for-papers': '📢', 'news': '📰', 'event': '🗓️', 'deadline': '⏰' };
  const iconClasses = { 'call-for-papers': 'green', 'news': 'blue', 'event': 'blue', 'deadline': 'gold' };
  const type = item.type || 'news';
  return `
    <div class="announce-card" data-reveal>
      <div class="announce-icon ${iconClasses[type] || 'blue'}">${icons[type] || '📢'}</div>
      <div>
        <div class="announce-date">${window.formatDate ? formatDate(item.created_at) : ''}</div>
        <div class="announce-title">${item.title}</div>
        <div class="announce-desc">${item.body || ''}</div>
        ${item.link ? `<a href="${item.link}" class="btn btn-outline btn-sm" style="margin-top:12px">Learn More →</a>` : ''}
      </div>
    </div>`;
}

// ── Comments UI ──────────────────────────────────────────────

function renderComment(c, isReply = false) {
  const ini = window.initials ? initials(c.author_name) : c.author_name?.[0] || '?';
  const date = window.formatDate ? formatDate(c.created_at) : '';
  const pinBadge = c.pinned ? `<span class="pinned-badge">📌 Pinned</span>` : '';
  return `
    <div class="comment" id="comment-${c.id}">
      <div class="comment-avatar">${ini}</div>
      <div style="flex:1">
        <div>
          <span class="comment-author">${escapeHtml(c.author_name)}</span>
          <span class="comment-date">${date}</span>
          ${pinBadge}
        </div>
        <p class="comment-body">${escapeHtml(c.body)}</p>
        <div class="comment-actions">
          <button class="comment-action-btn" onclick="handleLike('${c.id}', ${c.likes || 0}, this)">
            👍 <span class="like-count">${c.likes || 0}</span>
          </button>
          ${!isReply ? `<button class="comment-action-btn" onclick="showReplyForm('${c.id}')">↩ Reply</button>` : ''}
        </div>
        ${!isReply ? `<div id="reply-form-${c.id}" style="display:none"></div>
          <div class="reply-thread" id="replies-${c.id}"></div>` : ''}
      </div>
    </div>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

async function handleLike(commentId, currentLikes, btn) {
  try {
    await window.likeComment(commentId, currentLikes);
    const newCount = currentLikes + 1;
    btn.querySelector('.like-count').textContent = newCount;
    btn.classList.add('liked');
    btn.disabled = true;
    // update stored likes reference via closure won't work — reload to sync
  } catch (e) {
    console.error('Like failed:', e);
  }
}

function showReplyForm(parentId) {
  const container = document.getElementById(`reply-form-${parentId}`);
  if (!container) return;
  if (container.innerHTML) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <div class="comment-box" style="margin-top:12px;padding:16px">
      <input class="form-input" id="reply-name-${parentId}" placeholder="Your name" style="margin-bottom:8px">
      <input class="form-input" id="reply-email-${parentId}" placeholder="Your email" type="email" style="margin-bottom:8px">
      <textarea class="form-textarea" id="reply-body-${parentId}" placeholder="Write a reply…" style="min-height:80px"></textarea>
      <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="submitReply('${parentId}')">Post Reply</button>
    </div>`;
}

window.handleLike = handleLike;
window.showReplyForm = showReplyForm;

async function submitReply(parentId) {
  const name  = document.getElementById(`reply-name-${parentId}`)?.value?.trim();
  const email = document.getElementById(`reply-email-${parentId}`)?.value?.trim();
  const body  = document.getElementById(`reply-body-${parentId}`)?.value?.trim();
  if (!name || !body) return alert('Please fill in your name and reply.');
  try {
    await window.postComment({ targetType: currentCommentTarget.type, targetId: currentCommentTarget.id, parentId, authorName: name, authorEmail: email, body });
    document.getElementById(`reply-form-${parentId}`).innerHTML = `<p style="color:var(--green);font-size:var(--fs-sm);margin-top:8px">✅ Reply submitted for moderation.</p>`;
  } catch (e) {
    alert('Error posting reply: ' + e.message);
  }
}
window.submitReply = submitReply;

// Holds current target info for comment forms
let currentCommentTarget = { type: '', id: '' };

async function initComments(targetType, targetId, containerId) {
  currentCommentTarget = { type: targetType, id: targetId };
  const container = document.getElementById(containerId);
  if (!container) return;

  // Render form
  container.innerHTML = `
    <h3 class="title" style="font-size:var(--fs-xl);margin-bottom:24px">💬 Comments</h3>
    <div class="comment-box" id="commentForm">
      <h4 style="margin-bottom:16px;font-size:var(--fs-base)">Leave a Comment</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <input class="form-input" id="cName"  placeholder="Your name *" required>
        <input class="form-input" id="cEmail" placeholder="Your email" type="email">
      </div>
      <textarea class="form-textarea" id="cBody" placeholder="Share your thoughts…"></textarea>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:12px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-xs);color:var(--text-muted)">
          <select class="form-select" id="cSort" style="width:auto">
            <option value="newest">Sort: Newest</option>
            <option value="liked">Sort: Most Liked</option>
          </select>
        </label>
        <button class="btn btn-primary btn-sm" onclick="submitComment()">Post Comment</button>
      </div>
      <div id="commentAlert"></div>
    </div>
    <div id="commentList" style="margin-top:24px"></div>`;

  document.getElementById('cSort')?.addEventListener('change', (e) => loadComments(targetType, targetId, e.target.value));
  await loadComments(targetType, targetId, 'newest');

  // Real-time subscription
  window.subscribeComments && subscribeComments({ targetType, targetId, onInsert: (c) => {
    const list = document.getElementById('commentList');
    if (list) list.insertAdjacentHTML('afterbegin', renderComment(c));
  }});
}

async function loadComments(targetType, targetId, sort) {
  const list = document.getElementById('commentList');
  if (!list) return;
  showLoader(list, 'Loading comments…');
  try {
    const comments = await fetchComments({ targetType, targetId, sort });
    if (!comments.length) { showEmpty(list, 'Be the first to comment!', '💬'); return; }
    list.innerHTML = comments.map(c => renderComment(c)).join('');
    // Load replies
    for (const c of comments) {
      const replies = await fetchReplies(c.id);
      const replyContainer = document.getElementById(`replies-${c.id}`);
      if (replyContainer && replies.length) {
        replyContainer.innerHTML = replies.map(r => renderComment(r, true)).join('');
      }
    }
  } catch (e) {
    list.innerHTML = `<div class="alert alert-error">Failed to load comments.</div>`;
  }
}

async function submitComment() {
  const name  = document.getElementById('cName')?.value?.trim();
  const email = document.getElementById('cEmail')?.value?.trim();
  const body  = document.getElementById('cBody')?.value?.trim();
  const alert = document.getElementById('commentAlert');
  if (!name || !body) { showAlert(alert, 'Name and comment are required.', 'error'); return; }
  try {
    await window.postComment({ targetType: currentCommentTarget.type, targetId: currentCommentTarget.id, authorName: name, authorEmail: email, body });
    document.getElementById('cName').value = '';
    document.getElementById('cEmail').value = '';
    document.getElementById('cBody').value = '';
    showAlert(alert, '✅ Comment submitted! It will appear after moderation.', 'success');
  } catch (e) {
    showAlert(alert, 'Error: ' + e.message, 'error');
  }
}
window.submitComment = submitComment;

// ── Navigation HTML (injected by each page) ──────────────────
function getNavHTML(logoSrc = 'assets/images/logo.png') {
  return `
<nav class="nav" id="mainNav" role="navigation" aria-label="Main navigation">
  <div class="container nav-inner">
    <a href="index.html" class="nav-brand" aria-label="UJSMS Home">
      <img src="${logoSrc}" alt="UJSMS Logo" class="nav-logo" onerror="this.style.display='none'">
      <div class="nav-name">
        <span class="nav-name-top">UJSMS</span>
        <span class="nav-name-sub">Unilesa Journal</span>
      </div>
    </a>

    <div class="nav-links" role="list">
      <a href="index.html"          class="nav-link" role="listitem">Home</a>
      <a href="current-issue.html"  class="nav-link" role="listitem">Current Issue</a>
      <a href="archives.html"       class="nav-link" role="listitem">Archives</a>
      <a href="editorial-board.html"class="nav-link" role="listitem">Editorial Board</a>
      <a href="about.html"          class="nav-link" role="listitem">About</a>
      <a href="guidelines.html"     class="nav-link" role="listitem">Guidelines</a>
      <a href="contact.html"        class="nav-link" role="listitem">Contact</a>
    </div>

    <div class="nav-actions">
      <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" aria-label="Toggle theme">🌙</button>
      <a href="guidelines.html#submit" class="btn btn-primary btn-sm">Submit</a>
      <button class="nav-hamburger" id="navHamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</nav>

<div class="nav-mobile" id="navMobile" role="navigation" aria-label="Mobile navigation">
  <a href="index.html"          class="nav-link">Home</a>
  <a href="current-issue.html"  class="nav-link">Current Issue</a>
  <a href="archives.html"       class="nav-link">Archives</a>
  <a href="editorial-board.html"class="nav-link">Editorial Board</a>
  <a href="about.html"          class="nav-link">About</a>
  <a href="guidelines.html"     class="nav-link">Guidelines</a>
  <a href="contact.html"        class="nav-link">Contact</a>
  <a href="guidelines.html#submit" class="btn btn-primary btn-sm" style="margin-top:12px">Submit Manuscript</a>
</div>`;
}

function getFooterHTML() {
  return `
<footer class="footer" role="contentinfo">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a href="index.html" style="display:inline-flex;align-items:center;gap:12px;text-decoration:none">
          <img src="assets/images/logo.png" alt="UJSMS" style="width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,.2)" onerror="this.style.display='none'">
          <div style="color:#fff;font-family:'Playfair Display',serif;font-weight:700;font-size:1.1rem;line-height:1.2">
            UJSMS<br><span style="font-size:.7rem;font-family:'Inter',sans-serif;font-weight:400;opacity:.6;letter-spacing:.06em">UNILESA JOURNAL</span>
          </div>
        </a>
        <p class="footer-brand-desc">UJSMS advances interdisciplinary research in social and management sciences, fostering innovation, academic excellence, and impactful scholarship in Nigeria and beyond.</p>
        <div class="footer-social" aria-label="Social media links">
          <a href="#" aria-label="Facebook">f</a>
          <a href="#" aria-label="Twitter">𝕏</a>
          <a href="#" aria-label="LinkedIn">in</a>
        </div>
      </div>

      <div>
        <div class="footer-heading">Quick Links</div>
        <div class="footer-links">
          <a href="index.html">Home</a>
          <a href="current-issue.html">Current Issue</a>
          <a href="archives.html">Archives</a>
          <a href="editorial-board.html">Editorial Board</a>
          <a href="about.html">About UJSMS</a>
          <a href="guidelines.html">Author Guidelines</a>
        </div>
      </div>

      <div>
        <div class="footer-heading">Journal Info</div>
        <div class="footer-links">
          <a href="about.html#aim">Aim &amp; Scope</a>
          <a href="about.html#ethics">Publication Ethics</a>
          <a href="about.html#policy">Editorial Policy</a>
          <a href="guidelines.html#review">Peer Review</a>
          <a href="contact.html">Contact Us</a>
          <a href="admin/login.html">Admin Login</a>
        </div>
      </div>

      <div>
        <div class="footer-heading">Contact</div>
        <div class="footer-contact-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
          xxxxxx@xxxx.com
        </div>
        <div class="footer-contact-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91"/></svg>
          +234 (0) 800 000 0000
        </div>
        <div class="footer-contact-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          University of Ilesa, Ilesa, Osun State, Nigeria
        </div>
        <div style="margin-top:16px">
          <div class="label" style="color:rgba(255,255,255,.4);margin-bottom:8px">ISSN (Online)</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:.85rem;color:rgba(255,255,255,.7)">XXXX-XXXX</div>
        </div>
        <div style="margin-top:12px">
          <div class="label" style="color:rgba(255,255,255,.4);margin-bottom:8px">Website</div>
          <a href="https://www.unilesa.edu.ng" style="color:var(--light-blue);font-size:var(--fs-sm)">www.unilesa.com</a>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <span>© <span id="footerYear"></span> UJSMS — UNILESA Journal of Social and Management Sciences. All rights reserved.</span>
      <span>Vol. 1 · Issue 1 · July 2026</span>
    </div>
  </div>
</footer>`;
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Inject nav
  const navPlaceholder = document.getElementById('navPlaceholder');
  if (navPlaceholder) {
    // Detect depth (admin/ pages need adjusted paths)
    const isAdmin = location.pathname.includes('/admin/');
    const root = isAdmin ? '../' : '';
    navPlaceholder.outerHTML = getNavHTML(root + 'assets/images/logo.png')
      .replace(/href="(?!http|#|mailto|tel)/g, `href="${root}`)
      .replace(/src="(?!http|data)/g, `src="${root}`);
  }

  // Inject footer
  const footerPlaceholder = document.getElementById('footerPlaceholder');
  if (footerPlaceholder) footerPlaceholder.outerHTML = getFooterHTML();

  // Set current year in footer
  const fy = document.getElementById('footerYear');
  if (fy) fy.textContent = new Date().getFullYear();

  initNav();
  initReveal();
  initCounters();
  updateThemeIcon();
});
