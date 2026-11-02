# Campaign progression, results and saved careers

The mission browser's **Campaign routes and mission order** panel shows every stored battle set, ordered mission choices, random slots and terminal routes. It links directly to the existing mission/briefing inspectors. `TEST_BTL.DAT` is retained for comparison but is absent from the normal three-entry `BATLSETS.BIN` selector.

## Results and campaign branches

The simulation's on-screen outcome (`DBSIM 0xf4e7`) and its exported **result grade** (`0xf0f0`) are different values. Do not use the on-screen completion code 9 as the campaign result. Result grades depend on mission kind, player-group damage, target damage, route progress, member status flags and target safety/activation. The verified independent decision function is `tools/check_campaign.py:result_grade`; individual member flags remain numbered until their event producers have been traced.

GO imports the result grade into `MISSION.VAR` counter 0. It chooses branch 1 when that grade exceeds the mission-kind threshold, otherwise branch 0. For kinds 0–9, thresholds are `[4,4,4,3,3,3,4,3,3,3]`. Lower result grades are preferable. The same branch selects the filename at a mission step when two alternatives exist; a one-filename step ignores it.

After completing the last step in a node, the branch chooses the next node:

| Node | Branch 0 | Branch 1 |
|---|---|---|
| 0 | 1 | 2 |
| 1 | 3 | 4 |
| 2 | 3 | Failure |
| 3 | 5 | 6 |
| 4 | 5 | Failure |
| 5 | 7 | Failure |
| 6 | 7 | Failure |
| 7 | Victory | Failure |

Native terminal node values are 99 and -1. `0x16f22` advances the selected career block; changing nodes resets the stored career counters and node-local progress field. The separate live counter array survives ordinary Next Mission and is saved over the cleared counters; see MISSION_LAUNCH.md. Completing a step within the same node does not clear them. `0x3ba47` distinguishes player death, terminal campaign victory/failure and ordinary post-mission continuation.

The three selectable tables are `BTLSET_0`, `_1` and `_2`. Their node lengths are respectively `[7,8,8,9,9,8,8,8]`, `[1,6,6,9,5,5,8,5]`, and `[1,6,6,9,5,5,8,5]`. These are graph nodes, not eight sequential campaigns. `ANY_MSN.DAT` contains thirteen random-pool entries, including a duplicated `SM_ASS01.MSN`; do not deduplicate the pool, which would change probabilities.

`check_campaign.py` verifies **16,000** original result-grade decisions, **396** filename selections/transitions and **140** branch-threshold cases. Actor damage grades are controlled inputs; result, route, member-status and safety decision code executes unchanged. `analysis/missions/campaign.json` retains all cases.

## Mission launch inputs

[MISSION_LAUNCH.md](MISSION_LAUNCH.md) traces the original launcher's counter
preparation, shared RNG and terrain/options overrides. Compiler-only fixtures
skip these steps and must not be treated as captured campaign launches. The
browser now defaults to coherent Game launch captures, with explicit
node/step, event history, RNG inputs and the matching player roster.

## Simulation-to-shell handoff

`DBSIM 0x1d698` writes `DATA/RESULTS.DAT`:

1. Signed-short result grade.
2. Signed 32-bit recoverable value: Q10 multiplication of the accumulated recovery score by 2500, plus mission counter 7 times 25,000.
3. Signed-short salvage count, followed by pairs of weapon ID and remaining-condition percentage.
4. One 72-byte return record for every member of the player's group, in member order: 33 condition shorts, then three statistic shorts.

The 33 condition words are thirteen armor conditions, ten internal-component conditions and ten equipment conditions. The first two lists omit some of the simulator's full internal arrays. The statistics increment on enemy kills, indexed by the victim actor's kind (`0x10f2c`); their exact display labels should follow the shell's labels rather than a guessed order.

Conditions use `floor((256 - damage_fraction) * 100 / 256)`. Equipment condition combines its armor and internal damage. A destroyed accumulator contributes its full capacity. Salvaged weapons require combined damage below 128/256. The recovery score uses original per-section weights, attached sections, and **an absolute damage-accumulator cutoff of 150**, not a percentage threshold. Destroying section 0 halves the chassis recovery multiplier. Actors with +0xad set contribute neither chassis value nor weapon salvage. `0x1d434` visits opposing HERCs that are disabled or dead; it does not award arbitrary live opponents' value.

`MISSION.VAR` is separately written as 100 signed shorts. GO `0x38eb5` reads results, imports armory and crew conditions/statistics, reads those counters and overwrites counter 0 with the result grade. Campaign mode credits the returned value and performs crew/hangar progression. The writer's counter 7 is reset when a new simulation world loads, as documented in ACTORS.md.

`tools/check_results.py` verifies **5,114** return-condition and salvage states, covering all eight playable starting loadouts and the earlier captured damage scenarios. It compares independently calculated output with original `0x1d2c8`, `0x14034` and their consumers. The subsequent whole shell return and hangar checks are documented below; the interactive debrief is integrated; see SHELL.md.

### Original unused-equipment overread

