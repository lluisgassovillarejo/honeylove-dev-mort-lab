/**
 * Free Item Manager
 * Handles GraphQL operations for adding/removing free items
 * Includes idempotency checks and error handling
 */

import type {Milestone} from '~/lib/cartPerks';

// GraphQL query for getting product by handle
export const GET_PRODUCT_BY_HANDLE = `#graphql
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      selectedOrFirstAvailableVariant {
        id
        availableForSale
        title
        price {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
      }
      variants(first: 10) {
        nodes {
          id
          availableForSale
          title
          price {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
` as const;

// Type definitions for GraphQL response
export interface ProductVariant {
  id: string;
  availableForSale: boolean;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  selectedOrFirstAvailableVariant: ProductVariant | null;
  variants: {
    nodes: ProductVariant[];
  };
}

export interface GetProductResponse {
  product: Product | null;
}

/**
 * Resolve product variant by handle and optional variant specification
 */
export async function resolveProductVariant(
  handle: string,
  variantSpec?: string,
  storefront?: any,
): Promise<ProductVariant | null> {
  // Server-side logging only
  if (typeof window === 'undefined') {
    console.log(
      `[Free Item Manager Server] Resolving: ${handle}${variantSpec ? ` (${variantSpec})` : ''}`,
    );
  }

  if (!storefront) {
    if (typeof window === 'undefined') {
      console.error(
        '[Free Item Manager Server] Storefront client not available',
      );
    }
    return null;
  }

  try {
    const response = (await storefront.query(GET_PRODUCT_BY_HANDLE, {
      variables: {handle},
    })) as GetProductResponse;

    if (!response?.product) {
      if (typeof window === 'undefined') {
        console.error(
          `[Free Item Manager Server] Product not found: ${handle}`,
        );
      }
      return null;
    }

    const product = response.product;

    // If no specific variant requested, use selected or first available
    if (!variantSpec) {
      const variant = product.selectedOrFirstAvailableVariant;
      return variant;
    }

    // Find specific variant by color/option
    const matchingVariant = product.variants.nodes.find(
      (variant: ProductVariant) =>
        variant.selectedOptions.some(
          (option: {name: string; value: string}) =>
            option.name.toLowerCase() === 'color' &&
            option.value.toLowerCase() === variantSpec.toLowerCase(),
        ),
    );

    if (matchingVariant) {
      return matchingVariant;
    }

    // Fallback to default variant if specific not found
    const fallbackVariant = product.selectedOrFirstAvailableVariant;
    if (typeof window === 'undefined' && !fallbackVariant) {
      console.warn(`[Free Item Manager Server] No variant found for ${handle}`);
    }
    return fallbackVariant;
  } catch (error) {
    if (typeof window === 'undefined') {
      console.error(
        `[Free Item Manager Server] Error resolving ${handle}:`,
        error,
      );
    }
    return null;
  }
}

/**
 * Create cart line for free item
 */
export function createFreeItemLine(
  variant: ProductVariant,
  milestone: Milestone,
): any {
  const line = {
    merchandiseId: variant.id,
    quantity: 1,
    attributes: [
      {key: '_FREE_ITEM', value: 'true'},
      {key: '_FREE_ITEM_TYPE', value: milestone.handle || 'unknown'},
      {key: '_FREE_ITEM_THRESHOLD', value: milestone.threshold.toString()},
    ],
  };

  return line;
}

/**
 * Check if free item line should be removed based on threshold
 */
export function shouldRemoveFreeItemLine(
  line: any,
  currentSubtotal: number,
): boolean {
  if (!line.attributes) return false;

  // Check if this is a free item
  const isFreeItem = line.attributes.some(
    (attr: any) => attr.key === '_FREE_ITEM' && attr.value === 'true',
  );

  if (!isFreeItem) return false;

  // Get the threshold this item was added at
  const thresholdAttr = line.attributes.find(
    (attr: any) => attr.key === '_FREE_ITEM_THRESHOLD',
  );

  if (!thresholdAttr) {
    console.warn(
      '[Free Item Manager] Free item missing threshold attribute:',
      line.id,
    );
    return false;
  }

  const threshold = parseFloat(thresholdAttr.value);
  const shouldRemove = currentSubtotal < threshold;
  return shouldRemove;
}

/**
 * Get all free item lines that should be removed
 */
