# Component damage, hit volumes and shields

The resource definitions are now connected to verified running consumers. `check_damage.py` compares 5,106 original HERC damage updates on all eight playable starting loadouts, plus 180 accumulator boundary cases. `check_collision.py` compares 6,608 original projectile-ray and shield cases, including every stored collision sphere list. These are controlled original-code comparisons, not a complete combat replay.

## Armor and internal systems

An actor keeps separate signed-short arrays for accumulated internal damage, accumulated armor damage and section presence. Negative damage entries mark destroyed capacity; zero means undamaged. Presence is tested as nonzero: the original byte-fill initialization actually makes its short entries 257. The parser's DMG `hit_points` are internal capacities, not the changing runtime array.

`0x9c88` adds damage with word-width arithmetic. At capacity it marks the slot -1 and returns the excess. Armor overflow enters `0x979c`, which chooses among still-live internal components using the weights in the section's dependency pairs. A destroyed component is excluded from later choices; excess can continue through several components. The weights are selection probabilities, not proportional simultaneous damage allocation.

`0x9f7c` switches the section's cell to 1 when armor is exhausted but internals remain. When its internal dependencies are all gone and flag bit 0 permits removal, `0x9cd4` marks the section absent, destroys its dependencies, sets its cell to 2 and queues attached sections whose parent index refers to it. The pending list is consumed last-in-first-out. Presence guards also stop cycles in parent references. Section flag bit 1 requests attached effects; bit 2 selects the larger first explosion and suppresses repeated explosion emission during the cascade.

Original damage code also disables mounted weapons when the presence slot `19 + equipment_slot` disappears. Equipment slots follow the mount record, not weapon-list order. The viewer's damage selector uses verified post-impact cell and weapon states from the original starting loadouts. It shows one hit from an intact state; falling debris, continuing controller updates and smoke lifetimes are not implied by that static preview.

The stored field previously called `sequence` in a damage piece is a **cell-sequence index**, not an articulated movement-sequence number.

## Actor consequences

`0x13250` derives movement impairment from internal leg damage. Ratios above 128/256 and 192/256 set distinct sticky impairment flags. Losing at least half the legs disables movement: one leg is enough on a biped. Four-legged profiles average front/rear leg pairs when evaluating partial impairment. Destruction of core section dependencies or internal slot 9 takes the separate fatal path. Internal component 5 drives reactor power impairment, as established by `0x14ee0`; its partial/heavy flags are therefore named reactor damage in C++.

The actual damage, detachment, effect construction and weapon-removal code executes in these fixtures. Effects share a generator with damage selection, so their random consumption must not be casually removed from a faithful simulation. The independent cascade comparison takes the recorded component-choice draws as inputs; it does **not** claim to independently reproduce every visual effect's generator consumption. Tests preserve and compare armor/internal/presence arrays, cells, consequence flags and disabled weapons. No damage or effect routine is replaced with a no-op.

The original player-immunity branch is controlled by actor flag +0x9d and mission globals +0xbc4a0 / +0xbc4a8. Damage fixtures explicitly disable that branch. Projectile shield interception and armor impact are separate stages; directly applying an armor hit is not an assertion that a weapon can bypass shields in play.

## Projectile hit volumes

`0x89d4` tests a sphere center in ray coordinates: forward distance is Y, and lateral distance is the approximation `max(abs(X), abs(Z)) + floor(min(abs(X), abs(Z))/2)`. The cross section is consequently octagonal rather than mathematically circular. The projectile radius is added with signed-short arithmetic. Negative Y is rejected by the unsigned forward-range comparison; lateral/range boundaries are strict.

An accepted detailed hit reduces the remaining ray distance to `max(0, Y - (combined_radius - lateral_distance))`. This is a linear approximation, not a square-root sphere intersection. `0x8ab8` processes spheres in stored order, retaining the shortened range, and returns depth plus one so zero can mean no hit. A later sphere whose center lies beyond the already-shortened depth is skipped even when an exact sphere intersection might have been nearer. The comparisons cover all original lists under translated and rotated frames, plus cutoff/word-width edge cases.

## Directional shields

`0xfca8` first checks the chassis shield center and radius using the same lateral approximation. The inverse-transformed ray origin selects the front or rear shield: local Y greater than zero selects the first half, otherwise the second. Absorption subtracts the smaller of incoming shield damage and the chosen half's charge, leaving the remainder for the next stage. A shield-volume hit still returns an entry depth when its charge is zero. The 576 shield fixtures cover cardinal orientations, range/radius boundaries, both halves and exhausted/partial/full absorption.

Moving-actor terrain collision, projectile flight, AI firing and combat/replay ordering are integrated and documented in COLLISION.md, WEAPONS.md, CONTROLLERS.md and RUNTIME.md.

