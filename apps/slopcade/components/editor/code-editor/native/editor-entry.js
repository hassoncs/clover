import { EditorView, basicSetup } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const languageCompartment = new Compartment();
const readOnlyCompartment = new Compartment();

const theme = EditorView.theme(
  {
    '&': {
      color: '#E5E7EB',
      backgroundColor: '#1F2937',
      height: '100%',
    },
    '.cm-content': {
      caretColor: '#6366F1',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#6366F1',
    },
    '.cm-gutters': {
      backgroundColor: '#111827',
      color: '#9CA3AF',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1F2937',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(99, 102, 241, 0.32) !important',
    },
  },
  { dark: true }
);

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#C084FC' },
  { tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName], color: '#93C5FD' },
  { tag: [tags.function(tags.variableName), tags.labelName], color: '#FCA5A5' },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: '#F59E0B' },
  { tag: [tags.definition(tags.name), tags.separator], color: '#E5E7EB' },
  { tag: [tags.className], color: '#A5B4FC' },
  { tag: [tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: '#86EFAC' },
  { tag: [tags.typeName], color: '#67E8F9' },
  { tag: [tags.operator, tags.operatorKeyword], color: '#F9A8D4' },
  { tag: [tags.url, tags.escape, tags.regexp, tags.link], color: '#34D399' },
  { tag: [tags.meta, tags.comment], color: '#6B7280' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: '#60A5FA', textDecoration: 'underline' },
  { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: '#F59E0B' },
  { tag: [tags.processingInstruction, tags.string, tags.inserted], color: '#A7F3D0' },
  { tag: tags.invalid, color: '#F87171' },
]);

const postMessage = (message) => {
  if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
};

const getLanguageExtension = (language) => {
  switch (language) {
    case 'typescript':
      return javascript({ typescript: true });
    case 'javascript':
      return javascript();
    case 'json':
      return json();
    case 'markdown':
      return markdown();
    case 'css':
      return css();
    case 'html':
      return html();
    case 'glsl':
    case 'plain':
    default:
      return [];
  }
};

const updateContent = (nextValue) => {
  if (!window._editorView) return;
  const currentValue = window._editorView.state.doc.toString();
  if (currentValue === nextValue) return;
  window._editorView.dispatch({
    changes: { from: 0, to: window._editorView.state.doc.length, insert: nextValue },
  });
};

const setLanguage = (language) => {
  if (!window._editorView) return;
  window._editorView.dispatch({
    effects: languageCompartment.reconfigure(getLanguageExtension(language)),
  });
};

const setReadOnly = (readOnly) => {
  if (!window._editorView) return;
  window._editorView.dispatch({
    effects: readOnlyCompartment.reconfigure([
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
    ]),
  });
};

window.dispatchBridgeMessage = (message) => {
  if (!message || typeof message !== 'object') return;
  switch (message.type) {
    case 'setContent':
      updateContent(typeof message.value === 'string' ? message.value : '');
      break;
    case 'setLanguage':
      setLanguage(message.language);
      break;
    case 'setReadOnly':
      setReadOnly(Boolean(message.readOnly));
      break;
  }
};

window._editorView = new EditorView({
  parent: document.getElementById('editor'),
  state: EditorState.create({
    doc: '',
    extensions: [
      basicSetup,
      oneDark,
      theme,
      syntaxHighlighting(highlightStyle),
      languageCompartment.of(getLanguageExtension('typescript')),
      readOnlyCompartment.of([EditorState.readOnly.of(false), EditorView.editable.of(true)]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          postMessage({ type: 'change', value: update.state.doc.toString() });
        }
      }),
    ],
  }),
});

postMessage({ type: 'ready' });
