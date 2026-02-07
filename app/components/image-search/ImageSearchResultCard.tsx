import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

interface ImageSearchResultCardProps {
  id: string;
  name: string;
  previewUrl: string;
  collection?: string;
  onPress?: (id: string) => void;
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
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: previewUrl }}
          style={styles.image}
          resizeMode="contain"
        />
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