The return-condition helper `0x109bc` processes ten equipment slots although the constructed damage arrays have only nine: 28 armor parts and 21 internal components. Its last iteration reads part 28 and component 21, beyond those allocations. With zeroed padding in the analysis allocator, its combined-capacity division can divide by zero. This is an original-code overread, not evidence that the game's ordinary DOS allocator necessarily crashes there.

The comparison explicitly supplies labeled neighboring-memory canaries for that final entry. All nine valid entries are checked against their definitions; the tenth word depends on the canaries and is **not** treated as a stable authored value. A native implementation must keep the 33-word file layout without reproducing an out-of-bounds access. The actual ordinary-game value of that unused word remains allocation-dependent.

## Career and hangar saves

A current career file starts with a one-byte active flag, a two-byte mode and twelve short crew-name permutation values: **27 bytes**. It then contains **41 blocks**, each comprising a 503-byte career-state record followed by a variable armory inventory. Slot 0 is the current working state; slots 1–40 retain historical states. A separate hangar file contains 41 corresponding variable roster records.

Selected state-record fields:

| Offset | Meaning |
|---|---|
| 0 / 1 | Valid/current state flags |
| 2 | Node-local progress field |
| 4 | Shell screen/state code |
| 6 / 8 | Campaign node / step |
| 10 | Missions completed |
| 12 | Current mission kind |
| 14 / 16 / 18 | Selected crew / crew count / crew cursor |
| 20 | Four packed 37-byte crew records |
| 0xa8 | Technology progression state |
| 0x129 | Budget, 32-bit |
| 0x12d | 100 mission-counter shorts |
| 0x1f5 | Repair preference |

Each crew record includes its assigned hangar slot at +8, active byte at +10, rank at +13, health at +15, three current-mission statistics at +17 and three accumulated statistics at +23. The 32-bit field at +33 is a budget share (`0x160cb`), not a serialized pointer. Other fields include name/replacement and skill state; keep neutral names where their consumers have not been established.

`NAMES.LOG` is a separate career index: short count, then selected index and 100-byte records when nonempty. Each record holds a 64-byte pilot name, short player-portrait identity, 17-byte career filename and 17-byte hangar filename. The retained `CAREER1.MEC` resource is an older roster layout, not this career format.

### Inventory ordering

Inventory lists are stacks. Reader `0x27e3c` pushes each condition value at the head (`0x40ba6`); writer `0x40ca2` traverses the head first. A load followed by a save therefore reverses values within each weapon type. Copying an armory (`0x27cb3`) uses a temporary save/load and also reverses it. Do not assume byte-stable round trips or silently sort the values. Counts, IDs and condition values are preserved.

`tools/check_career_save.py` executes the original career writer **and reader**, including temporary-file replacement, against strictly in-memory files. Four cases save working/historical slots 0, 1, 13 and 40 and independently check all 164 state blocks and inventories, header, counters and selected state. These whole-career fixtures use valid empty hangars. Both actual starting rosters (twelve total HERCs) additionally pass original variable-record reading/writing and complete hangar-copy comparisons. Interactive loading of their artwork is a separate boundary. No comparison modifies an installed save.


## Complete mission return and replacement

`tools/check_shell_return.py` executes the entire GO `0x38eb5` return transaction, including actual career/hangar reload, original hangar artwork construction and file readers. **96 scenarios** independently match every crew byte, armory stack, budget, mission counter, technology record and the complete RNG state. These include 192 pilot deaths and **144 wingmate replacements**. All writes and temporary replacements are confined to memory files.

The original operation order is significant:

1. Reload the saved career and hangar, then import RESULTS.DAT salvage, chassis conditions and crew statistics.
2. Read MISSION.VAR, replace counter 0 with the result grade, and award the equipment recorded in counters 8–14. Those seven counters correspond to weapon IDs `[13,2,8,11,12,4,3]`; each awards a fully serviceable item and is then cleared.
3. Credit the recovery value. Replenish up to five available equipment types whose inventory has fewer than two items, adding **one** item per type. The ordered type list is `[2,8,4,12,3,1,7,11,10,13,9,6,0]`. Newly unlocked technology is processed later, so it cannot participate in this replenishment pass yet.
4. Divide the current budget equally among active crew with assigned chassis, rounding down. Count dead pilots. A dead wingmate's chassis is disposed of: equipment below 80% condition becomes credits; healthier equipment goes to the armory; remaining chassis components contribute recovery credit. Those later credits are not included in the already calculated shares. The selected player's death is counted but does not create a replacement.
5. Replace dead wingmates, advance mission count and technology, advance any chassis under construction, and select shell state 1710 (`0x6ae`).

Replacement names rotate through each wingmate's three supplied names; a second three-step field advances after each complete rotation. New skills and prior statistics consume five bounded draws from the original shared shell RNG. Replacement crew are active, healthy and unassigned to a chassis. Current mission statistics accumulate into three career totals. Rank uses strict thresholds `[0,1,5,15,30]` against the first total; the `-1` sentinel caps the highest rank.

The pilot's health is internal condition 9, at word 22 of the 33-word return record. It is not the chassis's average condition. Rebuilding hangar artwork also replaces zero-condition mounted equipment with the empty slot ID 17 and resets that empty slot's condition to 100.

