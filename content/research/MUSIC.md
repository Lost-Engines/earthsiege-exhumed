# Native music research

Earthsiege uses HMI's protected-mode Sound Operating System. The 20 HMP resources include separate device-targeted tracks. A GM soundfont rendition is therefore an audition of one routing choice, not an authoritative transcription of the FM soundtrack. DESERT is a conspicuous example with no GM melody in the normal GM/PCM fixture.

The music browser keeps one row per resource and offers OPL2, OPL3 and soundfont auditions. Original compressed game resources are unchanged. FLAC exports use maximum compression.

## Original-code boundaries

`native_music.py` runs original DBSIM `0x6e4c1` (song initialization/routing), `0x6ea6b` (start), `0x6ed60` (delta reader) and the far timer callback `0x7ef95`. The header field at 0x38 is passed to timer registration as Hz; all supplied songs use 120. Earlier provisional names `bpm` and `declared_ppqn` remain JSON aliases for compatibility, not established musical meanings.

`check_music.py` checks all 103,958 stored delta values and consumed-byte counts, including five-byte unsigned cases. Eighty routing fixtures cover twenty resources with GM/PCM, FM/PCM, callback/PCM and all listed device classes. Forty bounded native scheduler captures contain 169,947 packets. Those packet captures stop at entry to `0x715c5`, before downstream channel allocation and gain; they are not audio captures.

`native_fm.py` extends that fixture through original channel/gain processing, the original archived FM module and the built-in digital MIDI driver. Module selectors reproduce the original separate code/data bases. Original `0x81687` queries the module and builds its five entry pointers; `0x71076` installs the preloaded module, and `0x72275` supplies the banks. `native_opl.py` supplies explicit virtual IN/OUT ports and records OPL register writes. The selected banks are MELODIC.BNK and DRUM.BNK, matching SoundManager's original loading path. It also calls `0x7225a(0)`, as SoundManager does: SOS channel remapping is disabled, gain processing remains active, and the FM module handles note polyphony. DONS.BNK is retained but has no established use in that path.

The digital MIDI driver is initialized with an explicit existing virtual digital backend, eight voices and velocity-controlled gain, matching the SoundManager descriptor. Its original bank reader, note/volume/pan handlers and voice-list bookkeeping execute. Host boundaries are sample start/stop, sample volume/pan, and completion notifications. The supplied unsigned 8-bit PCM is rendered at the game's default 11,025 Hz, resampled for the 44,100 Hz audition.

`check_fm.py` repeats OPL2 and OPL3 command captures and checks original PCM active-voice counts throughout. The separate LGPL Nuked OPL3 core supplies chip output; its unmodified source, license and provenance are in `tools/vendor/nuked-opl3`.

## Device identifiers

| Identifier | Original implementation |
|---|---|
| 0xa000 | Generic/serial MIDI; HMP routing also accepts installed 0xa001 or 0xa008 |
| 0xa001 | MPU-401 module |
| 0xa002 | OPL2 `fmmidi.com`; FM HMP routing also accepts 0xa009 |
| 0xa003 | Built-in callback bridge, not an unidentified sound card |
| 0xa004 | MT-32 module |
| 0xa005 | Built-in digital-percussion MIDI driver |
| 0xa006 | Internal-speaker module |
| 0xa008 | AWE MIDI module |
| 0xa009 | OPL3 `fmmidi3.com` |
| 0xa00a | Gravis Ultrasound MIDI module |

The callback bridge at `0x81719` invokes the installed far function at `0xa2594`; `0x8175a` sets it. Some HMP tracks routed to this bridge contain periodic program-change pulses. The normal game loading path explicitly installs its selected physical driver and 0xa005; it does not install this callback bridge. The endpoint audit below separates this unused routing option from ordinary game music.

## Audition limits

Native FM auditions preserve the original scheduler's loop controls and physical-driver choices. They stop at a declared source-duration bound, then run original note cleanup and a two-second release tail. The export length is a listening bound; the game can continue looping. No game branch callbacks or in-game music transitions are supplied.

