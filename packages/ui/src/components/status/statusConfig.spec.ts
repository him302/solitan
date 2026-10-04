import { createColorTokens } from '@soliton/design-tokens';
import { statusVisual, type StatusKind } from './statusConfig';

const KINDS: StatusKind[] = ['success', 'warning', 'danger', 'info', 'neutral'];
const colorKeys = Object.keys(createColorTokens().light);

describe('statusVisual', () => {
  it('pairs every status with a color, a symbol AND a label (never color alone)', () => {
    for (const kind of KINDS) {
      const visual = statusVisual(kind);
      expect(colorKeys).toContain(visual.colorKey);
      expect(visual.symbol.length).toBeGreaterThan(0);
      expect(visual.defaultLabel.length).toBeGreaterThan(0);
    }
  });
});
