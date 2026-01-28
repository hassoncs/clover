import React, { useState, useCallback } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from "react-native";
import type { ExampleMeta } from "@/lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Text Grid Generator",
  description: "Test the silhouette font stylization pipeline with configurable grid, fonts, and rendering.",
};

const FONT_OPTIONS = [
  { name: "Luckiest Guy", family: "Luckiest Guy" },
  { name: "Bungee", family: "Bungee" },
  { name: "Press Start 2P", family: "Press Start 2P" },
  { name: "Roboto", family: "Roboto" },
  { name: "Montserrat", family: "Montserrat" },
  { name: "Poppins", family: "Poppins" },
];

const SILHOUETTE_MODES = ["fill", "stroke", "outline"] as const;
const ALIGN_OPTIONS = ["left", "center", "right"] as const;
const WRAP_MODES = ["word", "char"] as const;

export default function TextGridLab() {
  const [text, setText] = useState("HELLO\nWORLD");
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0]);
  const [fontSize, setFontSize] = useState(48);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(4);
  const [cellWidth, setCellWidth] = useState(64);
  const [cellHeight, setCellHeight] = useState(64);
  const [silhouetteMode, setSilhouetteMode] = useState<typeof SILHOUETTE_MODES[number]>("fill");
  const [align, setAlign] = useState<typeof ALIGN_OPTIONS[number]>("center");
  const [wrapMode, setWrapMode] = useState<typeof WRAP_MODES[number]>("word");
  const [lineGap, setLineGap] = useState(8);
  const [padding, setPadding] = useState(4);
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layoutInfo, setLayoutInfo] = useState<{ cells: number; lines: number } | null>(null);

  const generateGrid = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the API to generate the text grid
      const response = await fetch('/api/text-grid/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          grid: {
            cellW: cellWidth,
            cellH: cellHeight,
            cols,
            rows,
            maxLines: rows,
            lineGap,
            align,
          },
          wrap: {
            mode: wrapMode,
            overflow: 'truncate',
          },
          font: {
            family: selectedFont.family,
            weight: '400',
            style: 'normal',
            size: fontSize,
          },
          silhouette: {
            mode: silhouetteMode,
            padPx: padding,
            fillColor: '#808080',
            strokeColor: '#404040',
          },
          style: {
            prompt: 'stylized game title text',
          },
          output: {
            svg: true,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setSvg(data.svg);
      setLayoutInfo({
        cells: data.layoutDoc?.cells?.length || 0,
        lines: data.layoutDoc?.lines?.length || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
      setSvg(null);
    } finally {
      setLoading(false);
    }
  }, [text, selectedFont, fontSize, cols, rows, cellWidth, cellHeight, silhouetteMode, align, wrapMode, lineGap, padding]);

  const renderLocalPreview = useCallback(() => {
    // Simple local SVG preview without API call
    const width = cols * cellWidth;
    const height = rows * cellHeight + Math.max(0, rows - 1) * lineGap;
    
    const svgContent = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  <text x="${width / 2}" y="${height / 2}" 
        font-family="${selectedFont.family}, sans-serif"
        font-size="${fontSize}"
        fill="#${silhouetteMode === 'stroke' ? 'none' : '808080'}"
        stroke="#${silhouetteMode === 'fill' ? 'none' : '404040'}"
        stroke-width="${silhouetteMode === 'fill' ? 0 : 2}"
        text-anchor="middle"
        dominant-baseline="middle">
    ${text.replace(/\n/g, ' ')}
  </text>
  <text x="10" y="20" font-size="12" fill="#666">Preview Mode - Click Generate for Full Grid</text>
</svg>
    `.trim();
    
    setSvg(svgContent);
    setLayoutInfo({ cells: text.length, lines: text.split('\n').length });
  }, [text, selectedFont, fontSize, cols, rows, cellWidth, cellHeight, lineGap, silhouetteMode]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.controls} contentContainerStyle={styles.controlsContent}>
        <Text style={styles.sectionTitle}>Text</Text>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={2}
          placeholder="Enter text (use \\n for newlines)"
          placeholderTextColor="#666"
        />

        <Text style={styles.sectionTitle}>Font</Text>
        <View style={styles.buttonRow}>
          {FONT_OPTIONS.map((font) => (
            <TouchableOpacity
              key={font.family}
              style={[
                styles.button,
                selectedFont.family === font.family && styles.buttonActive,
              ]}
              onPress={() => setSelectedFont(font)}
            >
              <Text style={styles.buttonText}>{font.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Size & Spacing</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Font Size</Text>
            <TextInput
              style={styles.numberInput}
              value={String(fontSize)}
              onChangeText={(v) => setFontSize(Number(v) || 48)}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Line Gap</Text>
            <TextInput
              style={styles.numberInput}
              value={String(lineGap)}
              onChangeText={(v) => setLineGap(Number(v) || 8)}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Padding</Text>
            <TextInput
              style={styles.numberInput}
              value={String(padding)}
              onChangeText={(v) => setPadding(Number(v) || 4)}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Grid Dimensions</Text>
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cols</Text>
            <TextInput
              style={styles.numberInput}
              value={String(cols)}
              onChangeText={(v) => setCols(Number(v) || 8)}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rows</Text>
            <TextInput
              style={styles.numberInput}
              value={String(rows)}
              onChangeText={(v) => setRows(Number(v) || 4)}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cell W</Text>
            <TextInput
              style={styles.numberInput}
              value={String(cellWidth)}
              onChangeText={(v) => setCellWidth(Number(v) || 64)}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cell H</Text>
            <TextInput
              style={styles.numberInput}
              value={String(cellHeight)}
              onChangeText={(v) => setCellHeight(Number(v) || 64)}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Render Mode</Text>
        <View style={styles.buttonRow}>
          {SILHOUETTE_MODES.map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.button,
                silhouetteMode === mode && styles.buttonActive,
              ]}
              onPress={() => setSilhouetteMode(mode)}
            >
              <Text style={styles.buttonText}>{mode}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Alignment & Wrap</Text>
        <View style={styles.row}>
          <View style={styles.buttonRow}>
            {ALIGN_OPTIONS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[
                  styles.button,
                  align === a && styles.buttonActive,
                ]}
                onPress={() => setAlign(a)}
              >
                <Text style={styles.buttonText}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.buttonRow}>
            {WRAP_MODES.map((w) => (
              <TouchableOpacity
                key={w}
                style={[
                  styles.button,
                  wrapMode === w && styles.buttonActive,
                ]}
                onPress={() => setWrapMode(w)}
              >
                <Text style={styles.buttonText}>{w} wrap</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.previewButton} onPress={renderLocalPreview}>
            <Text style={styles.previewButtonText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.generateButton} onPress={generateGrid} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>Generate Grid</Text>
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {layoutInfo && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Cells: {layoutInfo.cells} | Lines: {layoutInfo.lines}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.preview}>
        {svg ? (
          <ScrollView contentContainerStyle={styles.svgContainer}>
            {/* Note: In a real implementation, use react-native-svg or webview */}
            <Text style={styles.svgPlaceholder}>SVG Preview ({cols * cellWidth}x{rows * cellHeight})</Text>
            <Text style={styles.svgCode} numberOfLines={10}>
              {svg.substring(0, 500)}...
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyText}>Configure settings and tap Preview or Generate</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  controls: {
    flex: 1,
    backgroundColor: "#111",
  },
  controlsContent: {
    padding: 16,
    gap: 16,
  },
  preview: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  sectionTitle: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#222",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 60,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#333",
  },
  buttonActive: {
    backgroundColor: "#FFD700",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    color: "#999",
    fontSize: 11,
    marginBottom: 4,
  },
  numberInput: {
    backgroundColor: "#222",
    color: "#fff",
    padding: 8,
    borderRadius: 6,
    textAlign: "center",
    fontSize: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  previewButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#444",
    alignItems: "center",
  },
  previewButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  generateButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    alignItems: "center",
  },
  generateButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: "#ff444433",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  errorText: {
    color: "#ff6666",
  },
  infoBox: {
    backgroundColor: "#444433",
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    color: "#cccc99",
  },
  svgContainer: {
    padding: 16,
  },
  svgPlaceholder: {
    color: "#666",
    fontSize: 14,
    marginBottom: 8,
  },
  svgCode: {
    color: "#888",
    fontSize: 10,
    fontFamily: "monospace",
  },
  emptyPreview: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    padding: 32,
  },
});
