# PGMS — PG Management System
### Complete Installation & Setup Guide

---

## What is PGMS?

PGMS is a modern, mobile-responsive web application for managing Paying Guest (PG) accommodations. Built with React, Firebase, and Tailwind CSS — runs entirely free with no server required.

---

## Features

| Module | Description |
|--------|-------------|
| 🏠 Room Management | Add, edit, delete rooms with status tracking |
| 👥 Tenant Management | Full tenant profiles, active & past tenants |
| 💰 Payments | Record cash/UPI/bank payments, dues tracking |
| 🧾 Expenses | Category-wise expenses with receipt attachments |
| 👷 Staff & Salary | Staff management and salary tracking |
| 📊 Reports | Business graphs, P&L, CSV download |
| 📦 Assets | Room-wise asset tracking |
| 🔔 Notifications | Auto rent due alerts, booking & expense alerts |
| 🔐 Access Control | Role-based access (Admin + Warden) with custom permissions |
| 🗑️ Delete Requests | Warden requests, admin approves |

---

## Tech Stack (All Free)

- **Frontend** — React + Tailwind CSS
- **Database** — Firebase Firestore
- **Auth** — Firebase Google Login
- **File Storage** — Cloudinary (receipt uploads)
- **Hosting** — GitHub Pages
- **Cost** — ₹0/month for up to 15 tenants

---

## Prerequisites

Install these before starting:

1. **Node.js** (v18 or higher) — https://nodejs.org
2. **Git** — https://git-scm.com
3. **VS Code** (recommended) — https://code.visualstudio.com
4. A **Google account** (for Firebase + login)
5. A **GitHub account** (for hosting)
6. A **Cloudinary account** (for receipt uploads) — https://cloudinary.com

---

## Step 1 — Get the Code

```bash
# Clone the repository
git clone https://github.com/YOUR_GITHUB_USERNAME/pgms.git
cd pgms

# Install dependencies
npm install
```

---

## Step 2 — Create Firebase Project

1. Go to **https://firebase.google.com** and sign in
2. Click **"Create a project"** → Name it `pgms` → Disable Analytics → Create
3. **Enable Firestore:**
   - Left sidebar → Build → Firestore Database
   - Click "Create database" → Start in test mode → Location: **asia-south1** → Enable
4. **Enable Google Auth:**
   - Left sidebar → Build → Authentication → Get started
   - Click Google → Enable → Add your Gmail as support email → Save
5. **Register Web App:**
   - Project Overview → Click `</>` (Web) icon
   - App nickname: `pgms` → Register app
   - Select **npm** → Copy the firebaseConfig object

---

## Step 3 — Configure Firebase

Open `src/firebase/config.js` and replace with your config:

```js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

---

## Step 4 — Configure Cloudinary

1. Go to **https://cloudinary.com** → Sign up free
2. Note your **Cloud name** from dashboard
3. Go to Settings → Upload → Upload presets → Add upload preset
   - Name: `pgms_uploads`
   - Signing mode: **Unsigned**
   - Save

Open `src/config/pgConfig.js` and update:

```js
const pgConfig = {
  pg_name: "Your PG Name Here",          // ← Change this
  owner_name: "Your Name",               // ← Change this
  max_rooms: 15,                          // ← Change this
  currency: "₹",
  rent_modes: ["monthly", "daily"],
  location: "Your City, State",          // ← Change this
  contact: "9876543210",                 // ← Change this
  upi_id: "yourname@upi",               // ← Change this
  cctv_enabled: false,
  theme_color: "#6366f1",
  app_version: "1.0.0",
  cloudinary_cloud_name: "YOUR_CLOUD_NAME",        // ← Change this
  cloudinary_upload_preset: "pgms_uploads"
};

export default pgConfig;
```

---

## Step 5 — Set Up GitHub Pages

1. Create a new GitHub repository named `pgms`
2. Open `package.json` and update homepage:

```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/pgms",
```

3. Open `vite.config.js` and set base:

```js
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/pgms/',
})
```

4. Push code to GitHub:

```bash
git init
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/pgms.git
git add .
git commit -m "initial commit"
git push origin main
```

5. Deploy to GitHub Pages:

```bash
npm run deploy
```

6. Go to GitHub repo → Settings → Pages → Select **gh-pages** branch → Save

Your app will be live at: `https://YOUR_GITHUB_USERNAME.github.io/pgms`

---

## Step 6 — Add Authorized Domain to Firebase

1. Firebase Console → Authentication → Settings → Authorized domains
2. Click "Add domain"
3. Add: `YOUR_GITHUB_USERNAME.github.io`
4. Save

---

## Step 7 — Set Up Admin Account

1. Go to Firebase Console → Firestore Database
2. Click **+ Start collection** → Collection ID: `users`
3. Auto ID → Add fields:
   - `email` → `your.gmail@gmail.com`
   - `role` → `admin`
4. Save

---

## Step 8 — Update Firestore Security Rules

Firebase Console → Firestore → Rules → Replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    match /{collection}/{id} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

Click **Publish**

---

## Step 9 — Test the App

1. Open your app URL
2. Login with your Google account
3. You should see the **👑 Admin** badge
4. Add a room, add a tenant — everything should work

---

## Adding Warden/Staff Accounts

1. Firebase Console → Firestore → users collection
2. Add document with:
   - `email` → staff Gmail address
   - `role` → `warden`
3. Go to **Access Control** page in the app
4. Toggle their permissions as needed

---

## Custom Domain Setup (Optional)

If you have a domain registered with Hostinger/GoDaddy/Namecheap:

1. Go to your domain registrar → DNS settings
2. Add a CNAME record:
   - Name: `@` or `www`
   - Value: `YOUR_GITHUB_USERNAME.github.io`
3. In GitHub repo → Settings → Pages → Custom domain → Enter your domain
4. Add domain to Firebase authorized domains

---

## Deploying Updates

Whenever you make changes:

```bash
git add .
git commit -m "your update message"
git push origin main
npm run deploy
```

---

## Android App (Optional)

To create an Android APK:

1. Go to **https://www.webintoapp.com**
2. Enter your app URL
3. App name: PGMS
4. Download the APK
5. Install on Android phone (enable "Install from unknown sources")

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank screen after deploy | Check GitHub Pages is set to gh-pages branch |
| Login not working | Add GitHub Pages domain to Firebase authorized domains |
| Data not saving | Check Firestore security rules allow write |
| Attachment upload failing | Check Cloudinary upload preset is set to "Unsigned" |
| Permission denied errors | Check Firestore rules are published |

---

## Support

Built with ❤️ by Omkar
For support or customization inquiries contact: omkarvh56@gmail.com

---

## License

This software is proprietary. Unauthorized copying, distribution or modification is prohibited.

© 2026 PGMS. All rights reserved.
