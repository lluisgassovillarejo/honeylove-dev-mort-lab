import { useFeatureIsOn, useFeatureIsValue } from '~/lib/growthbook';

export function FeatureFlagExample() {
  // These hooks will now persist values in session storage
  // The same values will be consistent between server-side rendering and client-side hydration
  const isNewUIEnabled = useFeatureIsOn('new_ui_enabled');
  const bannerText = useFeatureIsValue('banner_text');
  const discountPercentage = useFeatureIsValue('discount_percentage');
  const featureFlag = useFeatureIsValue('feature_flag');

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Feature Flag Example</h2>
      
      <div className="space-y-4">
        <div className="p-3 bg-white rounded border">
          <h3 className="font-semibold">New UI Feature</h3>
          <p className="text-sm text-gray-600">
            Status: <span className={isNewUIEnabled ? 'text-green-600' : 'text-red-600'}>
              {isNewUIEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </p>
        </div>

        <div className="p-3 bg-white rounded border">
          <h3 className="font-semibold">Banner Text</h3>
          <p className="text-sm text-gray-600">Value: {bannerText}</p>
        </div>

        <div className="p-3 bg-white rounded border">
          <h3 className="font-semibold">Discount Percentage</h3>
          <p className="text-sm text-gray-600">Value: {discountPercentage}%</p>
        </div>

        <div className="p-3 bg-white rounded border">
          <h3 className="font-semibold">Feature Flag</h3>
          <p className="text-sm text-gray-600">Value: {featureFlag}</p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These feature flag values are now persisted in session storage 
          and will remain consistent between server-side rendering and client-side hydration.
        </p>
      </div>
    </div>
  );
}
