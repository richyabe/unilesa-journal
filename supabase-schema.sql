-- ============================================================
-- UJSMS — Supabase Database Schema
-- Run this in your Supabase SQL Editor to create all tables,
-- indexes, RLS policies, and storage buckets.
-- ============================================================

-- ── Enable UUID extension ────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ════════════════════════════════════════════════════════════
-- TABLE: issues
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS issues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  volume          INTEGER NOT NULL DEFAULT 1,
  issue_number    INTEGER NOT NULL DEFAULT 1,
  title           TEXT,
  description     TEXT,
  published_date  DATE,
  cover_url       TEXT,          -- path in storage bucket "covers"
  pdf_url         TEXT,          -- path in storage bucket "issues"
  article_count   INTEGER DEFAULT 0,
  published       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (volume, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_issues_published ON issues(published, published_date DESC);


-- ════════════════════════════════════════════════════════════
-- TABLE: articles
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS articles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    UUID REFERENCES issues(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  authors     JSONB NOT NULL DEFAULT '[]',   -- array of author name strings
  abstract    TEXT,
  keywords    JSONB DEFAULT '[]',            -- array of keyword strings
  content     TEXT,                          -- full article HTML/markdown
  category    TEXT,
  doi         TEXT,
  pdf_url     TEXT,                          -- path in storage bucket "pdfs"
  featured    BOOLEAN DEFAULT FALSE,
  published   BOOLEAN DEFAULT FALSE,
  page_views  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_published  ON articles(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_issue      ON articles(issue_id);
CREATE INDEX IF NOT EXISTS idx_articles_featured   ON articles(featured);
CREATE INDEX IF NOT EXISTS idx_articles_category   ON articles(category);

-- Full-text search index on title + abstract
CREATE INDEX IF NOT EXISTS idx_articles_fts ON articles
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'')));


-- ════════════════════════════════════════════════════════════
-- TABLE: announcements
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS announcements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT DEFAULT 'news',   -- 'call-for-papers' | 'news' | 'event' | 'deadline'
  link       TEXT,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active, created_at DESC);


