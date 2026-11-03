# Spatial triggers and objective decisions

These are original DBSIM consumers verified with controlled fixtures. They establish particular rules, not a complete mission simulation. Actor construction is covered separately in ACTORS.md.

## Spatial areas and activation

SCRIPT areas are three signed shorts: kind, first point, and either second point or radius. Constructor `0x1cb48` resolves the point references. Kind zero is an axis-aligned rectangle; other kinds store the radius multiplied by ten.

`0x1cb94` ignores altitude. Rectangle boundaries are strictly excluded, regardless of corner ordering. Radial areas use `max(abs(dx), abs(dy)) + floor(min(abs(dx), abs(dy))/2) < radius`. This is an octagonal distance approximation, not Euclidean distance. The browser displays its outline; the integer boundary has single-unit steps.

A runtime trigger is 16 bytes: audience at +0, retained field at +2, area count at +4, area-pointer array at +6, latched state at +10, counter index at +12 and counter operation at +14. The compiled record's eight area indices terminate at the first negative index. **The last two shorts are counter/index actions, not a time delay.** The meaning of the second short remains unassigned; these spatial consumers do not use it.

`0x1ccb4` accepts entry into any listed area and latches permanently. `0x1cc5c` acts only on the first latch: for a nonnegative counter index, operation 5 clears it and operation 6 increments its signed short. Other operation values do not alter the counter in this consumer. Increment wraps at 32767.

The per-frame scan `0x1f87c` uses these audiences:

| Value | Actors considered |
|---|---|
| 0 | Player |
| 1 | Any member of the player's group |
| 2 | Members of active side-0 groups |
| 3 | Members of active side-1 groups |
| 4 | Members of active HERC groups (kind 0) |
| 5 | Members of active flyer groups (kind 1) |

A waiting group has a non-null trigger pointer. Group dispatch precedes the spatial trigger scan. On a later frame it clears a latched activation pointer; that branch does not also dispatch the group's controller immediately. Subsequent phases of that frame can observe the cleared pointer. Actor events can also latch triggers; the area scan is not their only source.

`tools/check_triggers.py` compares **1,841** original cases: area construction and boundaries, altitude independence, one-shot counter actions, repeated entry and audience filtering. Results are in `analysis/missions/triggers.json`.

## Damage grades used by objectives

The target-actor and target-group helpers do not use identical thresholds. `0xee84` classifies an individual actor's virtual damage grade at 50, 128 and 192; flags +0x93 or +0xae override it with grade 4. `0xecc0` averages all members' virtual grades, including disabled members, and counts members with +0x93 or +0x9e. An entirely disabled group is grade 4. Otherwise its grade is:

- 3 when disabled fraction in Q10 is at least 500, or average damage is at least 193.
- 2 when disabled fraction is at least 250, or average damage is at least 129.
- 1 when average damage is at least 51.
- 0 otherwise.

The group helper assumes a nonempty group. No invented outcome is assigned to its division by zero for an empty one. The comparison fixtures supply damage grades through a synthetic virtual accessor; they do not claim to reproduce the component-damage calculation.

## Outcome decision and timing

`0xf4e7` first handles player status flags (+0x93 → code 2, +0x9e → code 3). A special group argument 6 can report code 6 once target damage exceeds grade 2, subject to safety. Automatic evaluation then checks two margins around the world's rectangular bounds: 170,000 native units for code 8, 60,000 for code 7. The bounds are strict and independent of altitude. Explicit request mode skips those two boundary checks.

Completion depends on mission kind: actor flags for kinds 0/3, route exhaustion for 1/2, target safety/activation for 4/5, target grade 4 for 6/8/9, and both target route exhaustion and safety for 7. Completed and safe gives code 9; completed but threatened gives 10. Incomplete and threatened gives 4. Otherwise the per-kind baseline table is `[12,11,11,15,13,14,16,14,16,16]`. These raw codes should not be renamed from guesswork; shell messages and return actions determine their presentation.

Safety helper `0xf744` excludes inactive, same-side and disabled/ignored actors, and checks recognition. A recognized nearby opponent makes the player unsafe below 80,000 native distance units, or below 100,000 when it is targeting that player. This uses the original fast three-dimensional distance estimate, not an exact spherical radius. Non-player groups have additional route/target tests.

`0xf454` polls outcomes through two three-byte clock records. Their signed-short countdowns subtract the Q8 frame ratio, not milliseconds. Polling resets to 10,000; a newly pending terminal outcome also starts a 10,000 countdown. At ratio 256 this is 40 simulation updates (nominally four seconds), not ten seconds. Code 2 bypasses the pending delay when polled. The pending latch is retained; changing outcomes does not automatically restart it. The previous reported code suppresses repeat reporting.

`tools/check_objectives.py` compares **5,122** cases, including 3,400 clock updates. It runs original boundary, recognition, target, route, casualty, safety and decision routines; only actor damage-grade values are controlled inputs. Results are in `analysis/missions/objectives.json`. This fixture isolates player safety and ordinary actor targets. Component damage, AI decisions and full recorded replay have separate integrated comparisons in DAMAGE.md, CONTROLLERS.md and RUNTIME.md; this particular fixture does not exhaust every non-player safety route.

