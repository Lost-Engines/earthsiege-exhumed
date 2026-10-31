# Moving actors and scenery collision

These checks extend the projectile-ray and shield primitives in DAMAGE.md. `check_scenery_collision.py` independently matches 38,080 point queries and 8,960 segment queries across all 140 authored scenery fields. `check_actor_contact.py` adds 1,400 moving-HERC contact/ramming cases, including 91 damaging impacts. Component damage is tested separately; the contact fixture records damage-dispatch arguments at that boundary.

## Scenery fields

Each scenery root stores a rectangular byte grid, an origin, a cell shift and a 256-entry height table. Every supplied field has shift 9: cells span 512 world units. Cell bytes index the height table; they are not direct heights. The model browser exposes a separate collision-height image beneath scenery previews.

`0x1fc5c` adds the authored origin, with the original short-width shift, then calls `0x1fa9c`. Radii up to **and including** half a cell sample one cell. Larger radii return the maximum height over the inclusive bounding square. Out-of-grid samples contribute zero. This is not a circular footprint or bilinear interpolation.

Moving-body scenery contact `0x2075c` first compares horizontal `max + half-min` distance strictly against the scenery root radius, transforms X/Y into object coordinates, then performs a zero-radius occupancy query. The supplied moving-body radius argument is unused in this path. A nonzero stored height is a collision; the moving actor's Z is not compared here. Fixed ground objects (`0x0375c`) are considered before the ordinary scenery list (`0x20860`).

## Segment intersection

`0x1fccc` uses height-field samples, rather than visible polygon intersection. It first rejects a segment wholly above the last height-table value or wholly below Z=0. The step spacing is one cell plus the supplied radius. The approximate 3D distance determines the integer sample count; the direction is normalized through a signed-word Q16 scale and rounded component steps.

It samples the starting point and successive steps, but **does not include the endpoint**. A segment shorter than the spacing therefore has zero samples. A hit requires Z strictly below the sampled field height; returned X/Y are shifted back into local model coordinates. These properties, including short segments and boundary heights, are compared against the original. Negative/overflowed step spacings are outside the checked input domain and are rejected by the independent helper rather than guessed.

The outer scene query `0x20894` now has 3,360 independently matched candidate-selection queries across all 140 fields, including 1,218 hits (`analysis/models/scenery-rays.json`). It transforms candidates into the ray frame, rejects origins beyond the combined model/projectile radius and current reach, invokes the field test and narrows the retained distance after each hit. A retained distance below 500 stops traversal. Candidates remain in their original list order.

The inverse uses the transpose of the quantized matrix and separately rotates the negative translation. Combining those operations into `rotate(point - origin)` changes fixed-point rounding. The outer fixtures vary yaw; general matrix rotation is covered separately by the model-math comparisons.

## HERC contact and impact

`0x14174` visits the active actor array in order and ignores itself and actors whose group still has an activation trigger. It obtains each body's radius through virtual method `+0x60`; zero-radius other bodies are skipped. A contact occurs at strict approximate 3D distance `< radius_a + radius_b`. The first contact wins. It calls the other body's contact method (`0x118e3` for HERCs), setting flag `+0xab`.

For another HERC, impact strength uses relative forward motion and profile weights. The other body's local forward speed is rotated into world coordinates and then into the moving body's coordinate system. **Transpose the already quantized rotation matrix** for that inverse; regenerating a matrix from a negated angle changes lookup rounding and can alter damage by one.

The original computation is:

```
relative = signed_word(Q10(speed_a, weight_a)) - Q10(other_speed_in_a_y, weight_b)
impact = Q10(relative, 300)
```

Only `impact > 200` dispatches damage. Both bodies receive the same magnitude and radius 1200, with attacker/victim reversed between the two calls. X/Y are the arithmetic midpoint. Z comes from the lower selected articulated-part transform, as written by the original code; the contact path does not add the actor's world altitude to that value. The fixture retains all dispatch coordinates.

## Movement response

`0x14844` saves the old transform, advances authored root motion and tests contact. A collision restores the old transform, clears the throttle command, marks the collision flag and handles the current animation state. AI bodies also receive a 20,000 countdown and a random ±5000 steering-avoidance value. The normal running path reverses/clamps speed and reverses the animation rate before attempting another step; a second collision restores the transform again and stops motion. An in-progress transition instead resets directly to the profile's forward stop sequence. Attached foot/effect positions are updated afterward through `0x144dc`.

That response ordering is traced and exercised in the whole-frame fixtures. Its individual collision and ordinary locomotion inputs have independent comparisons; a complete independently implemented collision-response controller remains implementation work.

## Native movement integration

`check_contact_motion.py` now captures 1,920 original `0x14844` updates across all eight playable HERCs, with controlled first/second contact answers. C++ matches each attempted placement, resulting controls and complete pose/matrix state. The rollback preserves the original Euler angles while restoring the saved placement matrix/position and animation state; a second root-motion attempt can therefore retain the first attempt's turning. Collision clears the throttle at `+0x226`, not steering at `+0x222`. Transition interruption uses `0x6200c` (direct reset), rather than a queued sequence request. Foot/effect updates and collision audio remain explicitly separate fixture boundaries.

`check_scenery_contact.py` retains another 5,600 original moving-body occupancy queries across all 140 height fields, with four candidate objects, varied headings, altitudes and body radii. Native C++ agrees with all of them and all 1,400 retained actor-contact/ramming fixtures. The native inspection scene now applies this movement blocking; combat damage and non-player controller integration remain separate work.
