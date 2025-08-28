import {type MetaFunction, useLoaderData} from 'react-router';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {
  data,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type HeadersFunction,
} from '@shopify/remix-oxygen';
import {CartMain} from '~/components/CartMain';
import {
  useCartPerksController,
  getRequiredFreeItems,
  shouldHaveFreeShipping,
  type CartPerksVariant,
} from '~/lib/cartPerks';
import {
  processFreeItems,
  validateFreeItemOperations,
} from '~/lib/freeItemManager';
import {getSessionFeatureValueServer} from '~/lib/growthbook';

export const meta: MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

export async function action({request, context}: ActionFunctionArgs) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;

      // User inputted discount code
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;

      // User inputted gift card code
      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];

      // Combine gift card codes already applied on cart
      giftCardCodes.push(...inputs.giftCardCodes);

      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
  const {cart: cartResult, errors, warnings} = result;

  // Cart Perks: Process cart perks after any cart operation
  // Get fresh cart data to ensure we have complete cart structure
  const freshCart = await cart.get();
  await processCartPerks(freshCart || cartResult, context, action, request);

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
}

export async function loader({context, request}: LoaderFunctionArgs) {
  const {cart} = context;
  const cartData = await cart.get();

  // Process cart perks on page load as well
  await processCartPerks(cartData, context, 'PageLoad', request);

  return cartData;
}

/**
 * Process cart perks after any cart operation
 * Handles cart attributes and free item management
 */
async function processCartPerks(
  cartResult: any,
  context: any,
  action: string,
  request: Request,
) {
  try {
    // Skip processing for certain actions to prevent infinite loops
    if (action === 'CartPerksUpdate') {
      return;
    }

    if (!cartResult || !context) {
      return;
    }

    const {cart, storefront} = context;

    // Get cart perks variant from session or URL
    let variant =
      (getSessionFeatureValueServer(
        context,
        'cart_perks_variant',
      ) as CartPerksVariant) || 'A';

    // Check for URL override for testing
    const url = new URL(request.url);
    const urlVariant = url.searchParams.get('cart_variant') as CartPerksVariant;
    if (urlVariant === 'A' || urlVariant === 'B') {
      variant = urlVariant;
    }

    // Calculate cart perks state using consistent subtotal calculation
    const currency = cartResult?.cost?.subtotalAmount?.currencyCode || 'EUR';
    const cartPerksState = calculateCartPerksState(cartResult, variant);

    // Use the consistent subtotal from our calculation
    const subtotal = cartPerksState.subtotal;

    // Log key cart info for server debugging
    console.log(
      `[Cart Perks Server] Processing: ${action}, Variant: ${variant}, Subtotal: ${currency} ${subtotal.toFixed(2)}`,
    );

    // Determine required cart attributes
    const shouldHaveShipping = shouldHaveFreeShipping(cartPerksState);
    const currentShippingAttr = cartResult?.attributes?.find(
      (attr: any) => attr.key === '__FREE_SHIPPING',
    );

    // Update cart attributes if needed
    let needsAttributeUpdate = false;

    if (shouldHaveShipping && currentShippingAttr?.value !== 'true') {
      needsAttributeUpdate = true;
    } else if (!shouldHaveShipping && currentShippingAttr?.value === 'true') {
      needsAttributeUpdate = true;
    }

    // Process free items for Variant B
    const requiredFreeItems = getRequiredFreeItems(cartPerksState);

    let freeItemOperations;
    if (requiredFreeItems.length > 0) {
      freeItemOperations = await processFreeItems(
        requiredFreeItems,
        cartResult,
        subtotal,
        storefront,
      );

      const validation = validateFreeItemOperations(freeItemOperations);
      if (!validation.valid) {
        console.error(
          '[Cart Perks Server] Free item operations validation failed:',
          validation.errors,
        );
        return;
      }
    }

    // Execute cart updates
    if (needsAttributeUpdate) {
      try {
        const attributes = [
          {
            key: '__FREE_SHIPPING',
            value: shouldHaveShipping ? 'true' : 'false',
          },
        ];

        await cart.updateAttributes(attributes);
      } catch (error) {
        console.error(
          '[Cart Perks Server] Failed to update cart attributes:',
          error,
        );
      }
    }

    // Add free items if needed
    if (freeItemOperations && freeItemOperations.itemsToAdd.length > 0) {
      try {
        const linesToAdd = freeItemOperations.itemsToAdd.map(
          (item) => item.line,
        );
        await cart.addLines(linesToAdd);
      } catch (error) {
        console.error('[Cart Perks Server] Failed to add free items:', error);
      }
    }

    // Remove free items if needed
    if (freeItemOperations && freeItemOperations.itemsToRemove.length > 0) {
      try {
        await cart.removeLines(freeItemOperations.itemsToRemove);
      } catch (error) {
        console.error(
          '[Cart Perks Server] Failed to remove free items:',
          error,
        );
      }
    }

    // Log completion for major operations
    if (
      needsAttributeUpdate ||
      (freeItemOperations &&
        (freeItemOperations.itemsToAdd.length > 0 ||
          freeItemOperations.itemsToRemove.length > 0))
    ) {
      console.log(
        `[Cart Perks Server] Completed: ${needsAttributeUpdate ? 'attrs ' : ''}${freeItemOperations ? `+${freeItemOperations.itemsToAdd.length} -${freeItemOperations.itemsToRemove.length} items` : ''}`,
      );
    }
  } catch (error) {
    console.error(
      '[Cart Perks Server] Processing error:',
      error instanceof Error ? error.message : error,
    );
    // Don't throw - we don't want cart perks to break normal cart functionality
  }
}

