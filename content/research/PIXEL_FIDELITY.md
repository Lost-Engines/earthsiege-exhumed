# Sampled image fidelity investigation

The unresolved differences in the four supplied recordings have been traced to
specific original instructions, fixed in the native implementation where they
were errors, or demonstrated as the consequence of one explicit compatibility
departure. No sampled scene difference remains unexplained.

This is a statement about **120 complete 320×200 samples**, not every possible
mission, viewpoint or frame. Browser/WebGL previews are a separate inspection
tool and are not the reference for this comparison.

## Result

After supplying the independently observed presentation clocks and page-copy
schedule, **114 of 120 images are identical pixel for pixel** to the unchanged
original. The other six contain **230 differing pixels in total**, all on the
distant radar/listening-post model. No pixel region is excluded.

| Recording | Frames compared | Exact images | Remaining pixels | Frames with differences |
|---|---:|---:|---:|---|
| DEMO1 | 33 | 30 | 99 | 120: 36; 1020: 33; 1440: 30 |
| DEMO2 | 31 | 29 | 100 | 660: 46; 720: 54 |
| DEMO3 | 29 | 29 | 0 | None |
| DEMO4 | 27 | 26 | 31 | 0: 31 |
| Total | 120 | 114 | 230 | Six |

The native loader already repairs seven invalid partition-transform indices in
each of the two radar models. Giving the original renderer **only that same
repair** removes every remaining difference in all six scenes, without changing
any other pixel. This is a separate, explicitly modified original-code probe;
the unchanged DOSBox images are retained as the primary reference.

See [the six original/native crops](../analysis/tapes/replays/image-differences/remaining-radar-comparison.png)
and [the controlled repair results](../analysis/tapes/replays/image-differences/radar-repair-six-scenes.json).

## Errors corrected

| Difference | Original behavior and native correction | Independent evidence |
|---|---|---|
| Charge-slider corners | 389ac/38b30 restore a two-pixel thumb backing, including initially zero saved pixels, and retain untouched LED pixels. | 1,280 sequential cold/full/incremental paints across eight cockpits. |
| Alternate-frame left border after external view | 22b4d uses inclusive right=320. The 321-pixel planar copy crosses a page boundary; 66914 processes partial-left, complete groups, partial-right passes. | 42 complete 640×400 page copies, 213 pan frames and six live pan paths. |
| Missing lower-display light | 3cc39 fills GAU +4fc with 59/57 from cached subject byte +4dc. Damage-page subject selection updates that byte; MAP retains it. | Fourteen original HDD pages and eleven compared regions. |
| A few one-pixel-wide textured faces | 534ac rejects either zero projected width or zero height, irrespective of scan direction. The native row path checked height twice and drew collapsed vertical quads. | 432 narrow/degenerate original texture cases. |
| Two ATT/waypoint intersections | 35048 draws HUD children first; 35060 then paints ATT. | Individual writes at the mismatched pixels; component HUD tests and full replay images. |
| Wingmate idle caption | 3e5ee changes an idle label on the closing transition or full preparation, not on every idle frame. | Original portrait/status traces; all full replay state and image comparisons. |
| Erased system-message strip over weapon row | 2fa00/2fb18 clear once. Later dirty weapon headers and slider writes can replace those pixels. The three-pixel readiness lamp leaves a one-pixel gap before the name. | 192 original sequential message/weapon overlap rasters. |
| OFFLINE-to-operational label transitions | 384f0/38509 enlarge and centre the label permanently; subsequent paints retain the expanded bounds, including overlap with the slider backing. | The same 192-case transition fixture, with enabled/disabled, selection/group/ready and charge changes. |
| Startup clock image | Data byte 94b56 starts at one; full paints also tick it. 435dc copies retained pixels before checking the timer. Launch shake stops page swaps, so that copy can restore an older image without reverting logical time. | 1,024 original clock-page rasters across eight cockpits, plus independently asserted clock states in all four replays. |
| Cached MAP contacts and blink phase | 3f578 reads the timer when the MAP painter runs, separately from frame-start time. | 975 actual timer inputs; native deadlines and blink state are calculated rather than copied. |

