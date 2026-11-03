# Initialized original runtime and rendering references

The analysis can now execute complete simulation frames and scene drawing from an initialized Earthsiege 1 mission. This is an original-code reference harness, not a portable game implementation. The isolated harness and complete DOSBox replay have distinct comparison boundaries, detailed below.

## Capturing a usable address space

`analysis/dosbox-runtime/` contains a private DOSBox session, a separate install copy, its paused instant-action screenshot, system RAM, resolved application memory and VGA memory. It does not change the normal comparison install or send input to the user's desktop. `tools/dosbox_session.py --install-root` selects the private copy. `native_memory.py --module DBSIM --freeze` validates the private process and briefly stops it while reading RAM, then resumes it.

DOSX paging matters: finding the executable at a host address does **not** establish a constant base for globals or heap objects. `unpage_snapshot.py` identifies 156 independent executable page signatures, finds their page table, follows its page-directory reference and reconstructs 1,657 mapped pages in an 8 MiB flat address space. The retained fixture has eleven active actors and player position `(75000, 150000, 400)`. `dbsim-flat.json` records page mappings and the content hash. Earlier raw code-signature captures must not be used to read globals by simple address addition.

DOSBox stores its VGA planes separately from system RAM. `capture_vga_memory.py` finds candidate buffers using twenty independent cockpit rows, then selects the one whose displayed page matches **all 64,000 screenshot pixels exactly**. VGA six-bit RGB expands by bit replication, `(v << 2) | (v >> 4)`. Multiplying by 255/63 introduces one-level differences. The retained `vga.bin` contains four interleaved bytes per VGA address.

## Explicit harness boundaries

`native_snapshot.py` loads the captured application into Unicorn. Original simulation, input interpretation, object pools and UI methods execute unchanged. Device polling returns a controlled structure, and fixtures supply held key states. SoundManager is explicitly null, exercising the original no-driver gate. DOS mouse-position interrupt 33h/function 4 is recorded without moving a real pointer. Other unsupported interrupts fail.

New allocations use the bounded host arena. Captured allocations retain the original free/pool-release behavior; only host arena allocations defer release until the fixture ends. This distinction is necessary for deferred projectile destruction. The harness does not resume the captured CPU stack or simulate the whole DOS environment.

## Frame dispatch comparisons

`check_frame_order.py` compares original `0x59700` with a separately assembled phase loop calling the original individual consumers. It checks 7,200 frames: eight scenarios, three frame ratios and 300 updates per trace. Scenarios include normal movement, turning, pause states, activated opponents, firing and close collision. State comparisons include actor transforms, controller pointers, flags, contacts, internal/armor conditions, shields, weapon state, model cells, groups, effects and the complete shared RNG state.

This establishes ordering and combined native behavior. It is **not** an independent implementation of every controller or collision algorithm.

The outer loop runs phase-4 callbacks, platform processing, pacing, `0x59700`, view update `0x004b8`, scene generation, presentation and phase-6 callbacks. Scene generation `0x59c08` begins with phase-5 callbacks. These flush deferred deletions. A destroyed projectile can remain in its pool temporarily with a teardown vtable; skipping this phase makes a headless fixture call that object again on the next frame. That failure is a harness error, not a discovered game crash. Simulation-only fixtures reproduce the phase-5 boundary explicitly.

Phase-6 includes original VCR state-check machinery (`0xc84`, `0xbd4`), with an optional byte-comparison sidecar. The supplied TAP recordings do not include that sidecar. The bounded sidecar probe now establishes that no gameplay producer has been identified in this release; see COMMAND_LINE.md. Its mere presence must not be taken as an existing full-state determinism check.

## Original rendering

`native_scene.py` runs original terrain, objects, HUD, cockpit widgets, palette updates and page management against `native_vga.py`. The bounded VGA adapter supports the observed plane masks, latches, write modes 0/1, logical operations, DAC and CRTC accesses. Retrace is a controlled hardware boundary. The video atlas has a 160-byte plane stride and four 320×200 page origins within a 640×400 region.

The pause panel is dismissed through original method `0x460b8`, restoring its saved background, focus, viewport, cursor and drawing page. Cached instrument pixels come from the verified video snapshot; beginning with blank video memory incorrectly loses widgets whose values have not changed.

`capture_native_scene.py` saves [the retained DOSBox scene](../analysis/dosbox-runtime/dosbox-scene.png), [the newly rendered scene](../analysis/dosbox-runtime/native-scene.png), and every differing pixel in `native-scene.json`. The new frame matches **63,976 of 64,000** retained pixels. The remaining 24 are in the aiming cursor and one live readout. The snapshot was taken inside the pause dialog, between completed frames; dismissing it and running the next rendering calls is not a same-instant replay. The report does not hide these differences or claim a pixel-exact full-frame comparison. The renderer writes 24,595 video bytes in this fixture; the remaining cached cockpit pixels are retained.

