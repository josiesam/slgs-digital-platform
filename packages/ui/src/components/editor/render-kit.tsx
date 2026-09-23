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
import { EmojiKit } from "./plugins/emoji-kit";
import { ExitBreakKit } from "./plugins/exit-break-kit";
import { FontKit } from "./plugins/font-kit";
import { LineHeightKit } from "./plugins/line-height-kit";
import { LinkKit } from "./plugins/link-kit";
import { ListKit } from "./plugins/list-kit";
import { MathKit } from "./plugins/math-kit";
import { MediaKit, MediaKitStatic } from "./plugins/media-kit";
import { SlashKit } from "./plugins/slash-kit";
import { TableKit, TableKitStatic } from "./plugins/table-kit";
import { ToggleKit } from "./plugins/toggle-kit";
import { TrailingBlockPlugin } from "platejs";
import { FixedToolbarKit } from "./fixed-toolbar-kit";

const corePlugins = [
  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...MediaKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,

  // Draw

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Parsers
];

const corePluginsStatic = [
  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKitStatic,
  ...ToggleKit,
  ...MediaKitStatic,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,

  // Draw

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,
];

const editablePlugins = [
  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  // ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // UI
  ...BlockPlaceholderKit,

  // Toolbar
  ...FixedToolbarKit,
];

export const getRenderPlugin = (readOnly = false) => {
  if (readOnly) {
    return corePluginsStatic;
  }

  return [...corePlugins, ...editablePlugins];
};
