/**
 * System execution phases (like Unity's script execution order).
 * Systems are executed in phase order, then by priority within each phase.
 */
export var SystemPhase;
(function (SystemPhase) {
    SystemPhase[SystemPhase["PRE_UPDATE"] = 0] = "PRE_UPDATE";
    SystemPhase[SystemPhase["GAME_LOGIC"] = 1] = "GAME_LOGIC";
    SystemPhase[SystemPhase["PHYSICS"] = 2] = "PHYSICS";
    SystemPhase[SystemPhase["POST_PHYSICS"] = 3] = "POST_PHYSICS";
    SystemPhase[SystemPhase["VISUAL"] = 4] = "VISUAL";
    SystemPhase[SystemPhase["CLEANUP"] = 5] = "CLEANUP";
})(SystemPhase || (SystemPhase = {}));
//# sourceMappingURL=system-phase.js.map