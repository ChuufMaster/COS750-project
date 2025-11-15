import React, { useEffect, useRef } from "react";
import { ApollonEditor, ApollonMode, UMLDiagramType } from "@ls1intum/apollon";

type ApollonUmlEditorProps = {};

const ApollonUmlEditor: React.FC<ApollonUmlEditorProps> = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null); // Keep using 'any'

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Prevent re-initialization if container is not empty
    // This is a guard against the Strict Mode double-mount
    if (container.children.length > 0) {
      return;
    }

    const editor = new ApollonEditor(container, {
      type: UMLDiagramType.ClassDiagram,
      mode: ApollonMode.Modelling,
    });
    editorRef.current = editor;

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

      // 👇 ADD THIS LINE
      // Force-clear the container div so the *next* mount
      // gets a truly clean element.
      if (container) {
        container.innerHTML = "";
      }

      editorRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        border: "1px solid #b5b5b5ff",
        borderRadius: 8,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    />
  );
};

export default ApollonUmlEditor;
