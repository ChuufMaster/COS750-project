import React, { useEffect, useRef } from "react";
import { ApollonEditor, ApollonMode, UMLDiagramType } from "@ls1intum/apollon";

// A simplified type for the model
type ApollonModel = {
  elements: any[];
  relationships: any[];
};

type ApollonUmlEditorProps = {
  initialModel?: ApollonModel | undefined;
  readOnly?: boolean; // Prop to make editor un-editable
};

const ApollonUmlEditor: React.FC<ApollonUmlEditorProps> = ({
  initialModel,
  readOnly = false, // Default to false (editable)
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Determine the mode based on the prop
    const editorMode = readOnly
      ? ApollonMode.Presentation // Read-only mode
      : ApollonMode.Modelling;

    const options: any = {
      type: UMLDiagramType.ClassDiagram,
      mode: editorMode,
    };

    if (initialModel) {
      options.model = initialModel;
    }

    const editor = new ApollonEditor(container, options);
    editorRef.current = editor;

    // --- ResizeObserver logic ---
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !editorRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0 && editorRef.current.resize) {
        editorRef.current.resize(w, h);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
      }
      editorRef.current = null;
    };
  }, [initialModel, readOnly]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        // These styles are applied from your CSS:
        // border: "1px solid #444",
        // borderRadius: 8,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    />
  );
};

export default ApollonUmlEditor;
