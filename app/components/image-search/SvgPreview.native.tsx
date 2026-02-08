import { SvgUri } from "react-native-svg";

export function SvgPreview({
  uri,
  onError,
}: {
  uri: string;
  onError: () => void;
}) {
  return (
    <SvgUri uri={uri} width="70%" height="70%" onError={() => onError()} />
  );
}
