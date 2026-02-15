import React from "react";

export const FolderIcon = ({ expanded, color = "#6366F1" }: { expanded?: boolean; color?: string }) => (
	<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d={expanded 
				? "M1.5 4.5C1.5 3.67157 2.17157 3 3 3H6.5L8 4.5H13C13.8284 4.5 14.5 5.17157 14.5 6V12C14.5 12.8284 13.8284 13.5 13 13.5H3C2.17157 13.5 1.5 12.8284 1.5 12V4.5Z"
				: "M1.5 4.5C1.5 3.67157 2.17157 3 3 3H6.5L8 4.5H13C13.8284 4.5 14.5 5.17157 14.5 6V12C14.5 12.8284 13.8284 13.5 13 13.5H3C2.17157 13.5 1.5 12.8284 1.5 12V4.5Z"
			}
			fill={color}
			fillOpacity="0.8"
		/>
	</svg>
);

export const FileIcon = ({ color = "#9CA3AF" }: { color?: string }) => (
	<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M3 1.5C2.17157 1.5 1.5 2.17157 1.5 3V13C1.5 13.8284 2.17157 14.5 3 14.5H13C13.8284 14.5 14.5 13.8284 14.5 13V5.5L10.5 1.5H3Z"
			fill={color}
			fillOpacity="0.8"
		/>
		<path d="M10.5 1.5V5.5H14.5L10.5 1.5Z" fill={color} />
	</svg>
);

export const TSIcon = () => <FileIcon color="#3178C6" />;
export const JSIcon = () => <FileIcon color="#F7DF1E" />;
export const JSONIcon = () => <FileIcon color="#A3E635" />;
export const MDIcon = () => <FileIcon color="#60A5FA" />;
export const GodotIcon = () => <FileIcon color="#478CBF" />;
export const ImageIcon = () => <FileIcon color="#F472B6" />;
export const CSSIcon = () => <FileIcon color="#3B82F6" />;
export const HTMLIcon = () => <FileIcon color="#F97316" />;
