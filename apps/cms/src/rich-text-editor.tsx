import { useRef } from "react";
import type { Value } from "platejs";
import {
  BlockquotePlugin,
  BoldPlugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";

import type { RichTextDocument } from "@slgs/cms-domain";

const plainTextValue = (body: string): Value => {
  const paragraphs = body.split(/\n{2,}/);
  return (paragraphs.length ? paragraphs : [""]).map((text) => ({
    type: "p" as const,
    children: [{ text }],
  }));
};

export const richTextPlainText = (value: Value) =>
  value
    .map((node) =>
      "children" in node
        ? node.children
            .map((child) => ("text" in child ? String(child.text) : ""))
            .join("")
        : "",
    )
    .join("\n\n");

export function RichTextEditor({
  body,
  bodyRichText,
  disabled,
  id,
}: {
  readonly body: string;
  readonly bodyRichText: RichTextDocument | null;
  readonly disabled: boolean;
  readonly id: string;
}) {
  const initialValue: Value = bodyRichText
    ? bodyRichText.map((block) => ({
        ...block,
        children: block.children.map((leaf) => ({ ...leaf })),
      }))
    : plainTextValue(body);
  const serializedRef = useRef<HTMLInputElement>(null);
  const plainTextRef = useRef<HTMLInputElement>(null);
  const editor = usePlateEditor({
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      H2Plugin,
      H3Plugin,
      BlockquotePlugin,
    ],
    value: initialValue,
  });

  return (
    <div className="cms-rich-text">
      <input
        ref={serializedRef}
        name="bodyRichText"
        type="hidden"
        defaultValue={JSON.stringify(initialValue)}
      />
      <input ref={plainTextRef} name="body" type="hidden" defaultValue={body} />
      <Plate
        editor={editor}
        onValueChange={({ value }) => {
          if (serializedRef.current) {
            serializedRef.current.value = JSON.stringify(value);
          }
          if (plainTextRef.current) {
            plainTextRef.current.value = richTextPlainText(value);
          }
        }}
      >
        <div className="cms-rich-text__toolbar" aria-label="Text formatting">
          <button
            type="button"
            onClick={() => editor.tf.toggleMark("bold")}
            disabled={disabled}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.tf.toggleMark("italic")}
            disabled={disabled}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.tf.toggleMark("underline")}
            disabled={disabled}
            title="Underline"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={() => editor.tf.toggleBlock("h2")}
            disabled={disabled}
            title="Section heading"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.tf.toggleBlock("h3")}
            disabled={disabled}
            title="Subheading"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => editor.tf.toggleBlock("blockquote")}
            disabled={disabled}
            title="Block quote"
          >
            Quote
          </button>
          <button
            type="button"
            onClick={() => editor.tf.toggleBlock("p")}
            disabled={disabled}
            title="Paragraph"
          >
            Paragraph
          </button>
        </div>
        <PlateContent
          id={id}
          aria-label="Content"
          className="cms-rich-text__surface"
          disabled={disabled}
          placeholder="Write the approved public content…"
        />
      </Plate>
      <small>
        Use headings to structure the page. Formatting is stored as validated
        Plate JSON and rendered without injecting HTML.
      </small>
    </div>
  );
}
