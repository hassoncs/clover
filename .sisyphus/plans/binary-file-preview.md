# Binary File Preview Panel

## Overview

When clicking binary files (images, audio) in the file explorer, open a preview tab instead of the code editor. Similar to VS Code's binary file preview.

## Features

### Audio Preview
- Play/pause button
- Seek/progress bar
- Volume control
- Display metadata (duration, file size, format)

### Image Preview  
- Pan-zoom canvas (like Figma/VS Code image preview)
- Zoom in/out controls
- Fit to screen / 100% / actual size options
- Display dimensions and file info

## Implementation

### New Components

1. **BinaryPreviewPanel** - Main preview component
   - Detects file type (image vs audio)
   - Renders appropriate previewer

2. **AudioPreview** - Audio player UI
   - HTML5 Audio element with custom controls
   - Fetch audio from R2/asset URL

3. **ImagePreview** - Pan-zoom canvas
   - Canvas-based rendering for performance
   - Mouse/touch drag to pan
   - Wheel/pinch to zoom
   - Min/max zoom limits

### File Detection

```typescript
// Detect binary file types
function isBinaryFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'webm'];
  return binaryExts.includes(ext || '');
}

function getFileType(filename: string): 'image' | 'audio' | 'code' {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'image';
  if (['mp3', 'wav', 'ogg', 'webm'].includes(ext || '')) return 'audio';
  return 'code';
}
```

### Integration

Modify `useWorkspaceFiles` or editor tab logic:
- When opening a file, check if it's binary
- If binary: open BinaryPreviewPanel
- If code: open normal code editor

### UI Layout

```
┌─────────────────────────────────────┐
│  Preview: sound-effect.mp3     ✕   │
├─────────────────────────────────────┤
│                                     │
│         ▶️  ───────────────  0:23   │
│                                     │
│    [🔊]                    [ℹ️]    │
│                                     │
│  Type: Audio (MP3)                  │
│  Duration: 2.3s                     │
│  Size: 45 KB                        │
│                                     │
└─────────────────────────────────────┘
```

## Tasks

- [ ] Create BinaryPreviewPanel component
- [ ] Create AudioPreview sub-component
- [ ] Create ImagePreview sub-component with pan-zoom
- [ ] Add file type detection utility
- [ ] Integrate with editor tab system
- [ ] Test with generated audio files
- [ ] Test with game assets (images)

## Open Questions

1. Should we cache fetched binary data or stream it?
2. Do we need to handle video files too?
3. Should there be a download button?
