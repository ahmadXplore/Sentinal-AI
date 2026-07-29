'use client';

import { useState, useEffect, useCallback } from 'react';

export function useFetch(fetchFn, deps = [], options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { immediate = true } = options;

  const execute = useCallback(async (...args) => {
    try {
      if (data === null) setLoading(true);
      setError(null);
      const result = await fetchFn(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, deps);

  return { data, loading, error, execute, setData };
}
