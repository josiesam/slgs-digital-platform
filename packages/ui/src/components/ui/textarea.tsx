import * as React from "react";

import { cn } from "../../utils/cn";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex bg-background disabled:opacity-50 px-3 py-2 border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background focus-visible:ring-offset-2 w-full min-h-[80px] placeholder:text-muted-foreground md:text-sm text-base disabled:cursor-not-allowed",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
