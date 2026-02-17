export const ImpactFeedbackStyle = {
	Light: "light",
	Medium: "medium",
	Heavy: "heavy",
};

export const NotificationFeedbackType = {
	Success: "success",
	Warning: "warning",
	Error: "error",
};

export const selectionAsync = () => Promise.resolve();
export const impactAsync = () => Promise.resolve();
export const notificationAsync = () => Promise.resolve();

export default {
	ImpactFeedbackStyle,
	NotificationFeedbackType,
	selectionAsync,
	impactAsync,
	notificationAsync,
};
