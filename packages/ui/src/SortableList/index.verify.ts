// This file is ONLY for type-checking. Never import it.
// If this file has type errors, your platform exports are out of sync.

import type * as Native from './index.native';
import type * as Web from './index.web';

type NativeKeys = keyof typeof Native;
type WebKeys = keyof typeof Web;

// These types will be 'never' if all exports match, or the missing key names if not
type MissingInWeb = Exclude<NativeKeys, WebKeys>;
type MissingInNative = Exclude<WebKeys, NativeKeys>;

// This utility type causes a compile error if T is not 'never'
type AssertNever<T extends never> = T;

// These lines will error if any exports are missing
// Error will say: Type '"missingExportName"' does not satisfy the constraint 'never'
type _CheckWebComplete = AssertNever<MissingInWeb>;
type _CheckNativeComplete = AssertNever<MissingInNative>;

export {};
