import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const colors = {
  background: '#1F2937',
  foreground: '#E5E7EB',
  selection: 'rgba(99, 102, 241, 0.3)',
  cursor: '#6366F1',
  activeLine: 'rgba(255, 255, 255, 0.03)',
  matchingBracket: '#FFFFFF',
  matchingBracketBackground: 'rgba(99, 102, 241, 0.4)',
  gutterBackground: '#111827',
  gutterForeground: '#6B7280',
  
  keyword: '#C084FC',
  string: '#34D399',
  number: '#FB923C',
  comment: '#6B7280',
  function: '#60A5FA',
  type: '#F9A8D4',
  variable: '#E5E7EB',
  operator: '#94A3B8',
  property: '#93C5FD',
  punctuation: '#9CA3AF',
};

const theme = EditorView.theme({
  '&': {
    color: colors.foreground,
    backgroundColor: colors.background,
  },
  '.cm-content': {
    caretColor: colors.cursor,
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: colors.cursor,
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: colors.selection,
  },
  '.cm-gutters': {
    backgroundColor: colors.gutterBackground,
    color: colors.gutterForeground,
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: colors.activeLine,
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: colors.foreground,
  },
  '.cm-matchingBracket': {
    backgroundColor: colors.matchingBracketBackground,
    color: colors.matchingBracket,
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.gutterForeground,
  },
}, { dark: true });

const highlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: colors.keyword },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: colors.variable },
  { tag: [t.function(t.variableName), t.labelName], color: colors.function },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: colors.number },
  { tag: [t.definition(t.name), t.separator], color: colors.variable },
  { tag: [t.typeName, t.className, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: colors.type },
  { tag: t.number, color: colors.number },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: colors.operator },
  { tag: [t.meta, t.comment], color: colors.comment },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: colors.operator, textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: colors.keyword },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: colors.keyword },
  { tag: [t.processingInstruction, t.string, t.inserted], color: colors.string },
  { tag: t.invalid, color: '#ff0000' },
  { tag: t.punctuation, color: colors.punctuation },
  { tag: t.propertyName, color: colors.property },
]);

export const editorTheme = [theme, syntaxHighlighting(highlightStyle)];
