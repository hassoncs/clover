import { PenCanvasPanel } from "@slopcade/design-canvas";
import type { PenDocument, PenNode } from "@slopcade/shared/types/pen";
import { parsePenDocument } from "@slopcade/shared/types/pen";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { applyDesignChatOpsToDocument } from "../lib/designChatOps";
import { usePencilBridge } from "../lib/usePencilBridge";
import { usePencilServer } from "../lib/usePencilServer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SAMPLE_PEN = require("../assets/sample.json");
const LOCAL_DOC_KEY = "pencil:last-document";

function createEmptyDocument(): PenDocument {
  return { version: 1, children: [] };
}

function persistDocument(doc: PenDocument) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_DOC_KEY, JSON.stringify(doc));
}

function loadSampleDocument(): PenDocument {
  try {
    if (typeof window !== "undefined") {
      const persisted = window.localStorage.getItem(LOCAL_DOC_KEY);
      if (persisted) return parsePenDocument(JSON.parse(persisted));
    }
    return parsePenDocument(SAMPLE_PEN);
  } catch {
    return createEmptyDocument();
  }
}

export default function PencilScreen() {
  const [document, setDocument] = useState<PenDocument>(loadSampleDocument);
  const [selectedNodePaths, setSelectedNodePaths] = useState<string[][]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const selectedNodePath = selectedNodePaths[0] ?? null;

  const bridgeOptions = useMemo(
    () => ({
      onNewDocument: () => {
        setDocument(createEmptyDocument());
        setSelectedNodePaths([]);
      },
      onSaveDocument: () => persistDocument(document),
    }),
    [document]
  );

  usePencilBridge(document, setDocument, selectedNodePaths, bridgeOptions);

  // Connect to Pencil Server
  const { isConnected, agentCursors } = usePencilServer({
    document,
    setDocument,
    onDocumentChange: (doc) => {
      persistDocument(doc);
    },
  });

  useEffect(() => {
    persistDocument(document);
  }, [document]);

  const handleAddNode = useCallback((node: PenNode) => {
    setDocument((prev) => ({ ...prev, children: [...prev.children, node] }));
  }, []);

  const handleNewDocument = useCallback(() => {
    setDocument(createEmptyDocument());
    setSelectedNodePaths([]);
  }, []);

  const handleSaveDocument = useCallback(() => {
    if (typeof window === "undefined") return;
    const json = JSON.stringify(document, null, 2);
    persistDocument(document);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `pencil-${Date.now()}.pen.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [document]);

  const handleLoadDocument = useCallback(() => {
    if (typeof window === "undefined") return;
    const input = window.document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json,.pen";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = parsePenDocument(JSON.parse(text));
      setDocument(parsed);
      setSelectedNodePaths([]);
      persistDocument(parsed);
    };
    input.click();
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.toolbar}>
        <Pressable style={styles.toolbarButton} onPress={handleNewDocument}>
          <Text style={styles.toolbarButtonText}>New</Text>
        </Pressable>
        <Pressable style={styles.toolbarButton} onPress={handleLoadDocument}>
          <Text style={styles.toolbarButtonText}>Load</Text>
        </Pressable>
        <Pressable style={styles.toolbarButton} onPress={handleSaveDocument}>
          <Text style={styles.toolbarButtonText}>Save</Text>
        </Pressable>
        <Text style={styles.toolbarMeta}>
          {selectedNodePaths.length} selected
          {isConnected ? " • Server" : " • Local"}
        </Text>
      </View>
      <View style={styles.container}>
        <View style={styles.canvas}>
          <PenCanvasPanel
            document={document}
            onAddNode={handleAddNode}
            onDocumentChange={setDocument}
            selectedNodePaths={selectedNodePaths}
            onSelectionChange={setSelectedNodePaths}
            agentCursors={agentCursors}
          />
        </View>

        {chatOpen && (
          <View style={styles.sidebar}>
            <ChatSidebar
              onClose={() => setChatOpen(false)}
              selectedNodePath={selectedNodePath}
              document={document}
              onApplyOps={(ops) => {
                let appliedOps = 0;
                let errors: string[] = [];
                setDocument((prev) => {
                  const result = applyDesignChatOpsToDocument(prev, ops);
                  appliedOps = result.appliedOps;
                  errors = result.errors;
                  return result.nextDocument;
                });
                return { appliedOps, errors };
              }}
            />
          </View>
        )}

        {!chatOpen && (
          <Pressable
            style={styles.openChatButton}
            onPress={() => setChatOpen(true)}
          >
            <Text style={styles.openChatButtonText}>✦ Chat</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ops?: unknown[];
  appliedOps?: number;
  opErrors?: string[];
}

interface ChatSidebarProps {
  onClose: () => void;
  selectedNodePath: string[] | null;
  document: PenDocument;
  onApplyOps: (ops: unknown[]) => { appliedOps: number; errors: string[] };
}

function ChatSidebar({
  onClose,
  selectedNodePath,
  document,
  onApplyOps,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your AI design assistant. Describe what you'd like to create or explore.",
    },
  ]);
  const [input, setInput] = useState("");
  const sendMessageMutation = trpc.designChat.sendMessage.useMutation();
  const isSending = sendMessageMutation.isPending;
  const scrollRef = useRef<ScrollView>(null);

  const contextHint = selectedNodePath?.length
    ? `Node ${selectedNodePath[selectedNodePath.length - 1].slice(
        0,
        8
      )} selected`
    : null;

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const result = await sendMessageMutation.mutateAsync({
        message: text,
        documentJson: JSON.stringify(document),
        selectedFrameId: selectedNodePath?.[0] ?? undefined,
        selectedElementId: selectedNodePath?.[1] ?? undefined,
      });

      const { appliedOps, errors } = onApplyOps(result.ops);

      const reply: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.reply,
        ops: result.ops,
        appliedOps,
        opErrors: errors,
      };
      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [
    document,
    input,
    isSending,
    onApplyOps,
    sendMessageMutation,
    selectedNodePath,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>✦ AI Chat</Text>
        {contextHint && (
          <View style={styles.contextPill}>
            <Text style={styles.contextText}>{contextHint}</Text>
          </View>
        )}
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: false })
        }
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === "user" ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.role === "user" ? styles.userText : styles.aiText,
              ]}
            >
              {msg.content}
            </Text>
            {msg.role === "assistant" && Array.isArray(msg.ops) && (
              <View style={styles.toolCallRow}>
                <Text style={styles.toolCallText}>
                  Applied {msg.appliedOps ?? 0}/{msg.ops.length} ops
                </Text>
              </View>
            )}
            {msg.role === "assistant" &&
              Array.isArray(msg.ops) &&
              msg.ops.length > 0 && (
                <Text style={styles.opsPreviewText}>
                  {JSON.stringify(msg.ops)}
                </Text>
              )}
            {msg.role === "assistant" && (msg.opErrors?.length ?? 0) > 0 && (
              <Text style={styles.opErrorsText}>
                {msg.opErrors?.join("\n")}
              </Text>
            )}
          </View>
        ))}
        {isSending && (
          <View style={styles.aiBubble}>
            <Text style={styles.aiText}>…</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Describe what to design…"
          placeholderTextColor="#6460a0"
          multiline
          maxLength={2000}
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <Pressable
          onPress={send}
          disabled={!input.trim() || isSending}
          style={({ pressed }) => [
            styles.sendButton,
            (!input.trim() || isSending || pressed) &&
              styles.sendButtonDisabled,
          ]}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050310",
  },
  container: {
    flex: 1,
    flexDirection: "row",
  },
  toolbar: {
    height: 44,
    borderBottomWidth: 1,
    borderBottomColor: "#2d2650",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  toolbarButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#16122d",
    borderWidth: 1,
    borderColor: "#2d2650",
    borderRadius: 8,
  },
  toolbarButtonText: {
    color: "#e8e3ff",
    fontSize: 12,
    fontWeight: "600",
  },
  toolbarMeta: {
    marginLeft: "auto",
    color: "#a096c8",
    fontSize: 11,
  },
  canvas: {
    flex: 1,
  },
  sidebar: {
    width: 320,
    borderLeftWidth: 1,
    borderLeftColor: "#2d2650",
  },
  openChatButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#818cf8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#818cf8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  openChatButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#0d0a1e",
    flexDirection: "column",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2d2650",
    gap: 8,
  },
  chatTitle: {
    color: "#f0ebff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    flex: 1,
  },
  contextPill: {
    backgroundColor: "#16122d",
    borderWidth: 1,
    borderColor: "#2d2650",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  contextText: {
    color: "#a096c8",
    fontSize: 10,
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: "#6460a0",
    fontSize: 14,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#818cf8",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#16122d",
    borderWidth: 1,
    borderColor: "#2d2650",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  userText: {
    color: "#fff",
  },
  aiText: {
    color: "#e8e3ff",
  },
  toolCallRow: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0d0a1e",
    borderWidth: 1,
    borderColor: "#2d2650",
  },
  toolCallText: {
    color: "#a096c8",
    fontSize: 11,
    fontWeight: "600",
  },
  opsPreviewText: {
    marginTop: 6,
    color: "#8a82b8",
    fontSize: 10,
    lineHeight: 14,
    fontFamily: "monospace",
  },
  opErrorsText: {
    marginTop: 6,
    color: "#fca5a5",
    fontSize: 10,
    lineHeight: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#2d2650",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#050310",
    borderWidth: 1,
    borderColor: "#2d2650",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#f0ebff",
    fontSize: 13,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#818cf8",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
