import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, useWindowDimensions } from "react-native";
import type { ExampleMeta } from "@/lib/registry/types";
import { env } from "@/lib/config/env";

export const metadata: ExampleMeta = {
  title: "Text Grid Generator",
  description: "Generate stylized text grids with AI-powered img2img transformation",
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
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 900;
  
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
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const [stylizedImageUrl, setStylizedImageUrl] = useState<string | null>(null);
  const [stylePrompt, setStylePrompt] = useState("puffy blue cartoon text, 3D rendered, playful, game title style");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layoutInfo, setLayoutInfo] = useState<{ cells: number; lines: number } | null>(null);

  const updatePreview = useCallback(() => {
    const width = cols * cellWidth;
    const height = rows * cellHeight + Math.max(0, rows - 1) * lineGap;
    const fill = silhouetteMode === 'fill' ? '808080' : 'none';
    const stroke = silhouetteMode === 'fill' ? 'none' : '404040';
    const strokeWidth = silhouetteMode === 'fill' ? 0 : 2;
    
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  <text x="${width / 2}" y="${height / 2}" 
        font-family="${selectedFont.family}, Arial, sans-serif"
        font-size="${fontSize}"
        fill="#${fill}"
        stroke="#${stroke}"
        stroke-width="${strokeWidth}"
        text-anchor="middle"
        dominant-baseline="middle">
    ${text.replace(/\n/g, ' ')}
  </text>
</svg>`;
    
    const dataUrl = 'data:image/svg+xml;base64,' + btoa(svgContent);
    setSvg(svgContent);
    setSvgDataUrl(dataUrl);
    setStylizedImageUrl(null);
    setLayoutInfo({ cells: text.length, lines: text.split('\n').length });
  }, [text, selectedFont, fontSize, cols, rows, cellWidth, cellHeight, lineGap, silhouetteMode]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const generateStylized = useCallback(async () => {
    if (!svg) {
      setError('No SVG to stylize');
      return;
    }

    setGenerating(true);
    setError(null);
    setStylizedImageUrl(null);

    try {
      const generateResponse = await fetch(`${env.apiUrl}/api/text-grid/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text_grid',
          id: `text-grid-${Date.now()}`,
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
            prompt: stylePrompt,
          },
          output: {
            svg: true,
          },
        }),
      });

      if (!generateResponse.ok) {
        const errData = await generateResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `HTTP ${generateResponse.status}`);
      }

      const generateData = await generateResponse.json();
      const generatedSvg = generateData.svg;

      const stylizeResponse = await fetch(`${env.apiUrl}/api/text-grid/stylize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          svg: generatedSvg,
          prompt: stylePrompt,
          strength: 0.75,
        }),
      });

      if (!stylizeResponse.ok) {
        const errData = await stylizeResponse.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(errData.error?.message || `HTTP ${stylizeResponse.status}`);
      }

      const stylizeData = await stylizeResponse.json();
      setStylizedImageUrl(stylizeData.stylizedImage);
      setLayoutInfo({
        cells: generateData.layoutDoc?.cells?.length || 0,
        lines: generateData.layoutDoc?.lines?.length || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate stylized text');
      setStylizedImageUrl(null);
    } finally {
      setGenerating(false);
    }
  }, [svg, text, selectedFont, fontSize, cols, rows, cellWidth, cellHeight, lineGap, silhouetteMode, align, wrapMode, padding, stylePrompt]);

  return (
    <View style={[styles.container, isWide && styles.containerWide]}>
      <ScrollView style={[styles.controls, isWide && styles.controlsWide]} contentContainerStyle={styles.controlsContent}>
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

        <Text style={styles.sectionTitle}>AI Style Prompt</Text>
        <TextInput
          style={styles.textInput}
          value={stylePrompt}
          onChangeText={setStylePrompt}
          multiline
          numberOfLines={3}
          placeholder="Describe the style (e.g., 'puffy blue cartoon text, 3D rendered, playful')"
          placeholderTextColor="#666"
        />

        <TouchableOpacity 
          style={styles.generateButton} 
          onPress={generateStylized} 
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>✨ Generate Stylized Text</Text>
          )}
        </TouchableOpacity>

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

      <View style={[styles.preview, isWide && styles.previewWide]}>
        {stylizedImageUrl ? (
          <ScrollView contentContainerStyle={styles.svgContainer}>
            <Text style={styles.svgPlaceholder}>✨ AI Stylized Result</Text>
            <Image
              source={{ uri: stylizedImageUrl }}
              style={{
                width: 512,
                height: 512,
                backgroundColor: '#1a1a1a',
              }}
              resizeMode="contain"
            />
          </ScrollView>
        ) : svgDataUrl ? (
          <ScrollView contentContainerStyle={styles.svgContainer}>
            <Text style={styles.svgPlaceholder}>
              Preview: {cols * cellWidth}x{rows * cellHeight + Math.max(0, rows - 1) * lineGap}
            </Text>
            <Image
              source={{ uri: svgDataUrl }}
              style={{
                width: cols * cellWidth,
                height: rows * cellHeight + Math.max(0, rows - 1) * lineGap,
                backgroundColor: '#1a1a1a',
              }}
              resizeMode="contain"
            />
          </ScrollView>
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyText}>Configure settings to see preview</Text>
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
  containerWide: {
    flexDirection: "row",
  },
  controls: {
    flex: 1,
    backgroundColor: "#111",
  },
  controlsWide: {
    flex: 0.45,
    maxWidth: 500,
    borderRightWidth: 1,
    borderRightColor: "#333",
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
  previewWide: {
    flex: 0.55,
    borderTopWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: "#333",
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
  generateButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#9C27B0",
    alignItems: "center",
    marginTop: 8,
  },
  generateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
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
