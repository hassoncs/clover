export type EditorLanguage = 'typescript' | 'javascript' | 'json' | 'markdown' | 'glsl' | 'css' | 'html' | 'plain';

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: EditorLanguage;
  readOnly?: boolean;
  testID?: string;
}

export function detectLanguage(filename: string): EditorLanguage {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'glsl':
    case 'frag':
    case 'vert':
    case 'gdshader':
      return 'glsl';
    case 'css':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    default:
      return 'plain';
  }
}
