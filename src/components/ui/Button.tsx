import React, { forwardRef } from 'react';
import { Loader2Icon, type LucideIcon } from 'lucide-react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner and disables the button while an action runs. */
  loading?: boolean;
  icon?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
{ variant, size, fullWidth, loading = false, icon: Icon, disabled, className = '', children, type = 'button', ...rest },
ref)
{
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClasses({ variant, size, fullWidth })} ${className}`}
      {...rest}>

      {loading ?
      <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> :
      Icon ?
      <Icon className="h-4 w-4" aria-hidden="true" /> :
      null}
      {children}
    </button>);

});
