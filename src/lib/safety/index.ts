/**
 * Sakhi AI — proactive safety services (modular architecture).
 *
 * Each concern is a small, dependency-light module so future features can
 * plug in without refactoring:
 *
 *   journey         — Safety Journey state machine + monitoring
 *   routeAnalysis   — route deviation detection (configurable thresholds)
 *   aiRecommendations — safety intent → actions, and contextual insights
 *   safetyTriggers  — modular silent trigger registry + executor
 *   postIncident    — guided recovery checklist
 *   communitySafety — community safety map data foundation
 */

export * from "./journey";
export * from "./routeAnalysis";
export * from "./aiRecommendations";
export * from "./safetyTriggers";
export * from "./postIncident";
export * from "./communitySafety";
