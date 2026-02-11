import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface FileTab {
  filename: string;
  isActive: boolean;
}

interface FileTabBarProps {
  tabs: FileTab[];
  onSelectTab: (filename: string) => void;
  onCloseTab: (filename: string) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function FileTabBar({
  tabs,
  onSelectTab,
  onCloseTab,
  onToggleSidebar,
  isSidebarOpen,
}: FileTabBarProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      <TouchableOpacity
        style={[styles.sidebarToggle, isSidebarOpen && styles.sidebarToggleActive]}
        onPress={onToggleSidebar}
        accessibilityRole="button"
        accessibilityLabel="Toggle sidebar"
      >
        <Text style={styles.sidebarIcon}>📁</Text>
      </TouchableOpacity>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.filename}
            style={[styles.tab, tab.isActive && styles.tabActive]}
            onPress={() => onSelectTab(tab.filename)}
            accessibilityRole="tab"
            accessibilityLabel={tab.filename}
            accessibilityState={{ selected: tab.isActive }}
          >
            <Text style={[styles.tabText, tab.isActive && styles.tabTextActive]}>
              {tab.filename}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={(e) => {
                e.stopPropagation();
                onCloseTab(tab.filename);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Close ${tab.filename}`}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 32,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  sidebarToggle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1F2937',
  },
  sidebarToggleActive: {
    backgroundColor: '#1F2937',
  },
  sidebarIcon: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  tabsContainer: {
    flex: 1,
  },
  tabsContent: {
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 32,
    borderRightWidth: 1,
    borderRightColor: '#1F2937',
    minWidth: 100,
    maxWidth: 200,
  },
  tabActive: {
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 8,
    flex: 1,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  closeButton: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 14,
  },
});
