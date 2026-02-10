=== DIAGNOSTIC SCRIPT ===
#!/bin/bash
echo "--- Environment ---"
which ccache
ccache --version | head -1
ccache -s
echo "--- Configuration ---"
ccache -p | grep -E "cache_dir|max_size|sloppiness|base_dir|compiler"
echo "--- XCode Env ---"
grep -r "COMPILER_INDEX_STORE_ENABLE" app/ios/Pods/Pods.xcodeproj/project.pbxproj || echo "Index Store not explicitly disabled in Pods"
grep -r "CLANG_ENABLE_MODULES" app/ios/Pods/Pods.xcodeproj/project.pbxproj | head -1 || echo "Modules not explicitly enabled in Pods"