-- ════════════════════════════════════════════════════════════
-- TABLE: editorial_board
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS editorial_board (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'board-member',
  -- 'editor-in-chief' | 'managing-editor' | 'board-member' | 'advisory'
  specialization  TEXT,
  institution     TEXT,
  email           TEXT,
  bio             TEXT,
  photo_url       TEXT,          -- path in storage bucket "avatars"
  sort_order      INTEGER DEFAULT 99,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_active ON editorial_board(active, sort_order ASC);


-- ════════════════════════════════════════════════════════════
-- TABLE: comments
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS comments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type  TEXT NOT NULL,           -- 'article' | 'issue'
  target_id    UUID NOT NULL,           -- id of the article or issue
  parent_id    UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_name  TEXT NOT NULL,
  author_email TEXT,
  body         TEXT NOT NULL,
  approved     BOOLEAN DEFAULT FALSE,
  pinned       BOOLEAN DEFAULT FALSE,
  likes        INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_target   ON comments(target_type, target_id, approved);
CREATE INDEX IF NOT EXISTS idx_comments_parent   ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON comments(approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_pending  ON comments(approved) WHERE approved = FALSE;


-- ════════════════════════════════════════════════════════════
-- TABLE: contact_enquiries
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name   TEXT,
  last_name    TEXT,
  email        TEXT,
  institution  TEXT,
  subject      TEXT,
  message      TEXT,
  read         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enquiries_read ON contact_enquiries(read, created_at DESC);


-- ════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGER
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['issues','articles','announcements','editorial_board','comments'] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════
-- ARTICLE COUNT DENORMALISATION TRIGGER
-- Keeps issues.article_count in sync automatically
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION sync_article_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.issue_id IS NOT NULL THEN
    UPDATE issues SET article_count = (
      SELECT COUNT(*) FROM articles WHERE issue_id = NEW.issue_id AND published = TRUE
    ) WHERE id = NEW.issue_id;
  END IF;
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.issue_id IS NOT NULL THEN
    UPDATE issues SET article_count = (
      SELECT COUNT(*) FROM articles WHERE issue_id = OLD.issue_id AND published = TRUE
    ) WHERE id = OLD.issue_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_article_count
AFTER INSERT OR UPDATE OR DELETE ON articles
FOR EACH ROW EXECUTE FUNCTION sync_article_count();


-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Public: read published content only
-- Authenticated (admin): full access
-- ════════════════════════════════════════════════════════════

-- Issues
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published issues"
  ON issues FOR SELECT USING (published = TRUE);
CREATE POLICY "Admins have full access to issues"
  ON issues FOR ALL USING (auth.role() = 'authenticated');

-- Articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published articles"
  ON articles FOR SELECT USING (published = TRUE);
CREATE POLICY "Admins have full access to articles"
  ON articles FOR ALL USING (auth.role() = 'authenticated');

-- Announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active announcements"
  ON announcements FOR SELECT USING (active = TRUE);
CREATE POLICY "Admins have full access to announcements"
  ON announcements FOR ALL USING (auth.role() = 'authenticated');

-- Editorial Board
ALTER TABLE editorial_board ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active board members"
  ON editorial_board FOR SELECT USING (active = TRUE);
CREATE POLICY "Admins have full access to board"
  ON editorial_board FOR ALL USING (auth.role() = 'authenticated');

-- Comments: public can read approved, insert (for submitting), admins manage all
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read approved comments"
  ON comments FOR SELECT USING (approved = TRUE);
CREATE POLICY "Anyone can post a comment"
  ON comments FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins have full access to comments"
  ON comments FOR ALL USING (auth.role() = 'authenticated');

-- Contact enquiries: insert only for public, full for admins
ALTER TABLE contact_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit enquiry"
  ON contact_enquiries FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins can read enquiries"
  ON contact_enquiries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can update enquiries"
  ON contact_enquiries FOR UPDATE USING (auth.role() = 'authenticated');


-- ════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- Run this section separately in the Supabase Dashboard →
-- Storage → Create bucket, OR via the API below.
-- ════════════════════════════════════════════════════════════
-- NOTE: Storage bucket creation via SQL requires the
-- storage schema. Use the Dashboard UI or this snippet:

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('pdfs',   'pdfs',   TRUE),
  ('covers', 'covers', TRUE),
  ('issues', 'issues', TRUE),
  ('avatars','avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Public read policies for storage
CREATE POLICY "Public can read pdfs"
  ON storage.objects FOR SELECT USING (bucket_id = 'pdfs');
CREATE POLICY "Admins can upload pdfs"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pdfs' AND auth.role() = 'authenticated');
CREATE POLICY "Admins can delete pdfs"
  ON storage.objects FOR DELETE USING (bucket_id = 'pdfs' AND auth.role() = 'authenticated');

CREATE POLICY "Public can read covers"
  ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Admins can upload covers"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');

CREATE POLICY "Public can read issue files"
  ON storage.objects FOR SELECT USING (bucket_id = 'issues');
CREATE POLICY "Admins can upload issue files"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issues' AND auth.role() = 'authenticated');

CREATE POLICY "Public can read avatars"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Admins can upload avatars"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');


-- ════════════════════════════════════════════════════════════
-- SAMPLE SEED DATA (optional — remove for production)
-- ════════════════════════════════════════════════════════════

-- Sample issue
INSERT INTO issues (volume, issue_number, title, description, published_date, published)
VALUES (
  1, 1,
  'Inaugural Edition — Social Dynamics and Economic Governance',
  'The inaugural issue of UJSMS brings together cutting-edge research across social and management sciences, featuring contributions from leading scholars across Nigeria and the African continent.',
  '2026-07-01',
  TRUE
) ON CONFLICT DO NOTHING;

-- Sample editorial board
INSERT INTO editorial_board (name, role, specialization, institution, sort_order, active)
VALUES
  ('Prof. Adewale Johnson',  'editor-in-chief',  'Corporate Governance & Finance',   'University of Lagos, Nigeria',        1, TRUE),
  ('Dr. Ngozi Eze',          'managing-editor',  'Organizational Behaviour',          'Ahmadu Bello University, Nigeria',    2, TRUE),
  ('Dr. Chioma Okonkwo',     'managing-editor',  'Development Economics',             'University of Ibadan, Nigeria',       3, TRUE),
  ('Prof. Emeka Obi',        'board-member',     'Entrepreneurship & Innovation',     'Lagos Business School, Nigeria',      4, TRUE),
  ('Dr. Fatima Aliyu',       'board-member',     'Public Administration',             'University of Abuja, Nigeria',        5, TRUE),
  ('Dr. Kemi Adebayo',       'board-member',     'Digital Transformation',            'Covenant University, Nigeria',        6, TRUE),
  ('Prof. Taiwo Ogundele',   'board-member',     'Human Resource Management',         'Obafemi Awolowo University, Nigeria', 7, TRUE),
  ('Dr. Aminu Bello',        'board-member',     'Microfinance & Rural Development',  'Bayero University Kano, Nigeria',     8, TRUE),
  ('Prof. Grace Adesanya',   'board-member',     'Social Policy & Welfare',           'University of Benin, Nigeria',        9, TRUE),
  ('Dr. Samuel Oduya',       'advisory',         'International Economics',           'University of Ghana, Ghana',         10, TRUE),
  ('Prof. Aisha Conteh',     'advisory',         'Governance & Policy',               'Cheikh Anta Diop University, Senegal',11,TRUE),
  ('Dr. James Mwangi',       'advisory',         'African Development Studies',        'University of Nairobi, Kenya',       12, TRUE)
ON CONFLICT DO NOTHING;

-- Sample announcements
INSERT INTO announcements (title, type, body, active)
VALUES
  ('Call for Papers — Vol. 1, Issue 2', 'call-for-papers',
   'We invite submission of original research articles for the upcoming issue. Topics include management sciences, social policy, economics, public administration, and entrepreneurship. Deadline: September 30, 2026.',
   TRUE),
  ('UJSMS Now Indexed on African Journals Online', 'news',
   'We are delighted to announce that UJSMS has been accepted for indexing on AJOL (African Journals OnLine), making our articles discoverable to a wider African and global academic audience.',
   TRUE),
  ('International Conference on Social Sciences 2026', 'event',
   'UJSMS is proud to sponsor the ICSS 2026 conference in Abuja. Authors of selected UJSMS articles will be invited to present. Submit extended abstracts by August 15, 2026.',
   TRUE)
ON CONFLICT DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- REALTIME — enable for comments table
-- ════════════════════════════════════════════════════════════
-- Run in Supabase Dashboard → Database → Replication
-- and enable replication for the "comments" table.
-- Or via SQL (requires superuser):

-- ALTER PUBLICATION supabase_realtime ADD TABLE comments;


-- ════════════════════════════════════════════════════════════
-- FUTURE SCALABILITY TABLES (placeholders)
-- Un-comment when implementing these features
-- ════════════════════════════════════════════════════════════

/*
-- Researcher profiles
CREATE TABLE IF NOT EXISTS researcher_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  bio           TEXT,
  institution   TEXT,
  orcid         TEXT,
  photo_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Article ratings
CREATE TABLE IF NOT EXISTS article_ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (article_id, user_id)
);

-- Newsletter subscriptions
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT UNIQUE NOT NULL,
  confirmed  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT,
  message     TEXT,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
*/
