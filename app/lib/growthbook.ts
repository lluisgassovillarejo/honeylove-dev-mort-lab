/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable no-console */
import { useEffect, useState } from 'react';

// Server-side helpers for Hydrogen session feature persistence
import type {AppLoadContext} from '~/lib/context';

export function getSessionFeatureValueServer(context: AppLoadContext, feature: string) {
  const features = context.session.get('growthbook_features') || {};
  return features[feature];
}

export function setSessionFeatureValueServer(context: AppLoadContext, feature: string, value: any) {
  const features = context.session.get('growthbook_features') || {};
  features[feature] = value;
  context.session.set('growthbook_features', features);
}

// Client-side session storage for feature values
const CLIENT_SESSION_KEY = 'growthbook_features';

// Get feature value from client-side session storage
function getClientSessionFeatureValue(feature: string): any {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const stored = sessionStorage.getItem(CLIENT_SESSION_KEY);
    if (stored) {
      const features = JSON.parse(stored) as Record<string, any>;
      return features[feature];
    }
  } catch (error) {
    console.warn('[Growthbook] Failed to read from session storage:', error);
  }
  return undefined;
}

// Set feature value in client-side session storage
function setClientSessionFeatureValue(feature: string, value: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = sessionStorage.getItem(CLIENT_SESSION_KEY);
    const features = stored ? (JSON.parse(stored) as Record<string, any>) : {};
    features[feature] = value;
    sessionStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(features));
  } catch (error) {
    console.warn('[Growthbook] Failed to write to session storage:', error);
  }
}

// Get feature value with fallback logic
function getFeatureValue(feature: string, defaultValue?: any, context?: AppLoadContext): any {
  // If a default value is provided, use it
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  
  // Check client-side session storage first
  const clientValue = getClientSessionFeatureValue(feature);
  if (clientValue !== undefined) {
    return clientValue;
  }
  
  // Check server-side session if context is available
  if (context) {
    const serverValue = getSessionFeatureValueServer(context, feature);
    if (serverValue !== undefined) {
      // Store in client-side session for consistency
      setClientSessionFeatureValue(feature, serverValue);
      return serverValue;
    }
  }
  
  // Generate a random value and store it
  let randomValue: any;
  
  // For boolean features (isOn), generate boolean
  if (feature.toLowerCase().includes('on') || feature.toLowerCase().includes('enabled')) {
    randomValue = Math.random() > 0.5;
  } else {
    // For other features, generate a random value based on feature name
    const hash = feature.split('').reduce((a, b) => {
      a = ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff;
      return a;
    }, 0);
    
    if (feature.toLowerCase().includes('percentage') || feature.toLowerCase().includes('rate')) {
      randomValue = Math.floor(Math.random() * 100);
    } else if (feature.toLowerCase().includes('string') || feature.toLowerCase().includes('text')) {
      randomValue = `value_${Math.abs(hash) % 1000}`;
    } else {
      randomValue = Math.abs(hash) % 100;
    }
  }
  
  // Store the generated value in both client and server sessions
  setClientSessionFeatureValue(feature, randomValue);
  
  // If we have context, also store in server session
  if (context) {
    setSessionFeatureValueServer(context, feature, randomValue);
  }
  
  return randomValue;
}

// Hook for boolean feature flags
export function useFeatureIsOn(feature: string, isOn?: boolean, context?: AppLoadContext): boolean {
  const [result, setResult] = useState<boolean>(() => 
    getFeatureValue(feature, isOn, context)
  );
  
  // Update client session when value changes
  useEffect(() => {
    setClientSessionFeatureValue(feature, result);
  }, [feature, result]);
  
  // Log for debugging
  useEffect(() => {
    console.log(`[Growthbook] Feature '${feature}' isOn:`, result);
  }, [feature, result]);
  
  return result;
}

// Hook for value-based feature flags
export function useFeatureIsValue<T = any>(feature: string, value?: T, context?: AppLoadContext): T {
  const [result, setResult] = useState<T>(() => 
    getFeatureValue(feature, value, context)
  );
  
  // Update client session when value changes
  useEffect(() => {
    setClientSessionFeatureValue(feature, result);
  }, [feature, result]);
  
  // Log for debugging
  useEffect(() => {
    console.log(`[Growthbook] Feature '${feature}' value:`, result);
  }, [feature, result]);
  
  return result;
}

// Utility function to manually set a feature value (useful for testing)
export function setFeatureValue(feature: string, value: any, context?: AppLoadContext): void {
  setClientSessionFeatureValue(feature, value);
  if (context) {
    setSessionFeatureValueServer(context, feature, value);
  }
}

// Utility function to get all stored feature values
export function getAllFeatureValues(context?: AppLoadContext): Record<string, any> {
  const clientFeatures = (() => {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = sessionStorage.getItem(CLIENT_SESSION_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })() as Record<string, any>;
  
  const serverFeatures = context ? (context.session.get('growthbook_features') || {}) : {};
  
  return { ...serverFeatures, ...clientFeatures };
}
