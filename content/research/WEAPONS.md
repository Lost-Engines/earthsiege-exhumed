# Weapon controls, power and projectile motion

This document records comparisons with original DBSIM instructions. Combat is integrated in the native game; RUNTIME.md and AUTONOMOUS_VALIDATION.md describe the whole-mission checks. Addresses refer to the flat application image. See DAMAGE.md for hit volumes and damage propagation, LOCOMOTION.md for articulated aiming, and RUNTIME.md for frame ordering.

## Controls and readiness

`check_weapon_controls.py` compares 9,397 cases: range boundaries, readiness, charging, ELF spin-up, charge-setting controls, common HUD/cooldown/firing-animation updates and setting presets. Results are in `analysis/definitions/weapon-controls.json`.

`0xac14` uses strict minimum/maximum range bounds. Energy readiness (`0xb278`) requires an enabled weapon, zero refire timer, and sufficient capacitor charge. When the low threshold is less than the full threshold, the required charge is the larger of the low threshold and the requested setting. Ammunition readiness (`0xb340`) instead requires a nonzero ammunition count, zero refire timer and an enabled weapon.

Common update `0xb408` advances the refire timer using the frame ratio, clears transient requests and advances the firing animation. Capacitor update `0xb4d4` charges at up to 20 units per update, or 60 with fast charge, constrained by available power and the requested setting. Discharge returns up to 5 units to the available budget. Those amounts are **per update**, unlike the ratio-scaled refire timer. Disabled weapons retain their state.

Charge controls change the requested level by 80 within 0–1200 (`0xb820`), select 820 (`0xb884`), or request fast charging to 1200 (`0xb8a4`). The original constructor's fixed-point calculation starts a capacitor at 961, not an assumed 960. ELF firing has separate spin-up and ready flags (`0xacb4`, `0xb748`); releasing the trigger clears them and resets its animation.

The data includes grenade definitions and charging controls, but the grenade spawn method `0x7b44` is a no-op in this executable. This is not evidence of a working player grenade weapon. Weapon definition selectors 20, 21 and 22 are special: ECM has no ordinary projectile, missile ammunition selects a subtype, and the grenade selector lies beyond the nineteen-entry ordinary projectile table. Do not treat these as unrestricted array indices.

## Reactor, shields and capacitor allocation

`check_power.py` compares 5,186 cases: 4,096 shield updates, 66 balance changes and 1,024 weapon allocation passes, including disabled weapons, missing slots, fast charge, negative budgets and the original cheat condition. Results are in `analysis/definitions/power.json`.

A shield starts split equally front/rear with balance 512/1024 (`0xfabc`). Controls change that balance by 102, clamped to 0–1024 (`0xfae4`). Update `0xfb2c` adds at most 4 units of charge per update, constrained by budget and remaining capacity. It then moves the front allocation toward the requested proportion by at most 65 units; the rear receives the remainder. A negative available budget can reduce total charge. All intermediate short-width behavior is retained by the comparison.

Weapon-list allocator `0xcc2a` visits each slot at most once. An explicitly requested slot goes first; otherwise the highest priority goes first, with stable slot order for ties. Fast charging has priority 10000; ordinary energy weapons use their requested charge. Once a weapon retains its fast-charge request, subsequent capacitors discharge rather than charge. A requested missing slot ends that allocation pass. The energy cheat preserves the caller's budget while still updating the capacitors.

The reactor consumer `0x14ee0` produces a ratio-scaled 15 units. Component 5's damage flags reduce this to Q10 factors 600 or 200, identifying that component's reactor consequence. Weapons receive the current reserve minus 1500, then shields receive the returned budget. The remaining reserve plus 1500 is clamped to 0–10000. This sequencing is established from the original consumer; the 5,186 comparisons cover its shield/allocation helpers rather than every unrelated operation in `0x14ee0`.

## Projectile flight

`capture_projectile_motion.py` runs original world/actor construction, projectile constructors, animation and movement. `check_projectile_motion.js` independently reproduces 216 traces / 14,895 updates. The fixtures deliberately remove active collision actors and scenery, and put projectiles high above terrain. Controlled targets use the original plain-position fallback. This verifies flight and guidance, **not complete hit dispatch**.

