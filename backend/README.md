# SecureAttend Backend (Node.js & Express)

Express + MongoDB API powering the SecureAttend multi-layer attendance verification system.

## Setup

```bash
cd backend
cp .env.example .env
# Edit .env and set MONGODB_URI
npm install
npm run dev
```

API runs at `http://localhost:8080/api`

## Health Check

```
GET /api/health
```

## Stack

- **Express** – REST API
- **Mongoose** – MongoDB (same collections: `users`, `classes`, `sessions`, `attendance`)
- **bcryptjs** – password hashing
- **qrcode** – QR code generation

## Deployment

Deploy as a standard Node.js web service (e.g. Render, Railway, Vercel).
Set `MONGODB_URI` in your hosting environment variables.
Build command: `npm install`
Start command: `node src/server.js`
