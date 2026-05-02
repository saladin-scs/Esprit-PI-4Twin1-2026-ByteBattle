/**
 * Controlled vs Uncontrolled pattern: one component can be used in
 * controlled mode (value + onChange) or uncontrolled mode (defaultValue, internal state).
 */
import { useCallback, useRef, useState } from 'react';

export interface UseControlledOptions<T> {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
}

/**
 * Returns stable [value, setValue].
 * - If `value` is defined -> controlled mode (value + onChange).
 * - Otherwise -> uncontrolled mode (internal state initialized to defaultValue).
 */
export function useControlled<T>(options: UseControlledOptions<T>): [T, (value: T | ((prev: T) => T)) => void] {
  const { value: controlledValue, defaultValue, onChange } = options;
  const isControlled = controlledValue !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<T | undefined>(() => defaultValue);
  const defaultValueRef = useRef(defaultValue);

  const value = isControlled ? controlledValue! : (uncontrolledValue ?? defaultValueRef.current);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = value ?? defaultValueRef.current;
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(current as T) : next;
      if (!isControlled) setUncontrolledValue(resolved);
      onChange?.(resolved);
    },
    [isControlled, value, onChange]
  );

  return [value ?? (defaultValueRef.current as T), setValue];
}
