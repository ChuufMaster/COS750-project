import React, { useEffect, useRef } from "react";
import { ApollonEditor, ApollonMode, UMLDiagramType } from "@ls1intum/apollon";

// No props needed
type ApollonUmlEditorProps = {};

const ApollonUmlEditor: React.FC<ApollonUmlEditorProps> = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Simple options: Always create a new, editable Class Diagram
    const options: any = {
      mode: ApollonMode.Modelling,
      type: UMLDiagramType.ClassDiagram,
    };

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
      // --- Robust cleanup ---
      resizeObserver.disconnect();
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
      }
      if (container) {
        container.innerHTML = "";
      }
      editorRef.current = null;
    };
  }, []); // Empty dependency array, this runs only once

  return <div ref={containerRef} className="apollon-editor-container" />;
};

export default ApollonUmlEditor;
