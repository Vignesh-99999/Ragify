## RAGify – Student & Researcher PDF Study Assistant

RAGify is a full‑stack application that lets users upload PDFs, chat with them using a RAG (Retrieval‑Augmented Generation) backend, and (for paid users) use an AI research assistant for rewriting, brainstorming, and summarising content.

The project is split into:
- **Angular frontend** (`src`, `public`)
- **Node/Express auth + payments backend** (`backend`)
- **Python RAG backend** (`rag-backend`)
- **Local Embedding Model** (`Quora_stsb_finetune`)

---

### Features

- **Authentication**
  - Phone/password login for users, email/password for admins
  - Google OAuth login for users
  - Email OTP flows for login and password reset

- **Plans & Roles**
  - **Student (free)** — role: `user`
    - Max **1 PDF upload / day**
    - Max **5 RAG queries / day**
    - Full access to PDF chatbot (Q&A, summaries, flashcards, MCQs)
    - **AI research assistant locked** (shows lock + upgrade modal in navbar)
  - **Researcher (paid)** — role: `researcher`
    - **Unlimited** PDF uploads
    - **Unlimited** RAG queries
    - Access to `/assistant` + `/research-assistant` endpoint
  - **Admin** — role: `admin`, with separate admin dashboard

- **Chatbot (RAG)**
  - Upload PDFs (stored in MongoDB, indexed in Pinecone)
  - Chat with the document (Q&A)
  - Generate summaries, flashcards, and MCQs

- **AI Research Assistant**
  - Separate workspace for:
    - Rewrite (academic style)
    - Brainstorm ideas
    - Summarise text
  - Powered by Hugging Face Inference API (`/research-assistant` in `rag-backend/app.py`)
  - Only available to **researcher** role

- **Payments**
  - Stripe Checkout integration in `backend/controllers/payment.controller.js`
  - Plans configured in Angular `PaymentComponent`
  - On success:
    - User is redirected to `/payment-success`
    - Backend route `/api/auth/upgrade-to-researcher` upgrades the user’s role and returns a new JWT

---

### Tech Stack

- **Frontend**: Angular 19+ (standalone components, Vite builder)
- **Backend (Auth & Payments)**: Node.js, Express, Mongoose, Passport.js, Stripe, Nodemailer
- **RAG Backend**: Flask, PyMongo, Pinecone, Hugging Face Inference API
- **Database**: MongoDB
- **Embeddings**: Fine-tuned Sentence-BERT model (`Quora_stsb_finetune`)

---

### Project Structure

- **`/src` & `/public`**: Angular 19 application containing frontend standalone components, views, and styles.
- **`/backend`**: Node.js REST API handling JWT-based authentication, user roles, Google OAuth, and Stripe payments.
- **`/rag-backend`**: Python/Flask application managing the uploading and chunking of PDFs, pinecone vector indexing, and interactions with Hugging Face Inference API.
- **`/Quora_stsb_finetune`**: Contains a custom fine-tuned local Sentence-Transformers model weights for semantic similarity and text embeddings.
- **`run-project.bat`**: A convenient batch script to spin up the entire application stack.

---

### Prerequisites

- Node.js (LTS)
- npm
- Python 3.10+
- MongoDB instance (local or hosted)
- Pinecone account + index
- Stripe account (for payments)
- Hugging Face API key (for research assistant)

---

### Environment Variables

#### Node/Express backend (`backend/.env`)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/mean_auth
JWT_SECRET=your_jwt_secret

EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

#### Python RAG backend (`rag-backend/.env`)

```env
MONGO_URI=mongodb://localhost:27017/mean_auth
JWT_SECRET=your_jwt_secret   # must match backend JWT_SECRET

PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX_NAME=...

HF_API_KEY=hf_xxx
HF_ASSISTANT_MODEL=meta-llama/Llama-3.2-1B-Instruct
```

> Ensure `JWT_SECRET` is **identical** in both backends so tokens issued by Node are accepted by Flask.

---

### Install & Run

#### 1. Install root / Angular dependencies

```bash
cd MainProject
npm install
```

#### 2. Run Angular frontend

```bash
npm run start
# or: ng serve
```

App runs at `http://localhost:4200`.

#### 3. Install & run Node backend

```bash
cd backend
npm install
npm run start   # or: node server.js / nodemon server.js
```

Backend runs at `http://localhost:5000`.

#### 4. Install & run Python RAG backend

```bash
cd rag-backend
pip install -r requirements.txt
python app.py
```

RAG backend runs at `http://localhost:5001`.

---

### Student vs Researcher Logic (Summary)

- **Role storage**
  - Mongoose `User` schema has `role: 'user' | 'researcher' | 'admin'`.
  - JWT payload includes `{ id, role }`.

- **Limits enforced in Flask (`rag-backend/app.py`)**
  - Helper `is_student()` checks `g.user_role === 'user'`.
  - `/upload-pdf`:
    - For students, counts documents in `pdf_collection` with `uploaded_at` in today’s UTC range.
    - If count ≥ 1 → returns 403 with “daily PDF upload limit reached” message.
  - `/rag`:
    - For students, aggregates `conversation_collection.messages` where:
      - `role == 'user'`
      - `created_at` in today’s UTC range.
    - If count ≥ 5 → returns 403 with “daily query limit reached” message.
  - `/research-assistant`:
    - Returns 403 for students with a message that assistant is researcher‑only.

- **Upgrade flow**
  - Stripe success URL → `/payment-success` (frontend).
  - `PaymentSuccessComponent` calls `AuthService.upgradeToResearcher()`:
    - Hits `POST /api/auth/upgrade-to-researcher` on Node backend.
    - Backend sets `user.role = 'researcher'` and returns a **new JWT** + user info.
    - Frontend stores `token`, `role`, `userName`, `userEmail`, then redirects to `/home`.

- **UI differences**
  - Home navbar:
    - AI Assistant button shows a **LOCKED** badge for non‑researchers.
    - Clicking opens an **upgrade modal** instead of navigating to `/assistant`.
  - `/assistant` route:
    - Checks `localStorage.role === 'researcher'`; others are redirected to `/home`.

---

### Development Notes

- Cached Angular build files in `.angular/cache` are generated artifacts and normally should not be committed.
- Make sure Mongo, both backends, and the frontend are all running to exercise the full flow.
- When changing pricing or limits:
  - **Backend**: update numeric checks in `rag-backend/app.py`.
  - **Frontend**: update copy in `home.component.html` and `payment.component.ts`.

# MainProject

