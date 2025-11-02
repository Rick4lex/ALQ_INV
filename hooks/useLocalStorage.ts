// FIX: Import React to make React's types available for use in type annotations.
import React, { useState, useEffect } from 'react';
import { LOCAL_STORAGE_KEYS } from '../constants';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      let value = item ? JSON.parse(item) : initialValue;

      // One-time data migrations
      if (key === LOCAL_STORAGE_KEYS.PRODUCTS && Array.isArray(value) && value.length > 0) {
        // Migration 1: `available: boolean` to `stock: number`
        if (value[0].hasOwnProperty('available')) {
          value = value.map((p: any) => {
            const { available, ...rest } = p;
            return { ...rest, stock: available ? 1 : 0 };
          });
        }
        
        // Migration 2: `stock: number` to `variants: Variant[]`
        if (value[0].hasOwnProperty('stock') && !value[0].hasOwnProperty('variants')) {
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
