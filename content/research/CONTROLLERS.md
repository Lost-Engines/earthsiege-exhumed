# Original actor behavior states

The executable contains named controller records, not one universal movement tick. The mission browser now exposes all twenty HERC states and seven flyer states, with original names, countdowns and callback addresses. `check_controllers.py` executes their original initializers and verifies the resulting records against the initialized DOSBox snapshot.

Each record has a name pointer, a 32-bit countdown, sixteen unpacked Boolean flags, and decision/advance/reconsider callbacks. HERC records also have a status ID. The callbacks are separate phases: HERC wrappers `0x112e0`, `0x112b8`, `0x11308` call offsets `+0x18`, `+0x1c`, `+0x20`. The outer dispatcher calls the advance wrapper before the decision wrapper. Thus movement uses previous controls; new controls apply on the following dispatch. Null callbacks do nothing. Countdown values use the Q8 simulation ratio, not direct milliseconds.

## States

HERCs have deciding, player, attacking, flanking, facing off, attacking base, attacking flyer, patrolling, travelling, bulldog travel, search/destroy, sleeping, skirting, guarding, driving off en, ramming, fleeing, in limbo, dead and disabled. The abbreviated `driving off en` string is retained exactly from the executable.

Most HERC states use movement callback `0x14844`. Ramming uses `0x18278`; limbo has none. Dead and disabled use `0x18308` to request zero control input, while retaining the ordinary movement callback. Their presence does not imply an actor immediately disappears or that every animation stops.

Flyers have deciding, attacking, patrolling, search and destroy, sleeping, scouting and dead. Their records and callback functions are separate from the HERC table; sleeping/dead have no movement callback.

## Entry and order selection

Entering a state through `0xfdfc` resets its tick counter and scratch state, marks first-entry, and starts the definition's countdown plus a stagger. A shared counter advances by 13; its low four bits supply the stagger. The first `0xfe84` call clears first-entry without incrementing the tick count. Subsequent calls mark update and increment it. There are 162 checked entry traces, with three follow-up calls each.

HERC selector `0x1892c` always chooses player for the player-controlled actor. Otherwise it maps the group's order word:

| Order | Initial HERC state |
|---|---|
| 1 | search/destroy |
| 3 | ramming |
| 6 | guarding |
| 7, 8 | patrolling |
| 10 | sleeping |
| 11 | travelling, or bulldog travel when the profile's torso yaw-limit field is above 32000 |

The last selection follows the profile value, not an explicit chassis-name comparison. Choosing a fresh HERC state also releases its existing target reference, decrements that target's count and sets the target-changed flag.

Flyer selector `0x1c46c` maps order 1 to search and destroy, 6/10 to sleeping, 7/11 to scouting, and 8 to patrolling. The 62 selector cases include both sides of the HERC profile threshold and player/target combinations.

Unhandled order values leave an incoming register-derived pointer in these original selectors. They must not be assigned a made-up normal state. The current probes restrict themselves to the accepted order domains; whether another caller makes any unsupported value reachable requires separate evidence.

## Status and behavior scope

`0x15d70` supplies a displayed HERC status. It normally uses the controller's status ID. For living, enabled actors outside fleeing/attacking states, commands 1, 2, 3/6 override it with IDs 1, 2, 4 respectively. All 480 combinations are independently checked. State name, command and displayed status must therefore remain distinct values.

The full controllers run in the initialized frame comparisons, including activated-enemy and combat fixtures. The tables, entry and selection rules are independently checked; complete independent combat strategy is not implied by that coverage. Target scoring, route/formation navigation and avoidance now have additional comparisons below. PERCEPTION.md and COLLISION.md describe the separately verified inputs to those decisions.


## Navigation and obstacle avoidance

`check_navigation.py` adds 1,800 route, 2,400 formation and 3,000 avoidance comparisons. Original coordinate transforms, list traversal and authored formation offsets run; the final walking controller is a recorded boundary, as are scenery intersection results. The independently checked output is the requested speed and steering, not a second claim about the animation implementation.

