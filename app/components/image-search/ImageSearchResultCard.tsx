import { memo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SvgPreview } from "./SvgPreview";

interface ImageSearchResultCardProps {
  id: string;
  name: string;
  previewUrl: string;
  collection?: string;
  onPress?: (id: string) => void;
}

function PreviewImage({ uri }: { uri: string }) {
  const [error, setError] = useState(false);
  const isSvg = uri.includes(".svg");

  if (isSvg && !error) {
    return <SvgPreview uri={uri} onError={() => setError(true)} />;
  }

  return (
    <Image
      source={{ uri }}
      style={styles.image}
      resizeMode="contain"
    />
  );
}

export const ImageSearchResultCard = memo(function ImageSearchResultCard({
  id,
  name,
  previewUrl,
  collection,
  onPress,
}: ImageSearchResultCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress?.(id)}
      accessibilityRole="button"
      accessibilityLabel={`${name}${collection ? ` from ${collection}` : ''}`}
    >
      <View style={styles.imageContainer}>
        <PreviewImage uri={previewUrl} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {collection && (
        <Text style={styles.collection} numberOfLines={1}>
          {collection}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    backgroundColor: "#1A1C22",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 8,
    alignItems: "center",
  },
  cardPressed: {
    opacity: 0.7,
    backgroundColor: "#22252E",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#12141A",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    overflow: "hidden",
  },
  image: {
    width: "70%",
    height: "70%",
  },
  name: {
    color: "#E8E9EC",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  collection: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
});
