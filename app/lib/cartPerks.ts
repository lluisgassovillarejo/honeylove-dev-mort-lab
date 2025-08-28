/**
 * Cart Perks Controller
 * Handles variant logic, milestone calculations, and free item detection
 * Integrates with Growthbook feature flags
 *
 * Features:
 * - Variant A: Free shipping ≥ $50
 * - Variant B: Free shipping ≥ $50 + Black Sunnies ≥ $100 + Front Pack ≥ $150
 */

import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {OptimisticCart} from '@shopify/hydrogen';

// Type definitions
export type MilestoneType = 'shipping' | 'freeItem';
export type CartPerksVariant = 'A' | 'B';

export interface Milestone {
  threshold: number;
  type: MilestoneType;
  handle?: string; // Required for freeItem type
  title?: string; // Display name for freeItem
  variant?: string; // Specific variant for freeItem (e.g., "Green")
}

export interface MilestoneProgress extends Milestone {
  achieved: boolean;
  remaining: number;
  eligible: boolean;
}

export interface CartPerksState {
  variant: CartPerksVariant;
  subtotal: number;
  milestones: MilestoneProgress[];
  nextMilestone?: MilestoneProgress;
  hasProgress: boolean;
  allAchieved: boolean;
}

// Milestone configurations for each variant
export const CART_PERKS_VARIANTS: Record<CartPerksVariant, Milestone[]> = {
  A: [{threshold: 50, type: 'shipping'}],
  B: [
    {threshold: 50, type: 'shipping'},
    {
      threshold: 100,
      type: 'freeItem',
      handle: 'black-sunnies',
      title: 'Black Sunnies',
    },
    {
      threshold: 150,
      type: 'freeItem',
      handle: 'frontpack',
      title: 'Front Pack',
      variant: 'green',
    },
  ],
};

// Message templates for progress display
export const PROGRESS_MESSAGES = {
  shipping: (remaining: number, currency: string = 'EUR') =>
    `You're ${currency} ${remaining.toFixed(2)} away from Free Shipping`,
  freeItem: (remaining: number, title: string, currency: string = 'EUR') =>
    `${currency} ${remaining.toFixed(2)} away from free ${title}`,
  achieved: {
    shipping: 'Free Shipping unlocked! 🚚',
    freeItem: (title: string) => `${title} unlocked! Added to cart 🎉`,
  },
};

/**
 * Calculate subtotal excluding free items to prevent loops
 * Free items must NOT count toward new thresholds
 */
function calculateSubtotalExcludingFreeItems(
  cart: OptimisticCart<CartApiQueryFragment | null>,
): number {
  if (!cart?.lines?.nodes) return 0;

  return cart.lines.nodes.reduce((total, line) => {
    // Check if this is a free item
    const isFreeItem = line.attributes?.some(
      (attr) => attr.key === '_FREE_ITEM' && attr.value === 'true',
    );

    if (isFreeItem) {
      return total; // Do NOT count free items toward subtotal
    }

    const price = parseFloat(line.cost?.totalAmount?.amount || '0');
    return total + price;
  }, 0);
}

/**
 * Main cart perks controller hook
 * Calculates milestone progress and provides cart perks state
 */
export function useCartPerksController(
  cart: OptimisticCart<CartApiQueryFragment | null>,
  variant: CartPerksVariant,
): CartPerksState {
  try {
    // Calculate subtotal excluding free items
    const subtotal = calculateSubtotalExcludingFreeItems(cart);
    const currency = cart?.cost?.subtotalAmount?.currencyCode || 'EUR';

    // Server-side logging only
    if (typeof window === 'undefined') {
      console.log(
        `[Cart Perks Server] Variant: ${variant}, Subtotal: ${currency} ${subtotal.toFixed(2)}`,
      );
    }

    // Get milestones for the current variant
    const milestones = CART_PERKS_VARIANTS[variant] || CART_PERKS_VARIANTS.A;

    // Calculate progress for each milestone
    const milestoneProgress: MilestoneProgress[] = milestones.map(
      (milestone) => {
        const achieved = subtotal >= milestone.threshold;
        const remaining = Math.max(0, milestone.threshold - subtotal);
        const eligible = achieved;

        const progress: MilestoneProgress = {
          ...milestone,
          achieved,
          remaining,
          eligible,
        };

        // Log milestone status on server only
        if (typeof window === 'undefined' && achieved) {
          console.log(
            `[Cart Perks Server] Milestone achieved: ${milestone.type} at $${milestone.threshold}`,
          );
        }

        return progress;
      },
    );

    // Find next unachieved milestone
    const nextMilestone = milestoneProgress.find((m) => !m.achieved);

    // Determine if we have any progress to show
    const hasProgress = subtotal > 0 && nextMilestone !== undefined;
    const allAchieved = milestoneProgress.every((m) => m.achieved);

    const state: CartPerksState = {
      variant,
      subtotal,
      milestones: milestoneProgress,
      nextMilestone,
      hasProgress,
      allAchieved,
    };

    // Log final state on server only
    if (typeof window === 'undefined' && allAchieved) {
      console.log(
        `[Cart Perks Server] All milestones achieved for variant ${variant}`,
      );
    }

    return state;
  } catch (error) {
    console.error('[Cart Perks] Error calculating state:', error);

    // Return fallback state
    return {
      variant,
      subtotal: 0,
      milestones: [],
      nextMilestone: undefined,
      hasProgress: false,
      allAchieved: false,
    };
  }
}