HERC route following (`0x19604`) heads for the next route point and advances when horizontal octagonal distance is strictly below 10,000. An exhausted route requests zero controls. Default commanded speed is 170 unless actor field `+0x1e6` overrides it. Routes whose final point is the same point object as their first reset their cursor to zero on reaching that last entry (`0x1c8c0`); coordinate equality alone is insufficient.

Formation following (`0x1965d`) rotates the member's authored offset by the leader's orientation. Inside 2,000 units it stops and aligns heading. Within 25,000, a moving leader and heading difference below 8192 use longitudinal/lateral position errors plus leader speed; larger heading errors request reverse and a hard turn. Otherwise it closes at distance/128, capped by a request of 256 at 25,000. The leader-motion boundary is asymmetric: speed -25 is treated as stopped, while +25 is moving.

Avoidance (`0x11c80`) casts two diagonal probes from local X = ±1500 toward X = ±10000, Y = 20000, combining ordinary scenery and fixed ground objects. Nearby active actors with nonzero collision radii also influence the left/right clearance when their bearing is within 8192 angle units. Their distance is weighted by 2000/1024. Equal clearance chooses the same deterministic turn direction; the prior collision bias alters that choice when both sides are obstructed. Negative clearance stops movement. The apparent half-speed branch is unreachable in these original instructions. Control flag bit 0 bypasses both probe and actor avoidance, as used by ramming.

## Patrol/search engagement

`check_engagement.py` adds 3,600 HERC/flyer decisions and 256 complete flyer group attack entries. Navigation and target scoring are explicit boundaries already checked separately. The comparisons retain native timer arithmetic, objective eligibility, target reference counts and controller entry. The HERC attack-strategy callback is recorded rather than substituted with a guessed strategy.

HERC search/destroy periodically asks for a target using selector mode 1, then requires it to match the group's assigned actor/group objective. Ordinary patrol engages when group order is 8 or the actor's command is 2. A non-leader without an individual patrol command follows its leader instead of acquiring a target independently. Actors with disabled/dead/`+0x9f` flags select mode 0 and flee if a target is found. Reconsideration countdown is 10,000 Q8 units; state entry can reset its scratch storage.

Flyer search uses selection mode 17 and requires the objective match; flyer patrol uses mode 16 without that restriction. These modes exclude targets of the same actor kind. The leader's attack entry copies its target to every living member and enters their attack controller, maintaining target reference counts and the original per-entry stagger. Dead members keep their previous state.

## Combat strategy map

The following is a map of original consumers to guide implementation; it is not independent coverage of every branch:

| Consumer | Role |
|---|---|
| `0x16e04` | Reconsider target, coordinate HERC group members, choose attack/facing-off/flanking/base/flyer state |
| `0x16a74` | Retreat decision from damage, important component damage ratios, assigned attackers and their combined strength |
| `0x16968` | Relative-strength comparison with the original `random & 1000` perturbation; covered by target-selection fixtures |
| `0x16cf4` | Choose a target component, with distinct body/weapon/other ranges and random score additions |
| `0x1851c` | Shared target bearing, relative-facing and distance record |
| `0x18618` | Convert that record's near/far range and desired direction into movement requests |
| `0x18892` | Aim/fire against the selected target |
| `0x163a0`, `0x16574` | Attack approach and flanking geometry |
| `0x172f0` | Face-off movement with 16,000–35,000 range band |
| `0x1713c` | Retreat movement, retained threat and periodic left/right choice |
| `0x17ed4`, `0x17c84` | Guard an anchor and drive an enemy away from it |
| `0x17aa4` | Skirt a stored obstruction, with periodic clearance recheck |
| `0x18320`, `0x18278` | Ramming's alternating bursts; burst updates perform two additional movement calls |
| `0x1b9c4`, `0x1ba88` | Flyer route and formation following |
| `0x1bba4` | Flyer attack pass, target lead, firing gates and approach/breakaway phases |
| `0x1b084` | Flyer movement and obstacle/ground look-ahead |

