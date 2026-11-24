import type { Slide } from "../data/compose";

export type ShareKind = "type" | "marksheet";

export interface ScreenActions {
  next: () => void;
  exitToHome: () => void;
  share: (kind: ShareKind) => void;
  /** Open a recommended program's enrolment (the closing's course card). */
  openProgram: (url: string) => void;
}

export type ScreenProps<T extends Slide["id"]> = {
  slide: Extract<Slide, { id: T }>;
  actions: ScreenActions;
  /** True while this slide is the visible one (drives entrance sequencing). */
  active: boolean;
};