The native C++ component core now matches all 5,106 retained damage updates and 180 accumulator cases. Dependency pairs are named in their actual stored order: weight, then internal-component index; the section sequence byte is named `cell_sequence`. The isolated component suite supplies component choices; the integrated incoming-ray suite below now executes effect creation between those choices and compares the complete final random state.

Native C++ sphere-list and shield interception now match all 6,608 captured cases, alongside the component-damage core. Optional hit distances replace the original depth-plus-one sentinel at the C++ interface; comparisons convert back at the fixture boundary.

## Articulated component selection

`check_component_hits.py` runs complete original `0x9064` queries on all eight armed starting loadouts in sixteen moving/aiming poses each. All 8,192 queries (728 hits) agree with native C++, including the derived broad-phase bounding sphere, hierarchy composition and absent-section filtering. The broad phase retains its signed-word extrema and midpoint arithmetic.

A COL group's formerly named "states" are damage sections: the stored index selects the presence array and the damage recipient. They are not animation alternatives. Each group attaches to a model part (or the actor frame for a negative part ID); its spheres follow that part's articulated transform. Sections and groups retain file order, with each accepted detailed hit shortening subsequent queries. The captures retain the original weapon-augmented collision records, separately from their construction.

Native C++ now also reconstructs those weapon-augmented records from DMG/COL/GL/WEAPONS data. The equipment slot selects damage section `19 + slot` and internal component `12 + slot`; the weapon inherits its placeholder section's parent, replaces the first dependency's internal index, and receives its mount/orientation offset in collision space. Missing dependency lists make the initial section absent. The hit and damage suites now use these constructed definitions and initial arrays, comparing the captured native assembly only as an expectation.

`check_damaged_model_render.py` adds 370 complete original post-impact body frames. It applies the previously captured original damage cells and disabled weapon pointers to the original model renderer. Native C++ now computes those states through its owned HERC actor and matches every pixel, including weapon removal. These images isolate the surviving body; detached debris and continuing smoke are separate actors.

## Complete incoming HERC rays

`capture_herc_impacts.py` retains 2,304 complete `0x13b44` calls across the eight starting loadouts. The first 144 cases per chassis preserve the initial 1,152-ray set (445 interceptions, 178 body requests); another 128 per chassis aim at weapons across seeds/sides, and 16 exercise player immunity with and without its override. There are 1,597 successful interceptions overall, 80 weapon ejections and 48 salvage records. Original geometry, damage allocation, detachment, effect factories and shared random draws execute. Only speech and cockpit notifications are recorded UI boundaries. Captures retain before/after damage arrays, shields, sensor flags, received-damage counters, component choices and effect events. They are isolated incoming rays, not full combat replay.

Native C++ now agrees on the complete component/armour/presence/cell state, shields and sensor flags, ordered damage/effect/notification requests, salvage and the final primary random generator state for every capture. The independent explosion/debris constructors execute synchronously; expected component draws are not injected into this combined comparison. Shield geometry comes from chassis DAT offsets 22 (height) and 24 (radius). Non-player missile detection/ECM changes occur after the broad distance test but before the shield intersection; a body miss can still change those flags. Shield absorption occurs before the articulated body test, and unabsorbed shield damage gates that test independently of armour damage. The player receives warning 8 once when that penetration occurs, even if the articulated body is missed.

### Damage grades, radial hits and weapon loss

`0xa16c` measures Q8 section damage from armour plus all referenced internal
capacities. It sums dependency references without weighting or deduplicating
them. A -1 entry contributes its full capacity. `0x13b44` compares the pre/post
values shifted right by five: staying in the same damage band uses the ground
impact-effect row and debris group 1; a changed band uses the armour row and
group 2. Full destruction suppresses the ordinary final impact explosion/burst.

Radial damage visits present sections in index order, drawing the primary random
generator even for sections too far away. A low-12-bit result below 2050 admits
a section to the distance test. Inside the strict 500-unit radius, damage falls
linearly with the original integer division. Its cached section centre uses the
last collision-list binding and transforms model parts only when their ID is
positive. Detachment instead finds the first binding and also transforms part 0.
These original lookup differences are retained explicitly.

Each direct/radial component hit starts a fresh detachment cascade. A removed
section normally creates explosion 10 and debris group 3. Flag bit 2 creates
explosion 17 and suppresses further explosions/attached smoke in that cascade;
further debris bursts still run. Flag bit 1 requests attached smoke when the
section has a cell. Attached smoke chooses its variant from the **secondary**
generator at `0xb5c48`; explosion/debris/component choices share `0xb5bd4`.