ISA delays, Sound Blaster DAC/mixer arithmetic and the analogue output stage are not emulated. Host PCM interpolation, stereo balance, FM/PCM relative mix, immediate stop handling and completion notifications at scheduler boundaries are labelled approximations. Overall gain is reduced only if necessary to keep the exported mix below clipping, and is recorded beside each FLAC. No loudness normalization is imposed on quieter material.

To rebuild native auditions:

```sh
.venv/bin/python tools/render_native_music.py
.venv/bin/python tools/render_native_music.py --opl3
```

The first run builds a small local C wrapper around Nuked OPL3. Regenerating HMP event exports preserves existing render metadata. Native protocol checks require the original executable and resources; they do not replace them with copied disassembly in a game implementation.


## When songs play

`analysis/music/selection.json` exports the shell's twenty registered sound IDs and all 57 SOUNDS.STR records (including empty reserved entries). The browser now labels music roles rather than leaving their use implicit in filenames.

The GO shell's region-to-song table is `[1,1,3,4,3,3,1]` for regions 1000–7000: MENU, MENU, SHELLA, SHELLB, SHELLA, SHELLA, MENU. `0x395a0` queues a music change when the selected ID differs; the presentation loop `0x12980` applies it. Campaign overview scenes override the region music with RUBBLE for node 0, ICE for nodes 1–2, DESERT for 3–4, and VOLCANO for 5–7.

INTRO1 accompanies the Dynamix/lead-in sequence; INTRO2 accompanies the introduction, its replay and campaign victory sequences. Player death selects DEATH; campaign failure selects LOSING. WIN2 and SHELLC are registered resources with no identified selector in the complete supplied region/campaign/return/intro dispatch paths: the campaign victory dispatcher explicitly chooses INTRO2, so a filename alone must not substitute for the actual call.

### In-mission transitions

Original DBSIM `0x585dc` selects one of BATTLE1A, BATTLE2A and BATTLE3A with the shared visual/audio RNG. BATTLE1B–3B are paired encounter variants, three sound IDs later. `tools/check_music_selection.py` independently matches **1,200** selection/fade states, playback commands, volume and full RNG state. Distance, recognition, bearing and original pool iteration all run unchanged; only sound loading/playback and the final MIDI output are host boundaries.

After the unsigned clock passes a 300-tick deadline, an enabled, living side-1 actor can request the encounter variant if it is within 25,000 world units, or if the original cockpit detection and ±8,999-angle bearing checks both pass. A transition sets a new deadline. It fades the current song by **15 volume units per update**. Original signed-byte volume clamping takes 100 through 85, 70, 55, 40, 25, 10 and 0; on the following update, the old song stops and its paired song loads at volume 100. This is a fade-out followed by a restart, not an overlapping crossfade. These updates occur before simulation/pause dispatch, not on the HMP's 120 Hz event clock.

The switch back has an unusual original condition: after no qualifying ground/actor threat, a living, enabled flyer **farther than 18,928 units** prevents the transition back to A. It does not check that flyer's side or activation group here. The comparison direction was verified in the instructions and varied in the independent fixture; no supposedly more sensible proximity test is substituted.

When the current song is not playing, the controller normally restarts it. The original early return for an already-active qualifying encounter skips that final restart check in that update. Music-disabled or absent-driver state bypasses the controller entirely. The 300 ticks belong to the engine's `0x981c4` clock, which increments on every second timer callback; their wall-clock conversion must follow timer setup rather than assuming they are milliseconds.

## Positional effects and source coalescing

`check_spatial_audio.py` compares 6,144 positional source states and 6,000 submitted positions, including 909 enabled flushes. Original gain/pan calculations, source queuing, position setters and listener refresh run unchanged; only the final hardware gain setter is recorded. Results are in `analysis/music/spatial-audio.json`.

`0x4fb60` updates up to sixty positional slots. Distance uses the same approximate 3D metric as other engine consumers, with zero replaced by one. At or beyond the configured cutoff, gain becomes zero. Otherwise gain is `base - distance * base / cutoff`. Large cutoffs shift both the cutoff and relative coordinates before calculating. Pan projects the normalized source direction onto the transformed listener X axis, then uses the original integer mapping to its 16-bit pan field; `0x4fdd8` applies this to one slot when its position changes.

