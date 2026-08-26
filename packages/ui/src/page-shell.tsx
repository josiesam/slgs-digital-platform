import type { ReactNode } from "react";

export interface PageShellProps {
  readonly application: string;
  readonly children: ReactNode;
  readonly eyebrow: string;
}

export function PageShell({ application, children, eyebrow }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center px-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">
              {eyebrow}
            </span>
            <span className="text-lg font-semibold">{application}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-16">{children}</main>
    </div>
  );
}
