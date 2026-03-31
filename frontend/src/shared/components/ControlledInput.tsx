/**
 * Input that supports both controlled (value + onChange) and uncontrolled (defaultValue) modes.
 */
import { useControlled } from '../../hooks/useControlled';

export interface ControlledInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

export function ControlledInput({
  value: valueProp,
  defaultValue = '',
  onChange,
  ...rest
}: ControlledInputProps) {
  const [value, setValue] = useControlled({ value: valueProp, defaultValue, onChange });

  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