Two original 1.0 details are now confirmed rather than corrected in the research:

- `0x4dee4` attempts to coalesce repeated instances of the same sound, but compares the stored distance **with itself**. The first nonzero-distance submission wins, even if a later source is nearer. This is visible in the machine instructions and independently reproduced. A source exactly at the listener yields pending distance zero, can be overwritten by another submission, and is skipped by the flush if it remains zero.
- `0x4df98` refreshes the listener transform every ten enabled flushes using **zero rotation**, not the player's heading. Source positions update between those refreshes. Thus the manager supports rotated positional audio, while this simulation caller supplies a world-aligned listener.

These are software routing rules. They do not establish the exact analogue output level or mixer interpolation of a particular historical sound card.

## Completed consumer audit and live runtime traces

[usage-audit.json](../analysis/music/usage-audit.json) joins the original call sites,
absolute references, song tables and all four complete DOSBox recordings. Normal
SoundManager loaders (`DBSIM 0x4ef8c`, `GO 0x4240a`) install the configured physical
MIDI driver and the digital-percussion driver `0xa005`. They do not install
`0xa003`, whose callbacks remain an HMI library capability. No callback setter or
dispatch invocation occurs during the four original playback runs. Its routed
HMP tracks remain available for inspection, with no identified game-side purpose
in this release. This does not assert that other applications using HMI ignore
that device.

The original bank-loading paths (`DBSIM 0x4f6d4`, `GO 0x42bf9`) use MELODIC.BNK,
DRUM.BNK and DRUM32.DIG. No DONS basename/reference occurs in either supplied
application image or any extracted resource. It is retained as an alternate bank
with no demonstrated game loader. WIN2 and SHELLC likewise remain available as
unselected registered music; their names are not substituted for observed music
choices. Computed access and different builds remain outside this bounded finding.

Complete playback observes 32,915 original MIDI output packets, 4,428 digital
sample starts, 210 PCM MIDI completion callbacks, 174 SNC mouth-update calls,
16 song starts and 176 gain changes. The actual HMI drivers, DOS timer and digital
backend execute inside DOSBox. Music A/B switches, speech and ordinary weapon
effects coexist in these traces; this closes the earlier software-scheduling and
completion boundary. Per-tape resource names, clocks and transition states are
linked from the [replay gallery](../analysis/tapes/replays/index.html). These are
command/completion traces, not new audio recordings or a claim about historical
analogue output. The standalone auditions retain their documented mixing limits.

## PCM controls and archived digital mixer

`capture_pcm_sound.py` executes original PCM construction (`0x507c8`), gain,
rate and loop setters, play (`0x509c4`), stop, HMI's 32-voice allocator, and
completion (`0x4e7fc`). Loaded sample storage and completion timing are explicit
boundaries. **2,560** stateful cases include **594** sample submissions and
**273** replacements when channels are full. `SOUNDS.STR` attributes are loop
count, base volume, preload flag and cache priority; the preload byte is not a
repeat flag. Repeated plays can overlap, replacing the object's tracked handle
while an older voice continues. The positional-volume query (`0x5049c`)
multiplies by 32767 after division; its large result affects victim selection.

`native_pcm.py` loads the actual `tr8m.com` / `tr8st.com` mixer modules from
HMIDRV.386, with their separate protected-mode selectors. Their dispatcher and
self-generated mix loops execute unchanged. `check_pcm_mixer.py` compares
**1,024 kernels / 262,144 source samples** including signed gain quantization,
the signed-byte intermediate overflow, saturating addition and stereo balance.
`capture_pcm_dma.py` records **9,600** complete original ring-buffer/voice states;
native C++ matches their ring CRCs, loop counts, positions and delayed releases.
Virtual DMA count reads are the hardware boundary. Initial buffer lead is 256
bytes for mono and 128 for stereo, with guarded ahead-of-playback filling.
Loop/end processing can discard fewer than four remaining source bytes.

Two details refine the earlier statement that effects may change pitch:

