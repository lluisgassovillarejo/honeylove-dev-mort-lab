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

export const meta: MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

// Helper function to validate remaining bundles
function validateRemainingBundles(lines: any[]) {
  // Handle empty or null lines array
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return {
      hasValidBundles: false,
      totalValidBundles: 0,
      allBundleCounts: {},
    };
  }

  const bundles: Record<string, number> = {};

  // Count items per bundle ID (accounting for quantity)
  lines.forEach((line: any) => {
    if (!line || !line.attributes) return; // Skip invalid lines
    
    const bundleId = line.attributes?.find(
      (attr: any) => attr.key === '_BUNDLE_ID',
    )?.value;
    const bundleName = line.attributes?.find(
      (attr: any) => attr.key === '_BUNDLE_NAME',
    )?.value;

    if (bundleId && bundleName === 'men-t-shirt') {
      // Count the quantity of items in this line, not just the line itself
      const quantity = line.quantity || 1;
      bundles[bundleId] = (bundles[bundleId] || 0) + quantity;
    }
  });

  // Check if any bundle has exactly 3 items (valid bundle)
  const validBundles = Object.values(bundles).filter((count) => count === 3);

  return {
    hasValidBundles: validBundles.length > 0,
    totalValidBundles: validBundles.length,
    allBundleCounts: bundles,
  };
}

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

      // Auto-apply BUNDLE20 discount if bundle items are detected
      const hasBundleItems = inputs.lines?.some((line: any) =>
        line.attributes?.some((attr: any) => attr.key === '_BUNDLE_NAME'),
      );

      if (hasBundleItems && result.cart) {
        // Check if BUNDLE20 is already applied
        const hasBundleDiscount = result.cart.discountCodes?.some(
          (code: any) => code.code === 'BUNDLE20',
        );

        if (!hasBundleDiscount) {
          // Apply BUNDLE20 discount code automatically
          try {
            const discountResult = await cart.updateDiscountCodes(['BUNDLE20']);
            if (discountResult.cart) {
              result = discountResult;
            }
          } catch (error) {
            console.error('Failed to apply BUNDLE20 discount:', error);
            // Continue without discount if it fails
          }
        }
      }
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);

      // Validate bundles after quantity updates
      if (result.cart && result.cart.lines && result.cart.lines.nodes) {
        const remainingBundles = validateRemainingBundles(
          result.cart.lines.nodes,
        );
        const shouldHaveBundleDiscount = remainingBundles.hasValidBundles;
        const currentlyHasBundleDiscount = result.cart.discountCodes?.some(
          (code: any) => code.code === 'BUNDLE20',
        );

        if (currentlyHasBundleDiscount && !shouldHaveBundleDiscount) {
          try {
            const otherDiscounts =
              result.cart.discountCodes
                ?.filter((code: any) => code.code !== 'BUNDLE20')
                .map((code: any) => code.code) || [];

            const discountResult =
              await cart.updateDiscountCodes(otherDiscounts);
            if (discountResult.cart) {
              result = discountResult;
            }
          } catch (error) {
            console.error(
              'Failed to remove BUNDLE20 discount after update:',
              error,
            );
          }
        } else if (!currentlyHasBundleDiscount && shouldHaveBundleDiscount) {
          try {
            const currentDiscounts =
              result.cart.discountCodes?.map((code: any) => code.code) || [];
            const discountResult = await cart.updateDiscountCodes([
              ...currentDiscounts,
              'BUNDLE20',
            ]);
            if (discountResult.cart) {
              result = discountResult;
            }
          } catch (error) {
            console.error(
              'Failed to add BUNDLE20 discount after update:',
              error,
            );
          }
        }
      }
      break;
    case CartForm.ACTIONS.LinesRemove:
      // Log removal for debugging
      console.log('[Cart Server] Removing lines:', inputs.lineIds);
      
      result = await cart.removeLines(inputs.lineIds);
      
      // Log result for debugging  
      console.log('[Cart Server] Remove result:', {
        success: !!result.cart,
        remainingLines: result.cart?.lines?.nodes?.length || 0,
        errors: result.errors,
        warnings: result.warnings
      });

      // Validate remaining bundles after removal
      if (result.cart && result.cart.lines && result.cart.lines.nodes) {
        const remainingBundles = validateRemainingBundles(
          result.cart.lines.nodes,
        );
        
        console.log('[Cart Server] Bundle validation after remove:', remainingBundles);
        
        const shouldHaveBundleDiscount = remainingBundles.hasValidBundles;
        const currentlyHasBundleDiscount = result.cart.discountCodes?.some(
          (code: any) => code.code === 'BUNDLE20',
        );

        // Remove BUNDLE20 if no valid bundles remain
        if (currentlyHasBundleDiscount && !shouldHaveBundleDiscount) {
          try {
            console.log('[Cart Server] Removing BUNDLE20 discount - no valid bundles remain');
            const otherDiscounts =
              result.cart.discountCodes
                ?.filter((code: any) => code.code !== 'BUNDLE20')
                .map((code: any) => code.code) || [];

            const discountResult =
              await cart.updateDiscountCodes(otherDiscounts);
            if (discountResult.cart) {
              result = discountResult;
              console.log('[Cart Server] Successfully removed BUNDLE20 discount');
            }
          } catch (error) {
            console.error('[Cart Server] Failed to remove BUNDLE20 discount:', error);
          }
        }
        // Add BUNDLE20 if valid bundles exist but discount is missing
        else if (!currentlyHasBundleDiscount && shouldHaveBundleDiscount) {
          try {
            console.log('[Cart Server] Adding BUNDLE20 discount - valid bundles found');
            const currentDiscounts =
              result.cart.discountCodes?.map((code: any) => code.code) || [];
            const discountResult = await cart.updateDiscountCodes([
              ...currentDiscounts,
              'BUNDLE20',
            ]);
            if (discountResult.cart) {
              result = discountResult;
              console.log('[Cart Server] Successfully added BUNDLE20 discount');
            }
          } catch (error) {
            console.error('[Cart Server] Failed to add BUNDLE20 discount:', error);
          }
        }
      }
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

export async function loader({context}: LoaderFunctionArgs) {
  const {cart} = context;
  return await cart.get();
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