Bullets (`0x7d08`, `0x7f84`) move along local forward Y at a ratio-scaled speed. Their five-short BULLETS.DAT records specify shape, lifetime in updates, collision radius, animation reset and shot noise. Rockets (`0x74e4`, `0x7198`) have seven-short ROCKETS.DAT records: shape, lifetime, acceleration, collision radius, animation reset, cell index and shot noise. They start at speed 500; the original short-width acceleration/averaging calculation is clamped to their definition's speed limit. Both expire when the incremented age exceeds the stored lifetime. Lifetime and cell clocks are update counts, not elapsed milliseconds.

Homing `0x6eb4` computes pitch/yaw toward the target with the original approximate horizontal distance and angle table. Each signed angle error is limited to ±1280 before frame-ratio scaling. Player-owned missiles require the owner's current target to remain the same. Subtype 2 additionally checks target state flags. Owner flag +0x96 introduces a guidance deflection for applicable subtypes; its producer is in the target/ECM handling of `0x14ee0`.

Player-controlled subtype 3 uses `0x70dc`: releasing guidance clears the projectile target and changes its subtype to 0. It does not simply continue as a normal homing missile. These captures now include held and released manual steering, AI-owned subtype 3, ECM-eligible targets and interference under AI ownership. Manual axes use Q8 scaling; the consumer clears the held flag and both axes after a steering update. A terminal subtype-3 update clears the held flag even when lifetime expiry prevents steering. The projectile motion browser data retains animation cells and all exact intermediate angles, including the original angle-table rounding quirks.


## Hit dispatch and overlapping actors

`check_hit_dispatch.py` independently matches 1,200 complete outer dispatch calls at `0x1f1d0`, plus 200 flat-ground intersections and their impact-effect choices/RNG. The actor collision and reaction callbacks are explicit recording boundaries in those fixtures; scenery and actor hit geometry have their own comparisons. Waiting groups and the projectile owner are skipped. Enemy hits set the owner's hit flag, run the victim's mission trigger where applicable and dispatch AI reactions. Player friendly fire can additionally notify a nearby living member of the player's group.

The query clips against ground first, then scenery, then visits actors in array order. Each successful actor collision call immediately applies its damage before narrowing the remaining ray length. It does **not** find the nearest actor first and damage only that actor. Of the dispatch fixtures, 438 process more than one actor. Distances below 500 stop traversal; the successful return value is the retained distance plus one.

This is confirmed with real HERC geometry and shield methods in `check_overlapping_hits.py`: 32 cases cover both actor orders, all four difficulty settings and four shield-damage values. With a farther HERC visited before an aligned nearer HERC, both lose shield charge. Reversing the list damages only the nearer HERC. Original hit-volume tests, difficulty scaling, shield absorption and ray narrowing all run; only visual-effect construction and post-hit AI reaction are suppressed. See `analysis/definitions/overlapping-hits.json`. A future change to nearest-hit-only dispatch would therefore change original combat behavior.

The difficulty multipliers used here are Q10 values `[2800, 2000, 1400, 1000]`; the original override flag selects the final value. These fixtures deliberately use zero body damage to isolate shielding from component destruction. Projectile-to-destruction behaviour is integrated and checked separately through world-state and complete-recording comparisons; see RUNTIME.md and ANALYSIS_STATUS.md.

The native C++ weapon/power helpers now reproduce all 14,583 weapon/shield/allocation comparisons. HUD change bytes are represented as a bit set, with fired and setting-change producers identified; their common update intersects the active and refreshed sets before clearing the refreshed set. Disabled controls skip this entire update. Component 5 consequence fields are named reactor damage in C++ because the reactor consumer establishes their meaning.

## Reactor supply and reserve

`check_reactor.py` captures 2,048 original `0x14ee0` updates through `0x14fbe`. Generation starts at 15, scaled by the frame ratio. Heavy reactor damage multiplies that by 200/1024; light damage by 600/1024, with the original rounded arithmetic. The available weapon budget is the signed word sum of reserve and generation minus 1,500. Weapons allocate first, shields then consume the returned budget, and the remainder plus 1,500 is clamped to 0–10,000. The weapon allocator is an explicit recorded boundary; the reactor and shield routines execute original instructions. These cases now pass in native C++.

## Constructed mixed weapon banks

`check_weapon_bank.py` executes `0xc31c` across 34 mixed loadouts covering all seventeen weapon IDs. It retains all common control fields, animation cells, readiness and energy/ammunition state through 2,720 `0xcc2a` allocation passes. Another 1,360 updates run the real `0x14ee0` reactor through the constructed bank and shield recharge. All agree with native C++. Ammunition and ECM updates have priority zero and still participate in the same stable allocation order; they consume no recharge budget. Missile selection value 5 maps to subtype 0. Energy and ELF start with charge and setting 961 plus the setting-change HUD latch. Some models have no firing cells; they must not be invented as one-frame animations.

