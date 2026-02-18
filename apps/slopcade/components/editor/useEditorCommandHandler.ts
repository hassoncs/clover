import type { RuntimeIntentMode } from "@slopcade/shared";
import type { AgUiEvent } from "@slopcade/shared/chat";
import { useCallback } from "react";
import { Platform } from "react-native";
import { useChatEventSubscription } from "@/lib/chat/ChatStreamProvider";
import { useEditor } from "./EditorProvider";

type CommandPayload = Record<string, unknown>;

function getDebugOpsForContext(contextId?: string) {
	if (Platform.OS !== "web") return null;
	const registry = (window as any).debugOpsRegistry as
		| Record<string, any>
		| undefined;
	if (!registry) return null;
	if (contextId) return registry[contextId] ?? null;
	const focusedId = (window as any).debugOpsFocusedId as string | undefined;
	return focusedId ? (registry[focusedId] ?? null) : null;
}

export function useEditorCommandHandler() {
	const {
		previewContexts,
		activeContextId,
		setActiveContext,
		runtimeRef,
		setMode,
	} = useEditor();

	const handleCommand = useCallback(
		(command: string, payload: CommandPayload) => {
			switch (command) {
				case "listContexts": {
					console.log("[EditorCommand] listContexts", {
						count: previewContexts.length,
						contexts: previewContexts.map((c) => ({
							id: c.id,
							label: c.label,
							mode: c.mode,
							runtimeIntent: c.runtimeIntent,
						})),
					});
					break;
				}

				case "switchContext": {
					const contextId = payload.contextId as string;
					if (!contextId) break;
					const exists = previewContexts.some((c) => c.id === contextId);
					if (exists) {
						setActiveContext(contextId);
						console.log("[EditorCommand] switchContext →", contextId);
					} else {
						console.warn(
							"[EditorCommand] switchContext: unknown context",
							contextId,
						);
					}
					break;
				}

				case "setRuntimeIntentMode": {
					const mode = payload.mode as RuntimeIntentMode | undefined;
					if (!mode) break;
					setMode(mode === "live" ? "live" : "author");
					console.log("[EditorCommand] setRuntimeIntentMode →", mode);
					break;
				}

				case "readState": {
					const section = (payload.section as string) ?? "all";
					const contextId = payload.contextId as string | undefined;
					const runtime = runtimeRef.current;
					if (!runtime) {
						console.warn("[EditorCommand] readState: no runtime available");
						break;
					}

					const gameState = runtime.getGameState();
					const entityManager = runtime.getEntityManager();

					if (section === "variables" || section === "all") {
						console.log("[EditorCommand] readState variables:", {
							contextId: contextId ?? activeContextId,
							variables: gameState?.variables ?? {},
							state: gameState?.state,
						});
					}
					if (section === "entities" || section === "all") {
						const entities = entityManager?.getAllEntities?.() ?? [];
						console.log("[EditorCommand] readState entities:", {
							contextId: contextId ?? activeContextId,
							count: entities.length,
						});
					}
					break;
				}

				case "updateState": {
					const key = payload.key as string | undefined;
					const value = payload.value;
					if (!key || value === undefined) break;

					const runtime = runtimeRef.current;
					if (!runtime) {
						console.warn("[EditorCommand] updateState: no runtime available");
						break;
					}
					runtime.setVariable(key, value);
					console.log("[EditorCommand] updateState", { key, value });
					break;
				}

				case "inspectTarget": {
					const operation = payload.operation as string | undefined;
					const args = (payload.args as Record<string, unknown>) ?? {};
					const contextId = payload.contextId as string | undefined;

					if (!operation) break;

					const debugOps = getDebugOpsForContext(contextId ?? activeContextId);
					if (!debugOps) {
						console.warn(
							"[EditorCommand] inspectTarget: no debugOps for context",
							contextId ?? activeContextId,
						);
						break;
					}

					const opFn = debugOps[operation];
					if (typeof opFn === "function") {
						try {
							const result = opFn.call(debugOps, args);
							if (result && typeof result.then === "function") {
								(result as Promise<unknown>).then((r: unknown) => {
									console.log(
										`[EditorCommand] inspectTarget ${operation} result:`,
										r,
									);
								});
							} else {
								console.log(
									`[EditorCommand] inspectTarget ${operation} result:`,
									result,
								);
							}
						} catch (err) {
							console.error(
								`[EditorCommand] inspectTarget ${operation} error:`,
								err,
							);
						}
					} else {
						console.warn(
							`[EditorCommand] inspectTarget: unknown operation "${operation}"`,
						);
					}
					break;
				}

				default:
					console.warn("[EditorCommand] Unknown command:", command);
			}
		},
		[previewContexts, activeContextId, setActiveContext, setMode, runtimeRef],
	);

	useChatEventSubscription(
		useCallback(
			(event: AgUiEvent) => {
				if (event.type === "EDITOR_COMMAND") {
					handleCommand(event.command, event.payload);
				}
			},
			[handleCommand],
		),
	);
}
