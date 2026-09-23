import * as React from "react";

import {
  type CursorData,
  type CursorOverlayState,
  useCursorOverlay,
} from "@platejs/selection/react";
import { getTableGridAbove } from "@platejs/table";
import { RangeApi } from "platejs";
import { useEditorRef, usePluginOption } from "platejs/react";

import { cn } from "../../utils/cn";

export function CursorOverlay() {
  const { cursors } = useCursorOverlay();

  return (
    <>
      {cursors.map((cursor) => (
        <Cursor key={cursor.id} {...cursor} />
      ))}
    </>
  );
}

function Cursor({
  id,
  caretPosition,
  data,
  selection,
  selectionRects,
}: CursorOverlayState<CursorData>) {
  const editor = useEditorRef();
  const { style, selectionStyle = style } = data ?? ({} as CursorData);
  const isCursor = RangeApi.isCollapsed(selection);

  return null;
}
