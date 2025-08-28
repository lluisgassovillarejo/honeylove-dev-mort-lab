# Exercise 1 — "3-Pack" CTA on Men's T-Shirt PDP

**Goal:** Add a second call-to-action (CTA) next to the primary "Add to cart" on the Men's T-Shirt product page to add a discounted 3-pack.

**Page to modify (local dev):**  
`http://localhost:3000/products/men-t-shirt?Size=Small&Color=Green`

---

## What you'll build

1. A secondary CTA labeled **"3-Pack"** with a small pill above it reading **"Save 20%"**.
2. Clicking the "3-Pack" CTA adds **three** Men's T-Shirts to the cart instead of one.
3. Each added line must include a line item attribute:  
   - `_BUNDLE_NAME: "men-t-shirt"`
4. The 3-pack should represent a **20% discount** for the set.  
   - For this exercise, you **don't need** to implement real discounting logic via Shopify Functions.  
   - It's sufficient to tag the lines and (optionally) show a "bundle savings" calculation in the cart UI.

---

## Design inspiration

Use the look/feel of the "multi-pack" style CTAs (e.g., stacked label, bold value text) similar to what you might see on trueclassic. Keep it clean and unobtrusive next to the primary Add to Cart.

---

## Tech & references (Hydrogen / Storefront API)

- **Hydrogen cart docs (adding lines, line attributes):**  
  https://shopify.dev/docs/storefronts/headless/hydrogen/cart/manage

**Example shape for adding 3 lines (pseudo-code):**

```ts
await cartLinesAdd([
  {
    merchandiseId: variantIdFromCurrentPDP,
    quantity: 1,
    attributes: [{ key: "_BUNDLE_NAME", value: "men-t-shirt" }],
  },
  {
    merchandiseId: variantIdFromCurrentPDP,
    quantity: 1,
    attributes: [{ key: "_BUNDLE_NAME", value: "men-t-shirt" }],
  },
  {
    merchandiseId: variantIdFromCurrentPDP,
    quantity: 1,
    attributes: [{ key: "_BUNDLE_NAME", value: "men-t-shirt" }],
  },
]);
```

---

## Data assumptions & guardrails

- The PDP URL includes selected Size and Color query params. Resolve these to a specific variant ID before adding.
- If variant resolution fails, the CTA should be disabled with a clear tooltip/message.
- If the user clicks multiple times quickly, debounce or show a loading state to prevent duplicate adds.

---

## Tasks

### 1. UI

- Place a "3-Pack" button next to the primary "Add to cart".
- Add a small pill above "3-Pack" that reads "Save 20%".
- States: default, hover, focus, loading/disabled.

### 2. Variant resolution

- Use selected Size/Color (from URL/state) to find the correct merchandiseId (variant).

### 3. Add to cart handler

- Add **three** lines for the chosen variant.
- Include `_BUNDLE_NAME: "men-t-shirt"` on each line.
- Surface success or error to the user (toast, inline, etc.).

### 4. Bundle semantics (display only)

- (Optional but appreciated) In the cart UI, visually group items that share `_BUNDLE_NAME: "men-t-shirt"` and present a "Bundle (3)" label and "Save 20%" indication.

---

## Acceptance criteria

- "3-Pack" CTA is visible on men-t-shirt PDP and matches the style spec (pill + label).
- Clicking "3-Pack" adds **exactly 3** T-Shirts with `_BUNDLE_NAME: "men-t-shirt"` in their line attributes.
- Proper loading/disabled states; no duplicate adds on double-click.
- Errors (variant not found, network, etc.) are handled gracefully and communicated.

---

## Bonus points

### 1. Multiple bundles in cart

- If a user adds multiple 3-packs, ensure they're independently grouped in the cart UI.
- Tip: add a unique `_BUNDLE_ID` UUID to each set.

### 2. Color selection for the 3-pack

- Provide a mini "bundle builder" UI with color/size selectors for each slot.
- On add, create 3 cart lines with `_BUNDLE_NAME` and a shared `_BUNDLE_ID`.

### 3. Cart display

- Group lines with the same `_BUNDLE_ID`.
- Show:
  - Group title: "Men's T-Shirt — 3-Pack"
  - Colors summary (e.g., "Green ×2, Black ×1")
  - A "Save 20%" tag for the group
- Collapsible list of the 3 lines is a plus.

---

## What to submit

- The code changes (branch or PR).
- A short note explaining:
  - Where you added the CTA and why.
  - How you resolved variants from Size/Color.
  - How you tagged lines and grouped them in cart.
  - Any tradeoffs or assumptions.
