import * as ExpoHaptics from "expo-haptics";

export type ImpactFeedbackStyle = "Light" | "Medium" | "Heavy";

const styleMap = {
  Light: ExpoHaptics.ImpactFeedbackStyle.Light,
  Medium: ExpoHaptics.ImpactFeedbackStyle.Medium,
  Heavy: ExpoHaptics.ImpactFeedbackStyle.Heavy,
};

const typeMap = {
  Success: ExpoHaptics.NotificationFeedbackType.Success,
  Warning: ExpoHaptics.NotificationFeedbackType.Warning,
  Error: ExpoHaptics.NotificationFeedbackType.Error,
};

export async function impactAsync(style: ImpactFeedbackStyle = "Light"): Promise<void> {
  return ExpoHaptics.impactAsync(styleMap[style]);
}

export async function notificationAsync(
  type: "Success" | "Warning" | "Error" = "Success"
): Promise<void> {
  return ExpoHaptics.notificationAsync(typeMap[type]);
}

export async function selectionAsync(): Promise<void> {
  return ExpoHaptics.selectionAsync();
}