Flyer route arrival uses 15,000 units, versus HERCs' 10,000. Ordinary flying aims for altitude 10,000. The attack pass approaches inside 45,000, breaks away when facing/altitude conditions fail, and resumes approach beyond 80,000. Attack phases and timers must be preserved rather than replaced by a universal pursue-target controller. Precise movement and all combat branches remain native-port comparison work, with the executable fixtures available as the oracle.

The native C++ navigation port now agrees with all 7,200 route, formation and avoidance decisions and their generated probe endpoints. `check_navigation.py` retains the complete supplied inputs for those fixtures, not only the earlier summary fields. These remain requested controls; the native scheduler and combat-state callbacks must still select and apply them in the original order.

## Native controller port

C++ now matches the 27 definitions, 162 entry traces, 62 initial selections and
480 HUD statuses. `capture_controller_dispatch.py` adds 1,200 executions of the
outer `0xd8e8` dispatch, with explicit behavior callback boundaries. State entry,
long timer updates and first-entry/update flags execute unchanged. Reconsideration
happens before the decrement, then advance, decision (unless suppressed), and
finally the entry/tick latch. A behavior changed in a callback is immediately
visible to later phases. A decision result can zero the reconsideration clock.
The synthetic callback code invalidates translated blocks when regenerated.

The native patrol/search and flyer attack-entry port now matches all 3,600
engagement cases and 256 group broadcasts with full captured inputs. Target
references maintain assigned-attacker counts, and every living flyer receives
its own staggered state entry in group order. Complete strategies and movement
callbacks remain separate work.

## HERC attack movement and damage assessment

`capture_herc_tactics.py` executes 3,200 original attack, flank, face-off,
base-attack and flyer-attack decisions. Their relative geometry, movement/aim
call order, scratch timers, command cancellation and results agree with the
C++ port. Locomotion, weapon aiming/discharge, obstruction-state entry and
objective-completion checks are explicit boundaries in these captures.

Two details matter when composing these routines: range adjustment reads the
previous bearing magnitude before recomputing it after a changed steering
bearing; base attack calls locomotion twice. Base attack also stores the signed
long immediate `0xffffafc8` (-20,536), apparently a sign-extended 45,000, as its
far threshold. This is confirmed in the instructions, not a decompiler artifact.
The faithful port preserves all three behaviours.

`capture_herc_assessment.py` adds 1,848 live-loadout combat ratings and aimed
component selections across the 56 HERCs in the four recorded missions, plus
2,048 retreat decisions. Combat rating combines chassis value, surviving armour,
weapon ratings and penalties for heavily damaged internals. Ammunition weapons
count only while their magazine is at least one eighth full; disabled, charging
and refire flags do not participate in this particular availability callback.
The world refreshes the cached rating during the post-perception update only
when invalid; a shield intersection invalidates it, even if the body ray misses.

Retreat adds escalating penalties for damage above 60, 120 and 180/256 in
internal components 0, 1, 4, 5, 6 and 7. The resulting caution bands adjust the
weapon-choice threshold and use attacker count, total strength or average
strength. An incapacitated HERC abandons an undefended building target and
returns to its assigned orders; against other targets it flees.

The aimed-component selector checks the target's presence but scores the
**observer's** damage fractions, and bounds weapon-section candidates by the
observer's weapon-bank size. The first random draw is consumed even for a
collapsed target. These original quirks are independently retained.

The original damage-metric writer (`0x109bc`) iterates ten equipment entries
over nine allocated slots. The capture skips only its unused tenth output,
which otherwise reads heap litter and can divide by zero. All valid metrics,
availability callbacks, rating arithmetic and component RNG execute unchanged;
the C++ implementation only accesses actual equipment entries.

## HERC aim and firing decisions

`capture_herc_weapon_choice.py` executes `0x18e50` through real mixed banks:
2,448 choices retain readiness/range/seeker tests, front/rear shield scoring,
radar activation, unarmed event ordering and all RNG. The unused grenade's
selector 22 lies past the 19-entry projectile table and its spawn method is a
no-op; captures exclude this undefined lookup rather than inventing a projectile.

`capture_herc_target_aim.py` covers 3,072 `0x18892`/`0x1879c` decisions. Only
HERC targets receive the torso-cone test. The unsigned-word cone comparison is
strict at its upper endpoint. A selected component is used from 5,000 inclusive
to 20,000 exclusive; outside that band the HERC camera node is used. Ordinary
bases/flyers use their authored target offset added in world axes.