The test suite also retains earlier original comparisons for projection,
lighting, clipped lines, texture stepping, palette uploads and authored model
hierarchies. The observed lighting differences here were draw-order effects,
not a reason to tune colours or normals by eye.

## Why the radar differs

BASES_AN/BASES_AE root 0 contains two pose matrices but distant partition nodes
refer to matrices 2–4. Original routine 53240 therefore reads beyond that array.
The bytes include the following allocation's **ABLK header and allocator
pointer**, as well as animation data. They are not valid additional matrices.

A controlled test changes only that allocator pointer by 0x1000. Authored data,
actual poses, camera and clocks stay fixed, but eleven visible pixels change.
A fixed invented matrix cannot reproduce this behavior for all heap layouts.
Exact reproduction would require the original DOS address space and allocation
history. The native game instead interprets only those seven invalid references
as model-local partition planes; it never alters the bundled resource files.

The repair is intentionally retained in the authentic C++ build. This is a
narrow exception to the usual policy of leaving fixes to Redux: the original
out-of-bounds read is confirmed, and emulating the relevant DOS allocation
layout/history solely to reproduce it would add unnecessary machinery. The
local-space replacement is a documented deterministic choice; the evidence
does not recover the artists' intended replacement.

[The allocation probe](../analysis/tapes/replays/image-differences/radar-allocation-dependence.json)
and [actor analysis](ACTORS.md#invalid-distant-radar-partition-transforms) document
this boundary. The six-scene experiment runs original rendering twice from each
same snapshot. Its unchanged redraw agrees with every mismatched original pixel;
its repaired redraw agrees with every corresponding native pixel. The affected
sets have exactly 36, 33, 30, 46, 54 and 31 pixels.

## Timing and comparison method

The observer runs in a private DOSBox CPU core and only reads guest state.
Executable hashes and `game_unchanged: true` are recorded for all four runs in
`analysis/tapes/replays/demoN-clock-pages/`. Software cursors are removed using
the original saved-under buffer, not by masking their rectangles or dropping
those pixels from the comparison.

The first pass runs the complete native simulation from the original TAP,
preferences, independently sampled interface/radio/MAP clocks and original
speech-driver acceptance results. It asserts all 7,032 captured gameplay/exit
states, camera fields, both RNG streams, 9,300 consumed input records, final
RESULTS.DAT/MISSION.VAR, and 7,073 ordered non-engine sound starts/stops.

The second pass isolates asynchronous display timing. It replays 7,663 original
clock polls, 5,996 HMI elapsed-time dispatches and 7,412 VGA copy operations through
the native clock/font and TTM implementations. Drawing-page selectors and
viewport origins are recorded call context. All 7,024 end-frame clock states
and all pre-dispatch TTM states are **assertions**, never assigned to the native
state machines. Neither pass consumes expected pixels, positions, damage,
objectives or random results. The clock-page behavior also has a separate
original-executable test independent of these observed copy calls.

Without that timing alignment, the same native samples have maximum differences
of 42/62/24/43 pixels for DEMO1/2/3/4. Those raw reports are retained alongside the
controlled reports; the latter are not a claim that host and DOS interrupt
scheduling will naturally remain synchronized.

## Reproduce

From the analysis root, with the native build available:

```sh
.venv/bin/python -B tools/audit_replay_pixels.py
.venv/bin/python -B tools/probe_replay_radar_repair.py
```

The wrapper exports new audit fixtures into the native build directory. It does
not replace the checked-in regression fixtures. It writes
`analysis/tapes/replays/image-differences/demoN-raw-final.json` and
`demoN-timed-final.json`; per-demo logs are in the native build directory.
The repair probe is explicitly distinct from the unchanged original replay.

New component captures:
`capture_texture_narrow_quads.py`, `capture_weapon_message_erasure.py`,
`capture_clock_retained.py`, `capture_cockpit_page_copy.py`,
and `capture_weapon_charge_retained.py`.
