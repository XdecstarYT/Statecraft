import type { PollingFirm } from '../../engine/models/types';

/**
 * Pre-authored polling firms spanning cheap-and-noisy to expensive-and-
 * precise, with small persistent house-effect leans — same idea as real
 * pollster house effects, never a live-generated number.
 */
export const POLLING_FIRMS: PollingFirm[] = [
  { id: 'firm-quickpoll', name: 'QuickPoll Insights', sampleSize: 400, houseBias: 1.5, reliability: 0.6 },
  { id: 'firm-national', name: 'National Opinion Research', sampleSize: 1200, houseBias: 0, reliability: 0.9 },
  { id: 'firm-standard', name: 'Standard & Civic Polling', sampleSize: 2500, houseBias: -1, reliability: 0.95 },
  { id: 'firm-partisan-left', name: "People's Voice Polling", sampleSize: 800, houseBias: 4, reliability: 0.7 },
  { id: 'firm-partisan-right', name: 'Heritage Metrics', sampleSize: 800, houseBias: -4, reliability: 0.7 },
];
