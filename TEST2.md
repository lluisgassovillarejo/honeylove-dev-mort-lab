# Exercise 2 — Cart Perks Experiment (3 Variants)

**Goal:** Implement three cart "perk" experiences controlled by a feature flag. Depending on the returned test variant from `useFeatureIsValue`, the cart should show a progress bar and apply perks at thresholds.

---

## Variants & thresholds

Using the value from `useFeatureIsValue('cart_perks_variant')`, implement:

- **Variant A:** Free shipping when cart subtotal ≥ **$50**.
- **Variant B:** Free shipping ≥ **$50**, free **Black Sunnies** ≥ **$100**, and free **Front-pack** ≥ **$150**.

**Product links (local):**

- Black Sunnies: `http://localhost:3000/products/black-sunnies?Title=Default+Title`
- Front-pack: `http://localhost:3000/products/frontpack?Color=Green`

**UI inspiration:** True Classic progress bar. Use copy like:
- "You're $12 away from Free Shipping"
- "Black Sunnies unlocked! Added to cart"
- "Front-pack unlocked! Added to cart"

---

## Required cart attributes & line attributes

- When Free Shipping is unlocked, set cart attribute:  
  - `__FREE_SHIPPING: "true"`  
  (Unset or `"false"` when below threshold.)

- Free items must be added with line item attribute:  
  - `_FREE_ITEM: "true"`

**References:**  
- https://shopify.dev/docs/storefronts/headless/hydrogen/cart/attributes  
- https://shopify.dev/docs/storefronts/headless/hydrogen/cart/manage

---

## Behavior requirements

### 1. Progress bar & milestones

- Show a progress bar without milestones for the active variant only.
- Calculate "amount remaining" based on cart subtotal (exclude shipping/taxes).
- Update live as cart changes.

### 2. Free shipping flag

- At subtotal ≥ $50 → `__FREE_SHIPPING: "true"`.
- Below $50 → remove or set to `"false"`.

### 3. Free items add/remove

- Auto-add freebies at thresholds:
  - Variant B: Black Sunnies ≥ $100
  - Variant C: Black Sunnies ≥ $100, Front-pack ≥ $150
- Auto-remove if subtotal drops below threshold. Only remove `_FREE_ITEM: true` lines.

### 4. Idempotency

- Prevent duplicate free items.
- Distinguish between paid and free lines.

---

## Hooking up the experiment

Assume usage like:

```ts
const variant = useFeatureIsValue<'A' | 'B'>('cart_perks_variant', 'A');
```

- Fall back to 'A' if unavailable.
- Use variant value to decide thresholds.

---

## Implementation outline (pseudo-code)

```ts
const VARIANTS = {
  A: [{ threshold: 50, type: 'shipping' }],
  B: [
    { threshold: 50, type: 'shipping' },
    { threshold: 100, type: 'freeItem', handle: 'black-sunnies' },
    { threshold: 150, type: 'freeItem', handle: 'frontpack' },
  ],
};

function useCartPerksController(cart) {
  const variant = useFeatureIsValue('cart_perks_variant', 'A');
  const milestones = VARIANTS[variant];

  // Free shipping
  const hasFreeShipping = cart.subtotal >= 50;
  setCartAttribute('__FREE_SHIPPING', hasFreeShipping ? 'true' : 'false');

  // Free items
  for (const m of milestones) {
    if (m.type !== 'freeItem') continue;
    const eligible = cart.subtotal >= m.threshold;
    const hasFreeLine = cart.lines.some(
      (l) =>
        l.merchandise?.product?.handle === m.handle &&
        l.attributes?.some(
          (a) => a.key === '_FREE_ITEM' && a.value === 'true'
        )
    );
    if (eligible && !hasFreeLine) {
      addFreeItem(m.handle);
    } else if (!eligible && hasFreeLine) {
      removeFreeItem(m.handle);
    }
  }

  return { milestones, hasFreeShipping };
}
```

---

## Edge cases to handle

- Subtotal exactly equals a threshold (unlock).
- Customer removes a freebie → do not force re-add, but offer politely.

---

## Acceptance criteria

- **Variant A:** Free shipping unlocks ≥ $50; attribute set correctly.
- **Variant B:** Adds/removes Sunnies and Front-pack at $100 / $150.
- Progress bar updates and copy reflects remaining amount.
- Responsive.

---

## What to submit

- Code changes (branch or PR).
- A note covering:
  - How you wired the flag and thresholds.
  - How you managed attributes and free lines.
  - Any assumptions (e.g., $0 pricing vs display-only).
