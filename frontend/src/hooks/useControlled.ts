/**
 * Pattern Controlled vs Uncontrolled: un seul composant peut être utilisé en mode
 * contrôlé (value + onChange) ou non contrôlé (defaultValue, état interne).
 */
import { useCallback, useRef, useState } from 'react';

export interface UseControlledOptions<T> {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
}

/**
 * Retourne [value, setValue] stables.
 * - Si `value` est défini → mode contrôlé (value + onChange).
 * - Sinon → mode non contrôlé (état interne initialisé à defaultValue).
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