`capture_herc_aiming.py` covers 1,792 original `0x18b78`/`0x186f8` updates and
6,368 mounted-weapon convergence angles. Body placement and camera-pivot matrices
are inverted independently, retaining both rounding operations. Target tracking
uses Q10 gain 250, clamps each input to +/-256, and applies a signed quadratic
response; recentering omits the quadratic step. Each weapon converges from its
GL/definition offset on the target distance at the profile's camera height.

`capture_herc_fire_control.py` covers 3,072 `0x190ea` calls and 620 firing requests.
The original narrows distance/4 to a signed word before target-speed leading,
then narrows the resulting lead too. Enemy aim errors are positive offsets on
all axes, with bounds [1000, 666, 333, 0]; campaign mode selects the last entry.
Ordinary weapons require pitch and yaw errors in [-1000, 1000). Seeker-bearing
weapons bypass that gate. ELF retains the selected weapon while ready/in range;
a suppressed selection clears the skip flag but retains the old weapon pointer.

Native ownership now separates input/control preparation from physical advance.
`capture_herc_aimed_body.py` composes original advance, next requested movement,
articulated aiming, convergence and discharge over 512 frames for eight chassis;
all poses/matrices and 453 projectile requests agree. Contact, audio and actual
projectile construction are explicit boundaries in this composed fixture. Full
HERC mission dispatch, target-lock acquisition and player HUD following remain
separate integration consumers.

## HERC strategy, travel and guarding

`capture_herc_strategy.py` checks 2,560 original strategy entries, with selection,
follower notification, retreat and component choice recorded at their boundaries.
Behavior entry, target reference counts, resume-order selection and randomized
strength comparison execute unchanged. A HERC target invokes the retreat check
twice; against unchanged input both calls agree. Follower notification is an
alert, not an assignment of the leader's target. Ordinary bases/flyers bypass the
randomized HERC strength comparison.

`capture_herc_auxiliary.py` checks 768 decisions each for travel, fleeing,
skirting and ramming. All 3,072 ordered movement/aim/route calls, target reference
changes, scratch values and random draws agree. Travel remembers an unretained
threat independently of its selected target. Ramming bursts advance physically
twice more and recompute steering after each advance. Exiting skirting resets its
scratch data before the remaining movement preparation in the same call.

The fleeing routine stores a direction word at actor +0x54, overlapping the low
byte of its long turn timer at +0x55. The native implementation models that byte
replacement explicitly; it does not impose overlapping C++ fields. This changes
the low timer byte to 0 or 255 according to the signed direction.

`capture_herc_guard.py` checks 1,024 guard and 1,024 drive-off decisions. Guarding
ranks eligible HERCs around its anchor, prioritizes usable enemies, divides by
assigned attackers plus one and clears its previous target before searching.
The guard radius is 945,000 with an objective or 980,000 without one. Drive-off
movement uses a horizontal point halfway to the target, capped at 50,000, with
zero altitude. It tests completion after aiming/firing. The obstruction-entry
boundary is the real callable address `0x17bf8`, not the preceding alignment bytes.
Candidate eligibility, navigation, aiming, path obstruction and component choice
remain explicit boundaries here, ready for composition with their verified owners.

## Post-frame ECM and missile acquisition

`capture_herc_sensors.py` executes 4,096 sensor updates inside original `0x14ee0`.
Power allocation, shield charging, cached rating, equipment queries and HUD
presentation are controlled boundaries; acquisition geometry, countdowns,
interference, target-change consumption and full RNG agree independently in C++.

The tracking cone is [-12,288, 12,288) around heading minus torso angle. New
acquisition time is octagonal 3D distance / 4, capped at 32,767. Channels 0/4 need
the shooter's emission flag; channel 1 does not; channel 2 needs a detectable or
ECM-emitting target and ignores the temporary interference flag. Manual channel 3
has no acquisition. On a target change or out-of-cone frame, only channels 0–2
reset; channel 4 keeps its previous countdown. The changed-target latch is cleared
after the player's HUD update, only on that reset branch with a target present.

