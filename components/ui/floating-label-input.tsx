import * as React from 'react';

import { cn } from '../../lib/utils';

export interface FloatingLabelInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ className, type, label = "name", ...props }, ref) => {
    const [hasValue, setHasValue] = React.useState(false);

    React.useEffect(() => {
      setHasValue(!!props.value);
    }, [props.value]);

    const shouldShowLabel = hasValue || type === 'date';

    return (
      <div className="relative">
        {shouldShowLabel && (
          <label className="absolute -top-2 left-2 text-xs text-muted-foreground bg-background px-1 z-10">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            '[&:-webkit-autofill]:bg-background [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_hsl(var(--background))] [&:-webkit-autofill]:[-webkit-text-fill-color:hsl(var(--foreground))]',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
FloatingLabelInput.displayName = 'FloatingLabelInput';

export { FloatingLabelInput };