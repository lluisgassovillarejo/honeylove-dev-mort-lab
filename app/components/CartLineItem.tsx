import React from 'react';
import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 */
export function CartLineItem({
  layout,
  line,
}: {
  layout: CartLayout;
  line: CartLine;
}) {
  const {id, merchandise, attributes} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();

  // Check if this line is part of a bundle
  const bundleName = attributes?.find(attr => attr.key === '_BUNDLE_NAME')?.value;
  const bundleId = attributes?.find(attr => attr.key === '_BUNDLE_ID')?.value;
  const isBundle = bundleName && bundleId;

  return (
    <li key={id} className={`flex gap-3 ${isBundle ? 'bg-transparent' : 'border-b border-gray-100 pb-4 mb-4'}`}>
      {image && (
        <div className="flex-shrink-0">
          <Image
            alt={title}
            aspectRatio="1/1"
            data={image}
            height={60}
            loading="lazy"
            width={60}
            className="rounded-md object-cover"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {isBundle && (
          <div className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-1">
            Bundle Item
          </div>
        )}
        
        <Link
          prefetch="intent"
          to={lineItemUrl}
          onClick={() => {
            if (layout === 'aside') {
              close();
            }
          }}
          className="block group"
        >
          <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
            {product.title}
          </p>
        </Link>
        
        <div className="mt-1">
          <ProductPrice price={line?.cost?.totalAmount} />
        </div>
        
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
          {selectedOptions.map((option) => (
            <span key={option.name} className="inline-flex items-center">
              {option.name}: {option.value}
            </span>
          ))}
        </div>
        
        <div className="mt-2">
          <CartLineQuantity line={line} />
        </div>
      </div>
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 */
function CartLineQuantity({line}: {line: CartLine}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="cart-line-quantity">
      <small>Quantity: {quantity} &nbsp;&nbsp;</small>
      <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
        {(fetcher) => {
          const isUpdating = fetcher.state !== 'idle';
          const isDisabled = quantity <= 1 || !!isOptimistic || isUpdating;
          
          return (
            <button
              aria-label={isUpdating ? "Updating quantity..." : "Decrease quantity"}
              disabled={isDisabled}
              name="decrease-quantity"
              value={prevQuantity}
              className={`w-8 h-8 flex items-center justify-center border rounded transition-colors duration-200 ${
                isDisabled
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {isUpdating ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>&#8722;</span>
              )}
            </button>
          );
        }}
      </CartLineUpdateButton>
      &nbsp;
      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        {(fetcher) => {
          const isUpdating = fetcher.state !== 'idle';
          const isDisabled = !!isOptimistic || isUpdating;
          
          return (
            <button
              aria-label={isUpdating ? "Updating quantity..." : "Increase quantity"}
              name="increase-quantity"
              value={nextQuantity}
              disabled={isDisabled}
              className={`w-8 h-8 flex items-center justify-center border rounded transition-colors duration-200 ${
                isDisabled
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {isUpdating ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>&#43;</span>
              )}
            </button>
          );
        }}
      </CartLineUpdateButton>
      &nbsp;
      <CartLineRemoveButton 
        lineIds={[lineId]} 
        disabled={!!isOptimistic}
        onRemoveComplete={() => {
          console.log(`[Cart] Removed line item: ${lineId}`);
        }}
      />
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({
  lineIds,
  disabled,
  onRemoveComplete,
}: {
  lineIds: string[];
  disabled: boolean;
  onRemoveComplete?: () => void;
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      {(fetcher) => {
        const isRemoving = fetcher.state !== 'idle';
        const isButtonDisabled = disabled || isRemoving;
        
        // Call completion callback when done
        React.useEffect(() => {
          if (fetcher.state === 'idle' && fetcher.data && onRemoveComplete) {
            onRemoveComplete();
          }
        }, [fetcher.state, fetcher.data, onRemoveComplete]);
        
        return (
          <button 
            disabled={isButtonDisabled} 
            type="submit"
            className={`text-sm px-2 py-1 rounded transition-colors duration-200 ${
              isButtonDisabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-red-600 hover:text-red-800 hover:bg-red-50'
            }`}
            aria-label={isRemoving ? 'Removing item...' : 'Remove item'}
          >
            {isRemoving ? (
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                Removing...
              </span>
            ) : (
              'Remove'
            )}
          </button>
        );
      }}
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode | ((fetcher: any) => React.ReactNode);
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {(fetcher) => {
        return typeof children === 'function' ? children(fetcher) : children;
      }}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @param lineIds - line ids affected by the update
 * @returns
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}
