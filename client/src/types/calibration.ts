/**
 * client/src/types/calibration.ts
 *
 * TypeScript interfaces for Calibration data model.
 */

export interface Calibration {
  id: string;
  user_id: string;
  wpm: number;
  recorded_at: string; // ISO 8601
}

/** Payload sent by the client when submitting a calibration result */
export interface CalibrationSubmitPayload {
  wpm: number;
  recorded_at: string;
}