## Compiled header and handoff options

`GO 0x3445b` writes ten shorts. `DBSIM 0x1d850` reads them at `0xbc49c`.
The native reconstruction's former name `difficulty` for word 2 was incorrect:
it comes from GO `0xaad56`, the instant-action/campaign selector (0/1).
The actual difficulty is word 7 (`0xbc4aa`). Word 3 is the objective kind used
by `0xf43c`; word 4 remains the retained objective variant. Words 5 and 6
control unlimited weapon ammunition/power and player body-damage immunity.
Both require campaign mode zero and the option exactly one. Unlimited weapon
power is a weapon-bank option; it is not restricted to the player at that helper.

Word 8 selects normal (0) or low (1) visibility, also selecting the
60,000/30,000 perception range. Word 9 selects day (0), dusk (1) or night (2),
through the palette variant. These labels match the manual's single-mission options. Terrain and zone occupy
words 0 and 1. Campaign mode forces the damage multiplier's index to three;
instant action uses word 7. The shell's campaign-launch branch explicitly clears
the two cheat options before writing.

The 200-byte MISSION.VAR handoff contains 100 signed shorts. Immediately after
reading it, the loader clears short 7 (`0xbc4c6`), retaining all other counters.
The four supplied tapes have nonzero campaign/randomization counters even though
their campaign-mode word is zero. The native session now retains this state.

## Group/trigger/perception integration

`capture_mission_activity.py` constructs all four recorded worlds and captures
128 successive group-dispatch, spatial-trigger and perception passes with varied
positions and actor conditions. Controller bodies, speech and sight results are
explicit boundaries. The C++ mission activity owner matches all initial group,
actor/controller, trigger, counter and target links, then every callback, contact
byte, clock, latch and random word after each pass.

The runtime actor kind at +0x162 is HERC=0, base=1, flyer=2. It differs from
the compiled group kind HERC=0, flyer=1, base=2. Separate C++ enums prevent
target priority from accidentally interchanging static and flying actors.

HERC +0x91 is initialized from compiled record word 0, not its later `skill`
word. The sleeping decision at `0x178a4` keeps the actor's detectable flag set
when this byte is nonzero even without a current contact. It is represented as
a persistent-signature flag. Player-roster counter actions default to zero,
whereas NPC counter actions come from their source records.

### Destruction notifications

Actor notification `0xd77c` first calls group notification `0x1d524`. A group is
defeated if every other member is dead or disabled; the notified actor is skipped
regardless of its current flags. Group record trailing words 1/2 (compiled offsets
78/80, runtime +36/+38) are the counter index and operation. Individual actors use
+0x174/+0x176. Operation 1 clears, 2 increments with signed-word wrapping, and
13–16 assign 1–4. Other codes do nothing, and a negative index skips the action.
These notifications are not latched: repeating one repeats its counter action.
Group-before-actor order matters when they share a counter.

`capture_destruction_counters.py` compares 2,160 original notifications against
the native mission owner, varying live/dead/disabled members, recognized/ignored
operations, repeated calls, shared slots and overflow. Base/flyer death then
activates +0x170; flyers additionally enter their dead controller. Ordinary
hostile projectile hits activate the distinct +0x16c contact trigger, unless the
actor's +0x9c event-busy flag suppresses it.


## Integrated player progress and outcomes

The native session now uses the verified objective and debrief consumers.
`capture_player_objectives.py` retains 4,096 calls to original 0x15f80. Player
route advance stops before the duplicate first point of a closed route (unlike
AI following). Reconnaissance announces its selected objective once; defence
arrival uses horizontal distance below 40,000. Rescue requires an active living
target within 10,000 in three dimensions and the original non-wrapping torso
cone after signed-word heading subtraction. Losing it resets the dialogue.
The four delay longs at 0x91ce8 are 5,000, 5,000, -25,536, 0; the negative third
value makes the final acknowledgement eligible on the next update.

`capture_objective_worlds.py` adds 2,048 varied eight-actor worlds. All actor/group
safety, target damage grades, target route completion, status and debrief grades
match. A non-player objective can remain unsafe even at long range and without
recognition if a hostile group targeting it still has a route to follow.
Dead members are skipped in group safety; disabled living members are not.

The whole-frame harness now includes the shared projectile pool (0xaf0b4,
virtual +0x18) and collection 0x6db0. These were inadvertently omitted from its
earlier navigation capture. A seeded 880-frame comparison checks all prior body
states plus objective status, debrief grade, polling/confirmation clocks and
rescue progress. It matches 16,720 HERC/flyer observations. UI prompts are
recorded rather than displayed, and player input remains zero.

## Authored-world integration findings

The [mission fidelity investigation](MISSION_FIDELITY.md) records the subsequent
whole-world checks: authored activation stays intact, ground-object updates are
not suspended by that gate, starting damage precedes group ownership, and missing
source-map entries resolve to actor pool zero. It also separates repaired original
formation/queue defects from unchanged-reference comparisons.
