import {type FetcherWithComponents} from 'react-router';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
}: {
  analytics?: unknown;
  children: React.ReactNode | ((state: {isLoading: boolean; isSubmitting: boolean; fetcher: FetcherWithComponents<any>}) => React.ReactNode);
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
}) {
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<any>) => {
        const isLoading = fetcher.state !== 'idle';
        const isSubmitting = fetcher.state === 'submitting';
        const isButtonDisabled = disabled || isLoading;
        
        return (
          <>
            <input
              name="analytics"
              type="hidden"
              value={JSON.stringify(analytics)}
            />
            <button
              type="submit"
              onClick={onClick}
              disabled={isButtonDisabled}
              className="w-full border-0 bg-transparent p-0 font-family-inherit text-inherit cursor-pointer outline-none"
              style={{ 
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            >
              {typeof children === 'function' 
                ? children({ isLoading, isSubmitting, fetcher })
                : children
              }
            </button>
          </>
        );
      }}
    </CartForm>
  );
}
