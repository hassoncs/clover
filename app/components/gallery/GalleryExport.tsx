
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Clipboard } from 'react-native';

// A simple syntax highlighter for JSON
const SyntaxHighlightedJson = ({ json }: { json: object }) => {
  const jsonString = JSON.stringify(json, null, 2);
  // This is a simplified regex-based highlighter. A real app might use a library.
  const tokens = jsonString.split(/(\"(?:\\u[a-zA-Z0-9]{4}|[^\"\\])*\"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g);

  return (
    <Text style={styles.codeText}>
      {tokens.map((token, index) => {
        if (token.startsWith('"')) {
          return (
            <Text key={index} style={styles.string}>
              {token}
            </Text>
          );
        }
        if (/\b(true|false|null)\b/.test(token)) {
          return (
            <Text key={index} style={styles.boolean}>
              {token}
            </Text>
          );
        }
        if (/-?\d+/.test(token)) {
          return (
            <Text key={index} style={styles.number}>
              {token}
            </Text>
          );
        }
        return token;
      })}
    </Text>
  );
};

type GalleryExportProps = {
  json: object;
  usageExample: string;
};

export const GalleryExport = ({ json, usageExample }: GalleryExportProps) => {
  const copyToClipboard = () => {
    Clipboard.setString(JSON.stringify(json, null, 2));
    Alert.alert('Copied!', 'Configuration copied to clipboard.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Export</Text>
      <Text style={styles.subHeader}>Usage Example</Text>
      <View style={styles.codeBlock}>
        <Text style={styles.codeText}>{usageExample}</Text>
      </View>
      <Text style={styles.subHeader}>Configuration JSON</Text>
      <ScrollView style={styles.codeBlock} contentContainerStyle={{ padding: 12 }}>
        <SyntaxHighlightedJson json={json} />
      </ScrollView>
      <Pressable onPress={copyToClipboard} style={styles.copyButton}>
        <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  header: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subHeader: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 8,
  },
  codeBlock: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    marginBottom: 16,
  },
  codeText: {
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: 14,
  },
  string: {
    color: '#ff6b6b',
  },
  number: {
    color: '#4ecdc4',
  },
  boolean: {
    color: '#ffe66d',
  },
  copyButton: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
