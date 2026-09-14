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

Dockerfile included. Update `render.yaml` points to this directory.

Set `MONGODB_URI` in your hosting environment variables.
