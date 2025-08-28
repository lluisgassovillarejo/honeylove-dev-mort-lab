import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';
import {useFeatureIsValue} from '~/lib/growthbook';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

// Define the three variants for the AB test
const AB_TEST_VARIANTS = ['variantA', 'variantB', 'variantC'] as const;
type ABTestVariant = typeof AB_TEST_VARIANTS[number];

/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 */
export function CartMain({layout, cart: originalCart}: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);

  // AB test: ab2025-01 with three variants
  // The new feature flag system will automatically persist the variant for the session
  const ab202501 = useFeatureIsValue<ABTestVariant>('ab2025-01');
  
  // Get the current variant, ensuring it's one of the three valid variants
  const abVariant: ABTestVariant = AB_TEST_VARIANTS.includes(ab202501) 
    ? ab202501 
    : AB_TEST_VARIANTS[0]; // Fallback to variantA if invalid

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const withDiscount =
    cart &&
    Boolean(cart?.discountCodes?.filter((code) => code.applicable)?.length);
  const className = `cart-main ${withDiscount ? 'with-discount' : ''}`;
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;

  return (
    <div className={className}>
      {/* AB Test variant display - this will now persist across page refreshes */}
      <div className="ab-test-banner" style={{
        marginBottom: 16,
        padding: 12,
        backgroundColor: getVariantColor(abVariant),
        color: 'white',
        borderRadius: 8,
        textAlign: 'center',
        fontSize: '14px'
      }}>
        <strong>AB Test ab2025-01:</strong> {abVariant}
        <br />
        <small>This variant will persist for your entire session</small>
      </div>
      
      <CartEmpty hidden={linesCount} layout={layout} />
      <div className="cart-details">
        <div aria-labelledby="cart-lines">
          <ul>
            {(cart?.lines?.nodes ?? []).map((line) => (
              <CartLineItem key={line.id} line={line} layout={layout} />
            ))}
          </ul>
        </div>
        {cartHasItems && <CartSummary cart={cart} layout={layout} />}
      </div>
    </div>
  );
}

/**
 * Helper function to get variant-specific styling
 */
function getVariantColor(variant: ABTestVariant): string {
  switch (variant) {
    case 'variantA':
      return '#3b82f6'; // Blue
    case 'variantB':
      return '#10b981'; // Green
    case 'variantC':
      return '#f59e0b'; // Amber
    default:
      return '#6b7280'; // Gray fallback
  }
}

function CartEmpty({
  hidden = false,
}: {
  hidden: boolean;
  layout?: CartMainProps['layout'];
}) {
  const {close} = useAside();
  return (
    <div hidden={hidden}>
      <br />
      <p>
        Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you
        started!
      </p>
      <br />
      <Link to="/collections" onClick={close} prefetch="viewport">
        Continue shopping →
      </Link>
    </div>
  );
}
