import {Link, useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import type {ProductFragment} from 'storefrontapi.generated';
import {useState, useEffect, useMemo, useCallback} from 'react';

export function ProductForm({
  product,
  productOptions,
  selectedVariant,
  allVariants = [],
}: {
  product: ProductFragment;
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  allVariants?: any[];
}) {
  const navigate = useNavigate();
  const {open} = useAside();

  // Generate unique bundle ID for each 3-pack - moved outside useMemo
  const generateBundleId = useCallback(() => {
    return `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // State for bundle builder (mix & match)
  const [showBundleBuilder, setShowBundleBuilder] = useState(false);
  const [bundleVariants, setBundleVariants] = useState<
    (typeof selectedVariant)[]
  >([selectedVariant, selectedVariant, selectedVariant]);

  // State for tracking user selections independently of variants
  const [bundleSelections, setBundleSelections] = useState([
    {
      size:
        selectedVariant?.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'size',
        )?.value || 'Small',
      color:
        selectedVariant?.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'color',
        )?.value || 'Green',
    },
    {
      size:
        selectedVariant?.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'size',
        )?.value || 'Small',
      color:
        selectedVariant?.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'color',
        )?.value || 'Green',
    },
    {
      size:
        selectedVariant?.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'size',
        )?.value || 'Small',
      color:
        selectedVariant?.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'color',
        )?.value || 'Green',
    },
  ]);

  // Get available options for bundle builder
  const colorOption = productOptions.find(
    (opt) => opt.name.toLowerCase() === 'color',
  );
  const sizeOption = productOptions.find(
    (opt) => opt.name.toLowerCase() === 'size',
  );

  // Sync bundle selections when selectedVariant changes (e.g., from URL params)
  useEffect(() => {
    if (selectedVariant) {
      const newSize =
        selectedVariant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'size',
        )?.value || 'Small';
      const newColor =
        selectedVariant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'color',
        )?.value || 'Green';

      setBundleSelections([
        {size: newSize, color: newColor},
        {size: newSize, color: newColor},
        {size: newSize, color: newColor},
      ]);

      setBundleVariants([selectedVariant, selectedVariant, selectedVariant]);
    }
  }, [selectedVariant]);

  // Improved helper function to find variant by options
  const findVariantByOptions = useCallback(
    (size: string, color: string): typeof selectedVariant => {
      console.log(
        `[Variant Search] Looking for size: ${size}, color: ${color}`,
      );
      console.log(
        `[Variant Search] Total variants available: ${allVariants.length}`,
      );

      // PRIORITY 1: Search in ALL variants (most comprehensive)
      if (allVariants && allVariants.length > 0) {
        console.log(`[Variant Search] Searching in ALL ${allVariants.length} variants...`);
        const foundVariant = allVariants.find((variant) => {
          if (!variant || !variant.selectedOptions) return false;
          
          const variantSize = variant.selectedOptions.find(
            (opt: any) => opt.name.toLowerCase() === 'size',
          )?.value;
          const variantColor = variant.selectedOptions.find(
            (opt: any) => opt.name.toLowerCase() === 'color',
          )?.value;
          const match = variantSize === size && variantColor === color;
          
          if (match) {
            console.log(
              `[Variant Search] ✅ FOUND in all variants: ${variant.id}: ${variantSize}/${variantColor}`,
            );
          }
          return match;
        });

        if (foundVariant) {
          const compatibleVariant = {
            ...selectedVariant,
            ...foundVariant,
            image: foundVariant.image
              ? {
                  ...foundVariant.image,
                  __typename: 'Image' as const,
                }
              : foundVariant.image,
          };
          console.log(
            `[Variant Search] ✅ Returning variant from ALL variants:`,
            compatibleVariant.id,
            compatibleVariant.selectedOptions,
          );
          return compatibleVariant;
        }
      }

      // PRIORITY 2: Check the selectedOrFirstAvailableVariant
      if (selectedVariant) {
        const variantSize = selectedVariant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'size',
        )?.value;
        const variantColor = selectedVariant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'color',
        )?.value;
        const match = variantSize === size && variantColor === color;
        console.log(
          `[Variant Search] Checking selected variant ${selectedVariant.id}: ${variantSize}/${variantColor}, match: ${match}`,
        );
        if (match) {
          return selectedVariant;
        }
      }

      // PRIORITY 3: Try adjacentVariants
      const foundAdjacent = product.adjacentVariants?.find((variant) => {
        const variantSize = variant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'size',
        )?.value;
        const variantColor = variant.selectedOptions.find(
          (opt) => opt.name.toLowerCase() === 'color',
        )?.value;
        const match = variantSize === size && variantColor === color;
        console.log(
          `[Variant Search] Checking adjacent variant ${variant.id}: ${variantSize}/${variantColor}, match: ${match}`,
        );
        return match;
      });

      if (foundAdjacent) {
        const compatibleVariant = {
          ...selectedVariant,
          ...foundAdjacent,
          image: foundAdjacent.image
            ? {
                ...foundAdjacent.image,
                __typename: 'Image' as const,
              }
            : foundAdjacent.image,
        };
        console.log(
          `[Variant Search] Found adjacent variant:`,
          compatibleVariant.id,
        );
        return compatibleVariant;
      }

      console.log(
        `[Variant Search] ❌ No variant found for ${size}/${color}, returning selectedVariant as fallback`,
      );
      return selectedVariant || null;
    },
    [selectedVariant, product.adjacentVariants, allVariants],
  );

  // Update bundle selection and variant at specific index
  const updateBundleSelection = (
    index: number,
    field: 'size' | 'color',
    value: string,
  ) => {
    // First update the selections state
    setBundleSelections((prev) => {
      const updated = [...prev];
      updated[index] = {...updated[index], [field]: value};

      console.log(`[Bundle Debug] Updating index ${index}, ${field}: ${value}`);
      console.log(
        `[Bundle Debug] New selection for index ${index}:`,
        updated[index],
      );

      // Then update the corresponding variant
      const newVariant = findVariantByOptions(
        updated[index].size,
        updated[index].color,
      );
      console.log(
        `[Bundle Debug] Found variant for ${updated[index].size}/${updated[index].color}:`,
        newVariant?.id,
        newVariant?.selectedOptions,
      );

      setBundleVariants((prevVariants) => {
        const updatedVariants = [...prevVariants];
        updatedVariants[index] = newVariant;
        console.log(
          `[Bundle Debug] Updated bundleVariants:`,
          updatedVariants.map((v) => v?.id),
        );
        return updatedVariants;
      });

      return updated;
    });
  };

  // Check if all bundle variants are available
  const areBundleVariantsAvailable = () => {
    if (!showBundleBuilder) {
      return selectedVariant?.availableForSale || false;
    }
    return bundleVariants.every((variant) => variant?.availableForSale);
  };

  // Get unavailable variants for error display
  const getUnavailableVariants = () => {
    if (!showBundleBuilder) return [];
    return bundleVariants
      .map((variant, index) => ({variant, index: index + 1}))
      .filter(({variant}) => !variant?.availableForSale);
  };

  // Calculate bundle pricing
  const calculateBundlePricing = () => {
    const variants = showBundleBuilder
      ? bundleVariants
      : [selectedVariant, selectedVariant, selectedVariant];
    const validVariants = variants.filter(Boolean);

    if (validVariants.length === 0)
      return {
        total: 0,
        individual: 0,
        savings: 0,
        discount: 20,
        currency: '€',
      };

    const individualTotal = validVariants.reduce((sum, variant) => {
      return sum + parseFloat(variant?.price?.amount || '0');
    }, 0);

    const bundleTotal = individualTotal * 0.8; // 20% discount
    const savings = individualTotal - bundleTotal;
    const currency =
      validVariants[0]?.price?.currencyCode === 'EUR' ? '€' : '$';

    return {
      total: bundleTotal,
      individual: individualTotal,
      savings: savings,
      discount: 20,
      currency: currency,
    };
  };

  const pricing = calculateBundlePricing();
  const unavailableVariants = getUnavailableVariants();
  const bundleAvailable = areBundleVariantsAvailable();

  // Generate bundle ID only when actually adding to cart
  const [currentBundleId, setCurrentBundleId] = useState<string>('');

  // Reset bundle ID after a short delay to allow cart submission
  useEffect(() => {
    if (currentBundleId) {
      const timer = setTimeout(() => {
        setCurrentBundleId('');
      }, 100); // Short delay to ensure cart submission completes
      return () => clearTimeout(timer);
    }
  }, [currentBundleId]);

  // Generate cart lines - simplified dependencies
  const bundleCartLines = useMemo(() => {
    if (!selectedVariant || !bundleAvailable) return [];

    const variants = showBundleBuilder
      ? bundleVariants
      : [selectedVariant, selectedVariant, selectedVariant];

    console.log(
      `[Bundle Lines] Creating cart lines for ${showBundleBuilder ? 'custom' : 'standard'} bundle:`,
      variants.map((v) => ({
        id: v?.id,
        size: v?.selectedOptions?.find((o: any) => o.name === 'Size')?.value,
        color: v?.selectedOptions?.find((o: any) => o.name === 'Color')?.value,
      })),
    );

    return variants.filter(Boolean).map((variant, idx) => ({
      merchandiseId: variant!.id,
      quantity: 1,
      attributes: [
        {key: '_BUNDLE_NAME', value: 'men-t-shirt'},
        {key: '_BUNDLE_ID', value: currentBundleId || 'temp-bundle-id'}, // Use state-based ID
      ],
      selectedVariant: variant,
    }));
  }, [
    selectedVariant,
    bundleAvailable,
    showBundleBuilder,
    bundleVariants,
    currentBundleId,
  ]);

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Product Options */}
      {productOptions.map((option) => {
        if (option.optionValues.length === 1) return null;

        return (
          <div key={option.name} className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              {option.name}
            </h5>
            <div className="flex flex-wrap gap-2">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;

                const baseClasses = `
                  px-4 py-2 text-sm font-medium border rounded-md transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : available
                        ? 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                        : 'border-gray-200 bg-gray-100 text-gray-400'
                  }
                `;

                if (isDifferentProduct) {
                  return (
                    <Link
                      key={option.name + name}
                      className={baseClasses.trim()}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </Link>
                  );
                } else {
                  return (
                    <button
                      key={option.name + name}
                      type="button"
                      className={baseClasses.trim()}
                      disabled={!exists || !available}
                      onClick={() => {
                        if (!selected && exists && available) {
                          navigate(`?${variantUriQuery}`, {
                            replace: true,
                            preventScrollReset: true,
                          });
                        }
                      }}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </button>
                  );
                }
              })}
            </div>
          </div>
        );
      })}

      {/* Primary Add to Cart Button */}
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => open('cart')}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                },
              ]
            : []
        }
      >
        {({isLoading, isSubmitting}) => (
          <div
            className={`w-full font-semibold py-3 px-6 rounded-md transition-colors duration-200 text-center flex items-center justify-center gap-2 ${
              !selectedVariant || !selectedVariant.availableForSale
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isLoading
                  ? 'bg-blue-500 text-white cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {!selectedVariant
              ? 'Select Variant'
              : !selectedVariant.availableForSale
                ? 'Sold Out'
                : isSubmitting
                  ? 'Adding to Cart...'
                  : isLoading
                    ? 'Processing...'
                    : 'Add to Cart'}
          </div>
        )}
      </AddToCartButton>

      {/* 3-Pack Bundle Section */}
      <div className="border border-gray-200 rounded-lg bg-gray-50/30">
        {/* Bundle Content */}
        <div className="px-4 py-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm">
                3-Pack Bundle
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {showBundleBuilder
                  ? 'Mix & match your perfect combination'
                  : 'Get 3 T-Shirts and save 20%'}
              </p>
              {pricing.total > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-gray-900">
                    {pricing.currency}
                    {pricing.total.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 line-through">
                    {pricing.currency}
                    {pricing.individual.toFixed(2)}
                  </span>
                  <span className="text-xs text-green-600 font-medium">
                    Save {pricing.currency}
                    {pricing.savings.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            {/* Save Badge */}
            <div className="bg-orange-500 text-white px-2.5 py-0.5 text-xs font-bold rounded-full shadow-sm ml-2 shrink-0">
              SAVE {pricing.discount}%
            </div>
          </div>

          {/* Bundle Options Toggle */}
          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setShowBundleBuilder(!showBundleBuilder)}
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              {showBundleBuilder
                ? 'Use same variant'
                : 'Mix & Match colors/sizes'}
            </button>
          </div>

          {/* Bundle Builder UI */}
          {showBundleBuilder && (
            <div className="space-y-3 bg-white rounded-md p-3 border border-gray-100">
              <h4 className="text-xs font-medium text-gray-700 mb-2">
                Customize your 3-Pack:
              </h4>
              {[0, 1, 2].map((index) => {
                const variant = bundleVariants[index];
                const isAvailable = variant?.availableForSale;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2 w-16">
                      <span className="text-xs text-gray-600">
                        #{index + 1}
                      </span>
                      {!isAvailable && (
                        <div
                          className="w-2 h-2 bg-red-500 rounded-full"
                          title="Out of stock"
                        />
                      )}
                      {isAvailable && showBundleBuilder && (
                        <div
                          className="w-2 h-2 bg-green-500 rounded-full"
                          title="In stock"
                        />
                      )}
                    </div>
                    <div className="flex gap-2 flex-1">
                      {/* Size Selector */}
                      {sizeOption && (
                        <select
                          className={`text-xs border rounded px-2 py-1 bg-white flex-1 ${
                            !isAvailable
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200'
                          }`}
                          value={bundleSelections[index]?.size || 'Small'}
                          onChange={(e) => {
                            updateBundleSelection(
                              index,
                              'size',
                              e.target.value,
                            );
                          }}
                        >
                          {sizeOption.optionValues.map((value) => (
                            <option key={value.name} value={value.name}>
                              {value.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Color Selector */}
                      {colorOption && (
                        <select
                          className={`text-xs border rounded px-2 py-1 bg-white flex-1 ${
                            !isAvailable
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200'
                          }`}
                          value={bundleSelections[index]?.color || 'Green'}
                          onChange={(e) => {
                            updateBundleSelection(
                              index,
                              'color',
                              e.target.value,
                            );
                          }}
                        >
                          {colorOption.optionValues.map((value) => (
                            <option key={value.name} value={value.name}>
                              {value.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="w-16 text-right">
                      {variant?.price && (
                        <span className="text-xs text-gray-600">
                          {variant.price.currencyCode === 'EUR' ? '€' : '$'}
                          {parseFloat(variant.price.amount).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Message for Unavailable Variants */}
          {showBundleBuilder && unavailableVariants.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
              <div className="flex items-start">
                <div className="w-4 h-4 bg-red-500 rounded-full mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 mb-1">
                    Out of Stock Items
                  </p>
                  <p className="text-xs text-red-600">
                    {unavailableVariants.length === 1
                      ? `Item #${unavailableVariants[0].index} is out of stock. Please select a different combination.`
                      : `Items #${unavailableVariants.map((v) => v.index).join(', ')} are out of stock. Please adjust your selections.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3-Pack Add to Cart Button */}
          <AddToCartButton
            disabled={!selectedVariant || !bundleAvailable}
            onClick={() => {
              // Generate unique bundle ID only when adding to cart
              const newBundleId = generateBundleId();
              setCurrentBundleId(newBundleId);

              console.log(
                `[Cart Debug] 🛒 Generated new bundle ID: ${newBundleId}`,
              );
              console.log(`[Cart Debug] 📦 Adding bundle to cart:`, {
                bundleType: showBundleBuilder ? 'Mix & Match' : 'Same Variant 3-Pack',
                bundleId: newBundleId,
                totalItems: 3,
                variants: showBundleBuilder 
                  ? bundleVariants.map((v, i) => ({
                      slot: i + 1,
                      id: v?.id,
                      size: bundleSelections[i]?.size,
                      color: bundleSelections[i]?.color,
                      available: v?.availableForSale
                    }))
                  : [{
                      slot: 'All 3',
                      id: selectedVariant?.id,
                      size: selectedVariant?.selectedOptions?.find(o => o.name === 'Size')?.value,
                      color: selectedVariant?.selectedOptions?.find(o => o.name === 'Color')?.value,
                      available: selectedVariant?.availableForSale
                    }]
              });
              
              console.log(`[Cart Debug] 🎯 Final cart lines to be added:`, bundleCartLines);

              open('cart');
            }}
            lines={bundleCartLines}
          >
            {({isLoading, isSubmitting}) => (
              <div
                className={`w-full font-semibold py-3 px-6 rounded-md transition-colors duration-200 text-center flex items-center justify-center gap-2 ${
                  !selectedVariant || !bundleAvailable
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isLoading
                      ? 'bg-gray-700 text-white cursor-wait'
                      : 'bg-gray-800 hover:bg-gray-900 text-white'
                }`}
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {!selectedVariant
                  ? 'Select Variant'
                  : !bundleAvailable
                    ? showBundleBuilder && unavailableVariants.length > 0
                      ? `${unavailableVariants.length} Item${unavailableVariants.length > 1 ? 's' : ''} Out of Stock`
                      : 'Out of Stock'
                    : isSubmitting
                      ? showBundleBuilder
                        ? 'Adding Custom 3-Pack...'
                        : 'Adding 3-Pack...'
                      : isLoading
                        ? 'Processing Bundle...'
                        : showBundleBuilder
                          ? 'Add Custom 3-Pack'
                          : 'Add 3-Pack to Cart'}
              </div>
            )}
          </AddToCartButton>
        </div>
      </div>
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}
