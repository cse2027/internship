# DriveHub — Minimalist Google Drive Link Storage & Resource Directory

A clean, modern, lightweight website designed for storing, organizing, and accessing Google Drive links and educational resources.

---

## 1. Project Overview & Architecture

DriveHub is designed for maximum simplicity, performance, and ease of deployment:
- **No Subfolders**: All application files reside directly in the root directory.
- **No Separate Login/Admin Pages**: An **Admin** button in the top right corner opens a lightweight **popup modal** directly on the homepage.
- **From the Popup**: You can authenticate using `cse` / `n2027`, add new Google Drive links with live preview, and manage existing resources without leaving the page.
- **Card-Based UI**: Stored links are displayed as cards with:
  - **Open**: Opens the file, folder, Doc, Sheet, or Slide in Google's native viewer.
  - **Download**: Direct file download endpoint (`uc?export=download&id=...`) or Docs/Sheets export endpoints.
- **Search, Filter & Sort**: Search by title or description, filter by category chips, and sort newest/oldest/alphabetically.
- **Instructions**: A built-in guide to Word document fonts, headings, page layout, and figure requirements.

---

## 2. Flat File Structure (Zero Subdirectories)

```text
├── index.html            # Main homepage with card grid, search, filters & admin popup
├── style.css             # Unified single-file styling for cards, toolbar, and modals
├── app.js                # Consolidated application logic (Drive parsing, Supabase, UI)
├── schema.sql            # Complete Supabase PostgreSQL schema with RLS & sample data
├── database_schema.md    # Detailed schema documentation and security policies
├── README.md             # Complete project guide
├── .env.example          # Template for Supabase credentials
├── .gitignore            # Protects secrets and temporary files
├── package.json          # Node scripts (start, dev)
└── server.js             # Lightweight zero-dependency dev server with .env injection
```

---

## 3. How to Run Locally

### Step 1: Start the Server
Run the built-in, zero-dependency Node server:
```bash
npm start
```
or:
```bash
node server.js
```
The application will be available at:
`http://localhost:3000`

*(You can also simply open `index.html` in any web browser or use VSCode Live Server!)*

---

## 4. Admin Workflow (Popup Modal)

1. Open the homepage at `http://localhost:3000`.
2. In the top right corner, click the **Admin** button.
3. A popup modal opens on the page:
   - **Username**: `cse`
   - **Password**: `n2027`
4. Click **Sign In**.
5. The popup immediately reveals the **Add New Resource** form:
   - **Resource Title**: e.g., `Distributed Systems Notes`
   - **Category**: e.g., `Computer Science`
   - **Google Drive URL**: Paste any sharing link (file, folder, Docs, Sheets, Slides)
   - **Live Preview**: Automatically detects file ID and direct download capabilities
   - **Short Description**: Brief notes
6. Click **Publish Link**.
7. The new resource card appears immediately on the homepage without refreshing!

---

## 5. Google Drive Open & Download Mechanics

[`app.js`](file:///w:/College%20Trash/TEMPLATES/app.js) contains an integrated URL parser:

| Resource Type | Open Action | Download Action |
| :--- | :--- | :--- |
| **Standard File** | Native Google Drive Preview | `https://drive.google.com/uc?export=download&id={ID}` |
| **Google Doc** | Google Docs Web Editor | Exported directly as PDF |
| **Google Sheet** | Google Sheets Web Editor | Exported directly as Microsoft Excel (`.xlsx`) |
| **Google Slides** | Google Slides Web Editor | Exported directly as PDF Presentation |
| **Drive Folder** | Opens Google Drive Folder | Prompts user and directs to Drive's native "Download All" |

---

## 6. Supabase Database Setup (Optional Live Sync)

DriveHub works out-of-the-box in local demo mode, and can be connected to Supabase for live cloud persistence:

1. Create a free project on [Supabase](https://supabase.com).
2. Run the SQL script from [`schema.sql`](file:///w:/College%20Trash/TEMPLATES/schema.sql) in your **Supabase SQL Editor**.
3. In the homepage top right corner, click the **Settings (gear)** icon and enter your `SUPABASE_URL` and `SUPABASE_ANON_KEY`, or add them to your `.env` file:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

---

## License
MIT License.
