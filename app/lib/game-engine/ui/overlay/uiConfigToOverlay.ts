import type { OverlayConfig, OverlayElement } from '@slopcade/shared';

interface LegacyUIConfig {
  showTimer?: boolean;
  timerCountdown?: boolean;
  backgroundColor?: string;
  entityCountDisplays?: Array<{ tag: string; label: string; color?: string }>;
  variableDisplays?: Array<{
    name: string;
    label: string;
    position?: 'top-left' | 'top-right' | 'top-center';
    color?: string;
    format?: string;
    showWhen?: 'always' | 'not_default';
    defaultValue?: number | string | boolean;
  }>;
}

export function uiConfigToOverlay(ui: LegacyUIConfig): OverlayConfig {
  const elements: OverlayElement[] = [];
  let topLeftY = 16;
  let topCenterY = 16;
  let topRightY = 16;

  for (const display of ui.entityCountDisplays ?? []) {
    elements.push({
      id: `count-${display.tag}`,
      type: 'text',
      anchor: 'top-left',
      offset: { x: 16, y: topLeftY },
      fontSize: 18,
      fontWeight: 'bold',
      color: display.color ?? '#FFFFFF',
      bindings: { text: `${display.label.toUpperCase()}\n{{entityCount('${display.tag}')}}` },
      style: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
      },
    });
    topLeftY += 56;
  }

  for (const display of ui.variableDisplays ?? []) {
    const anchor = display.position === 'top-right' ? 'top-right' as const
      : display.position === 'top-center' ? 'top-center' as const
      : 'top-left' as const;

    let offsetY: number;
    if (anchor === 'top-left') { offsetY = topLeftY; topLeftY += 56; }
    else if (anchor === 'top-center') { offsetY = topCenterY; topCenterY += 56; }
    else { offsetY = topRightY; topRightY += 56; }

    const textBinding = display.format
      ? display.format.replace('{value}', `{{variables.${display.name}}}`)
      : `${display.label.toUpperCase()}\n{{variables.${display.name}}}`;

    const element: OverlayElement = {
      id: `var-${display.name}`,
      type: 'text',
      anchor,
      offset: { x: 16, y: offsetY },
      fontSize: 18,
      fontWeight: 'bold',
      color: display.color ?? '#FFFFFF',
      bindings: { text: textBinding },
      style: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
      },
    };

    if (display.showWhen === 'not_default' && display.defaultValue !== undefined) {
      element.visibleWhen = `variables.${display.name} != ${JSON.stringify(display.defaultValue)}`;
    }

    elements.push(element);
  }

  if (ui.showTimer) {
    elements.push({
      id: 'timer',
      type: 'text',
      anchor: 'top-center',
      offset: { x: 0, y: topCenterY },
      fontSize: 20,
      fontWeight: 'bold',
      color: '#FFFFFF',
      bindings: { text: '{{formatTime(elapsed)}}' },
      style: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
      },
    });
  }

  return { elements };
}
