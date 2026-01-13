# FreshVeg Admin Panel (React + Vite)

This admin panel is generated **strictly from your backend routes/validations** (Express + Sequelize + Postgres).

## Tech
- React + Vite (JavaScript only)
- React Router
- TanStack Query
- Axios (token attach + refresh on 401)
- React Hook Form + Zod
- TailwindCSS + shadcn-style UI components (Radix primitives)

## Setup

```bash
cd freshveg-admin-panel
cp .env.example .env
npm install
npm run dev
```

### Env
- `VITE_API_BASE_URL` → your backend base url (e.g. `http://localhost:10000`)
- `VITE_APP_NAME` → optional

## Implemented end-to-end modules
✅ Auth OTP Login (Send → Verify)  
✅ Categories (Ops) CRUD + Toggle Active  
✅ Products (Admin create/update/active) + List + Detail

## Backend response format assumed
Backend returns:
```json
{ "success": true, "status": 200, "data": {...}, "error": null, "message": null }
```
Errors:
```json
{ "success": false, "status": 400, "data": null, "error": { "code": "...", "message": "...", "details": ... }, "message": null }
```

## Notes / Backend Gaps (admin needs)
These are **not invented** — they are missing from your current backend:
1) **Admin users list/get**
   - Present: `POST /v1/admin/users`, `PUT /v1/admin/users/:id/roles`
   - Missing: `GET /v1/admin/users` and `GET /v1/admin/users/:id`

2) **Admin product list that includes inactive products**
   - `GET /v1/products` returns only `is_active=true`
   - `GET /v1/products/:id` requires `is_active=true`
   - For admin you likely need:
     - `GET /v1/admin/product?include_inactive=true`
     - `GET /v1/admin/product/:id`

3) **Dashboard KPIs**
   - No endpoint for today orders/revenue/etc.

4) **Product pack admin payload mismatch (BUG)**
   - Validation expects `mrp_paise`, `selling_price_paise`
   - Service code references `payload.mrp`, `payload.price` in some places.
   - Admin UI currently shows packs as read-only in product detail to avoid breaking.

If you want, I can generate **minimal backend additions** for the missing endpoints with controller/service shapes matching your codebase style.
