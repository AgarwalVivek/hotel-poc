# The Golden Sun Hotel Website

A luxury hotel website built in 3 phases.

---

## 📁 Project Structure

```
hotel-website/
├── index.html          ← Main website
├── admin.html          ← Admin panel (manage rooms & enquiries)
├── css/
│   ├── style.css       ← Main styles
│   └── admin.css       ← Admin styles
├── js/
│   ├── db.js           ← ⭐ Database layer (swap this file for Phase 2 & 3)
│   ├── main.js         ← Website logic
│   └── admin.js        ← Admin panel logic
└── README.md
```

---

## 🚀 Phase 1 — Local MVP (CURRENT)

### How to Open
Just double-click `index.html` — no server needed!

Works in any modern browser (Chrome, Firefox, Edge, Safari).

### How It Works
- **Database**: `localStorage` in the browser — data persists between sessions
- **Rooms**: Pre-loaded with 6 sample rooms; editable in Admin Panel
- **Enquiries**: Form submissions saved to localStorage, viewable in Admin
- **Admin Panel**: Open `admin.html` to manage rooms and view enquiries

### Admin Panel Features
- Dashboard with stats
- Add / Edit / Delete rooms
- Toggle room availability
- View and manage enquiries
- Reset rooms to defaults

---

## 🌐 Phase 2 — Free Hosting (Netlify + Supabase)

### Step 1: Create a free Supabase project at supabase.com
- Create two tables: `rooms` and `enquiries` (use same fields as in db.js)
- Copy your project URL and anon key

### Step 2: Update `js/db.js`
Replace the localStorage functions with Supabase fetch calls:

```js
// At top of db.js, add:
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json'
};

// Replace rooms.getAll():
async getAll() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms`, { headers });
  return res.json();
}
// (update all other methods similarly)
```

### Step 3: Deploy to Netlify
1. Create account at netlify.com
2. Drag and drop the `hotel-website/` folder
3. Site is live at `yoursite.netlify.app`
4. Optional: Connect a free domain from Freenom

---

## ☁️ Phase 3 — Azure Integration

### Architecture
```
Browser → Azure Static Web Apps (hosting)
              ↓
         Azure Functions (API layer, Node.js)
              ↓
         Azure Cosmos DB or Azure SQL (database)
```

### Step 1: Azure Resources to Create
- **Azure Static Web Apps** (free tier) — hosts HTML/CSS/JS
- **Azure Functions** (consumption plan, free tier) — REST API
- **Azure Cosmos DB** (serverless) or **Azure SQL** (basic tier)

### Step 2: Create API Functions
Create these Azure Function endpoints:
```
GET    /api/rooms          → return all rooms
POST   /api/rooms          → add a room
PUT    /api/rooms/{id}     → update a room
DELETE /api/rooms/{id}     → delete a room
POST   /api/enquiries      → submit enquiry
GET    /api/enquiries      → get all enquiries
```

### Step 3: Update `js/db.js` for Azure
```js
const API_BASE = 'https://your-func-app.azurewebsites.net/api';

const rooms = {
  async getAll() {
    const res = await fetch(`${API_BASE}/rooms`);
    return res.json();
  },
  async add(room) {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      body: JSON.stringify(room),
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  }
  // ... etc
};
```

### Step 4: Deploy
```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy ./hotel-website --app-name your-app-name
```

---

## 🔐 Admin Security (Phase 2/3)

In Phase 1, the admin panel is open. For production, add:
- **Netlify Identity** (Phase 2) — free user auth
- **Azure Active Directory B2C** (Phase 3) — enterprise auth

---

## 📞 Contacts Shown
- Address: 1, Jaydev Vihar, Bhubaneswar, Odisha 751013
- Phone: +91 674 255 3000
- Email: reservations@goldensunhotel.com

Update these in `index.html` → Contact section.
