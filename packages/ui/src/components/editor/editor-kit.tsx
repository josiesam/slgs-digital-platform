import { type Value, TrailingBlockPlugin } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";

import { AlignKit } from "./plugins/align-kit";
import { AutoformatKit } from "./plugins/autoformat-kit";
import { BasicBlocksKit } from "./plugins/basic-blocks-kit";
import { BasicMarksKit } from "./plugins/basic-marks-kit";
import { BlockMenuKit } from "./plugins/block-menu-kit";
import { BlockPlaceholderKit } from "./plugins/block-placeholder-kit";
import { CodeBlockKit } from "./plugins/code-block-kit";
import { ColumnKit } from "./plugins/column-kit";
import { CursorOverlayKit } from "./plugins/cursor-overlay-kit";
import { DateKit } from "./plugins/date-kit";
import { DndKit } from "./plugins/dnd-kit";
import { EmojiKit } from "./plugins/emoji-kit";
import { ExitBreakKit } from "./plugins/exit-break-kit";
import { FixedToolbarKit } from "./plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "./plugins/floating-toolbar-kit";
import { FontKit } from "./plugins/font-kit";
import { LineHeightKit } from "./plugins/line-height-kit";
import { LinkKit } from "./plugins/link-kit";
import { ListKit } from "./plugins/list-kit";
import { MathKit } from "./plugins/math-kit";
import { MediaKit } from "./plugins/media-kit";
import { SlashKit } from "./plugins/slash-kit";
import { TableKit } from "./plugins/table-kit";
import { TocKit } from "./plugins/toc-kit";
import { ToggleKit } from "./plugins/toggle-kit";

export const EditorKit = [
  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Collaboration

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
