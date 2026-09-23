import * as React from "react";
import "katex/contrib/mhchem";

import type { TEquationElement } from "platejs";
import type { PlateElementProps } from "platejs/react";

import { useEquationElement } from "@platejs/math/react";
import { RadicalIcon } from "lucide-react";
import {
  PlateElement,
  useEditorRef,
  useEditorSelector,
  useElement,
  useSelected,
} from "platejs/react";

import { cn } from "../../utils/cn";
import { inlineSuggestionVariants } from "../../lib/suggestion";
import { MathFieldKeyboardPopover } from "./mathfield-keykoard";
import { Popover, PopoverTrigger } from "./popover";

export function EquationElement(props: PlateElementProps<TEquationElement>) {
  const selected = useSelected();
  const [open, setOpen] = React.useState(selected);
  const katexRef = React.useRef<HTMLDivElement | null>(null);
  const lineBreakBadge = (
    props as PlateElementProps<TEquationElement> & {
      lineBreakBadge?: React.ReactNode;
    }
  ).lineBreakBadge;

  useEquationElement({
    element: props.element,
    katexRef,
    options: {
      displayMode: true,
      errorColor: "#cc0000",
      fleqn: false,
      leqno: false,
      macros: {
        "\\f": "#1f(#2)",
        "\\placeholder": "\\mathbin{\\square}",
        "\\ACTIVESLOT": "\\mathbin{\\blacksquare}",
      },
      output: "htmlAndMathml",
      strict: "warn",
      throwOnError: false,
      trust: false,
    },
  });

  const onClose = () => {
    setOpen(false);
  };

  return (
    <PlateElement className="my-1" {...props}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "group flex cursor-pointer select-none items-center justify-center rounded-sm hover:bg-primary/10 data-[selected=true]:bg-primary/10",
              props.element.texExpression.length === 0
                ? "bg-muted p-3 pr-9"
                : "px-2 py-1",
            )}
            data-selected={selected}
            contentEditable={false}
            role="button"
          >
            {props.element.texExpression.length > 0 ? (
              <span ref={katexRef} />
            ) : (
              <div className="flex h-7 w-full items-center gap-2 whitespace-nowrap text-muted-foreground text-sm">
                <RadicalIcon className="size-6 text-muted-foreground/80" />
                <div>Add a Tex equation</div>
              </div>
            )}
            {lineBreakBadge}
          </div>
        </PopoverTrigger>

        <MathFieldKeyboardPopover
          isInline={false}
          open={open}
          onClose={onClose}
          element={props.element}
          placeholder={
            "f(x) = \\begin{cases}\n  x^2, &\\quad x > 0 \\\\\n  0, &\\quad x = 0 \\\\\n  -x^2, &\\quad x < 0\n\\end{cases}"
          }
        />
      </Popover>

      {props.children}
    </PlateElement>
  );
}

export function InlineEquationElement(
  props: PlateElementProps<TEquationElement>,
) {
  const { element } = props;
  const katexRef = React.useRef<HTMLDivElement | null>(null);
  const selected = useSelected();
  const isCollapsed = useEditorSelector(
    (editor) => editor.api.isCollapsed(),
    [],
  );
  const [open, setOpen] = React.useState(selected && isCollapsed);

  React.useEffect(() => {
    if (selected && isCollapsed) {
      setOpen(true);
    }
  }, [selected, isCollapsed]);

  useEquationElement({
    element,
    katexRef,
    options: {
      displayMode: true,
      errorColor: "#cc0000",
      fleqn: false,
      leqno: false,
      macros: {
        "\\f": "#1f(#2)",
        "\\placeholder": "\\mathbin{\\square}",
        "\\ACTIVESLOT": "\\mathbin{\\blacksquare}",
      },
      output: "htmlAndMathml",
      strict: "warn",
      throwOnError: false,
      trust: false,
    },
  });

  const editor = useEditorRef();
  const inlineElement = useElement<TEquationElement>();

  const onClose = () => {
    setOpen(false);
    editor.tf.select(inlineElement, { focus: true, next: true });
  };

  return (
    <PlateElement
      {...props}
      className={cn(
        "mx-1 inline-block select-none rounded-sm [&_.katex-display]:my-0!",
      )}
    >
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              'after:-top-0.5 after:-left-1 after:absolute after:inset-0 after:z-1 after:h-[calc(100%)+4px] after:w-[calc(100%+8px)] after:rounded-sm after:content-[""]',
              "h-6",
              inlineSuggestionVariants(),
              ((element.texExpression.length > 0 && open) || selected) &&
                "after:bg-brand/15",
              element.texExpression.length === 0 &&
                "text-muted-foreground after:bg-neutral-500/10",
            )}
            contentEditable={false}
          >
            <span
              ref={katexRef}
              className={cn(
                element.texExpression.length === 0 && "hidden",
                "font-mono leading-none",
              )}
            />
            {element.texExpression.length === 0 && (
              <span>
                <RadicalIcon className="mr-1 inline-block h-[19px] w-4 py-[1.5px] align-text-bottom" />
                New equation
              </span>
            )}
          </div>
        </PopoverTrigger>

        <MathFieldKeyboardPopover
          className="my-auto"
          isInline
          open={open}
          onClose={onClose}
          element={element}
          placeholder="E = mc^2"
        />
      </Popover>

      {props.children}
    </PlateElement>
  );
}
