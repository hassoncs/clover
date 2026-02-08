import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage as ChatMessageModel } from './types';

type TextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'codeblock'; value: string }
  | { kind: 'list'; items: string[] };

function parseInlineMarkdown(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];

  const listBlockPattern = /(?:^|\n)((?:[-*] .+(?:\n|$))+)/g;
  let outerCursor = 0;
  let listMatch = listBlockPattern.exec(raw);

  const parseInline = (text: string) => {
    const inlinePattern = /```([\s\S]*?)```|`([^`]+)`|\*\*(.+?)\*\*|_(.+?)_/g;
    let cursor = 0;
    let match = inlinePattern.exec(text);

    while (match !== null) {
      if (match.index > cursor) {
        segments.push({ kind: 'text', value: text.slice(cursor, match.index) });
      }
      if (match[1] !== undefined) {
        segments.push({ kind: 'codeblock', value: match[1].trim() });
      } else if (match[2] !== undefined) {
        segments.push({ kind: 'code', value: match[2] });
      } else if (match[3] !== undefined) {
        segments.push({ kind: 'bold', value: match[3] });
      } else if (match[4] !== undefined) {
        segments.push({ kind: 'italic', value: match[4] });
      }
      cursor = match.index + match[0].length;
      match = inlinePattern.exec(text);
    }

    if (cursor < text.length) {
      segments.push({ kind: 'text', value: text.slice(cursor) });
    }
  };

  while (listMatch !== null) {
    if (listMatch.index > outerCursor) {
      parseInline(raw.slice(outerCursor, listMatch.index));
    }
    const items = listMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*] /, '').trim())
      .filter(Boolean);
    segments.push({ kind: 'list', items });
    outerCursor = listMatch.index + listMatch[0].length;
    listMatch = listBlockPattern.exec(raw);
  }

  if (outerCursor < raw.length) {
    parseInline(raw.slice(outerCursor));
  }

  return segments;
}

function FormattedText({ text, baseStyle }: { text: string; baseStyle: TextStyle }) {
  const segments = parseInlineMarkdown(text);

  if (segments.length === 1 && segments[0].kind === 'text') {
    return <Text style={baseStyle}>{text}</Text>;
  }

  const hasBlockElement = segments.some(s => s.kind === 'codeblock' || s.kind === 'list');

  const segKey = (seg: TextSegment, i: number) =>
    `${seg.kind}-${i}-${'value' in seg ? seg.value.slice(0, 16) : 'list'}`;

  if (hasBlockElement) {
    return (
      <View>
        {segments.map((seg, i) => {
          const k = segKey(seg, i);
          switch (seg.kind) {
            case 'text':
              return <Text key={k} style={baseStyle}>{seg.value}</Text>;
            case 'bold':
              return <Text key={k} style={[baseStyle, { fontWeight: '700' }]}>{seg.value}</Text>;
            case 'italic':
              return <Text key={k} style={[baseStyle, { fontStyle: 'italic' }]}>{seg.value}</Text>;
            case 'code':
              return <Text key={k} style={[baseStyle, styles.inlineCode]}>{seg.value}</Text>;
            case 'codeblock':
              return (
                <View key={k} style={styles.codeBlock}>
                  <Text style={styles.codeBlockText}>{seg.value}</Text>
                </View>
              );
            case 'list':
              return (
                <View key={k} style={styles.listContainer}>
                  {seg.items.map((item, j) => (
                    <View key={`${k}-item-${item.slice(0, 16)}`} style={styles.listItem}>
                      <Text style={styles.listBullet}>{'\u2022'}</Text>
                      <Text style={[baseStyle, styles.listItemText]}>{item}</Text>
                    </View>
                  ))}
                </View>
              );
            default:
              return null;
          }
        })}
      </View>
    );
  }

  const children: React.ReactNode[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const k = segKey(seg, i);
    switch (seg.kind) {
      case 'text':
        children.push(<Text key={k}>{seg.value}</Text>);
        break;
      case 'bold':
        children.push(<Text key={k} style={{ fontWeight: '700' }}>{seg.value}</Text>);
        break;
      case 'italic':
        children.push(<Text key={k} style={{ fontStyle: 'italic' }}>{seg.value}</Text>);
        break;
      case 'code':
        children.push(
          <Text key={k} style={styles.inlineCode}>{seg.value}</Text>
        );
        break;
    }
  }

  return <Text style={baseStyle}>{children}</Text>;
}

interface UserQuestion {
  header: string;
  question: string;
  options: { label: string; description: string; iconKey?: string }[];
  multiple?: boolean;
}

interface ClarificationQuestion {
  questionId: string;
  question: string;
  stage: string;
  context?: string;
}

interface Props {
  message: ChatMessageModel;
  onSubmitUserAnswer?: (batchId: string, answers: string[][]) => void;
  onSubmitClarification?: (questionId: string, answer: string) => void;
  onRetry?: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return '1d+ ago';
}

function UserQuestionCard({ message, onSubmit }: { message: ChatMessageModel, onSubmit?: (batchId: string, answers: string[][]) => void }) {
  const payload = message.payload as { questions: UserQuestion[]; batchId: string };
  
  const [answers, setAnswers] = useState<string[][]>(
    message.pending ? payload.questions.map(() => []) : []
  );
  const [customAnswers, setCustomAnswers] = useState<string[]>(
    message.pending ? payload.questions.map(() => '') : []
  );

    const handleOptionSelect = (qIndex: number, optionLabel: string) => {
    const question = payload.questions[qIndex];
    const currentAnswers = answers[qIndex];
    let newAnswers: string[];

    if (question.multiple) {
      if (currentAnswers.includes(optionLabel)) {
        newAnswers = currentAnswers.filter(a => a !== optionLabel);
      } else {
        newAnswers = [...currentAnswers, optionLabel];
      }
    } else {
      newAnswers = [optionLabel];
    }

    const nextAnswers = [...answers];
    nextAnswers[qIndex] = newAnswers;
    setAnswers(nextAnswers);
  };

  const handleSubmit = () => {
    const finalAnswers = answers.map((ans, i) => {
      const custom = customAnswers[i].trim();
      return custom ? [...ans, custom] : ans;
    });
    onSubmit?.(payload.batchId, finalAnswers);
  };

  const isSubmitDisabled = answers.some((ans, i) => ans.length === 0 && !customAnswers[i].trim());

  if (!message.pending) {
    return (
      <View style={styles.agentContainer}>
        <View style={[styles.card, styles.cardAnswered]}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#4ADE80" />
            <Text style={styles.cardTitle}>Answered</Text>
          </View>
          <Text style={styles.cardText}>You answered these questions.</Text>
        </View>
        <Text style={styles.timestamp}>{formatTimeAgo(message.timestamp)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.agentContainer}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="help-circle-outline" size={20} color="#A1A1AA" />
          <Text style={styles.cardTitle}>Questions</Text>
        </View>
        
        {payload.questions.map((q, i) => (
          <View key={`${i}-${q.header}`} style={styles.questionContainer}>
            <Text style={styles.questionHeader}>{q.header}</Text>
            <Text style={styles.questionText}>{q.question}</Text>
            
            {q.options.map((opt, j) => {
              const isSelected = answers[i].includes(opt.label);
              return (
                <Pressable
                  key={opt.label}
                  style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                  onPress={() => handleOptionSelect(i, opt.label)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${opt.label}: ${opt.description}`}
                >
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optionDescription}>{opt.description}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#2563EB" />}
                </Pressable>
              );
            })}
            
            <TextInput
              style={styles.textInput}
              placeholder="Other (optional)..."
              placeholderTextColor="#71717A"
              value={customAnswers[i]}
              onChangeText={(text) => {
                const nextCustom = [...customAnswers];
                nextCustom[i] = text;
                setCustomAnswers(nextCustom);
              }}
              accessibilityLabel={`Custom answer for ${q.header}`}
            />
          </View>
        ))}

        <Pressable
          style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
          accessibilityRole="button"
          accessibilityLabel="Submit answers"
          accessibilityState={{ disabled: isSubmitDisabled }}
        >
          <Text style={[styles.submitButtonText, isSubmitDisabled && styles.submitButtonTextDisabled]}>
            Submit Answers
          </Text>
        </Pressable>
      </View>
      <Text style={styles.timestamp}>{formatTimeAgo(message.timestamp)}</Text>
    </View>
  );
}