If a weapon's damage band changes without full destruction, chassis DAT word 84
permits a separate knock-off chance: `3 * 41 / 4096` for side 0, `10 * 41 / 4096`
otherwise. Mount equipment slots identify the weapon, independently of bank
order. The original disables it, launches its physical model when external,
clears the section's presence and applies another 10,000 damage through the raw
component core, bypassing the ordinary presence/consequence wrapper. Side 1 also
records salvage. Its ID is the runtime weapon definition index (`+0x56`), not the
on-disk damage-icon field. Salvage condition is derived from the pre-knock-off
Q8 damage grade using the original rounded `500/1024` scale.

The C++ actor owns the changing combat state and emits synchronous effects.
Physical ejected-weapon motion, persistent attached-smoke controllers and group
credit/AI reactions are integrated in the world. These isolated captures exercise
the component boundary; EFFECTS.md and RUNTIME.md describe pool behaviour and
complete-recording comparisons.

## Starting condition and saved roster restoration

`capture_starting_damage.py` runs 1,792 original `0x12f20` calls across all
sixteen HERC chassis and fourteen condition boundary values. Native C++ agrees
on damage/presence/cell arrays, disabled weapons, consequence flags, effect
request order and the complete primary RNG state. Values below zero or at least
80 add no damage. Bands 60–79, 40–59 and 20–39 select random damage magnitudes
50, 80 and 120; the last also fills reactor damage to capacity and excludes
salvage. Below 20, a random leg (and a second pair on quadrupeds) takes 32,000
damage, then the actor is disabled, excluded from salvage and marked collapsed,
with magnitude 150. `0x13078` visits currently present sections in order, accepts
low-byte random values below magnitude + 25, and scales the section's unweighted
capacity sum by a random Q8 multiplier. Detachment effects consume randomness
before the next section draw.

Flag +0xad excludes the actor from salvage (`0x14034`); +0xae is the collapse
latch (`0x12038`), which suppresses repeating collapse damage/audio. It is not an
actor visibility/removal flag. Profiles with zero salvage value start excluded.

`0x107f0` restores PLAYER.MEC's thirteen armour percentages, ten internal
percentages and ten equipment percentages. Internal slot 9 is forced undamaged.
Equipment damage exhausts armour before its internal slot; when armour absorbs
it all, the existing internal value is left untouched. The routine does not
recompute model cells, section presence or consequence flags. All 384 retained
native comparisons on the eight supported player chassis agree.

There are two original bounds hazards: the restore routine iterates ten equipment
slots despite allocating nine, and forcing the non-playable Spider into the
player roster reads beyond its twelve-entry internal capacity table. Research
captures retain these unsupported probes, but native comparison/export only
claims the supported shell contract and never reproduces out-of-bounds accesses.
The Spider still receives the ordinary 21-entry live internal-damage allocation;
its absent torso/elevation animation channels are explicitly skipped.


## Player heading when the legs fail

In 13250, the transition to disabled at 136ac-137c4 has an additional path for
the controlled player (global b5b86). It composes the currently evaluated camera
part with actor placement (64fe4), extracts angles (5e988), writes the resulting
yaw to the chassis, clears the placement cache, zeros torso angle +22e, sets its
animation channel to phase zero (620c4), and advances the pose by one unscaled animation-time unit (215c with 1).
Elevation and angular rates are not directly cleared. This keeps the cockpit
pointing in the same direction as the legs become unusable.

Construction damage happens before this HERC becomes the controlled player.
The additional alignment therefore belongs to live damage transitions, not
initial damaged-model setup. Six complete 512-frame original comparisons agree
after adding the missing native operation, including follower and collision
consequences. See AUTONOMOUS_VALIDATION.md for the cases and retained fixtures.


That one-unit advance matters with reverse playback: at rate -155 the Q8 shift
produces -1, taking the body channel from elapsed 79 to 78. In the retained
battle0-failure-return13/B0_C2_70 trace, actor Y moves from -40,033 to -40,034
before the ordinary frame advance. The final position differs by two units if
this call is treated as a pose-only refresh. The corrected native run agrees
for all 1,024 frames, with the cached channel rate preserved.

## Engine flag history and article examples

The engine flags at `+0xa4/+0xa5` are classified only while both remain clear.
Unlike the leg branch, the engine branch does not promote a previously light
injury to heavy after further damage. A focused original-code check confirms
this with Samson engine damage 400, 600, then destroyed versus 600 directly;
the former retains light generation (9 at ratio 256), the latter heavy (3).
See [COMBAT_ARTICLE.md](COMBAT_ARTICLE.md) for the controlled-input scope,
shield-threshold captures, salvage cutoff and illustrated component chains.
