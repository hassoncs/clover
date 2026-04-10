export type EntityTarget = {
    type: "self";
} | {
    type: "by_id";
    entityId: string;
} | {
    type: "by_tag";
    tag: string;
} | {
    type: "touched";
} | {
    type: "player";
} | {
    type: "other";
};
//# sourceMappingURL=targeting.d.ts.map