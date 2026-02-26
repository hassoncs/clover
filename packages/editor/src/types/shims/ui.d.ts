import type { ComponentType, ReactNode } from "react";

export declare const WithGodot: ComponentType<Record<string, unknown>>;
export declare const FileTree: ComponentType<Record<string, unknown>>;
export declare const MicButton: ComponentType<Record<string, unknown>>;
export declare const ShimmerText: ComponentType<Record<string, unknown>>;

export interface FileTreeData {
	[id: string]: unknown;
}

export interface FileTreeStateResult {
	selectedId?: string | null;
}

export function useFileTreeState(data?: FileTreeData): FileTreeStateResult;
export function AppDepsProvider(props: { children: ReactNode }): ReactNode;
