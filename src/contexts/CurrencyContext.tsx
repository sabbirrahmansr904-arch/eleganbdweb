/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

type CurrencyCode = 'USD' | 'BDT';

interface CurrencyContextType {
  currency: CurrencyCode;
  rate: number; // USD to BDT
  symbol: string;
  isAutoDetected: boolean;
  setCurrency: (code: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>('BDT');
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const rate = 117.50; // 1 USD = 117.50 BDT (Mock/Fixed rate for this demo)

  useEffect(() => {
    const detectCurrency = async () => {
      // First attempt: ipapi.co
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          // We still allow auto-detection if it's explicitly BD, 
          // but our default is now BDT anyway.
          setCurrencyState(data.country_code === 'BD' ? 'BDT' : 'USD');
          setIsAutoDetected(true);
          return;
        }
      } catch (e) { /* ignore and try next */ }

      // Second attempt fallback: freeipapi.com
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          setCurrencyState(data.countryCode === 'BD' ? 'BDT' : 'USD');
          setIsAutoDetected(true);
          return;
        }
      } catch (e) { /* silent fallback */ }

      // Final default
      setCurrencyState('BDT');
      setIsAutoDetected(true);
    };

    detectCurrency();
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
  };

  const symbol = currency === 'BDT' ? '৳' : '$';

  return (
    <CurrencyContext.Provider value={{ currency, rate, symbol, isAutoDetected, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
