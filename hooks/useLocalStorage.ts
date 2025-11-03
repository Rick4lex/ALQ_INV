// FIX: Import React to make React's types available for use in type annotations.
import React, { useState, useEffect } from 'react';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { Product } from '../types';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      let value = item ? JSON.parse(item) : initialValue;

      // One-time data migrations
      if (key === LOCAL_STORAGE_KEYS.PRODUCTS && Array.isArray(value) && value.length > 0) {
        let needsUpdate = false;
        
        // Migration 1: `available: boolean` to `stock: number`
        if (value[0].hasOwnProperty('available')) {
            needsUpdate = true;
            value = value.map((p: any) => {
                const { available, ...rest } = p;
                return { ...rest, stock: available ? 1 : 0 };
            });
        }
        
        // Migration 2: `stock: number` to `variants: Variant[]`
        if (value[0].hasOwnProperty('stock') && !value[0].hasOwnProperty('variants')) {
            needsUpdate = true;
            value = value.map((p: any) => {
                const { stock, price, sku, ...rest } = p;
                return {
                ...rest,
                variants: [{
                    id: `${p.id}-default`,
                    name: 'Único',
                    stock: stock ?? 0,
                    price: price ?? '',
                    sku: sku ?? '',
                }],
                };
            });
        }
        
        // Migration 3: `variant.price: string` to `variant.price: number`
        if (value.some((p: Product) => p.variants.some(v => typeof v.price === 'string'))) {
            needsUpdate = true;
            value = value.map((p: any) => {
                const updatedVariants = p.variants.map((v: any) => {
                    if (typeof v.price === 'string') {
                        const numericString = v.price.replace(/[^\d]/g, '');
                        return { ...v, price: numericString ? parseInt(numericString, 10) : 0 };
                    }
                    return { ...v, price: typeof v.price === 'number' ? v.price : 0 };
                });
                return { ...p, variants: updatedVariants };
            });
        }
        
        // Migration 4: Remove `priceUnit` from Product, add `itemCount` to Variant
        if (value.some((p: any) => p.hasOwnProperty('priceUnit') || p.variants.some((v: any) => !v.hasOwnProperty('itemCount')))) {
            needsUpdate = true;
            value = value.map((p: any) => {
                const { priceUnit, ...rest } = p;
                const updatedVariants = rest.variants.map((v: any) => ({
                    ...v,
                    itemCount: v.itemCount || 1,
                    name: v.name === 'Único' ? 'Unidad' : v.name,
                }));
                return { ...rest, variants: updatedVariants };
            });
        }
      }
      
      return value;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore =
        typeof storedValue === 'function'
          ? storedValue(storedValue)
          : storedValue;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}