- The PCM pitch setter stores its requested 16.16 value, but ordinary play
  descriptors retain flags `0x4100` / `0x4300`. The mixer requires `0x0400` to use
  that field. Fifteen original loop/rate traces show that these descriptors play
  identically at requested rates 0.5, 1 and 15. No pitch variation is invented
  for this normal path.
- Loop count **255 is finite**. Only **65535** repeats without decrementing.
  Positional pan is copied when a voice starts; later position updates change
  the object pan and active volume, without updating that voice's pan.

The native implementation defines the original positional-volume divide-by-zero
case as zero. Unused custom subrange descriptors lack an initialized tail-length
word; native subranges are bounded to sample data. These are documented defensive
choices, not discoveries of valid authored sample-loop behavior. The modern
output device's rate conversion and historical analogue circuitry remain separate.

Speech starts only when the SNC's initial mouth frame is nonzero and speech is
enabled. All 556 simulation SNC resources have a nonzero initial frame; the gate
is nevertheless preserved. Portrait clock and radio-ready state remain separate
from successful digital voice allocation.

## Authored footstep triggers and native playback

`capture_footsteps.py` executes DBSIM `0x144dc` for 1,800 stateful cases. The requested movement sequence takes precedence over the current sequence. Foot contacts use each attachment's animated local Y: forward walk/turn/stopping, reverse walk/stopping and fast gait select threshold pairs 0, 1 and 2. Reverse playback reverses both comparisons. The disabled sequence uses attachment type 2, world Z, pair 3 and the initially armed fifth latch for sound 31. Foot contacts request sound 29 at the actor origin, not at the attachment. Comparisons are strict. Missing attachment objects do not advance the original latch pointer.

`capture_herc_steps.py` adds 2,560 complete movement/aiming updates on the eight original constructed player HERCs. Original attachment allocation, part lookup and hierarchy transforms execute. The corresponding native C++ animation path matches all 279 footstep requests. The native mission now consumes these and the projectile/explosion, collapse, collision, radar and shared flyer-engine requests through the verified PCM mixer. All 37 simulation samples and four live wingmate acknowledgement paths produce audible PCM in automated integration checks. The later whole-game audio checks below compare request order and identify the remaining engine-start timing limit.

`capture_audio_controls.py` records 6,000 original calls to the yaw/pitch sound gates (`0x14afc`, `0x14dc4`), target tones (`0x1552c`) and cockpit-engine update (`0x58574`). Independent yaw/pitch latches share sound 33; the threshold is strictly greater than 192, and signed -32768 retains its original wrapped magnitude. Target acquisition/change uses 20, lock pulses 21 and lock loss 22. Pulses follow clock bit 6, not an invented interval timer. The sensor caller returns before the sound update if there is no target. Cockpit view 4 is external: it stops engine loop 45; other views start it only after startup sample 19 has finished. Native controllers and emitted requests agree with all captured states.

## Native driver reconstruction checks

The C++ integration has additional original-code fixtures in `analysis/music`:

- `fm-driver.bin/json`: 16,276 original OPL2/OPL3 MIDI commands, 223,115 ordered
  register writes, and retained voice/controller/sustain state. All programs and
  drum keys, dense chords, allocation, bend-range changes and sustain overflow.
- `pcm-midi.bin/json`: 10,000 digital MIDI commands/completions and 13,592 backend
  events. The original bank and a copy with its note-off sentinel changed cover
  both one-shot and interruptible-note paths without modifying archived data.
- `music-gain.bin/json`: 4,000 gain updates and 62,286 physical packets, preserving
  the distinct per-message, master and song-volume arithmetic.
- `music-pipeline.bin/json`: all 20 songs with both original FM drivers, 722 ticks
  per case, six master-volume settings and stop cleanup; 257,910 FM writes and
  3,092 digital backend events. Sample completion notifications are explicit
  inputs; digital mixing and chip synthesis remain separate boundaries.

Two driver details surfaced while matching these captures. OPL3 implements nine
paired stereo voices. Its downward bend indexes pitch range by voice, while the
OPL2 driver indexes by MIDI channel. Both modules' 16-byte release cache overlaps
the frequency cache for high operator indices, so later note starts can write
release values influenced by previous frequencies. The native port preserves
these behaviours instead of substituting generic MIDI-to-OPL conventions.

