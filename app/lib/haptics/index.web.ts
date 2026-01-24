export type ImpactFeedbackStyle = "Light" | "Medium" | "Heavy";

export async function impactAsync(_style: ImpactFeedbackStyle = "Light"): Promise<void> {
  return;
}

export async function notificationAsync(
  _type: "Success" | "Warning" | "Error" = "Success"
): Promise<void> {
  return;
}

export async function selectionAsync(): Promise<void> {
  return;
}
