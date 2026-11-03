# Actor recognition and contact sharing

`tools/check_perception.py` independently checks 1,110 original recognition, contact-sharing and visibility-cache cases. Controlled actor positions, sides, triggers and flags are inputs. Fresh visibility queries run the original collision consumer against an empty scenery list; this does not validate obstructed sight lines or the complete AI decision tree.

## Recognition

`0xd808(observer, target)` returns true when the observer's awareness byte for the target's ordinal is set. It also returns true when target flag `+0x8f` is set and distance is strictly below 1,000,000. The return is a 16-bit value; upper EAX bits are not a Boolean result.

Distance helper `0x6325a` sorts absolute coordinate differences `a <= b <= c` and returns `c + (a >> 2) + (b >> 2) + (b >> 4) + (b >> 5)`. It is neither Euclidean distance nor Manhattan distance.

## Sharing a contact

`0xe618(source, target)` does nothing when both belong to the same side. Otherwise it visits active actors on the source's side whose group is no longer waiting on an activation trigger.

- Below distance 120,000, it sets that observer's awareness byte at `+0xbc + target_ordinal`.
- Below 50,000, it also sets target flag `+0x98`.
- In that closer range, an observer with a trigger at `+0x16c` and clear flag `+0x9c` invokes the original latch/action helper. Already latched triggers do not repeat their counter action.

Both range comparisons are strict. This helper does not separately exclude dead or disabled actors; callers and the active roster supply the wider lifecycle context. Fixtures include those flags to verify that absence of a local gate. Counter clearing, incrementing and signed-word wrap are checked.

## Visibility caching

`0xe55c` has an asymmetric timer rule: it checks the **target's** short at `+0x179`, but when refreshing visibility it writes a new delay, `5000 + random(1000)`, to the **observer's** timer at that offset. Otherwise it returns the observer's cached byte at `+0x10c + target_ordinal`. This asymmetry is present in the original instructions and must not be silently repaired in a faithful implementation.

The 54 cache fixtures verify both timer owners, cached values and RNG results. Native scene intersection helpers run with zero occluders, rather than replacing line-of-sight with an unconditional host stub.

## Wider update order

`0xe240` advances the active, ungated actors' perception clocks, refreshes contact lists when due through `0xe419`, then processes eligible side-zero actors through `0xe85c`, with the player last. It clears `+0x9c` after that pass. `0xe419` revalidates existing contacts against range and visibility. Those larger consumers now also have the independent C++ implementation verified below; the whole-frame original-code ordering fixtures remain described in REFERENCE_CAPTURE.md.

## Target eligibility and ranking

`check_target_selection.py` independently matches 3,000 complete calls to `0xddf4`, including every word and index of the shared RNG afterward. `target_selection.py` implements the comparison without replacing native helper calls. Fixtures vary group objectives, mission rules, actor kinds, positions, headings, conditions, current targets, controller flags and attacker counts.

Eligibility (`0xdce8`) excludes the same side, dead/removed actors and unrecognized contacts. Selection flag 0x10 restricts candidates to a different actor kind. A player-led group in mission kind 3 cannot select its designated representative target while the leader's +0x9a event flag is clear. An actor instructed to ignore the HUD target also excludes that target.

Ranking first assigns a priority class. With flag 1, the group's designated objective receives priority over other targets for search/destroy order 1. Active candidates outrank disabled/unavailable ones within that class. Disabled targets are considered only when they are designated objectives for a nonzero-side observer.

Within a class, score starts from bearing alignment, with a stronger distance term inside 25,000 units. Flag 0x20 removes bearing preference. Three Q10 multiplier tables then account for retaliation, passive controller state and attacking someone else. A final actor-kind multiplier favors HERCs over the other actor kinds. Unless flag 4 is set, the score is divided among other attackers already assigned to the target. Flag 2 suppresses retaliation weighting. Equal class/score retains the earlier candidate in the active roster.

The observer's virtual strength assessment (`0x16968`) adds **`random_value & 1000`**, not `random_value % 1000`, to each HERC's cached combat-strength value. It classifies a difference below 400 as comparable; otherwise it distinguishes stronger/weaker. Non-HERC targets use class zero without consuming these draws. The bearing, condition and priority gates affect which candidates reach this helper, so matching only the selected target while ignoring RNG consumption would be inadequate.

The executable's multiplier tables, in assessment-class order, are retaliation `[1500,2000,2500]`, passive `[600,400,200]`, engaged elsewhere `[700,850,1000]`; actor kinds 0–2 use `[2000,500,200]`. These are original integer Q10 values. Short-width rounding and tie order are retained in the independent comparison.

The native C++ targeting port now matches all 3,000 decisions and full RNG states.
The capture additionally varies group leadership: mission-kind-3 protection
uses the group leader's player/event flags even when a different member observes.
Recognition/contact-sharing/visibility helpers match the 1,110 retained original
cases. The integrated actor scheduler supplies their context; RUNTIME.md records the whole-frame comparisons.

### Ordinary-actor strength callback

The HERC randomized comparison is an override. The base and flyer vtables use
`0xd730`, a short `return 1` routine, for slot +0x50. They therefore always rank
relative strength as comparable and consume no random numbers. The original
3,000 captures deliberately used the HERC vtable, including synthetic actor-kind
variations. Another 1,500 now use the actual ordinary-actor callback; the Python
and C++ consumers have an explicit assessment-policy field and match all 4,500
choices and complete RNG states.

## Complete world-pass comparison

`capture_perception_world.py` executes 384 eight-actor worlds for six successive
updates each: 2,304 original `0xe240` calls and 14,824 ordered callback events.
Native expiration, recognition, contact sharing, trigger actions, timers and RNG
execute unchanged. Visibility is supplied at `0x20b70`; orientation and notice
virtuals are explicit boundaries. The original view cone `0xd738` executes for
HERC/flyer-style actors; ordinary static actors use their always-true cone.
The C++ consumer agrees on all actor state, counter/latch state and callback order.

The first pass ticks visibility/refresh clocks for nonwaiting actors, including
dead and disabled ones. Refresh resets to 10,000 plus a bounded 1,000 draw, clears
`+0x8f` and invalidates known opposing contacts when horizontal distance exceeds
120,000 or cached visibility fails. Invalidating clears both directions.

The subsequent scan visits eligible side-zero nonplayers in list order, then
the player. Against active side-one targets, a 100,000 full-distance gate can
produce a shared sighting (`+0x8f`) if either actor is detectable (`+0x90`).
The narrower contact gate uses `0x1f814`: 30,000 when the mission environment
word at `0xbc4ac` is one, otherwise 60,000. Each actor's view cone controls
sharing, but both directions use the observer-to-target visibility cache.
The player-only forward-contact path sets just its own known byte.

Already mutual contacts below 50,000 raise alert flags and eligible actor
triggers. Finally every actor's event-busy latch is cleared, including waiting
actors. `0xd738` subtracts two signed headings without wrapping the difference;
its interval is [-14,336, 14,336). This boundary quirk is preserved.