export function getFreeItemsToRemove(
  cartLines: any[],
  currentSubtotal: number,
): string[] {
  if (!cartLines) return [];

  const linesToRemove = cartLines
    .filter((line) => shouldRemoveFreeItemLine(line, currentSubtotal))
    .map((line) => line.id);

  // Server-side logging only
  if (typeof window === 'undefined' && linesToRemove.length > 0) {
    console.log(
      `[Free Item Manager Server] Removing ${linesToRemove.length} free items`,
    );
  }

  return linesToRemove;
}

/**
 * Process free items for cart perks
 * Returns operations to add/remove free items
 */
export interface FreeItemOperations {
  itemsToAdd: Array<{
    milestone: Milestone;
    variant: ProductVariant;
    line: any;
  }>;
  itemsToRemove: string[];
}

export async function processFreeItems(
  requiredItems: Milestone[],
  cart: any,
  currentSubtotal: number,
  storefront?: any,
): Promise<FreeItemOperations> {
  // Server-side logging only
  if (typeof window === 'undefined' && requiredItems.length > 0) {
    console.log(
      `[Free Item Manager Server] Processing ${requiredItems.length} free items`,
    );
  }

  const operations: FreeItemOperations = {
    itemsToAdd: [],
    itemsToRemove: [],
  };

  // Find items to remove (below threshold)
  if (cart?.lines?.nodes) {
    operations.itemsToRemove = getFreeItemsToRemove(
      cart.lines.nodes,
      currentSubtotal,
    );
  }

  // Find items to add (missing required items)
  for (const milestone of requiredItems) {
    if (!milestone.handle) {
      if (typeof window === 'undefined') {
        console.warn('[Free Item Manager Server] Missing handle for milestone');
      }
      continue;
    }

    // Check if item is already in cart
    const existingItem = cart?.lines?.nodes?.some((line: any) => {
      const productHandle = line.merchandise?.product?.handle;
      const isFreeItem = line.attributes?.some(
        (attr: any) => attr.key === '_FREE_ITEM' && attr.value === 'true',
      );
      return productHandle === milestone.handle && isFreeItem;
    });

    if (existingItem) {
      continue; // Skip if already in cart
    }

    // Resolve product variant
    const variant = await resolveProductVariant(
      milestone.handle,
      milestone.variant,
      storefront,
    );

    if (!variant) {
      if (typeof window === 'undefined') {
        console.error(
          `[Free Item Manager Server] Could not resolve: ${milestone.handle}`,
        );
      }
      continue;
    }

    // Check availability and potentially inventory
    if (!variant.availableForSale) {
      if (typeof window === 'undefined') {
        console.warn(
          `[Free Item Manager Server] Not available: ${variant.title}`,
        );
      }
      continue;
    }

    // Create cart line for this free item
    const line = createFreeItemLine(variant, milestone);

    operations.itemsToAdd.push({
      milestone,
      variant,
      line,
    });
  }

  // Server-side logging only
  if (
    typeof window === 'undefined' &&
    (operations.itemsToAdd.length > 0 || operations.itemsToRemove.length > 0)
  ) {
    console.log(
      `[Free Item Manager Server] Operations: +${operations.itemsToAdd.length} -${operations.itemsToRemove.length}`,
    );
  }

  return operations;
}

/**
 * Validate free item operations before executing
 */
export function validateFreeItemOperations(operations: FreeItemOperations): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate items to add
  for (const {milestone, variant, line} of operations.itemsToAdd) {
    if (!milestone.handle) {
      errors.push(`Missing handle for milestone: ${milestone.type}`);
    }

    if (!variant.id) {
      errors.push(`Missing variant ID for: ${milestone.handle}`);
    }

    if (!variant.availableForSale) {
      errors.push(`Variant not available: ${variant.title}`);
    }

    if (!line.merchandiseId) {
      errors.push(`Missing merchandise ID for: ${milestone.handle}`);
    }
  }

  // Validate items to remove
  for (const lineId of operations.itemsToRemove) {
    if (!lineId) {
      errors.push('Invalid line ID for removal');
    }
  }

  const valid = errors.length === 0;

  if (!valid && typeof window === 'undefined') {
    console.error('[Free Item Manager Server] Validation failed:', errors);
  }

  return {valid, errors};
}
