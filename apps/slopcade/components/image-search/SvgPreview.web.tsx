import { Image, StyleSheet } from "react-native";

export function SvgPreview({
  uri,
  onError,
}: {
  uri: string;
  onError: () => void;
}) {
  return (
    <Image
      source={{ uri }}
      style={styles.image}
      resizeMode="contain"
      onError={() => onError()}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: 100,
    height: 100,
  },
});
