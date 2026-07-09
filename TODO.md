# TODO - Buyer Orders page

- [ ] Inspect current `buyers/order.html` structure and missing main content / JS.
- [ ] Compare with existing buyer dashboard order loading logic (from `buyers/marketplace.html`).
- [ ] Add UI sections (tabs/containers) for **Recent Orders** and **Old Orders** inside `buyers/order.html`.
- [ ] Add a `buyers/order.js` (or inline script) that:
  - Authenticates buyer
  - Loads buyer orders from Firestore `orders` where `buyerId == uid`
  - Splits orders into recent vs old (e.g., by time window)
  - Renders each list with status/date/amount/product info
- [ ] Ensure existing sidebar + mobile menu + logout handler are wired on `buyers/order.html`.
- [ ] Quick sanity test: open `buyers/order.html` in browser; confirm lists render.

