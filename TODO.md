# TODO - AgroPlug Dashboard

- [x] Create standalone dashboard page: `agroplug-dashboard.html` (repo root)
- [x] Implement dashboard UI + logic to show:
  - [x] total app users (best-effort)
  - [x] total transactions (from `orders`)
  - [x] qualifying farmer profit (≥ ₦20,000)
  - [x] AgroPlug commission at 5% (only when profit ≥ ₦20,000)
  - [x] transactions table (buyer ↔ farmer)
- [x] Update Firestore rules to allow admin marker to read any `orders`:
  - [x] Add `/admins/{uid}` marker + `isAdmin()` helper
  - [x] Permit read/update of `/orders` when `isAdmin()`

- [ ] (Manual) Create an admin marker document in Firestore:
  - Path: `/admins/<ADMIN_UID>`
  - Data: `{ enabled: true }`
- [ ] Test in browser: open `agroplug-dashboard.html` after signing in as the admin
- [ ] If total users fails due to rules, decide whether to expose `/users` via admin rule or a separate stats doc

