import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: {to: string;label: string;};
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backTo, action, children }: PageHeaderProps) {
  return (
    <header className="bg-pine text-white">
      <div className="mx-auto max-w-6xl px-5 pb-6 pt-8 lg:px-10 lg:pb-9 lg:pt-10">
        {backTo &&
        <Link
          to={backTo.to}
          className="mb-3 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-white/80 transition-colors duration-150 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            {backTo.label}
          </Link>
        }
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight lg:text-[32px] lg:leading-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm font-medium text-white/80 lg:text-base">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </header>);

}