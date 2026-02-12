## 2026-02-12 Task: Initial Analysis
- Adapter pattern chosen over full ContentBlock[] migration for ChatMessageList
- Old ChatMessage type retained as adapter target (would break ChatMessage.tsx, ChatMessageList.tsx if removed)
