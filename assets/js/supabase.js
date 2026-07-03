/**
 * UJSMS — Supabase Client & Utilities
 * 
 * Setup: copy .env.example to .env.local and fill in your
 * SUPABASE_URL and SUPABASE_ANON_KEY values.
 * 
 * For static HTML deployment (Vercel), replace the two constants
 * below with your actual project values, OR use a build step.
 */

// ── Supabase credentials (replace with your project values) ──
const SUPABASE_URL  = window.ENV_SUPABASE_URL  || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = window.ENV_SUPABASE_ANON || 'YOUR_ANON_KEY';

// ── Initialise Supabase client ──────────────────────────────
const { createClient } = supabase; // from CDN
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Storage helpers ──────────────────────────────────────────

/**
 * Get public URL for a file stored in Supabase Storage.
 * @param {string} bucket  - storage bucket name
 * @param {string} path    - file path within bucket
 * @returns {string} public URL
 */
function storageUrl(bucket, path) {
  if (!path) return '';
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || '';
}

// ── Database helpers ─────────────────────────────────────────

/** Fetch all published issues ordered newest first */
async function fetchIssues() {
  const { data, error } = await db
    .from('issues')
    .select('*')
    .eq('published', true)
    .order('published_date', { ascending: false });
  if (error) console.error('fetchIssues:', error);
  return data || [];
}

/** Fetch a single issue by id */
async function fetchIssue(id) {
  const { data, error } = await db
    .from('issues')
    .select('*')
    .eq('id', id)
    .single();
  if (error) console.error('fetchIssue:', error);
  return data;
}

/** Fetch the latest published issue */
async function fetchLatestIssue() {
  const { data, error } = await db
    .from('issues')
    .select('*')
    .eq('published', true)
    .order('published_date', { ascending: false })
    .limit(1)
    .single();
  if (error) console.error('fetchLatestIssue:', error);
  return data;
}

/** Fetch articles, optionally filtered by issue_id */
async function fetchArticles({ issueId = null, limit = 20, featured = null } = {}) {
  let query = db
    .from('articles')
    .select('*, issues(volume, issue_number, title)')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (issueId)  query = query.eq('issue_id', issueId);
  if (featured !== null) query = query.eq('featured', featured);

  const { data, error } = await query;
  if (error) console.error('fetchArticles:', error);
  return data || [];
}

/** Fetch a single article by id */
async function fetchArticle(id) {
  const { data, error } = await db
    .from('articles')
    .select('*, issues(volume, issue_number, title)')
    .eq('id', id)
    .single();
  if (error) console.error('fetchArticle:', error);
  return data;
}

/** Fetch active announcements */
async function fetchAnnouncements(limit = 6) {
  const { data, error } = await db
    .from('announcements')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('fetchAnnouncements:', error);
  return data || [];
}

/** Fetch editorial board members */
async function fetchEditorialBoard() {
  const { data, error } = await db
    .from('editorial_board')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) console.error('fetchEditorialBoard:', error);
  return data || [];
}

/** Fetch comments for a given target (article / issue) */
async function fetchComments({ targetType, targetId, sort = 'newest' } = {}) {
  let query = db
    .from('comments')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('approved', true)
    .is('parent_id', null); // top-level only

  if (sort === 'newest') query = query.order('created_at', { ascending: false });
  if (sort === 'liked')  query = query.order('likes', { ascending: false });

  const { data, error } = await query;
  if (error) console.error('fetchComments:', error);
  return data || [];
}

/** Fetch replies for a comment */
async function fetchReplies(parentId) {
  const { data, error } = await db
    .from('comments')
    .select('*')
    .eq('parent_id', parentId)
    .eq('approved', true)
    .order('created_at', { ascending: true });
  if (error) console.error('fetchReplies:', error);
  return data || [];
}

/** Post a new comment */
async function postComment({ targetType, targetId, parentId = null, authorName, authorEmail, body }) {
  const { data, error } = await db
    .from('comments')
    .insert([{
      target_type: targetType,
      target_id: targetId,
      parent_id: parentId,
      author_name: authorName,
      author_email: authorEmail,
      body,
      approved: false, // pending moderation
      likes: 0,
      pinned: false,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Like a comment (optimistic) */
async function likeComment(id, currentLikes) {
  const { error } = await db
    .from('comments')
    .update({ likes: currentLikes + 1 })
    .eq('id', id);
  if (error) throw error;
}

// ── Real-time subscription helpers ───────────────────────────

/** Subscribe to new approved comments for a target */
function subscribeComments({ targetType, targetId, onInsert }) {
  return db
    .channel(`comments:${targetType}:${targetId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'comments',
      filter: `target_type=eq.${targetType}`,
    }, (payload) => {
      if (payload.new.target_id === targetId && payload.new.approved) {
        onInsert(payload.new);
      }
    })
    .subscribe();
}

// ── Auth helpers ─────────────────────────────────────────────

async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await db.auth.signOut();
}

async function getSession() {
  const { data } = await db.auth.getSession();
  return data?.session;
}

// ── Utility formatters ───────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    month: 'short', year: 'numeric'
  });
}

function truncate(str, max = 200) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max).trim() + '…';
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

// ── DOM helpers ──────────────────────────────────────────────

function el(selector, parent = document) { return parent.querySelector(selector); }
function els(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }

function showLoader(container, msg = 'Loading…') {
  container.innerHTML = `<div class="loading-state"><div class="loader"></div><span>${msg}</span></div>`;
}

function showEmpty(container, title = 'No content yet', icon = '📭') {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
    </div>`;
}

function showAlert(container, msg, type = 'info') {
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = msg;
  container.prepend(div);
  setTimeout(() => div.remove(), 5000);
}

// Export for ES module use if bundled; also works as a plain script
if (typeof window !== 'undefined') {
  Object.assign(window, {
    db, storageUrl,
    fetchIssues, fetchIssue, fetchLatestIssue,
    fetchArticles, fetchArticle,
    fetchAnnouncements, fetchEditorialBoard,
    fetchComments, fetchReplies, postComment, likeComment,
    subscribeComments,
    signIn, signOut, getSession,
    formatDate, formatDateShort, truncate, slugify, initials,
    el, els, showLoader, showEmpty, showAlert,
  });
}