The percussion driver's volume and pan are shared by the device, regardless of
MIDI channel. When its eight tracked entries are full, it attempts to evict a
voice on the incoming channel; if none exists, it can start an untracked sample.
The shared 32-voice digital backend still bounds actual playback. Its physical
ring-slot removal order is retained, including wraparound.


Normal SoundObject MIDI playback **does install a loop filter**: `0x505c8` passes
`0x4e718` to HMI `0x6ee87`. This is separate from the optional callback driver
and controller-119 callback, whose no-established-consumer boundaries still
apply. Earlier native scheduler notes conflated them; the C++ documentation has
been corrected. Markers without bit 7 always pass. Marked loops consult the
configured/current repeat word: zero rejects, 65535 repeats indefinitely, and
other nonzero values decrement and pass. SOUNDS.STR supplies 255 for combat music.

`capture_music_loops.py` executes that callback and its original loop setter for
3,072 playing/stopped, branch-ID and repeat-count combinations.
`capture_hmp_object_loops.py` installs it in the original scheduler for MENU and
BATTLE1A with counts 0, 1 and 65535, capturing 44,444 timed packets across six
23,000-tick runs. Zero and finite repeats finish; infinite repeats remain active.
The native counterparts agree. These complement the driver-isolated auditions,
which intentionally omit the game callback and use a declared duration bound.

The native live mission now connects these controllers to encounter observations
and shared UI RNG, original music fades, OPL3 synthesis and the same 32-voice PCM
backend used by effects. The host mix is 44.1 kHz signed stereo with equal FM/PCM
headroom; original 11.025 kHz PCM values are held between DAC updates. This mix is
not a measurement of an original card's analogue output balance.


## Integrated replay audio

World sound requests dispatch at their original call sites, preserving order
relative to UI, radio and effect requests. Radio opening/closing tones respect
the original already-playing gate. MFD/HDD buttons, shield and weapon controls,
weapon selection, options and alerts produce their original feedback.
Alert-input fixtures also compare the original click count for each response.

Original 58574 selects music before gating the cockpit engine, then flushes
positioned effects against the retained camera position before simulation.
The listener refresh keeps the original ten-call cadence and identity
orientation. Previously the native path refreshed after simulation against
the HERC's ground position, shifting distant engines' audible boundaries.

The four replay tests additionally compare 4,474 ordered non-engine requests
(1,328 / 1,500 / 1,052 / 594), including their frame and call order. All requests
are retained in separate ESREQ001 fixtures generated from the unchanged DOSBox
trace; expected requests are never fed into the game. Optional
EARTHSIEGE_REPLAY_AUDIO writes the native requests, driver acceptance and active
voice counts. Audio advances against the recorded outer clocks during replay.

Engine 16/45 starts depend on whether their prior sample is still playing and
whether the shared 32-voice pool can accept it. They remain in the comparison
reports, with the current counts in the final request-order section below.
The lower-panel and retained-page visual differences found during this work
are resolved in PIXEL_FIDELITY.md.


## Flyer engine destruction state

Original 1afa8 reads the live actor's byte at 93 before stopping or positioning
engine sound 16. The integration had read a cached decision-state flag, which
can remain stale until another controller refresh. It now reads flyer_actor's
actual destruction state; the replay audit also compares that flag against the
original on every frame. Gameplay, random state and return files still agree.

This removed the stale destruction-state cause of repeated engine starts.
The remaining differences depend on channel availability and sample completion;
the final request-order section below gives the current counts.


## Complete sound request ordering

Original 58574 gates cockpit-engine sound 45 on cockpit view 4, not on camera
ownership. During a prepared transition those change on different frames.
Reading the view state restores the original stop timing, including a frozen
options preview. ESREQ002 now checks 4,474 non-engine starts and all 2,599 stops
in exact combined frame/call order (7,073 requests), including engine stops.
Engine starts/retries remain separately reported because they depend on the PCM
completion and voice-allocation timeline: current differing-frame counts for
cockpit engine 45 are 17/5/1/10, and flyer engine 16 differs in two DEMO3 frames.


