import { Plate, createPlateEditor } from "platejs/react";
import { useMemo } from "react";
import "katex/contrib/mhchem";
import { getRenderPlugin } from "../editor/render-kit";
import { Value } from "platejs";
import { EditorStatic } from "./editor-static";
import { getEquationHtml } from "@platejs/math";
import { parseEditorValue } from "../../utils/editor/parsedValues";

interface RichContentRendererProps {
  nodes: string;
}

const EMPTY_DOC = [{ type: "p", children: [{ text: "" }] }];

function StaticEquation({ tex, inline }: { tex: string; inline: boolean }) {
  if (!tex) return null;
  try {
    const html = getEquationHtml({
      element: {
        type: inline ? "inlineEquation" : "equation",
        texExpression: tex,
      } as any,
      options: {
        displayMode: !inline,
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
    return (
      <span
        className={inline ? "inline-block mx-1" : "block my-2 text-center"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (_e) {
    return (
      <code className="text-xs text-rose-400 font-mono">
        {inline ? `$${tex}$` : `$$${tex}$$`}
      </code>
    );
  }
}

const StaticEquationComponent = (props: any) => {
  return (
    <div {...props.attributes} className="my-1">
      <div contentEditable={false}>
        <StaticEquation tex={props.element.texExpression} inline={false} />
      </div>
      {props.children}
    </div>
  );
};

const StaticInlineEquationComponent = (props: any) => {
  return (
    <span {...props.attributes} className="inline-block mx-1">
      <span contentEditable={false}>
        <StaticEquation tex={props.element.texExpression} inline={true} />
      </span>
      {props.children}
    </span>
  );
};

const customComponents = {
  equation: StaticEquationComponent,
  inlineEquation: StaticInlineEquationComponent,
};

const staticPlugins = getRenderPlugin(true);

export function RichContentRenderer({ nodes }: RichContentRendererProps) {
  const normalizedNodes = parseEditorValue(nodes);
  console.log("RichContentRenderer", nodes, typeof nodes);

  const value: Value = normalizedNodes.length > 0 ? normalizedNodes : EMPTY_DOC;

  const staticEditor = useMemo(() => {
    return createPlateEditor({
      id: "rich-content-static-editor",
      plugins: staticPlugins,
      components: customComponents,
    });
  }, []);

  return (
    <Plate editor={staticEditor}>
      <EditorStatic editor={staticEditor} value={value} />
    </Plate>
  );
}
