# HERC locomotion and aiming

The model browser includes four original-controller movement examples for each playable chassis, plus optional torso and weapon-elevation layers. These default to in-place inspections. Apply world movement shows the verified displacement and heading against a fixed reference grid, with an explicit Fit travelled path button. They do not run collision, combat or AI.

## Movement comes from the animation

DBSIM `0x11afc` / `0x12038` converts player axes into throttle, a signed animation rate and body steering. `0x14148` advances the animation and applies its authored root movement to the actor. Walking is therefore not a separate guessed velocity applied beneath a cosmetic walk cycle. Start/stop, reversing, turning in place and the faster gait use resource-specific sequence references from the chassis DAT.

`tools/capture_locomotion.py` runs the original normal-health player path for all eight single-mission starting loadouts. Its four examples cover acceleration/coasting/braking, reverse-to-forward, stationary steering and moving steering. At Q8 frame ratios 64, 256 and 450, `tools/check_locomotion.js` compares **11,520 updates** against the independent browser implementation: position, orientation, throttle, speed, steering, animation rate and channel state.

The controller retains some per-update behavior: animation-rate acceleration and body-steering acceleration are not multiplied by the frame ratio. Root-motion time is scaled. Replacing all these values with rates per second would change the original response. The normal steering curve also depends on the current animation rate; a single constant turn rate would miss that behavior.

Root motion is rebased against the current interpolated pose before each step. The fixture checks that rebasing as well as subsequent motion and yaw extraction. The verified normal locomotion paths have planar root rotation; the independent implementation explicitly rejects untested root tilt instead of silently approximating it. Original integer angle lookup and its low-word rounding carry quirk are preserved.

## Torso yaw and weapon elevation

Original `0x149ac` and `0x14ba0` use chassis-specific rates, acceleration and angle limits. Acceleration and angular integration use the Q8 time helper. If the requested rate has greater magnitude, the controller approaches it and integrates the average previous/new rate; otherwise it snaps to the requested rate and integrates that rate. Limits apply after word-width angle arithmetic.

`tools/check_aim_controls.py` checks **13,440** original acceleration/limit cases across all sixteen chassis definitions. These fixtures intentionally omit HUD following and weapon convergence: the physical controller is checked separately from those consumers.

Aiming samples an animation phase rather than choosing a fixed frame. `0x620c4` maps the unsigned angle shifted right by two to a Q14 phase across the sequence's total authored duration minus one. `check_aim_rigs.py` / `.js` verify this selection and **800 combined walking/torso/elevation poses and hierarchical matrices** on fully constructed original actors.

Animation priority matters. Channels are stably sorted by ascending sequence priority, then applied in reverse order: a lower priority number wins overlapping nodes, and an earlier channel wins ties. The HERC constructor changes both start/stop sequences to priority zero. The browser uses these runtime priorities for layered previews instead of treating walking, torso yaw and weapon elevation as three independent additive transforms.

## Profile fields and inspection controls

The definitions browser names the verified movement/aim fields and displays their on-disk offsets. Native objects have a two-byte prefix, so executable offsets must not be copied directly into a disk reader. Sequence roles are read from each profile; identical numeric indices are not assigned universal meanings across unrelated models.

Movement examples use nominal 100 ms simulation updates. The browser speed control changes audition speed. Aim sliders directly inspect angles within profile limits; they do not pretend to be live joystick input. Manual sequence inspection remains available, and leaving a movement example restores it.

## Remaining consumers

COLLISION.md now covers independently checked scenery queries and HERC contact/ramming dispatch; CONTROLLERS.md maps the original normal, dead and disabled callbacks and verifies controller selection. Weapon controls and projectile movement are covered in WEAPONS.md. The native game also integrates collision response, AI navigation, weapon convergence and HUD tracking. Those consumers have separate component checks and complete-recording comparisons; see ANALYSIS_STATUS.md for the current coverage. The movement fixture described here isolates unobstructed normal-player motion and articulated aiming.

## Integrated native HERC body

`check_herc_body.py` captures 1,280 sequential combined updates on fully constructed original player HERCs: simultaneous movement and aiming with changing frame ratios. Only the player flag is cleared to suppress HUD-following; collision, AI, damage and firing are outside the trace. Native C++ now agrees on all positions, orientations, control fields, local poses and hierarchical matrices. Runtime definitions bind lower details, select the original texture group and set both start/stop priorities to zero before creating instances.

The `--requested` variant of `check_herc_body.py` also retains 1,280 original states using absolute speed/steering requests at `0x12038`. Native C++ matches these with the same gait, aiming and collision-capable body used for player movement. The fixture supplies normal-health prepared controls; obstacle avoidance and damaged/disabled modifiers remain separate stages.

## Damaged and disabled movement

`check_herc_body.py --damaged` captures 2,880 complete body states in `native-herc-damaged.json`. All eight starting chassis receive partial/heavy leg damage, both directions of temporary collision recovery, and a permanent disabled state. The original reduces requested speed using Q10 factors 750/400 before gait acceleration. Recovery forces forward/reverse requested speed until its signed long countdown expires; disabled state suppresses controls and leaves that countdown untouched.

The disabled sequence is queued through the existing authored animation transitions. Arrival emits the one-shot collapse damage request `(120, 150)` and sound 41; starting the transition emits sound 30. These effect/damage calls are recording boundaries, while control processing, aiming, root motion and all skeletal transforms execute unchanged. Native C++ matches every state and event in these captures.

## Integrated aiming follow-up

The convergence and AI aim consumers previously listed separately are now
characterised in CONTROLLERS.md and implemented in native C++. The composed
512-frame capture verifies advancement before next-frame controls, including
all articulated matrices and mounted projectile transforms. NPC avoidance is
inserted after recovery/speed limiting and before damage speed reduction, as
in `0x12038`; the live mission consumer is integrated and checked in the
complete-replay comparisons.
