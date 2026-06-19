/**
 * Design System tokens — single public API.
 *
 * UX-1A · Foundation Freeze
 *
 * Rules:
 *   1. Every consumer (`src/ui/**`, `src/workspaces/**`, future packages)
 *      imports tokens *only* from this module. Direct imports from
 *      `src/ui/tokens/colors`, `.../spacing`, etc. are forbidden and
 *      enforced by `scripts/fitness/check-token-export.mjs`.
 *   2. Token values are sourced from CSS variables in `src/index.css`.
 *      Never hardcode HSL/HEX/RGB or font-family strings in UI code.
 *   3. Any change to this module or its source files MUST append an entry
 *      to `docs/architecture/TOKEN_CHANGELOG.md` and follow the semver
 *      rules in `docs/architecture/TOKEN_CHANGELOG.md`.
 *
 *   See: docs/architecture/PRINCIPLES.md
 *        docs/architecture/TOKEN_CHANGELOG.md
 */

export { colorTokens, type ColorTokens } from "./colors";
export {
  spacingTokens,
  spacingScale,
  semanticSpacing,
  type SpacingTokens,
} from "./spacing";
export {
  typographyTokens,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  type TypographyTokens,
} from "./typography";
export { radiusTokens, type RadiusTokens } from "./radius";
export { elevationTokens, type ElevationTokens } from "./elevation";
export {
  motionTokens,
  motionDuration,
  motionEasing,
  type MotionTokens,
} from "./motion";

import { colorTokens } from "./colors";
import { spacingTokens } from "./spacing";
import { typographyTokens } from "./typography";
import { radiusTokens } from "./radius";
import { elevationTokens } from "./elevation";
import { motionTokens } from "./motion";

/**
 * Design token bundle — useful for theming utilities and Storybook.
 */
export const tokens = {
  color: colorTokens,
  spacing: spacingTokens,
  typography: typographyTokens,
  radius: radiusTokens,
  elevation: elevationTokens,
  motion: motionTokens,
} as const;

export type Tokens = typeof tokens;

/**
 * Token semver — bumped only via `docs/architecture/TOKEN_CHANGELOG.md`.
 * Frozen at v1 at the end of UX-1.
 */
export const TOKEN_VERSION = "v1" as const;
export type TokenVersion = typeof TOKEN_VERSION;