/**
 * Check if a specific free item is already in the cart
 */
export function hasFreeItemInCart(
  cart: OptimisticCart<CartApiQueryFragment | null>,
  handle: string,
): boolean {
  if (!cart?.lines?.nodes) return false;

  const hasItem = cart.lines.nodes.some((line) => {
    const productHandle = line.merchandise?.product?.handle;
    const isFreeItem = line.attributes?.some(
      (attr) => attr.key === '_FREE_ITEM' && attr.value === 'true',
    );
    return productHandle === handle && isFreeItem;
  });

  // Server-side logging only
  if (typeof window === 'undefined' && hasItem) {
    console.log(`[Cart Perks Server] Free item "${handle}" found in cart`);
  }
  return hasItem;
}

/**
 * Check if free shipping is currently applied to the cart
 */
export function hasFreeShippingAttribute(
  cart: OptimisticCart<CartApiQueryFragment | null>,
): boolean {
  if (!cart?.attributes) return false;

  const hasShipping = cart.attributes.some(
    (attr) => attr.key === '__FREE_SHIPPING' && attr.value === 'true',
  );

  // Server-side logging only
  if (typeof window === 'undefined' && hasShipping) {
    console.log(`[Cart Perks Server] Free shipping attribute is active`);
  }
  return hasShipping;
}

/**
 * Get progress message for the current state
 */
export function getProgressMessage(
  state: CartPerksState,
  currency: string = 'EUR',
): string {
  if (!state.hasProgress || !state.nextMilestone) {
    return '';
  }

  const {nextMilestone} = state;

  if (nextMilestone.type === 'shipping') {
    return PROGRESS_MESSAGES.shipping(nextMilestone.remaining, currency);
  }

  if (nextMilestone.type === 'freeItem' && nextMilestone.title) {
    return PROGRESS_MESSAGES.freeItem(
      nextMilestone.remaining,
      nextMilestone.title,
      currency,
    );
  }

  return '';
}

/**
 * Get success message when a milestone is achieved
 */
export function getAchievementMessage(milestone: MilestoneProgress): string {
  if (!milestone.achieved) return '';

  if (milestone.type === 'shipping') {
    return PROGRESS_MESSAGES.achieved.shipping;
  }

  if (milestone.type === 'freeItem' && milestone.title) {
    return PROGRESS_MESSAGES.achieved.freeItem(milestone.title);
  }

  return '';
}

/**
 * Calculate progress percentage for progress bar
 */
export function calculateProgressPercentage(state: CartPerksState): number {
  if (!state.nextMilestone || state.subtotal <= 0) {
    return state.allAchieved ? 100 : 0;
  }

  const {nextMilestone, subtotal} = state;
  const percentage = Math.min(100, (subtotal / nextMilestone.threshold) * 100);

  return percentage;
}

/**
 * Get all free items that should be in cart for current subtotal
 */
export function getRequiredFreeItems(state: CartPerksState): Milestone[] {
  return state.milestones
    .filter((m) => m.type === 'freeItem' && m.achieved && m.handle)
    .map((m) => ({
      threshold: m.threshold,
      type: m.type,
      handle: m.handle,
      title: m.title,
      variant: m.variant,
    }));
}

/**
 * Check if free shipping should be applied
 */
export function shouldHaveFreeShipping(state: CartPerksState): boolean {
  const shippingMilestone = state.milestones.find((m) => m.type === 'shipping');
  return shippingMilestone?.achieved || false;
}
