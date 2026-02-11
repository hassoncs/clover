import { useCallback } from 'react';
import ReactCodeMirror, { Extension } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { glsl } from '@slopcade/codemirror-lang-glsl';
import type { CodeEditorProps, EditorLanguage } from './types';
import { editorTheme } from './theme';

export function CodeEditor({ value, onChange, language, readOnly, testID }: CodeEditorProps) {
  const getExtensions = useCallback((lang: EditorLanguage): Extension[] => {
    switch (lang) {
      case 'typescript':
        return [javascript({ jsx: true, typescript: true })];
      case 'javascript':
        return [javascript({ jsx: true })];
      case 'json':
        return [json()];
      case 'markdown':
        return [markdown()];
      case 'css':
        return [css()];
      case 'html':
        return [html()];
      case 'glsl':
        return [glsl()];
      case 'plain':
      default:
        return [];
    }
  }, []);

  const handleChange = useCallback((val: string) => {
    onChange(val);
  }, [onChange]);

  return (
    <div 
      style={{ 
        flex: 1, 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        backgroundColor: '#1F2937' 
      }} 
      data-testid={testID}
    >
      <style>
        {`
          .cm-editor { height: 100%; }
          .cm-scroller { overflow: auto; }
        `}
      </style>
      <ReactCodeMirror
        value={value}
        height="100%"
        theme={editorTheme}
        extensions={getExtensions(language)}
        onChange={handleChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          bracketMatching: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
        }}
      />
    </div>
  );
}
