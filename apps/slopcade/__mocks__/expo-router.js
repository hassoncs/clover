import React from "react";

export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
  navigate: () => {},
  canGoBack: () => false,
  setParams: () => {},
});

export const useLocalSearchParams = () => ({});
export const useGlobalSearchParams = () => ({});
export const usePathname = () => "/";
export const useSegments = () => [];
export const useNavigation = () => ({});
export const useFocusEffect = (cb) => {};
export const useRootNavigation = () => ({});
export const useRootNavigationState = () => ({});

export const Link = ({ children, href, ...props }) =>
  React.createElement("a", { href, ...props }, children);

export const Redirect = ({ href }) => null;

export const Stack = ({ children }) => React.createElement(React.Fragment, null, children);
Stack.Screen = ({ children }) => React.createElement(React.Fragment, null, children);

export const Tabs = ({ children }) => React.createElement(React.Fragment, null, children);
Tabs.Screen = ({ children }) => React.createElement(React.Fragment, null, children);

export const Drawer = ({ children }) => React.createElement(React.Fragment, null, children);
Drawer.Screen = ({ children }) => React.createElement(React.Fragment, null, children);

export const Slot = ({ children }) => React.createElement(React.Fragment, null, children);

export const ErrorBoundary = ({ children }) => React.createElement(React.Fragment, null, children);

export const withLayoutContext = (Nav) => Nav;

export default { useRouter, Link, Stack, Tabs, Drawer, Slot };
