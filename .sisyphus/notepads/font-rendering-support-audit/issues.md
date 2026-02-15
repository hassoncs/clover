# Issues: Font Rendering Support Audit

- **Split-Brain Typography**: Jarring inconsistency between Godot (custom fonts) and React Native (system fonts).
- **Dead APIs**: `FontPreset` and `OverlayTheme.fontFamily` are defined in types but non-functional in implementation.
- **Network Dependency**: Complete lack of bundled fonts makes the system fragile in offline scenarios.
- **Silent Failures**: Both layers currently fail silently when a font cannot be loaded, providing no feedback to authors.
