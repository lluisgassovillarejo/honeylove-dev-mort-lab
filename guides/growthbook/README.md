# Growthbook Library with Session Persistence

This guide explains how to use the updated Growthbook library that provides session-based feature flag persistence for both server-side and client-side rendering.

## Overview

The updated Growthbook library ensures that feature flag values remain consistent between server-side rendering (SSR) and client-side hydration, providing a seamless user experience without feature flag flickering.

## Key Features

- **Session Persistence**: Feature flag values are stored in both server-side sessions and client-side session storage
- **SSR/Client Consistency**: Same values persist across server and client rendering
- **Smart Value Generation**: Automatically generates appropriate values based on feature flag names
- **Type Safety**: Full TypeScript support with proper typing

## Usage

### Basic Feature Flag Hooks

```tsx
import { useFeatureIsOn, useFeatureIsValue } from '~/lib/growthbook';

function MyComponent() {
  // Boolean feature flag
  const isNewFeatureEnabled = useFeatureIsOn('new_feature_enabled');
  
  // Value-based feature flag
  const bannerText = useFeatureIsValue('banner_text');
  const discountRate = useFeatureIsValue('discount_rate');
  
  return (
    <div>
      {isNewFeatureEnabled && <NewFeatureComponent />}
      {bannerText && <Banner text={bannerText} />}
      <DiscountDisplay rate={discountRate} />
    </div>
  );
}
```

### Server-Side Context Usage

When you need to access feature flags in server-side code (loaders, actions):

```tsx
import { getSessionFeatureValueServer, setSessionFeatureValueServer } from '~/lib/growthbook';

export async function loader({ context }: LoaderFunctionArgs) {
  // Get a feature flag value from server session
  const isFeatureEnabled = getSessionFeatureValueServer(context, 'feature_enabled');
  
  // Set a feature flag value in server session
  setSessionFeatureValueServer(context, 'feature_enabled', true);
  
  return { isFeatureEnabled };
}
```

### Utility Functions

```tsx
import { setFeatureValue, getAllFeatureValues } from '~/lib/growthbook';

// Manually set a feature value (useful for testing)
setFeatureValue('test_feature', 'test_value');

// Get all stored feature values
const allFeatures = getAllFeatureValues();
```

## How It Works

### 1. Value Resolution Priority

The library follows this priority order when determining feature flag values:

1. **Explicit Value**: If a value is passed directly to the hook
2. **Client Session**: Check browser's session storage
3. **Server Session**: Check server-side session (if context available)
4. **Generated Value**: Create a new value and store it in both sessions

### 2. Smart Value Generation

The library automatically generates appropriate values based on feature flag names:

- **Boolean Features**: Names containing "on", "enabled" → `true`/`false`
- **Percentage/Rate Features**: Names containing "percentage", "rate" → `0-100`
- **String/Text Features**: Names containing "string", "text" → `value_XXX`
- **Default**: Numeric hash-based value

### 3. Session Storage

- **Client Side**: Uses `sessionStorage` for browser session persistence
- **Server Side**: Uses Hydrogen's session system for server-side persistence
- **Synchronization**: Values are automatically synced between client and server

## Example Component

See `app/components/FeatureFlagExample.tsx` for a complete working example.

## Best Practices

1. **Consistent Naming**: Use descriptive names that indicate the type of value (e.g., `banner_text`, `discount_percentage`)
2. **Server Context**: Always pass the context when using in server-side code
3. **Error Handling**: The library gracefully handles storage errors and falls back to generated values
4. **Testing**: Use `setFeatureValue()` to set specific values for testing scenarios

## Migration from Previous Version

The hooks now accept an optional `context` parameter for server-side usage:

```tsx
// Before
const isEnabled = useFeatureIsOn('feature');

// After (client-side usage remains the same)
const isEnabled = useFeatureIsOn('feature');

// After (server-side usage)
const isEnabled = useFeatureIsOn('feature', undefined, context);
```

## Troubleshooting

### Feature Flag Flickering
- Ensure the same feature flag names are used consistently
- Check that server-side context is properly passed when needed

### Session Storage Issues
- The library automatically falls back to generated values if storage fails
- Check browser console for any storage-related warnings

### Server/Client Mismatch
- Verify that `context` is passed when using in server-side code
- Check that session secrets are properly configured
