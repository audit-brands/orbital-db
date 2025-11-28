// SQL Editor component - minimal Monaco editor wrapper

import { useEffect, useRef } from 'react';
import Editor, { OnMount, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';

// Configure Monaco to use bundled files instead of CDN (required for CSP)
loader.config({ monaco });

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  readOnly?: boolean;
  theme: 'light' | 'dark';
  profileId?: string;
}

export default function SqlEditor({ value, onChange, onExecute, readOnly, theme, profileId }: SqlEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const onExecuteRef = useRef(onExecute);

  // Keep the onExecute ref up to date
  useEffect(() => {
    onExecuteRef.current = onExecute;
  }, [onExecute]);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Add Cmd/Ctrl+Enter keybinding for query execution
    editor.addCommand(
      // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter
      2048 | 3, // CtrlCmd + Enter
      () => {
        onExecuteRef.current();
      }
    );

    // Register DuckDB autocomplete provider if profileId is available
    if (profileId && window.orbitalDb?.query?.autocomplete && monacoInstance) {
      monacoInstance.languages.registerCompletionItemProvider('sql', {
        triggerCharacters: [' ', '.', '(', ','],
        provideCompletionItems: async (model, position) => {
          try {
            // Get text up to cursor position
            const textUntilPosition = model.getValueInRange({
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            });

            // Call DuckDB's native autocomplete
            const suggestions = await window.orbitalDb.query.autocomplete(profileId, textUntilPosition);

            // Get the word at cursor position to determine replacement range
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            // Convert DuckDB suggestions to Monaco completion items
            return {
              suggestions: suggestions.map((suggestion) => ({
                label: suggestion,
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                insertText: suggestion,
                range: range,
              })),
            };
          } catch (error) {
            // Silently fail on autocomplete errors
            return { suggestions: [] };
          }
        },
      });
    }

    // Focus the editor
    editor.focus();
  };

  useEffect(() => {
    // Update editor theme when app theme changes
    if (editorRef.current) {
      const globalWindow = window as typeof window & { monaco?: { editor: { setTheme: (theme: string) => void } } };
      if (globalWindow.monaco) {
        globalWindow.monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
      }
    }
  }, [theme]);

  return (
    <Editor
      height="200px"
      language="sql"
      value={value}
      onChange={(newValue) => onChange(newValue || '')}
      onMount={handleEditorDidMount}
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      options={{
        // Minimal, clean configuration
        minimap: { enabled: false },
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
        renderLineHighlight: 'line',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        fontSize: 14,
        fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
        padding: { top: 8, bottom: 8 },
        readOnly: readOnly || false,
        wordWrap: 'on',
        wrappingStrategy: 'advanced',

        // Enable autocomplete
        suggest: {
          showMethods: true,
          showFunctions: true,
          showKeywords: true,
          showWords: false,
          showSnippets: false,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        acceptSuggestionOnEnter: 'on',
        suggestOnTriggerCharacters: true,
        parameterHints: { enabled: false },
        codeLens: false,
        contextmenu: true,

        // Keep useful features
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: true,
        bracketPairColorization: { enabled: true },
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: 'never',
          seedSearchStringFromSelection: 'selection',
        },
      }}
    />
  );
}
