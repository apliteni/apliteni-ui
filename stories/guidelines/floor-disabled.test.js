// The disabled walk of both themes, one part of the floor walks (#562).
// stories/lib/floor-parts.js holds the deal, and the main file of the walks guards it.
import { disabledPart } from '../lib/floor-part.js';

await disabledPart();