function ClarificationCard({ message, onSubmit }: { message: ChatMessageModel, onSubmit?: (questionId: string, answer: string) => void }) {
  const payload = message.payload as ClarificationQuestion;
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    onSubmit?.(payload.questionId, answer);
  };

  if (!message.pending) {
    return (
      <View style={styles.agentContainer}>
        <View style={[styles.card, styles.cardAnswered]}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#4ADE80" />
            <Text style={styles.cardTitle}>Clarification Provided</Text>
          </View>
          <Text style={styles.cardText}>{payload.question}</Text>
        </View>
        <Text style={styles.timestamp}>{formatTimeAgo(message.timestamp)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.agentContainer}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="help-circle-outline" size={20} color="#A1A1AA" />
          <Text style={styles.cardTitle}>Clarification Needed</Text>
        </View>
        
        <View style={styles.stageBadge}>
          <Text style={styles.stageText}>{payload.stage}</Text>
        </View>
        
        <Text style={styles.questionText}>{payload.question}</Text>
        
        {payload.context && (
          <View style={styles.contextBox}>
            <Text style={styles.contextText}>{payload.context}</Text>
          </View>
        )}
        
        <TextInput
          style={styles.textArea}
          placeholder="Type your answer..."
          placeholderTextColor="#71717A"
          multiline
          value={answer}
          onChangeText={setAnswer}
          textAlignVertical="top"
          accessibilityLabel="Clarification answer"
        />
        
        <Pressable
          style={[styles.submitButton, !answer.trim() && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!answer.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send answer"
          accessibilityState={{ disabled: !answer.trim() }}
        >
          <Text style={[styles.submitButtonText, !answer.trim() && styles.submitButtonTextDisabled]}>
            Send Answer
          </Text>
        </Pressable>
      </View>
      <Text style={styles.timestamp}>{formatTimeAgo(message.timestamp)}</Text>
    </View>
  );
}

export function ChatMessage({ message, onSubmitUserAnswer, onSubmitClarification, onRetry }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemWrapper}>
        <View style={styles.systemContainer}>
          {message.type === 'completion' && (
            <Ionicons name="checkmark-circle" size={16} color="#4ADE80" style={styles.icon} />
          )}
          {message.type === 'error' && (
            <Ionicons name="alert-circle" size={16} color="#F87171" style={styles.icon} />
          )}
          <Text style={[
            styles.systemText,
            message.type === 'error' && styles.errorText,
            message.type === 'completion' && styles.completionText
          ]}>
            {message.text}
          </Text>
        </View>
        {message.type === 'error' && onRetry && (
          <Pressable
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Try Again"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (message.type === 'user_question') {
    return <UserQuestionCard message={message} onSubmit={onSubmitUserAnswer} />;
  }

  if (message.type === 'clarification') {
    return <ClarificationCard message={message} onSubmit={onSubmitClarification} />;
  }

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.agentContainer
    ]}>
      <View style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.agentBubble
      ]}>
        {isUser ? (
          <Text style={[styles.text, styles.userText]}>{message.text}</Text>
        ) : (
          <FormattedText text={message.text} baseStyle={StyleSheet.flatten([styles.text, styles.agentText])} />
        )}
      </View>
      <Text style={[
        styles.timestamp,
        isUser ? styles.userTimestamp : styles.agentTimestamp
      ]}>
        {formatTimeAgo(message.timestamp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  agentContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    maxWidth: '90%',
  },
  systemWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  systemContainer: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  retryButton: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    backgroundColor: 'transparent',
    borderLeftWidth: 2,
    borderLeftColor: '#3F3F46',
    borderRadius: 0,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: '#FFFFFF',
  },
  agentText: {
    color: '#A1A1AA',
  },
  systemText: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
  },
  errorText: {
    color: '#F87171',
  },
  completionText: {
    color: '#4ADE80',
  },
  icon: {
    marginRight: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#52525B',
    marginTop: 4,
    marginHorizontal: 4,
  },
  userTimestamp: {
    textAlign: 'right',
  },
  agentTimestamp: {
    textAlign: 'left',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    minWidth: 280,
  },
  cardAnswered: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A1A1AA',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  cardText: {
    fontSize: 16,
    color: '#E4E4E7',
    lineHeight: 24,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E4E4E7',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 16,
    color: '#E4E4E7',
    marginBottom: 12,
    lineHeight: 24,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionChipSelected: {
    backgroundColor: 'rgba(37,99,235,0.15)',
    borderColor: '#2563EB',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E4E4E7',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#60A5FA',
  },
  optionDescription: {
    fontSize: 13,
    color: '#A1A1AA',
  },
  textInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#E4E4E7',
    fontSize: 15,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    color: '#E4E4E7',
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#27272A',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#71717A',
  },
  stageBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  stageText: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  contextBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#A1A1AA',
  },
  contextText: {
    fontSize: 14,
    color: '#A1A1AA',
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 4,
    borderRadius: 3,
    color: '#E4E4E7',
  },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  codeBlockText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#A1A1AA',
    lineHeight: 20,
  },
  listContainer: {
    marginVertical: 6,
    paddingLeft: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  listBullet: {
    fontSize: 14,
    color: '#71717A',
    marginRight: 8,
    lineHeight: 22,
  },
  listItemText: {
    flex: 1,
  },
});
