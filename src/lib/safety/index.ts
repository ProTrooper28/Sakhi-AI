/**
 * Sakhi AI — proactive safety services (modular architecture).
 *
 * Each concern is a small, dependency-light module so future features can
 * plug in without refactoring:
 *
 *   journey         — Safety Journey state machine + monitoring
 *   routeAnalysis   — route deviation detection (configurable thresholds)
 *   aiRecommendations — safety intent → actions, and contextual insights
 *   safetyScore     — AI Safety Score: weighted route scoring + explanations
 *   safeCheckin     — AI Safe Check-in: missed-ETA monitoring + escalation
 *   batterySafety   — Battery-Aware Safety: low-battery warnings + guardian alert
 *   safetyTriggers  — modular silent trigger registry + executor
 *   postIncident    — guided recovery checklist
 *   communitySafety — community safety map data foundation
 */

export * from "./journey";
export * from "./routeAnalysis";
export * from "./aiRecommendations";
export * from "./safetyScore";
export * from "./safeCheckin";
export * from "./batterySafety";
export * from "./safetyTriggers";
export * from "./postIncident";
export * from "./communitySafety";
