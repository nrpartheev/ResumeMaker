import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { html } from "@codemirror/legacy-modes/mode/xml";
import { EditorView } from "@codemirror/view";

const theme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": { padding: "16px 0" },
  ".cm-line": { padding: "0 12px" },
});

export function HtmlEditor({ value, onChange, readOnly }: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      readOnly={readOnly}
      basicSetup={{ lineNumbers: true, highlightActiveLine: true, highlightActiveLineGutter: true, foldGutter: true, bracketMatching: true }}
      extensions={[StreamLanguage.define(html), EditorView.lineWrapping, theme]}
      onChange={(next) => onChange?.(next)}
      style={{ height: "100%" }}
    />
  );
}