/**
 * Calculate subtotal excluding free items (server-side version)
 * CRITICAL: Free items must NOT count toward new thresholds
 */
function calculateSubtotalExcludingFreeItems(cartResult: any): number {
  if (!cartResult?.lines?.nodes) return 0;

  return cartResult.lines.nodes.reduce((total: number, line: any) => {
    // Check if this is a free item
    const isFreeItem = line.attributes?.some(
      (attr: any) => attr.key === '_FREE_ITEM' && attr.value === 'true',
    );

    if (isFreeItem) {
      return total; // Do NOT count free items toward subtotal
    }

    const price = parseFloat(line.cost?.totalAmount?.amount || '0');
    return total + price;
  }, 0);
}

/**
 * Server-side version of cart perks state calculation
 * (Simplified version without React hooks)
 */
function calculateCartPerksState(cartResult: any, variant: CartPerksVariant) {
  // CRITICAL FIX: Calculate subtotal excluding free items
  const subtotal = calculateSubtotalExcludingFreeItems(cartResult);

  // Import milestone configurations (simplified)
  const VARIANTS = {
    A: [{threshold: 50, type: 'shipping' as const}],
    B: [
      {threshold: 50, type: 'shipping' as const},
      {
        threshold: 100,
        type: 'freeItem' as const,
        handle: 'black-sunnies',
        title: 'Black Sunnies',
      },
      {
        threshold: 150,
        type: 'freeItem' as const,
        handle: 'frontpack',
        title: 'Front Pack',
        variant: 'green',
      },
    ],
  };

  const milestones = VARIANTS[variant] || VARIANTS.A;
  const milestoneProgress = milestones.map((milestone) => ({
    ...milestone,
    achieved: subtotal >= milestone.threshold,
    remaining: Math.max(0, milestone.threshold - subtotal),
    eligible: subtotal >= milestone.threshold,
  }));

  return {
    variant,
    subtotal,
    milestones: milestoneProgress,
    nextMilestone: milestoneProgress.find((m) => !m.achieved),
    hasProgress: subtotal > 0 && milestoneProgress.some((m) => !m.achieved),
    allAchieved: milestoneProgress.every((m) => m.achieved),
  };
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();

  return (
    <div className="cart">
      <h1>Cart</h1>
      <CartMain layout="page" cart={cart} />
    </div>
  );
}
