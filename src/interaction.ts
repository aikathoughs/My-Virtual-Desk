export type View = "desk" | "screen" | "window" | "notebook" | "studentId";

export type ThemeMode = "night" | "day";

export type HoverTargetId =
  | "notebook"
  | "studentId"
  | "dvd"
  | "computer"
  | "power"
  | "lamp"
  | "window"
  | "blinds"
  | "tab";

export type HoverInfo = {
  id: HoverTargetId;
  label: string;
} | null;

export type NotebookState =
  | "NOTEBOOK_CLOSED"
  | "NOTEBOOK_COVER_VIEW"
  | "NOTEBOOK_OPENING"
  | "NOTEBOOK_FIRST_PAGE"
  | "NOTEBOOK_PAGE_TURNING_FORWARD"
  | "NOTEBOOK_PAGE_TURNING_BACKWARD"
  | "NOTEBOOK_LAST_PAGE"
  | "NOTEBOOK_CLOSING";

export type DVDState =
  | "STARTUP"
  | "IDLE"
  | "DVD_SELECTED"
  | "CASE_OPENING"
  | "CASE_OPEN"
  | "DISC_REMOVING"
  | "DRIVE_OPENING"
  | "DISC_INSERTING"
  | "DISC_READING"
  | "PROJECT_LOADING"
  | "PROJECT_READY"
  | "PROJECT_PLAYING"
  | "DRIVE_EJECTING"
  | "DISC_RETURNING"
  | "CASE_CLOSING"
  | "RETURNING_TO_STACK"
  | "OFF";

export type Phase = DVDState;

export type CRTState =
  | "COMPUTER_IDLE"
  | "DISC_DETECTED"
  | "READING_DISC"
  | "CONNECTING_TO_YOUTUBE"
  | "VIDEO_LOADING"
  | "VIDEO_READY"
  | "VIDEO_PLAYING"
  | "VIDEO_PAUSED"
  | "VIDEO_BUFFERING"
  | "VIDEO_ENDED"
  | "VIDEO_UNAVAILABLE"
  | "EMBEDDING_DISABLED"
  | "CONNECTION_ERROR";

export const DESK_TOP = 0.9;

/**
 * Dedicated presentation transform for the selected DVD case:
 * Sits in front-right open desk space, completely clear of CRT, computer tower, keyboard, and stacks.
 */
export const DVD_PRESENTATION = {
  position: [3.25, 2.38, 2.55] as const,
  rotation: [-0.38, 0, 0] as const,
};

/**
 * Optical drive world coordinates on the front face of the computer tower.
 */
export const DRIVE = {
  x: 0.55,
  y: 1.34,
  closedZ: 0.62,
  openZ: 1.66,
};

export const dvdIsBusy = (state: DVDState) =>
  !["IDLE", "PROJECT_READY", "PROJECT_PLAYING", "STARTUP", "OFF"].includes(state);

export const dvdIsInDrive = (state: DVDState) =>
  ["DISC_READING", "PROJECT_LOADING", "PROJECT_READY", "PROJECT_PLAYING"].includes(state);

export const notebookIsActive = (state: NotebookState) => state !== "NOTEBOOK_CLOSED";

export const notebookIsAnimating = (state: NotebookState) =>
  [
    "NOTEBOOK_OPENING",
    "NOTEBOOK_PAGE_TURNING_FORWARD",
    "NOTEBOOK_PAGE_TURNING_BACKWARD",
    "NOTEBOOK_CLOSING",
  ].includes(state);
