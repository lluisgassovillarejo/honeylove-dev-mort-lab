import {Money} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

export function ProductPrice({
  price,
  compareAtPrice,
}: {
  price?: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
}) {
  return (
    <div className="text-xl font-semibold text-gray-900">
      {compareAtPrice ? (
        <div className="flex items-center gap-3">
          {price ? (
            <span className="text-xl font-bold">
              <Money data={price} />
            </span>
          ) : null}
          <s className="text-sm text-gray-500 font-normal">
            <Money data={compareAtPrice} />
          </s>
        </div>
      ) : price ? (
        <Money data={price} />
      ) : (
        <span>&nbsp;</span>
      )}
    </div>
  );
}