## Roland devices and the missing MT-32 arrangement

The native game now offers OPL2, OPL3, SC-55 v1.21, SCC-1A v1.30,
MT-32/CM-32L and General MIDI SoundFont playback. Ctrl+Shift+M selects the device
and saves it beside the game saves. Munt, Nuked-SC55 and TinySoundFont adapters
reuse the approaches from Darker and TFX. Firmware fetch helpers and automatic
asset lookup follow those projects too. [The native music guide](../../earthsiege-cpp/docs/MUSIC.md)
covers setup, locations and the two distinct MT-32 choices.

The supplied installer advertises an MT-32 option, but **none of the twenty HMP
resources assigns a melodic track to device 0xa004**. This includes the separate
SSET/SOUNDSET.HMP setup song. Original scheduler routing leaves those tracks at
255, meaning no installed destination. Only tracks assigned to the separately
installed digital driver 0xa005 survive. In MENU, its first sampled-percussion
hit occurs at tick 220, about 1.83 seconds after playback starts.

This is an original-data limitation in the supplied 1.0 release. The relevant
boundaries were checked directly:

- HMIMDRV.386 contains `mpu401.com` at offset 68044, size 677, and `mt32.com` at
  offset 68769, size 664. Their SHA-256 values are respectively
  `52e7c4b40e079ea9e00467af14cb26637d23309963b0978660a3c6c9f628c366`
  and `d10b1dd2e42653c442b2feebdb5d9fbabd629f6f0e3d44551ef7e30cd5165b2f`.
- Original module installation at `0x71076` retains the MT-32 device ID.
  Scheduler aliases accept 0xa001/0xa008 for 0xa000, and 0xa009 for 0xa002;
  they do not treat 0xa004 as General MIDI.
- SoundManager loading at `0x4ef8c` supplies MELODIC.BNK, DRUM.BNK and
  DRUM32.DIG, then disables HMI channel remapping with `0x7225a(0)`. There is
  no GM-to-MT-32 patch conversion or instrument-bank upload in this path.
- Both archived physical-MIDI drivers send the MIDI bytes unchanged. Their
  MPU port handshake is emulated explicitly by `tools/native_midi.py`.
- Master gain at `0x6edb3` uses the installed channel-enable mask. MT-32's
  mask is 0x02fe, channels 1-7 and 9 with zero-based numbering; MPU-401 uses
  all sixteen. This mask controls emitted volume updates, not track routing.

`tools/capture_midi_pipeline.py` executes the original installation, scheduler,
gain, physical module and digital-percussion driver. All twenty songs are
captured with each physical driver for 722 steps, including six master-volume
levels, explicit PCM completion, stop and cleanup. `analysis/music/midi-pipeline.json`
records 27,644 MPU-401 bytes, 3,120 MT-32 bytes and 1,546 digital events per
selection. The MT-32 bytes are setup, volume and cleanup commands, not a missing
melody arrangement. Native C++ matches all 30,764 bytes and 3,092 events.
Ready MPU ports, timer registration and sample completion are controlled host
inputs; this fixture does not measure hardware bus latency.

The strict MT-32 choice preserves the original omission. A separate **MPU-401
experiment** sends the available General MIDI parts to Munt, without rewriting
program numbers or inventing a patch bank. Its instrumentation can therefore
sound quite different. SC-55, SCC-1A and SoundFont choices retain any GM gaps in
the data as well: DESERT, for example, has no GM melody route.

The analysis browser's existing exports remain OPL2, OPL3 and SoundFont
listening copies. Adding native hardware backends does not relabel those files
as Roland recordings. All synthesis modes are tested with actual local firmware
or a SoundFont in the native build, including percussion, suspension, resume
and switching devices. The complete native suite passes 272 tests, with six
audio suites also passing ASan/UBSan and leak checking.

The private-window report is retained in `analysis/music/window-check/report.json`, with screenshots of selection, restoration after restart and the resumed menu. It uses an isolated Xvfb display and SDL dummy audio; real synthesis is exercised by the separate firmware tests.
