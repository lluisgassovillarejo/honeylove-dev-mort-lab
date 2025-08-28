/**
 * Cart Progress Bar Component
 * Renders dynamic progress UI with milestone messaging
 * Handles both variant A (shipping only) and variant B (shipping + items)
 * True Classic-inspired design with Tailwind CSS
 */

import {useEffect, useState} from 'react';
import type {CartPerksState, CartPerksVariant} from '~/lib/cartPerks';
import {
  useCartPerksController,
  getProgressMessage,
  getAchievementMessage,
  calculateProgressPercentage,
} from '~/lib/cartPerks';
import {useFeatureIsValue} from '~/lib/growthbook';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {OptimisticCart} from '@shopify/hydrogen';

interface CartProgressBarProps {
  cart: OptimisticCart<CartApiQueryFragment | null>;
}

export function CartProgressBar({cart}: CartProgressBarProps) {
  // Get cart perks variant from feature flag
  const baseVariant = useFeatureIsValue<CartPerksVariant>(
    'cart_perks_variant',
    'A',
  );

  // State for URL override
  const [variant, setVariant] = useState<CartPerksVariant>(() => {
    // Initialize with URL parameter if available, otherwise use baseVariant
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlVariant = urlParams.get('cart_variant') as CartPerksVariant;
      if (urlVariant === 'A' || urlVariant === 'B') {
        return urlVariant;
      }
    }
    return baseVariant;
  });

  // Update variant when baseVariant changes (but not on every render)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlVariant = urlParams.get('cart_variant') as CartPerksVariant;

      if (urlVariant === 'A' || urlVariant === 'B') {
        if (variant !== urlVariant) {
          setVariant(urlVariant);
        }
      } else if (variant !== baseVariant) {
        setVariant(baseVariant);
      }
    }
  }, [baseVariant, variant]);

  // Get cart perks state from controller
  const cartPerksState = useCartPerksController(cart, variant);

  // Track recent achievements for success messages
  const [recentAchievements, setRecentAchievements] = useState<string[]>([]);

  // Check for new achievements and show success messages
  useEffect(() => {
    const achievedMilestones = cartPerksState.milestones
      .filter((milestone) => milestone.achieved)
      .map((milestone) => getAchievementMessage(milestone))
      .filter((message) => message);

    // Only update if achievements actually changed
    const hasNewAchievements = achievedMilestones.some(
      (msg) => !recentAchievements.includes(msg),
    );

    if (hasNewAchievements && achievedMilestones.length > 0) {
      setRecentAchievements(achievedMilestones);

      // Clear achievements after 3 seconds
      setTimeout(() => {
        setRecentAchievements([]);
      }, 3000);
    }
  }, [
    cartPerksState.milestones
      .map((m) => `${m.type}-${m.threshold}-${m.achieved}`)
      .join(','),
  ]); // Stable dependency

  // Only hide if cart is completely empty
  const cartHasItems = (cart?.totalQuantity || 0) > 0;
  if (!cartHasItems && recentAchievements.length === 0) {
    return null;
  }

  const progressPercentage = calculateProgressPercentage(cartPerksState);
  const currency = cart?.cost?.subtotalAmount?.currencyCode || 'EUR';
  const progressMessage = getProgressMessage(cartPerksState, currency);

  return (
    <div className="cart-progress-container mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Variant indicator for debugging */}
      <div className="mb-2 text-xs text-gray-500">
        Cart Perks: Variant {variant} | Subtotal: {currency}{' '}
        {cartPerksState.subtotal.toFixed(2)}
      </div>

      {/* Achievement messages */}
      {recentAchievements.map((message, index) => (
        <div
          key={`achievement-${index}`}
          className="mb-3 p-3 bg-green-100 border border-green-300 rounded-md text-green-800 text-sm font-medium animate-pulse"
        >
          {message}
        </div>
      ))}

      {/* Progress section - always show if cart has items */}
      {cartHasItems && (
        <>
          {/* Progress message */}
          {progressMessage ? (
            <div className="mb-3 text-sm font-medium text-gray-700 text-center">
              {progressMessage}
            </div>
          ) : cartPerksState.allAchieved ? (
            <div className="mb-3 text-sm font-medium text-green-600 text-center">
              {variant === 'A'
                ? 'Free Shipping unlocked! 🚚'
                : '🎉 All milestones achieved!'}
            </div>
          ) : null}

          {/* Progress bar container */}
          <div className="relative">
            {/* Background bar */}
            <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
              {/* Progress fill with gradient */}
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-in-out"
                style={{width: `${progressPercentage}%`}}
              />
            </div>

            {/* Progress percentage indicator */}
            <div className="mt-2 text-xs text-gray-500 text-center">
              {progressPercentage.toFixed(0)}% complete
            </div>
          </div>

          {/* Enhanced Milestone indicators */}
          {variant === 'B' && (
            <div className="mt-4">
              <div className="text-xs text-gray-600 mb-2 font-medium">
                Perks Progress:
              </div>
              <div className="space-y-2">
                {cartPerksState.milestones.map((milestone, index) => (
                  <div
                    key={`milestone-${index}`}
                    className={`flex items-center justify-between p-2 rounded-md ${
                      milestone.achieved
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          milestone.achieved ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <div className="text-sm">
                        {milestone.type === 'shipping'
                          ? 'Free Shipping'
                          : milestone.title || 'Free Item'}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        milestone.achieved ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {currency} {milestone.threshold}
                      {milestone.achieved ? ' ✓' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variant A simple milestone */}
          {variant === 'A' && (
            <div className="mt-4">
              <div className="flex items-center justify-between p-2 rounded-md bg-blue-50 border border-blue-200">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      cartPerksState.allAchieved
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                  <div className="text-sm">Free Shipping</div>
                </div>
                <div
                  className={`text-xs font-medium ${
                    cartPerksState.allAchieved
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {currency} 50 {cartPerksState.allAchieved ? ' ✓' : ''}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* All milestones achieved state */}
      {cartPerksState.allAchieved && cartPerksState.milestones.length > 0 && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm text-center font-medium">
          {variant === 'A'
            ? '🚚 Free shipping unlocked! Enjoy your discount!'
            : '🎉 All perks unlocked! Enjoy free shipping and your free items!'}
        </div>
      )}

      {/* Debug information (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-2 text-xs text-gray-500">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-1 p-2 bg-gray-100 rounded text-[10px] overflow-x-auto">
            {JSON.stringify(
              {
                variant,
                subtotal: cartPerksState.subtotal,
                hasProgress: cartPerksState.hasProgress,
                allAchieved: cartPerksState.allAchieved,
                milestones: cartPerksState.milestones.map((m) => ({
                  type: m.type,
                  threshold: m.threshold,
                  achieved: m.achieved,
                  remaining: m.remaining,
                })),
                nextMilestone: cartPerksState.nextMilestone
                  ? {
                      type: cartPerksState.nextMilestone.type,
                      threshold: cartPerksState.nextMilestone.threshold,
                      remaining: cartPerksState.nextMilestone.remaining,
                    }
                  : null,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * Mini progress bar for use in cart summary or aside
 */
export function CartProgressBarMini({cart}: CartProgressBarProps) {
  // Get cart perks variant from feature flag
  const baseVariant = useFeatureIsValue<CartPerksVariant>(
    'cart_perks_variant',
    'A',
  );

  // State for URL override (same as main component)
  const [variant, setVariant] = useState<CartPerksVariant>(() => {
    // Initialize with URL parameter if available, otherwise use baseVariant
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlVariant = urlParams.get('cart_variant') as CartPerksVariant;
      if (urlVariant === 'A' || urlVariant === 'B') {
        return urlVariant;
      }
    }
    return baseVariant;
  });

  // Update variant when baseVariant changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlVariant = urlParams.get('cart_variant') as CartPerksVariant;

      if (urlVariant === 'A' || urlVariant === 'B') {
        if (variant !== urlVariant) {
          setVariant(urlVariant);
        }
      } else if (variant !== baseVariant) {
        setVariant(baseVariant);
      }
    }
  }, [baseVariant, variant]);

  const cartPerksState = useCartPerksController(cart, variant);

  // Only hide if cart is completely empty
  const cartHasItems = (cart?.totalQuantity || 0) > 0;
  if (!cartHasItems) return null;

  const progressPercentage = calculateProgressPercentage(cartPerksState);
  const currency = cart?.cost?.subtotalAmount?.currencyCode || 'EUR';
  const progressMessage = getProgressMessage(cartPerksState, currency);

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded border">
      {/* Variant indicator for debugging */}
      <div className="mb-1 text-xs text-gray-400">
        Cart Perks: Variant {variant}
      </div>

      {/* Achievement or progress message */}
      {progressMessage ? (
        <div className="text-xs text-gray-600 mb-2">{progressMessage}</div>
      ) : cartPerksState.allAchieved ? (
        <div className="text-xs text-green-600 mb-2 font-medium">
          {variant === 'A'
            ? 'Free Shipping unlocked! 🚚'
            : '🎉 All milestones achieved!'}
        </div>
      ) : null}

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
          style={{width: `${progressPercentage}%`}}
        />
      </div>

      {/* Progress percentage */}
      <div className="text-xs text-gray-500 text-center">
        {progressPercentage.toFixed(0)}% complete
      </div>

      {/* Enhanced milestones for Variant B */}
      {variant === 'B' && cartPerksState.milestones.length > 1 && (
        <div className="mt-2 space-y-1">
          {cartPerksState.milestones.map((milestone, index) => (
            <div
              key={`mini-milestone-${index}`}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    milestone.achieved ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span
                  className={
                    milestone.achieved ? 'text-green-600' : 'text-gray-500'
                  }
                >
                  {milestone.type === 'shipping'
                    ? 'Free Shipping'
                    : milestone.title}
                </span>
              </div>
              <span
                className={`${milestone.achieved ? 'text-green-600' : 'text-gray-500'} font-medium`}
              >
                {currency} {milestone.threshold}
                {milestone.achieved ? ' ✓' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
