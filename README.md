# UJSMS — UNILESA Journal of Social and Management Sciences
## Official Website · v1.0.0

A fully responsive, professional academic journal website with admin dashboard, Supabase backend, real-time comments, and dark/light mode — ready for Vercel deployment.

---

## 📁 Project Structure

```
ujsms/
├── index.html                 # Home page
├── about.html                 # About, Mission, Scope, Ethics
├── current-issue.html         # Latest journal issue & articles
├── archives.html              # All volumes & issues
├── editorial-board.html       # Editorial team profiles
├── guidelines.html            # Author submission guidelines
├── contact.html               # Contact form & info
├── article.html               # Individual article viewer + comments
├── admin/
│   ├── login.html             # Admin authentication
│   └── dashboard.html         # Full admin dashboard
├── assets/
│   ├── css/
│   │   ├── main.css           # Design system & all public styles
│   │   └── admin.css          # Admin dashboard styles
│   ├── js/
│   │   ├── supabase.js        # DB client, helpers, auth functions
│   │   └── components.js      # Nav, footer, comments, animations
│   ├── images/
│   │   ├── logo.png           # ← Place your UJSMS logo here
│   │   └── cover.jpg          # ← Place your journal cover here
│   └── pdfs/                  # Local PDF storage (optional)
├── supabase-schema.sql        # Full DB schema + seed data
├── vercel.json                # Vercel deployment config
├── .env.example               # Environment variable template
└── README.md                  # This file
```

---

## 🚀 Quick Start

### 1. Add Your Images

Copy your UJSMS logo and journal cover into `assets/images/`:

```
assets/images/logo.png      ← The circular UJSMS seal logo
assets/images/cover.jpg     ← Journal cover (July 2026)
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open **SQL Editor** in your Supabase dashboard
3. Paste and run the contents of `supabase-schema.sql`
4. This creates all tables, RLS policies, storage buckets, and seed data
5. In **Authentication → Users**, create your admin user:
   - Email: `admin@ujsms.com` (or your preferred email)
   - Password: a strong password

### 3. Configure Credentials

Open `assets/js/supabase.js` and replace the two constants at the top:

```javascript
const SUPABASE_URL  = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON = 'your-anon-public-key-here';
```

Find these values in: **Supabase Dashboard → Project Settings → API**

### 4. Deploy to Vercel

**Option A — Vercel CLI:**
```bash
npm install -g vercel
cd ujsms/
vercel --prod
```

**Option B — Vercel Dashboard:**
1. Push the `ujsms/` folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → Import Project → Select your repo
3. Add environment variables (optional, if using build-time injection):
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your anon key
4. Click **Deploy**

---

## 🔐 Admin Access

After deployment, access the admin dashboard at:

```
https://your-domain.com/admin/login.html
```

Use the Supabase admin user credentials you created in Step 2.

### Admin Features
| Feature | Description |
|---|---|
| 📄 Articles | Add, edit, delete articles; upload PDFs; toggle featured/published |
| 📚 Issues | Create journal issues; upload cover images and full-issue PDFs |
| 📢 Announcements | Create/manage call-for-papers, news, and event announcements |
| 💬 Comments | Approve, reject, pin, and delete user comments |
| 👥 Editorial Board | Add/edit board members, roles, photos, and bios |
| ⚙️ Settings | Account settings; journal configuration |

---

## 🎨 Design System

### Brand Colours
| Token | Hex | Usage |
|---|---|---|
| `--navy` | `#0B2D5B` | Primary backgrounds, headings |
| `--royal` | `#1E5AA8` | Buttons, links, accents |
| `--sky` | `#4A90D9` | Hover states |
| `--light-blue` | `#A7D8F0` | Light accents, dark mode text |
| `--green` | `#138A36` | Success states, CTA buttons |
| `--gold` | `#B5924C` | Pinned/featured badges |

### Fonts
- **Playfair Display** — headings, display text (academic serif)
- **Inter** — body text, UI elements (clean sans-serif)
- **JetBrains Mono** — labels, metadata, code (monospace)

### Theme
- Light and dark mode toggle available on every page
- User preference stored in `localStorage` as `ujsms-theme`
- Toggle via the 🌙/☀️ button in the navigation bar

---

## 💬 Comments System

Comments are stored in Supabase and require admin approval before appearing publicly.

### Public Features
- Post comments with name + email
- Reply to comments (threaded)
- Like comments
- Sort by newest or most liked

### Admin Moderation (Dashboard → Comments)
- Approve / unapprove comments
- Pin important comments
- Delete inappropriate comments
- View pending count on dashboard

### Real-time Updates
Comments use Supabase Realtime for live updates. Enable replication in:
**Supabase Dashboard → Database → Replication → supabase_realtime → tables → comments**

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `issues` | Journal volumes and issues |
| `articles` | Research articles with metadata |
| `announcements` | News, CFPs, events |
| `editorial_board` | Board member profiles |
| `comments` | Public comments with moderation |
| `contact_enquiries` | Contact form submissions |

---

## 📦 Supabase Storage Buckets

| Bucket | Contents | Public |
|---|---|---|
| `pdfs` | Individual article PDFs | ✅ Yes |
| `covers` | Issue cover images | ✅ Yes |
| `issues` | Full-issue PDFs | ✅ Yes |
| `avatars` | Board member photos | ✅ Yes |

---

## 🔮 Future Scalability

The codebase is prepared for these future additions (schema stubs included):

- [ ] User accounts & researcher profiles
- [ ] Article ratings (1–5 stars)
- [ ] Email newsletter subscriptions
- [ ] Push notifications
- [ ] DOI integration & citation generation
- [ ] AI-powered article search
- [ ] ORCID author verification
- [ ] Submission tracking portal

---

## 🛠️ Customisation Guide

### Adding a New Page
1. Copy `about.html` as a starting template
2. Change the `<title>`, page banner title, and content
3. Add a link in the nav inside `assets/js/components.js` → `getNavHTML()`

### Changing Brand Colours
Edit the CSS variables at the top of `assets/css/main.css`:
```css
:root {
  --navy:  #0B2D5B;
  --royal: #1E5AA8;
  --green: #138A36;
  /* ... */
}
```

### Adding New Article Categories
Update the `<select>` in `admin/dashboard.html` (Article Modal → Category dropdown) and the filter options in `archives.html`.

### Modifying the Footer
Edit the `getFooterHTML()` function in `assets/js/components.js`.

---

## 📞 Support

- **Email:** editor@ujsms.com
- **Website:** [www.ujsms.com](https://www.ujsms.com)
- **Technical Issues:** submissions@ujsms.com

---

## 📄 License

© 2026 UJSMS — UNILESA Journal of Social and Management Sciences.  
All rights reserved. Powered by [Supabase](https://supabase.com) · Deployed on [Vercel](https://vercel.com).
