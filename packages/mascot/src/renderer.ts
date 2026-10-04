import type { MascotView } from './states';

/**
 * Runtime/rendering seam. A platform renderer turns a {@link MascotView} into output
 * (the RN placeholder today; Rive or Lottie later). Consuming apps depend on this
 * contract and the view model only — never on the animation implementation.
 */
export interface MascotRenderProps {
  readonly view: MascotView;
  readonly size: number;
}

export interface MascotRenderer<TOutput = unknown> {
  render(props: MascotRenderProps): TOutput;
}
