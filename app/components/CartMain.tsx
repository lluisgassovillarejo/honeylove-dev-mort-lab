import React, {useState} from 'react';
import {useOptimisticCart, CartForm} from '@shopify/hydrogen';
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

// Bundle grouping types and functions
type BundleGroup = {
  bundleId: string;
  bundleName: string;
  lines: CartApiQueryFragment['lines']['nodes'];
  totalPrice: number;
  originalPrice: number;
  savings: number;
  colorSummary: string;
};

function groupCartLines(lines: CartApiQueryFragment['lines']['nodes']) {
  const bundles: Record<string, BundleGroup> = {};
  const individualLines: CartApiQueryFragment['lines']['nodes'] = [];

  lines.forEach((line) => {
    const bundleName = line.attributes?.find(attr => attr.key === '_BUNDLE_NAME')?.value;
    const bundleId = line.attributes?.find(attr => attr.key === '_BUNDLE_ID')?.value;

    if (bundleName && bundleId) {
      if (!bundles[bundleId]) {
        bundles[bundleId] = {
          bundleId,
          bundleName,
          lines: [],
          totalPrice: 0,
          originalPrice: 0,
          savings: 0,
          colorSummary: '',
        };
      }
      bundles[bundleId].lines.push(line);
    } else {
      individualLines.push(line);
    }
  });

  // Calculate bundle summaries
  Object.values(bundles).forEach((bundle) => {
    // Calculate actual total price (Shopify will handle discounts)
    bundle.totalPrice = bundle.lines.reduce((sum, line) => {
      return sum + parseFloat(line.cost?.totalAmount?.amount || '0');
    }, 0);
    
    // Original price for reference (before any discounts)
    bundle.originalPrice = bundle.lines.reduce((sum, line) => {
      return sum + parseFloat(line.merchandise.price?.amount || '0');
    }, 0);
    
    bundle.savings = bundle.originalPrice - bundle.totalPrice;

    // Create color summary (accounting for quantity)
    const colorCounts: Record<string, number> = {};
    bundle.lines.forEach((line) => {
      const color = line.merchandise.selectedOptions.find(opt => opt.name.toLowerCase() === 'color')?.value || 'Unknown';
      const quantity = line.quantity || 1;
      colorCounts[color] = (colorCounts[color] || 0) + quantity;
    });

    bundle.colorSummary = Object.entries(colorCounts)
      .map(([color, count]) => count > 1 ? `${color} ×${count}` : color)
      .join(', ');
  });

  return { bundles: Object.values(bundles), individualLines };
}

// Component to remove entire bundle - Minimal Design
function BundleRemoveButton({ bundleLines }: { bundleLines: CartApiQueryFragment['lines']['nodes'] }) {
  const lineIds = bundleLines.map(line => line.id);
  
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      {(fetcher) => {
        const isRemoving = fetcher.state !== 'idle';
        
        return (
          <button 
            disabled={isRemoving} 
            type="submit"
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
              isRemoving
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-red-500 hover:text-red-700 hover:bg-red-50'
            }`}
            aria-label={isRemoving ? 'Removing bundle...' : 'Remove bundle'}
            title="Remove bundle"
          >
            {isRemoving ? (
              <>
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                <span className="sr-only">Removing...</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="sr-only">Remove</span>
              </>
            )}
          </button>
        );
      }}
    </CartForm>
  );
}

function renderCartItems(lines: CartApiQueryFragment['lines']['nodes'], layout: CartLayout) {
  const { bundles, individualLines } = groupCartLines(lines);

  return (
    <ul>
      {/* Render bundle groups */}
      {bundles.map((bundle) => (
        <BundleGroup key={bundle.bundleId} bundle={bundle} layout={layout} />
      ))}
      
      {/* Render individual lines */}
      {individualLines.map((line) => (
        <CartLineItem key={line.id} line={line} layout={layout} />
      ))}
    </ul>
  );
}

function BundleGroup({ bundle, layout }: { bundle: BundleGroup; layout: CartLayout }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate total items in bundle (accounting for quantity)
  const totalItemsInBundle = bundle.lines.reduce((sum, line) => sum + (line.quantity || 1), 0);
  const isCompleteBundle = totalItemsInBundle === 3;
  
  return (
    <li className="bg-white border border-gray-100 rounded-lg p-4 mb-3 shadow-sm">
      {/* Bundle Header - Clean & Minimal */}
      <div className="flex items-start justify-between pb-3 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          {/* Title & Badge */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              Men's T-Shirt — 3-Pack
            </h3>
            {isCompleteBundle ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Save 20%
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Incomplete
              </span>
            )}
          </div>
          
          {/* Color Summary */}
          <div className="text-xs text-gray-600 mb-2">
            {bundle.colorSummary}
            {!isCompleteBundle && (
              <span className="block text-amber-600 mt-0.5">
                {totalItemsInBundle}/3 items • Add {3 - totalItemsInBundle} more for discount
              </span>
            )}
          </div>
          
          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {bundle.lines[0]?.cost?.totalAmount?.currencyCode === 'EUR' ? '€' : '$'}{bundle.totalPrice.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 line-through">
              {bundle.lines[0]?.cost?.totalAmount?.currencyCode === 'EUR' ? '€' : '$'}{bundle.originalPrice.toFixed(2)}
            </span>
            <span className="text-xs text-green-600 font-medium">
              Save {bundle.lines[0]?.cost?.totalAmount?.currencyCode === 'EUR' ? '€' : '$'}{bundle.savings.toFixed(2)}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-4">
          <button 
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <svg className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {isExpanded ? 'Hide' : 'Show'}
          </button>
          <BundleRemoveButton bundleLines={bundle.lines} />
        </div>
      </div>
      
      {/* Expanded Items */}
      {isExpanded && (
        <div className="pt-3 space-y-2">
          {bundle.lines.map((line) => (
            <div key={line.id} className="bg-gray-50 rounded-md p-2 border-l-3 border-l-blue-200">
              <CartLineItem line={line} layout={layout} />
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

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
          {renderCartItems(cart?.lines?.nodes ?? [], layout)}
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