Technology records contain early/late mission thresholds and an available flag. For chassis, either threshold can be **at or below** the mission count; the early threshold additionally needs a favorable result classification. Weapon thresholds instead require **equality** with the count. Both thresholds must be different from -1. The same return routine processes chassis first, then weapons, preserving the last unlocked item for presentation.

The surrounding dispatcher `0x3ba47` subsequently selects player-death, campaign-terminal or ordinary-debrief presentation, applies the saved automatic-repair preference (`0x1601b`), and saves the resulting career (`0x168b0`). The transaction checks do not claim to render those screens.

## Repair budgets and chassis construction

`tools/check_hangar_service.py` independently checks **6,400 repair quotes**, **1,280 repair transactions**, **25 construction steps**, the three repair policies and every price-table entry. Real starting HERCs retain the original variable equipment lists and artwork.

Ordinary repairs (`0x29bf3`) choose among condition targets **100, 90, 74, 51, 0**. Their condition bands begin at 91, 75, 52, 1 and 0. Repair quotes sum the positive shortfall of six grouped armor sections, nine internal components and surviving mounted equipment, weighted by prices derived from CFG/DAMAGE.DAT and the chassis price. Pilot health is excluded. Each component contribution rounds down separately.

The algorithm lowers its target while the quote exceeds the supplied budget, stopping at the chassis's current average condition band. It performs the repair only when the final quote is **strictly less** than the budget: exact equality does not buy the repair. The native setter writes the chosen condition to all serviced sections, including sections already healthier than that target. This can reduce their condition. Both behaviors occur in original-code comparisons; a faithful implementation should not silently improve them.

Repair policy 0 repairs nobody, 1 starts with crew slot 1 (wingmates), and 2 starts with slot 0 (everyone). Each eligible member uses the budget share stored in their crew record.

Construction is a separate mission-count process (`0x29d68` / `0x29e01`):

| Chassis | Purchase price | Missions to construct |
|---|---:|---:|
| Roadrunner | 50,000 | 1 |
| Gunslinger | 60,000 | 1 |
| Raptor | 80,000 | 2 |
| Tomahawk | 100,000 | 2 |
| Patriot | 120,000 | 2 |
| Panther | 140,000 | 3 |
| Hercules | 170,000 | 3 |
| Colossus | 200,000 | 3 |

The construction counter decrements once on mission return. Completion fills the normal serviced conditions to 100 and clears the pending-construction slot; pilot health is a separate field. Partial-construction artwork is selected by the original remaining-count rules, not a continuously interpolated repair percentage.

## Portable implementation comparisons

The companion C++ implementation now runs the same complete career/save,
repair/construction and mission-return cases against retained original outputs.
`capture_career_fixtures.py`, `capture_hangar_fixtures.py` and
`capture_shell_return_fixtures.py` keep complete inputs and outputs under
`analysis/missions/`. The last capture executes an original career save after
`0x38eb5`; all 96 resulting career and hangar files match the portable
transaction byte for byte, alongside casualties, statistics and RNG state.
This extends the state checks above without treating menu integration as proven.

### Portable mission result producer

The C++ simulator now retains knocked-off weapon salvage through the mission
and exports the player group's damage conditions, statistics and recovery
value. Its percentage/salvage helpers match all 5,114 retained original states;
four complete pre-tick world handoffs also match their original grade, crew
records and counters. These checks do not substitute for full campaign replay.

The unused tenth equipment condition is explicitly written as 100 instead of
reading beyond the allocated damage arrays. The original canary-dependent word
is excluded from the 5,114-state comparison; all nine allocated slots are
checked. This is a memory-safety correction, not a new equipment slot.

### Application handoff details

The shell's return dispatcher saves the working career only. The call at
`0x16fdd` visits four currently empty pilot-update hooks; it does not create a
backup. Manual Career Backups uses `0x167cd` to copy into slot missions + 1.
Returning from flight also starts GO anew: its time-derived RNG is initialized
again and the saved career is reloaded, reversing armory stacks as described
above. Keeping one persistent in-memory shell across a mission must reproduce
those boundaries explicitly.


The complete four-demo replay now also compares final original RESULTS.DAT
and MISSION.VAR byte for byte, after the recorded terminal dialogs/EOF.
Runtime actor +162 uses HERC=0, base=1, flyer=2, unlike the compiled mission
table order HERC/flyer/base. 10f2c indexes the three kill counters by the runtime
kind; retaining the compiled order silently exchanges building and aircraft
statistics. This distinction is checked by the DEMO3 and DEMO4 return payloads.

## Terminal campaign journeys

All six consecutive success/failure journeys across the three battle sets now
match through 121 return, repair, save and next-launch transactions, ending at
99 or -1. Flight results are controlled inputs; saves and launches are original
outputs. This uncovered the BST random-mission-list selection path, now implemented
with its original bounded RNG draw. See [MISSION_FIDELITY.md](MISSION_FIDELITY.md)
for individual counts, addresses, reproducible captures and coverage limits.
