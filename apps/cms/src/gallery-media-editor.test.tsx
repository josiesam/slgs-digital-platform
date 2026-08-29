import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GalleryMediaEditor } from "./gallery-media-editor";

describe("gallery media editor", () => {
  it("loads ordered available media without offering archived assets", () => {
    const markup = renderToStaticMarkup(
      <GalleryMediaEditor
        contentId="content-1"
        initialMediaIds={["media-2", "media-1"]}
        media={[
          { id: "media-1", filename: "one.png", status: "available" },
          { id: "media-2", filename: "two.png", status: "available" },
          { id: "media-3", filename: "archived.png", status: "archived" },
        ]}
        pending={false}
        onSave={vi.fn()}
      />,
    );

    expect(markup.indexOf("two.png")).toBeLessThan(markup.indexOf("one.png"));
    expect(markup).not.toContain("archived.png");
  });
});