The displayed page must be read from the surface's presentation index. Comparing a retained, unmodified page can give a misleading exact match. This capture checks the actual newly presented page.

These references are distinct from the interactive model browser. The browser now uses verified original lighting, pose and palette rules, but its depth-buffer triangles still differ from original BSP/span drawing. The C++ renderer is compared against these captures and complete recorded frames; PIXEL_FIDELITY.md records the final sampled-image results.

`NativeResourceSnapshot` adds explicit read-only resource streams to the initialized
mission, allowing original on-demand radio and dialog loads. It does not write
installation files. A full radio capture also runs the original no-sound initializer:
clearing only SoundManager is sufficient for ordinary effects, but captured speech
slots otherwise still contain live hardware pointers. `DialogNative` adds a separate
in-memory PREFS writer for modal persistence checks.

Cockpit transitions program the VGA attribute controller as well as the CRTC.
The capture now retains its address/data flip-flop and fine panning, and can read
actual hardware scanout between individual display-address changes. This extends
the bounded adapter; it is still not a general VGA emulator.

## Complete unmodified DOSBox replay

`build_dosbox_reference.py` builds the retained DOSBox Staging 0.75 source with a
small read-only observer in its normal CPU core. `capture_dosbox_tape.py` copies
the normal install, mounts the original CD, and runs `dbsim -eggplant -pTAPES\DEMOx`.
No guest instruction, input packet, allocator, interrupt or game resource is
replaced. Original DOS/HMI/VGA execution is provided by DOSBox, rather than the
isolated Unicorn transports. The original EXE hash is checked after each run.
The source, license, build settings and observer are retained locally.

At verified instruction boundaries, the observer reads the actual guest page
tables directly from physical memory. It records applied inputs, both RNG
regions, actors, damage, groups, modal depth, audio driver commands and timers.
Periodic 8 MiB address spaces, VGA buffers and correctly expanded palette images
are retained. It does not alter guest page tables or populate the emulated TLB.
Host file I/O may affect throughput; each run records actual clocks and its fixed
60,000-cycle setting. These are references at that setting, not a promise of
identical timing on all emulator configurations.

| Tape | Input records | Records inside dialogs | Rendered main frames | Return |
|---|---:|---:|---:|---:|
| DEMO1 | 2,308 | 368 | 1,938 | 3 |
| DEMO2 | 2,951 | 1,120 | 1,829 | 3 |
| DEMO3 | 2,470 | 781 | 1,685 | 3 |
| DEMO4 | 1,571 | 0 | 1,572 | 3 |

`analyse_dosbox_replays.py` checks all 9,300 packed 14-byte records, their original
button bits, every queued mouse event and its packet position against the TAP.
Dialogs consume records without ordinary simulation frames; EOF can execute a
final main frame without another packet. Consequently the sum of all TAP deltas
is not elapsed simulation time. Original return files and their hashes are
retained alongside the complete trace. The numbers above should be read with
[the generated summaries](../analysis/tapes/replays/catalogue.json), which are
the authoritative observed results.

Two independently started DEMO1 runs match all 1,938 captured main-frame states
for position, angles, aiming, controllers, flags, targets, motion, damage, shields,
groups, the full gameplay RNG and the captured visual RNG words. The original
observer saved 228 bytes across the two RNG blocks, omitting the final two bytes
of visual RNG state; the report states that limit explicitly. Unrelated heap
bytes and display buffers are excluded. This is repeatability of the original
under this configuration, not a comparison against the unfinished C++ game.

The normal static initializer enables sound before parsing. `-s` toggles it off,
which an isolated parser fixture alone cannot establish. Final reference runs
install original OPL2 `0xa002` plus digital MIDI `0xa005`; the report also records
voice completions, speech resources and encounter music fades during gameplay.
Earlier probe directory names reflect a reversed runner label; installed driver
records, commands and corrected metadata identify their actual sound state.

Direct `-p` playback produces normal simulation return codes, whereas `-D` sets
the separate attract-mode flag and returns code 6. No equivalence between those
shell destinations is implied. View the [original replay gallery](../analysis/tapes/replays/index.html).

## Native display conversion

Native resources and all animated palette writers now use the same six-bit
replication as the DOSBox capture. The analysis media palette catalogue, cockpit
reference images and their native display fixtures were regenerated accordingly.
This closes the previous one-level RGB preview discrepancy, independently of
native palette state and scene composition.
