import {useOptimisticCart} from '@shopify/hydrogen';
import {Link} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';
import {CartProgressBar, CartProgressBarMini} from './CartProgressBar';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 * Now includes Cart Perks progress bar functionality.
 */
export function CartMain({layout, cart: originalCart}: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const withDiscount =
    cart &&
    Boolean(cart?.discountCodes?.filter((code) => code.applicable)?.length);
  const className = `cart-main ${withDiscount ? 'with-discount' : ''}`;
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;

  return (
    <div className={className}>
      {/* Cart Perks Progress Bar - Use Mini for sidebar, full for page */}
      {layout === 'aside' ? (
        <CartProgressBarMini cart={cart} />
      ) : (
        <CartProgressBar cart={cart} />
      )}

      {/* Debug: Cart items count and free items count */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 p-2 mb-4 text-xs">
          <div>
            <strong>Debug Cart Info:</strong>
          </div>
          <div>Total lines: {cart?.lines?.nodes?.length || 0}</div>
          <div>Total quantity: {cart?.totalQuantity || 0}</div>
          <div>
            Free items:{' '}
            {cart?.lines?.nodes?.filter((line) =>
              line.attributes?.some(
                (attr) => attr.key === '_FREE_ITEM' && attr.value === 'true',
              ),
            ).length || 0}
          </div>
          <div>
            Subtotal: {cart?.cost?.subtotalAmount?.currencyCode}{' '}
            {cart?.cost?.subtotalAmount?.amount}
          </div>
        </div>
      )}

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
