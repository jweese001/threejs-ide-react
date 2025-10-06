import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

interface EditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onMount?: (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => void;
}

export interface EditorRef {
  insertText: (text: string) => void;
}

const Editor = forwardRef<EditorRef, EditorProps>(({ value, onChange, onMount }, ref) => {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    editorRef.current = editor;

    // Set up Monaco Editor options
    editor.updateOptions({
      theme: 'vs-dark',
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      minimap: { enabled: false },
    });

    // Add Three.js type definitions to the editor for autocompletion
    fetch('https://unpkg.com/@types/three/index.d.ts')
      .then((res) => res.text())
      .then((types) => {
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
          types,
          'three.d.ts'
        );
      });

    // Call parent onMount if provided
    if (onMount) {
      onMount(editor, monaco);
    }
  };

  // Expose a function to the parent component via the ref
  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      if (editorRef.current) {
        const position = editorRef.current.getPosition();
        editorRef.current.executeEdits('snippet-inserter', [
          {
            range: new window.monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            ),
            text: text,
          },
        ]);
        editorRef.current.focus();
      }
    },
  }));

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="javascript"
      value={value}
      onChange={onChange}
      onMount={handleEditorDidMount}
      options={{
        theme: 'vs-dark',
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        minimap: { enabled: false },
      }}
    />
  );
});

export default Editor;
