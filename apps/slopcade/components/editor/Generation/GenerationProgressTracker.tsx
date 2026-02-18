import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface TemplateConfig {
  id: string;
  name: string;
  enabled: boolean;
}

interface ModalLifecycleState {
  ready: boolean;
  phase: 'initializing' | 'downloading_models' | 'creating_symlinks' | 'starting_comfyui' | 'waiting_for_comfyui' | 'ready' | 'unknown';
  etaSeconds: number;
  elapsedSeconds: number;
  activeJobs: number;
}

const PHASE_DESCRIPTIONS: Record<ModalLifecycleState['phase'], string> = {
  initializing: 'Container starting...',
  downloading_models: 'Downloading AI models (~17GB)...',
  creating_symlinks: 'Setting up model paths...',
  starting_comfyui: 'Starting ComfyUI server...',
  waiting_for_comfyui: 'Waiting for ComfyUI to be ready...',
  ready: 'Ready',
  unknown: 'Unknown state...',
};

interface GenerationProgressTrackerProps {
  total: number;
  completed: number;
  failed: number;
  templateConfigs: TemplateConfig[];
  generatingTemplates: Set<string>;
  coldStartState?: ModalLifecycleState;
}

type TaskStatus = 'pending' | 'generating' | 'completed' | 'failed';

function ColdStartView({ state }: { state: ModalLifecycleState }) {
  const phaseDescription = PHASE_DESCRIPTIONS[state.phase] ?? PHASE_DESCRIPTIONS.unknown;
  const hasEta = state.etaSeconds > 0;

  return (
    <View style={styles.coldStartContainer}>
      <View style={styles.coldStartHeader}>
        <Text style={styles.coldStartIcon}>🌙</Text>
        <Text style={styles.coldStartTitle}>Preparing AI Server</Text>
      </View>

      <Text style={styles.coldStartPhase}>{phaseDescription}</Text>

      <View style={styles.coldStartProgressBar}>
        <View style={styles.coldStartProgressIndeterminate} />
      </View>

      <View style={styles.coldStartMeta}>
        {hasEta && (
          <Text style={styles.coldStartMetaText}>
            ~{state.etaSeconds}s remaining
          </Text>
        )}
        <Text style={styles.coldStartMetaText}>
          Started {state.elapsedSeconds}s ago
        </Text>
      </View>
    </View>
  );
}

export function GenerationProgressTracker({
  total,
  completed,
  failed,
  templateConfigs,
  generatingTemplates,
  coldStartState,
}: GenerationProgressTrackerProps) {
  const progressPercent = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const isColdStarting = coldStartState !== undefined && !coldStartState.ready;

  const getTaskStatus = (templateId: string): TaskStatus => {
    if (generatingTemplates.has(templateId)) return 'generating';
    return 'pending';
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'generating':
        return <ActivityIndicator size="small" color="#4F46E5" />;
      case 'completed':
        return <Text style={styles.statusIconCompleted}>✓</Text>;
      case 'failed':
        return <Text style={styles.statusIconFailed}>✕</Text>;
      default:
        return <View style={styles.statusIconPending} />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'generating':
        return '#4F46E5';
      case 'completed':
        return '#10B981';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      {isColdStarting && coldStartState && (
        <ColdStartView state={coldStartState} />
      )}

      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Generating Assets</Text>
        <Text style={styles.progressCount}>
          {completed + failed}/{total}
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
        <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
      </View>

      <View style={styles.taskList}>
        {templateConfigs
          .filter(t => t.enabled)
          .map(config => {
            const status = getTaskStatus(config.id);
            return (
              <View key={config.id} style={styles.taskItem}>
                <View style={styles.taskStatus}>{getStatusIcon(status)}</View>
                <Text
                  style={[styles.taskName, { color: getStatusColor(status) }]}
                  numberOfLines={1}
                >
                  {config.name}
                </Text>
              </View>
            );
          })}
      </View>

      {failed > 0 && (
        <View style={styles.failedNotice}>
          <Text style={styles.failedNoticeText}>
            {failed} asset{failed !== 1 ? 's' : ''} failed to generate
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressCount: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  progressPercent: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'monospace',
    minWidth: 40,
    textAlign: 'right',
  },
  taskList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
  },
  taskStatus: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusIconPending: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4B5563',
  },
  statusIconCompleted: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
  },
  statusIconFailed: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  taskName: {
    flex: 1,
    fontSize: 14,
  },
  failedNotice: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  failedNoticeText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },
  coldStartContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  coldStartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coldStartIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  coldStartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  coldStartPhase: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
  },
  coldStartProgressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  coldStartProgressIndeterminate: {
    width: '60%',
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  coldStartMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  coldStartMetaText: {
    color: '#6B7280',
    fontSize: 12,
  },
});