An ECM-equipped HERC target can disrupt acquisition when the interference timer
expires: `(random & 4095) < 820` starts a 5,000-unit disruption; a failed draw
starts a 1,500-unit retry. The accumulated damage window resets every 4,000 units,
and impact-induced ECM suppression ticks in the same post-perception pass.

## Complete native navigation frames

`capture_mission_herc_frames.py` now executes all groups, bodies, previous-control
movement, next-control decisions, perception and living-HERC power/sensors in
all four recorded missions. Setting groups to side zero and removing activation
triggers isolates navigation. The native session matches 960 frames at ratios
64, 256 and 450, including 17,760 HERC/flyer state observations and full RNG.
Comparisons include damage/cells, reserve/shields, controller entry staggering,
route cursors, recovery and movement/aiming. Audio/HUD messages and the unused
out-of-bounds tenth combat-metric slot remain explicit boundaries. No player
input is supplied in these captures.

The original leader's follower callback at `0x174ca` recursively invokes the
follower's own strategy (`0x16e04`); it does not simply copy the leader's target.
HERC requested speed comes from compiled spawn word 1 (byte offset 2), while
word 0 controls persistent radar visibility. The native session now connects
both fields to their original consumers.


## Hostile integration and hit reactions

The hostile mode of `capture_mission_herc_frames.py` retains original sides while
activating all groups. Two starts at ratios 256/450 now match 640 complete frames,
12,160 HERC/flyer observations, and RNG. These use the harness's initialization;
they are not complete recorded-input replays.

`capture_herc_reactions.py` verifies 4,096 calls to original 0x19338 and its timer
updates. Player-group incoming damage must exceed 7,999 before retaliation;
its rolling window is 30,000 units. Retaliation cooldown is 10,000, friendly-fire
warning cooldown 40,000. Actor +0x94 suppresses HUD target use; +0x98 is the
separate awareness alert latch. Impact dispatch shares contacts, updates targets
and preserves group-specific retaliation rules. Skirting uses the blocking
object recorded by 0x17a80, not the selected enemy's position.

Original virtual +0x40 returns gun-turret yaw (0x2dc0, actor +0x1a8) and zero for
ordinary bases. Base attack combines it with base heading. Missing this changes
facing classification and subsequent movement in the composed hostile run.


## Original AI shield-query mismatch

The complete DEMO2 replay exposes a caller/callee type mismatch that isolated
weapon-selection callbacks did not establish. At 18e50, the selector converts
target facing to a front/rear Boolean and passes 0 or 1 through the virtual
shield getter. The HERC implementation at 10e6c expects a signed angle, using
(angle + 16384) < 32768 to choose front. Both Boolean values therefore read
the front shield, including attacks from behind. Actual damage absorption
uses its own angle and is unaffected.

At frame 1068, target front/rear charge is 65/362 during weapon selection.
With identical random draws, the original scores definition 2 at 1326, versus
309 when incorrectly using the rear shield. It consequently chooses a
projectile speed of 5000 instead of 6000, changing lead and subsequent torso
motion. The faithful native implementation preserves the original front-shield
query. Read-only instruction observations are retained under
analysis/tapes/replays/demo2-weapon-scores.

The HERC obstruction test at 17a00 passes destination then origin to
038b8/20b70; their sampled segment runs from the querying actor to its target.


## Extended-run findings

The aimed-component word at HERC +238 is not initialized by constructor 11330.
A travelling actor can reach 1879c/18892 before strategy 16e04 replaces that
word. The native state uses -1 for centre aiming until a component is selected.
Two-sentinel constructor probes and complete mission comparisons establish this
as an intentional deterministic fallback for original uninitialized memory.

Long skirting offsets expose an independent original arithmetic bug in
63d8c/5e838: overflow of the low signed product changes the rounding constant
and adds a spurious carry. Native detours keep their wide-product calculation.
The original instruction sequence, exact affected coordinates and labelled
corrected-reference comparisons are in AUTONOMOUS_VALIDATION.md.
