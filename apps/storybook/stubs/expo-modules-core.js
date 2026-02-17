export function registerWebModule() {}
export function createWebModule() {
	return {};
}
export class NativeModule {}
export class SharedObject {}
export const Platform = {
	OS: "web",
	select: (specifics) => specifics?.web ?? specifics?.default,
};
export class EventEmitter {
	addListener() {
		return { remove() {} };
	}
	removeAllListeners() {}
	emit() {}
}
export class CodedError extends Error {
	constructor(code, message) {
		super(message);
		this.code = code;
	}
}
export class UnavailabilityError extends CodedError {
	constructor(moduleName, propertyName) {
		super("ERR_UNAVAILABLE", `${moduleName}.${propertyName} is not available`);
	}
}
export function requireNativeModule() {
	return {};
}
export function requireOptionalNativeModule() {
	return null;
}
export default {};
