import * as React from "react";

import type { TPlaceholderElement } from "platejs";
import type { SlateElementProps } from "platejs/static";

import { AudioLines, FileUp, Film, ImageIcon } from "lucide-react";
import { KEYS } from "platejs";
import { SlateElement } from "platejs/static";

import { cn } from "../../utils/cn";

const CONTENT: Record<
  string,
  {
    content: React.ReactNode;
    icon: React.ReactNode;
  }
> = {
  [KEYS.audio]: {
    content: "Audio file",
    icon: <AudioLines />,
  },
  [KEYS.file]: {
    content: "File",
    icon: <FileUp />,
  },
  [KEYS.img]: {
    content: "Image",
    icon: <ImageIcon />,
  },
  [KEYS.video]: {
    content: "Video",
    icon: <Film />,
  },
};

export function PlaceholderElementStatic(
  props: SlateElementProps<TPlaceholderElement>,
) {
  const currentContent = CONTENT[props.element.mediaType];

  return (
    <SlateElement className="my-1" {...props}>
      <div
        className={cn("flex select-none items-center rounded-sm bg-muted p-3")}
        contentEditable={false}
      >
        <div className="relative mr-3 flex text-muted-foreground/80 [&_svg]:size-6">
          {currentContent.icon}
        </div>
        <div className="whitespace-nowrap text-muted-foreground text-sm">
          <div>{currentContent.content}</div>
        </div>
      </div>
      {props.children}
    </SlateElement>
  );
}
