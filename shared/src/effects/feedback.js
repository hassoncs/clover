// ---------------------------------------------------------------------------
// Feedback manager — centralized lifecycle for all feedback buffers
// ---------------------------------------------------------------------------
function makeInitialState(id, policy) {
    return {
        id,
        policy,
        currentReadIndex: 0,
        currentWriteIndex: 1,
        initialized: false,
        frameCount: 0,
        frozen: false,
    };
}
function requireBuffer(buffers, id) {
    const state = buffers.get(id);
    if (!state) {
        throw new Error(`Feedback buffer '${id}' not found`);
    }
    return state;
}
export class FeedbackManager {
    buffers = new Map();
    register(id, policy) {
        if (this.buffers.has(id)) {
            throw new Error(`Feedback buffer '${id}' is already registered`);
        }
        this.buffers.set(id, makeInitialState(id, policy));
    }
    unregister(id) {
        return this.buffers.delete(id);
    }
    initialize(id) {
        const state = requireBuffer(this.buffers, id);
        state.initialized = true;
    }
    getState(id) {
        return this.buffers.get(id);
    }
    swap(id) {
        const state = requireBuffer(this.buffers, id);
        if (!state.initialized) {
            throw new Error(`Feedback buffer '${id}' is not initialized`);
        }
        if (state.frozen) {
            throw new Error(`Feedback buffer '${id}' is frozen`);
        }
        const prevRead = state.currentReadIndex;
        state.currentReadIndex = state.currentWriteIndex;
        state.currentWriteIndex = prevRead;
        state.frameCount++;
    }
    stop(id) {
        const state = requireBuffer(this.buffers, id);
        if (state.policy.stopBehavior === 'freeze') {
            state.frozen = true;
        }
        else {
            state.currentReadIndex = 0;
            state.currentWriteIndex = 1;
            state.initialized = false;
            state.frameCount = 0;
            state.frozen = false;
        }
    }
    resume(id) {
        const state = requireBuffer(this.buffers, id);
        if (!state.frozen) {
            throw new Error(`Feedback buffer '${id}' is not frozen`);
        }
        state.frozen = false;
    }
    reset(id) {
        const state = requireBuffer(this.buffers, id);
        const resetState = makeInitialState(id, state.policy);
        this.buffers.set(id, resetState);
    }
    isReadable(id) {
        const state = this.buffers.get(id);
        if (!state || !state.initialized)
            return false;
        if (state.policy.initMode === 'seedFromInput' && state.frameCount === 0) {
            return false;
        }
        return true;
    }
    getAllIds() {
        return Array.from(this.buffers.keys()).sort();
    }
    validate() {
        const errors = [];
        for (const [id, state] of this.buffers) {
            if (state.currentReadIndex === state.currentWriteIndex) {
                errors.push(`Buffer '${id}': read and write indices are the same (${state.currentReadIndex})`);
            }
            if (state.frozen && !state.initialized) {
                errors.push(`Buffer '${id}': frozen but not initialized`);
            }
            if (state.currentReadIndex !== 0 && state.currentReadIndex !== 1) {
                errors.push(`Buffer '${id}': invalid read index ${state.currentReadIndex}`);
            }
            if (state.currentWriteIndex !== 0 && state.currentWriteIndex !== 1) {
                errors.push(`Buffer '${id}': invalid write index ${state.currentWriteIndex}`);
            }
            if (state.frameCount < 0) {
                errors.push(`Buffer '${id}': negative frame count ${state.frameCount}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    getFrameCount(id) {
        const state = this.buffers.get(id);
        if (!state)
            return -1;
        return state.frameCount;
    }
}
//# sourceMappingURL=feedback.js.map