## Discharge and muzzle placement

`check_weapon_firing.py` captures 1,160 original firing calls with 1,272 projectile-creation requests. Weapon GL words at offsets 2 and 4 select pitch and yaw animation channels; a missing channel makes `0xadd4` apply the independent weapon angle to the mount transform instead. The transformed muzzle includes the mount orientation offset and definition offset.

Ammunition weapons consume the full-threshold field, clamp empty magazines to zero, and clear their usable flag. The ammunition cheat skips that consumption, but does not suppress capacitor consumption. Ordinary energy fire either consumes the full threshold or emits a charge-scaled projectile; three-barrel partial shots use the authored lateral position, zero and its negation. Beams use the muzzle position as their ray origin. ELF consumes its full threshold but always requests beam power 1200. Grenade discharge updates ammunition and clears the held state, while its projectile creation method remains a no-op.

Native C++ now matches all these requests and post-discharge states through its owned HERC actor. Readiness is a separate caller gate; the captures intentionally include below-readiness values. Actual projectile, beam and impact-effect entities are separate consumers.

### Projectile construction boundaries

Only bullet subtypes 0, 1, 2, 6 and 7 have bullet definitions in WEAPONS.DAT. Model/motion slots 3–5 exist, but the corresponding laser weapons use beam definitions. The early flight harness incorrectly constructed all eight bullet slots; those three returned null definition pointers. Its 27 traces / 1,377 updates have been removed, and both flight and impact-packet captures now derive valid types from the original loaded definition table and reject null definitions. Remaining flight coverage is 216 trajectories / 14,895 updates.

`check_projectile_packets.py` captures 270 valid bullet/rocket updates and 576 immediate beam calls. Zero bullet power is an unscaled sentinel; beams always multiply their damage by power, including zero. Projectile packets retain the original definition subtype even if manual guidance later changes the motion subtype. Beams use collision radius 200 and the returned depth-plus-one directly for the visible endpoint. Native C++ projectile instances and beam dispatch match all packet fields and resulting positions.

### Combined world impacts

`check_world_impacts.py` executes `0x1f1d0` with real scenery from all 140 stored collision fields, capturing 3,360 combined scenery/actor calls. It varies owner side, player ownership, selected targets, friendly groups, nearby living/disabled/dead companions and victims dying during their hit method. Actor damage, reactions, trigger activation and effect construction are explicit boundaries; scenery queries and subsequent decision logic execute unchanged. C++ reproduces every retained event, depth, enemy-hit latch and random state.

Friendly/scenery obstruction reports compare the impact’s horizontal distance against the target’s three-dimensional distance, then make a signed one-sided heading comparison (`error < 8192`), not an absolute cone test. A friendly-fire warning chooses the nearest living, enabled group companion and requires distance strictly below 30,000. Actor eligibility for a reaction is read after its hit method, so a fatal hit suppresses the reaction.

## Player weapon groups and trigger policy

`capture_player_armament.py` executes the player-bank constructor (`0xc808`),
selection/group commands, original firing gate (`0xd2bc`) and real weapon methods.
Its 34 loadouts / 11,594 sequential updates agree with native C++, including
609 discharges, 167 paired shots, ELF spin-up and three held-grenade releases.
Projectile construction and the cockpit mode-widget write are explicit recording
boundaries; resource consumption and readiness remain original instructions.

The three weapon groups are editable inclusion lists. Initially all non-ECM
weapons belong to group zero; the other two lists are empty. GL byte 7 selects
the numbered cockpit control and signed byte 22 identifies a paired mount by
relative slot. Matching definitions may be linked. Cycling skips the second
linked mount, and selecting it redirects to the first. Disabled/empty linked
weapons are separated during the HUD exchange. Alt+1–9 toggles membership in the
current list; it does not directly select a weapon. B changes the current group
without immediately changing selection, reflecting the original handler order.

Automatic selection considers readiness, strict range bounds and seeker locks;
zero target distance bypasses the range test. The trigger gate itself checks
readiness and trigger state, allowing an explicitly held selection to fire
without a lock. Both linked weapons must be ready before either trigger runs.
ELF spin-up therefore does not start while its capacitor fails readiness.
The player's selected slot receives recharge priority. Enter belongs to target
cycling, while W/Alt+W cycle weapons.
