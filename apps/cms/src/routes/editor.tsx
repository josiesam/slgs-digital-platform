import { createFileRoute } from "@tanstack/react-router";

import { Editor, EditorContainer, Plate, usePlateEditor } from "@slgs/ui";

export const Route = createFileRoute("/editor")({
  component: RouteComponent,
});

function RouteComponent() {
  return <App />;
}

export default function App() {
  const editor = usePlateEditor(); // Initializes the editor instance

  return (
    <Plate editor={editor}>
      <EditorContainer>
        <Editor placeholder="Type your amazing content here..." />
      </EditorContainer>
    </Plate>
  );
}
