# Cockpit multifunction displays

Original DBSIM `0x39c64` constructs six pages: STATUS, FLASH COMM, NAV MAP,
SCANNER, TARGET and MISSILE CAM. The parent owns thirteen buttons and the shared
selected actor, range and page state. STATUS and TARGET use separate instances
of the same damage-diagram class (`0x32f74`, full paint `0x330b4`).

## Damage diagrams and status

`tools/capture_damage_display.py` records 1,200 complete indexed frames from the
unchanged original renderer on real constructed world actors. Cases cover all
eight player chassis, individual armour sections, internal damage, colour-band
boundaries, shield/death precedence, friendly/enemy/self labels, no target,
unknown targets, and actual ground/flyer actors from the demo world. The native
C++ PDG reader and display renderer match every frame. Captures and their JSON
inputs live under `analysis/cockpits/damage-display*`.

PDG has three diagram views, each with bounds and seven-word colour regions,
followed by five-word mount records. The MFD uses view/frame 2. Each region names
an armour section or an average of paired/three-part sections. Health bands are
90, 74, 51 and 1 percent. The four stored remap modes shift a three-colour range,
replace an exact colour, add a palette offset to every non-background pixel, or
flatten a three-colour range. Sprite index zero is transparent; the display's
background is index 63.

HERC status precedence is DESTROYED, CRITICAL if all twelve internal fractions
exceed 128/256, INT DAMAGE if any is positive, SHIELDS DN if otherwise intact,
then OK. Ground/flyer status instead uses total-health colour bands. Only friendly
actors receive the numeric health percentage. Self STATUS omits target/name
labels. Ground/flyer names retain the previous name font, even when the preceding
page state was NONE or an opposing HERC; this original statefulness is preserved.

The original damage metric helper `0x109bc` reads a tenth weapon component even
though HERCs allocate nine hardpoints. The harness pads that unused capacity and
accumulator with 1 and 0, preserving the actual component counts and all original
instructions. The unused output is never consumed by this display. The padding
is a controlled fixture input; the original out-of-range access has no defined
value.

## Parent controls and page scheduling

The GAU parent starts at byte `0x2d8`, the thirteen relative button rectangles at
`0x2e8`, and the relative display rectangle at `0x3b8`. Mode changes (`0x3a9ec`)
select the actor from the player or HUD target for STATUS/TARGET. Ordinary parent
updates (`0x3a2a8`) refresh STATUS/NAV MAP/TARGET after a strict 30-tick deadline;
SCANNER and MISSILE CAM refresh every update. Page changes and full repaints have
separate immediate paths. The parent controls, pages and damage timing have original-code captures below.
Their integration into the native application is a separate implementation task.

`capture_mfd_controls.py` now records 472 button-only rasters and 72 range cycles.
The native control renderer matches every pixel, all thirteen rectangles and page
availability across all eight GAU layouts. Range cycles 120,000 → 30,000 → 80,000.
Initial page installation `0x2cdac` explicitly selects STATUS. The seven flags
used by `0x3a9ec` are stored with a thirteen-byte stride; the six remaining bytes
are not another set of button-availability flags.

## Scanner and communications

`capture_scanner_display.py` verifies 480 complete original frames. Scanner range
uses the strict original boundary and fast integer distance, then original sine
projection at 30,000/80,000/120,000 units. Dead, disabled and waiting actors are
omitted. Undetected hostile contacts use their last-known position and blink on
bit 5 of the UI clock. The selection box, friend/foe/type colours and readouts
match native C++.

`capture_communications_display.py` verifies 240 original FLASH COMM frames and
command indices, including selected/disabled text, shortcut letters, and the
SCAN/EMCON and FIRE AT WILL/HOLD YOUR FIRE alternatives. Delivery is now connected to the native mission and independently verified below.

## Navigation map

`capture_navigation_display.py` records 288 original NAV MAP frames covering all
24 environment variants, multiple terrain-centred positions, headings, roll and
display rectangles. Every indexed frame matches the C++ renderer.

The map camera is fixed at Z=200000 with pitch -16384, retaining the current
camera's horizontal position, roll and heading. Projection uses shift 7 and near
128. The page draws the static zone in stored order, without the normal scene's
distance sorting, distance shading or actor pass. Even-numbered ramps 0 through
14 become the sixteen colours 16–31. Background is palette index 23 and the
five-pixel central cross is index 60. A blank map at some starting positions is
legitimate: the original zone may have no terrain inside this small viewport.

The capture supplies the real initialized display's default graphics context at
+0x40 as well as its current context at +0x44. The child context constructor copies
this default; leaving it unset silently copies executable bytes from address zero.
The actual map-angle static constructor `0x36e9c` is executed too. These setup
requirements are explicit in the capture and do not replace renderer instructions.

## Missile camera

`capture_missile_display.py` records 94 original full frames and state transitions:
idle readiness/lock labels, live views, explosion flashes, projectile retirement
while flashing, flash retirement, and explosion detection from the last retained
camera position. All match the C++ page and tracker. Original world, missile and
explosion factories, pool traversal and painting execute unchanged. Positions,
retirements, ammunition/lock flags are controlled. Scenery candidates are static
terrain, and panorama detail is explicitly disabled in these fixtures.

Every player-fired rocket becomes the watched projectile (`0x7748`), regardless
of seeker subtype. The camera advances 500 units horizontally using its heading,
retaining pitch/roll. It retains the last camera position when a missile vanishes,
then checks explosions in original oldest-first pool order; fast distance must
be strictly below 10000. While that explosion remains allocated the display
alternates palette 60/63 on every paint. The retained explosion takes precedence
over validating the projectile reference. Pool-slot identity is preserved, so
slot reuse has the same semantics as original raw-pointer reuse.

The live image uses ordinary scene culling/sorting but the same even-ramp
16–31 remapping as NAV MAP. Texture translations retain the original world palette
from initialization. Its projection is shift 7, near 128, with a rectangular
mask; the small background has sky colours 16–18 and ground 22–24. High-detail
panorama rendering remains part of the remaining shared background work.

Readiness counts ammunition only for rocket-class weapons (original virtual
method `0xac70`); it does not require a currently selected EO missile. The separate
parent's automatic page switching does depend on selecting EO. LOCK is blue on
palette 48 while clear, and yellow over palette 63/53 when asserted, blinking on
UI clock bit 5. Parent updates and automatic page changes are verified below;
the C++ cockpit now connects the healthy page paths to live mission state.

## Parent state and scheduling captures

`capture_mfd_state.py` records 600 healthy parent MFD transitions. C++ matches
all page/range/selection state, retained EO auto-switch state, button faces,
refresh flags/deadlines and child paint dispatches. Actual constructors, page
setters, button callbacks and `0x3a2a8` execute; only the child painter entry
points are intercepted, with their pixels verified independently above.

Page changes request a full paint followed by an update on a subsequent parent
call. STATUS/NAV/TARGET share a strict `deadline < now` check, then schedule
`now + 30`; SCANNER/MISSILE update on every call, while COMM clears its update
request after painting. A retained update flag can cause full and update calls
in the same iteration. EO selection remembers the previous page and opens the
camera; manually leaving it suppresses that automatic switch until selection
changes. Hidden and external-camera views do not advance this state. Range and
communications scroll cases use the original button callbacks; disabled choices
are skipped. Damage-induced instrument flicker remains a separate boundary.

## Instrument damage and flicker

`check_instrument_failure.py` independently matches all **257** damage fractions
and **14,400** timer/RNG updates. Module 4 drives the failure state of the main
MFD, wingmate panel and targeting display. Remaining-health bands 90, 74, 51 and
1 percent become severity 0–4. Severity 0 bypasses the failure routine. Severity
3 immediately asserts failure; the other nonzero severities use timed windows.
The fully destroyed band 4 still follows that latter branch in the original;
it must not be inferred to behave like severity 3.

The separate UI random generator at `0xb5c48` schedules a window 2–7 nominal
seconds ahead, lasting 1–240 UI ticks. Within the window it flips failure state
after 1–30 ticks, using strict deadline comparisons, and requests sound 28 on
entry into failure. When a window expires, it reschedules from the current
clock and leaves severity 2 and above failed between windows. Damage does not
consume the gameplay random stream. The UI clock advances at nominal 60 Hz;
these intervals do not catch up multiple missed events in one update.

`capture_instrument_failure.py` runs **450** complete original cockpit/background
frames with module-4 damage supplied directly. Its five animated captures are in
[failure and radio presentation](../analysis/cockpits/runtime.html). This verifies
the visible failure, restoration and page-copy behavior, independently of the
arithmetic fixture. World physics is stationary in these captures; they are not
combat replay. Original rasters, SHA-256 values and timer states are retained in
`analysis/cockpits/failure-composition.json`.

## FLASH COMM delivery and acknowledgement presentation

`capture_communications_delivery.py` records **80** original command deliveries
through `0x2b448` → group dispatch `0x1c950` → the actual HERC virtual handler
`0x1a1cc`. It retains controller/order/target changes, acknowledgement IDs and
text, radio queue records and the separate UI random stream. Scenarios include
missing, dead, distant and valid targets, disabled or busy wingmates, an existing
attack order, a current attacker and the radar/ignore alternatives. No command
or acknowledgement methods are replaced.

The group excludes dead members and the issuing actor. It prioritizes suitable
controller/radar states, then the nearest member. ATTACK TARGET and HELP ME stop
after the first acceptance; the remaining orders can reach the other members.
The accumulated acceptance/refusal state prevents a chorus of acknowledgements:
the first refusal can speak, and a later first acceptance can supersede it.

| Command | Original handler consequence |
|---|---|
| Attack target (0) | Requires a valid HUD target within 130001 fast-distance units, a capable wingmate and no busy-controller gate; installs order 4 and target identity stamp |
| Ignore target (1) | Sets the ignore flag and, where necessary, retargets or cancels the current attack |
| Help me (2) | Searches living HERCs targeting the player within 60000 units and chooses the nearest; it does not simply attack the HUD target |
| Form up (3) | Restores the formation controller and clears the explicit order; near/far acknowledgements differ at 25000 units |
| Scan (4) / EMCON (7) | Sets/clears radar and its request flag |
| Fire at will (5) / Hold your fire (8) | Uses actual target selection and controller transitions; acceptance depends on the wingmate's state |

Acknowledgements pass through `0x1a188` and the speaker-specific descriptor tables
in `0x2ed94`. Random text variants use the UI random stream. The radio queue has
ten slots, a priority insertion path, relative minimum/maximum display times
and earliest/expiry deadlines stored in 60 Hz units. Its insertion and eviction
bookkeeping defects are documented below. The active message is treated separately
from waiting-message expiry.
The COMM panel flips its SCAN/EMCON or FIRE/HOLD alternative only after delivery
is accepted, not merely when a button is pressed.

An **80-frame** original composition shows “WHAT'S YOUR TARGET?”, “ROGER. RADAR
ACTIVATED.” and “ROGER. SHUTTING DOWN.” with their real queue transitions and
on-demand SNC reads. The original no-sound initializer `0x4db14` rebuilds speech
slots without the DOS snapshot's stale hardware pointers. Original mouth-event
callback `0x4e39c`, registered every second 120 Hz interrupt, advances between
frames. This particular capture exercises silent-driver presentation. Audible
speech completion and mixing have separate integrated checks in MUSIC.md. See the [runtime gallery](../analysis/cockpits/runtime.html).

## Scanner history producer audit

The isolated scanner raster fixtures establish how a supplied last-known
position is displayed. They do **not** establish that gameplay maintains it.
`check_scanner_history.py` watches every original write to actor `+0x164/+0x168`
and unavailable byte `+0xa1` across **4,500** whole simulation frames: idle,
moving, activated opposition, close collision and firing at three frame ratios.
There are **no writes**, including in scenarios with changing visibility.

All captured actors start with the history-unavailable flag asserted. A bounded
static offset-reference audit finds constructors, the scanner consumer, and
unrelated UI structures, but no established producer. Linear disassembly cannot
exclude every pointer alias or computed access. The documented endpoint is
therefore **retained fallback with no observed producer**, not a proven active
radar-memory feature and not proof of universal dead code. C++ should not invent
a producer merely to make the fallback visible. Evidence is retained in
`analysis/cockpits/scanner-history.json`.

## Native command integration and original undefined state

The C++ cockpit now binds all six healthy MFD pages to the live mission, including
actual projectile slots, scanner detection flags, target damage and wingmate
commands. `capture_mission_displays.py` verifies all 128 actors in the four demo
starts. `capture_wingmate_orders.py` records 1,536 original command branches,
including direct attack, position orders and mission-command aliases as well as
the FLASH COMM choices. Target selection, attack strategy and acknowledgement
presentation are named boundaries in that branch fixture.

`capture_wingmate_dispatch.py` records 256 original recipient sequences, including
priority, distance ties, dead/issuer exclusion and accumulated acceptance. The
live `capture_mission_orders.py` then executes 48 sequential orders across all
four original demo starts with target selection and strategy running unchanged.
Every resulting actor order, target, controller, radar/request/ignore flag,
acknowledgement and gameplay RNG state matches the C++ mission. The original RNG
initializer runs before actor construction with zero warm-up draws. Radio queue
insertion is the explicit boundary in this integration fixture; its independent
complete original captures remain above.

There is a confirmed original defect in `0x1c950`: the local priority word at
`[EBP-0x2e]` is not initialized for several commands, including FORM UP (3). The
switch at `0x1ca19` skips directly to the read at `0x1ca5c`. If the inherited word
is below -1, no recipient is selected; otherwise neutral commands choose the
nearest member. The dispatch fixture supplies that inherited word explicitly,
covering negative and positive values. C++ uses zero for live delivery, a
documented deterministic resolution of this undefined original behavior.

The HERC constructor also leaves aimed-component scratch at actor `+0x238`
untouched. The live fixture watches original writes and compares this word only
after a command consumer has produced it; allocator zeros are not treated as a
semantic initial value. The C++ default remains the explicit no-component value.

## Combined failure and radio integration verification

`capture_mfd_failure_state.py` runs **1,200** parent MFD updates with changing
damage bands, page selection, EO selection, hidden views and external cameras.
Only child painters, the failure-label raster and the sound submission are
recorded boundaries. C++ matches page dispatch, timer state, flags, sound 28
requests and the final UI RNG. The failure label comes from STRINGS0 group 30:
OFFLINE. Severity below 2 paints an empty background instead. The original can
still dispatch a child update after a failure repaint; damage-page update
`0x33690` invokes its full painter. C++ retains this seemingly odd interaction.

`capture_radio_queue.py` records **1,152** original insertion, removal and expiry
operations. Both slot contents and the retained index/allocation arrays match
C++. Initial unused index words are explicitly zeroed. Original `0x2e59c` starts
the insertion shift at count minus one, leaving the new last index untouched.
Original `0x2e85c` uses `order[order[9]]` when releasing a full queue's slot.
These produce repeated indices in 878 captured states; they are original
bookkeeping defects, not inferred intended priority behaviour.

`capture_radio_descriptors.py` runs **880** original system/pilot/commander
resolutions, covering three voice banks, missing entries, unknown-speaker fallback
and four UI RNG seeds. **776** resolve to messages. C++ matches text, selected
speaker, all descriptor fields and final RNG. Supplied banks have at most two
variants; the original nonzero-variant helper repeatedly asks for the record
after the first, rather than advancing a cursor.

The same tool writes `commander-loader.json`, demonstrating a further original
defect. COMMANDR IDs 50–56 are stored at `0xbd0ac + id*9`, while lookup reads
`0xbceea + id*9`. The intended table remains empty. The misplaced writes start
at `0xbd26e`, beyond the table and inside other UI globals. A separate isolated
probe zeroes both regions before executing the unchanged loader; it recovers
all seven descriptors at the wrong addresses. The ordinary speaker fixture
therefore produces no commander messages. C++ keeps those resource records but
does not imitate the out-of-bounds memory writes. This is an explicit safe
resolution of undefined memory corruption, not an assertion that every affected
original campaign session necessarily survives loading unchanged.

`capture_radio_state.py` executes **1,920** active-consumer transitions through
`0x2ef58`, with presentation readiness, callbacks and text enablement supplied.
C++ matches callbacks, active-slot identity, retained flags, queue contents and
all four timing fields. The front entry is exempt from waiting expiry; relative
minimum/maximum times become absolute only when presentation starts. The active
slot remains a storage identity even if subsequent priority insertion changes
the front index. Portrait rendering and speech output are integrated; the sections below
record their original-state and complete-composition comparisons.

## Pilot portraits and live radio presentation

`capture_portrait_timing.py` executes the original SNC reader (`0x4e4a7`), start
(`0x4e518`) and timer callback (`0x4e39c`) for all **556** simulation SNC files.
Native C++ matches **37,280** mouth/deadline states. Entries are byte pairs of
frame and duration on the nominal 60 Hz audio/UI clock; frame 255 terminates.
This is distinct from the 120 Hz HMP event clock. The isolated capture disables
hardware audio and does not claim to verify concurrent callback-list ordering.

`capture_portrait_state.py` verifies **2,400** original `0x3e573` transitions,
including ordinary replies, opening/closing static, hidden panels, dead pilots
and special message 37. Opening and closing static each last 20 UI ticks. The
radio queue becomes ready when the SNC starts; its cancellation latch is set
when the timeline ends. Message 37 flashes mouth frame 27 against static with
original UI RNG delays, then leaves permanent static. Portrait painting, page
copy and sound submission are explicit boundaries here, independently checked
by their raster/timing fixtures. The mouth argument is a signed 16-bit stack
argument; its uninitialized upper half is not part of the frame index.

`capture_radio_portraits.py` compares **600** portrait rasters and complete UI
RNG states: twelve pilots, both full/reduced detail modes, 24 ordinary mouth
frames and special death frame 27. Full detail selects backing frame 24–26 with
an unsigned remainder after sign-extending the RNG's 16-bit result. Reduced
detail uses backing bitmap 6 and its original mouth-remap table, without that
RNG draw. OFS loading reads exactly 27 indexed records; later file data is
retained without treating it as additional live offsets. Death frame 27's
unloaded offset is zero in the captured allocation. C++ explicitly uses zero
rather than copying an indeterminate-memory dependency.

`capture_wingmate_portraits.py` verifies **1,620** original idle/static rasters.
The pilot name uses CPRED over the slot colour (56, 59, 49); STATUS/OBJECTIVE
labels use CPBLUE and their values CPRED. Health is the original band of the
integer mean of nineteen armour fractions. Controller display status is the
separately verified `0x15d70` result, not the raw command. The static bank cycles
five frames only while its panel is visible. Label rendering executes unchanged;
damage metrics and displayed controller status are supplied at their already
verified boundaries. Captures measure the prepared VGA page, since these child
painters do not switch the displayed page themselves.

`capture_radio_banner.py` verifies **32** original text/banner rasters. It keeps
the first 74 message bytes and the original CPRED layout around X=160/Y=100.
The no-speaker prefix is literally `XXXX`, not an inferred localized label.

The native inspection cockpit now consumes live command acknowledgements through
the verified catalogue, queue, transmission phases and portrait/banner renderers.
Pilot identities come from the roster slot divided by three; voice banks are
1, 2 and 4 for successive groups of four pilots. The first three non-player
members of the player's group populate the panel. Eight integration checks cover
all four original demo rosters with the panel visible or hidden, validating
speech resource bindings and completion. Speech requests now reach the native PCM backend. Failed starts retain the
original portrait/queue behavior; the complete replay inputs and comparison
boundary are documented in RUNTIME.md. Full mission replays are checked
separately from this radio-panel fixture.

## Lower-panel tactical map

The lower HDD MAP is separate from the forward NAV MAP MFD. Original painter
`0x40d4c` uses a north-up camera at pitch -16384, projection shift 7 and near
plane 128. Its initial altitude fits the mission's entire compiled point table,
expanded by 60,000 on each edge. Pan follows the player's position plus retained
X/Y offsets. Zoom changes altitude by 50,000, bounded to 50,000–1,000,000.

The background/grid/boundary indices are 54/55/53. The grid projects an 800,000
world-unit span and subdivides it into sixteen; the first negative line has a
separate rounding expression. Scenery draws in resource order with its first
cell set to 1 and shade ramp 14 rebound to index 56. These are deliberately
schematic shapes rather than the normal shaded hills.

ICONS.DBA provides waypoint numbers, eight-direction HERC/flyer symbols and
building markers. Building scaling compares against bitmap height, not its
padded storage width. Friendly wrecks remain visible; hidden/dead hostiles do
not. A lost hostile can blink at its retained last position when that record is
available. The initialized actor flag normally disables this latter path.

`tools/capture_tactical_map.py` captures 160 original VGA rasters, including
zoom/pan, directional boundaries, building scaling, selection and failure.
The native C++ map matches every indexed pixel. Its fixture includes controlled
contact records; this check does not establish the later command-selection or
whole-panel lifecycle behavior.

## Lower-panel map controls and complete damage diagrams

`capture_tactical_controls.py` runs the original map-selection and destination
routines on an initialized scene. Its 908 sequential states retain separate
pending/committed destinations for three wingmates, command selection, cursor
mode, pan/zoom and the shared outgoing packet. Picking uses a strict five-pixel
world-space square in original actor order. ATTACK requires a hostile actor;
DEFEND accepts a friendly actor or (before a destination is ready) a ground point.
The selection range is the current MFD range, without scanner visibility checks.

The original packet writer only overwrites the field selected by destination
kind. An actor destination leaves the preceding position intact, while a point
leaves the preceding target intact. In particular, the DEFEND receiver consumes
the position even for an actor selection. These retained fields are represented
explicitly in the native controller, rather than silently correcting the behavior.

`capture_full_damage.py` captures 592 complete VGA frames from all eight playable
HERCs. The original `0x3058c` builds weapon diagrams from PDG attachment anchors,
GL equipment-to-slot bindings, WEAPONS.DAT icon indices and WEAPONS.PDG dimensions.
DBA padded widths matter for mirrored left-side weapons. The damage painter
`0x424f8` handles structural/internal/weapon pages, twelve-row pagination, five
health grades and subject/no-target labels. Shaded body regions read original
bitmap pixels when recolouring; equipped weapons use the current framebuffer.
Weapon health combines armour and internal capacity. The native renderer matches
all 592 indexed frames; this verifies complete redraws, not the original page-copy
transport or incremental update schedule.

## Assembled lower cockpit and retained labels

`capture_cockpit_hdd.py` adds fourteen complete lower-panel comparisons using
an initialized original DOSBox snapshot and its coherent handoff files. Damage
page/subject changes, pilot names, map selection, cancellation and prompts match
all compared pixels. The comparison excludes surrounding cockpit instruments,
animated portraits and the separately drawn software cursor; those are distinct
owners. It steps original page rendering without stepping mission AI.

The integration exposed an original label-table defect in `0x424f8`. Weapon
names are copied into consecutive eight-byte buffers; only occupied mount slots
update their pointer entries in `0xb160c`. Empty entries retain pointers into
that shared pool. After viewing a different HERC, previously empty weapon rows
can acquire stale names. C++ retains these references as bounded indices and
strings; this is not extra equipment in the mission roster.

The map fixture now includes waiting friendly groups and selected-wingmate
blinking. Actor `+0x9e` means disabled, whereas group `+0x16` is the activation
trigger pointer. A friendly group's current position is available when that
pointer is null or the actor is seen. Other unseen contacts use the last-position
path and clock bit 32. Selected-wingmate blinking instead uses the independent
phase toggled by the map's thirty-tick refresh.

`capture_tactical_targets.py` adds 1,024 original Tab cycles. Unlike mouse picking,
this selection does not use the current MFD range. `0x41b19` requires the requested
side, a living actor, its `+0x92` selectable flag and an on-map projection. Hostiles
also need remembered knowledge or a seen flag within 1,000,000 native units.
The `+0x92` flag is retained explicitly in the comparison rather than renamed
as a radar or damage condition. The initialized live actors have it set.

Original map Enter projects a Tab-selected actor and runs the ordinary click
path; ATTACK without a selected actor does nothing. Comma/period cycle only an
already selected command. The isolated damage painter supports a scroll offset,
but no Page Up/Page Down handler was established; the interactive implementation
does not invent one. Key tables and direct function captures distinguish those
capabilities.


## Input dispatch ordering

The original mouse queue is consumed before world AI, but the two displays
have different button owners. MFD callback 3a46c executes immediately. HDD
callback 3d430 merely writes its last button index at +4e5; update 3cd28
dispatches it through 3d48c after simulation. A failed HDD retains pending
non-page requests until usable, rather than discarding them.

MFD 3a5e7 handles D, Alt+R, T, X, comma and period, consuming recognized keys
even when the current page disables their button. Alt+R still cycles range.
On communications, A/G/H/O/C/E/F choose attack/ignore/help/form/scan/scan/fire.
The Alt variants use the separate global immediate-command path.

Communications keeps the parent highlight separately from the child's last
painted choice. 35d20 copies the selection during painting; 3adc8/35f4c
transmits that child choice. TRANSMIT suppresses calls while the shared
double-click latch is set. Thus clicking an already selected row twice routes
back to a transmit callback that rejects it; it does not deliver an order.

capture_mfd_input_dispatch.py executes 72 original transmit cases across all
parent/painted selections and both latch values, plus twelve same-row click
cases. Only final group delivery is intercepted. Results are retained in
analysis/cockpits/mfd-input-dispatch.json; full replays independently check
the resulting native orders and controller timing.


## Later live integration findings

System alerts use their own queue at interface +0x207; pilot speech uses +0x203.
System captions are forced on and use CPRED in the GAU rectangle at +0x694,
with an 80-byte text limit. Messages 31/32/33 control the original blink latch.
capture_system_banner.py measures 60 unchanged 2fa00 rasters.

The 2b3e8 individual-order path cancels a pending message 34 for that pilot
through 2f370. It does not request a new status report. capture_radio_cancel.py
retains 15 original queued/opening/ready cancellation cases.

The UI clock 981c4 and SNC timer 959dc run at nominal 60 Hz with independent
phases. A mouth animation can end one UI tick earlier than a shared-clock
implementation predicts. The post-load clock read at 3e4c9 is also distinct
from queue-entry time. New full-replay observations retain these boundaries.

A failed speech start at 3e682 cancels during opening, before the ordinary
caption transition clears the starting flag. Original 2ef58 retains that flag
on removal, potentially preventing later messages from starting.
capture_portrait_state.py --failed-playback supplies an explicit failed device
return and records another 2,400 original portrait/queue-flag transitions.
The complete original recordings demonstrate this path without injected failure.


Full cockpit repaint 2fa00 clears the system-message rectangle to colour 63
before checking whether any text is active. Finishing a message also retains a
blank area on the original page. The native renderer now preserves that blank
instead of restoring the underlying cockpit artwork each frame, and translates
its authored bounds by the current cockpit origin. Tracing the original return
from the lower view locates the clear at 2fa72 and the retained-page copy at
22d33. This resolves the 1,479-pixel header difference in the sampled DEMO1 view.


## Lower cockpit composition and the original temporary brush bug

The original HDD painter 3cb90 stores a pointer to its local brush. Drawing an
occupied pilot via 3df60 replaces that pointer with another stack-local brush.
Restoring the window does not restore the brush pointer. The next empty portrait
fill succeeds, but 53d9c reuses that stack space for its rectangle; further empty
slots then see an invalid brush kind and retain the underlying artwork.

With one wingmate this clears slot two to colour 63 while slot three retains
86. With no occupied slots, all three clear. The native renderer reproduces the
observed slot behavior with ordinary owned values, without an invalid pointer.
capture_empty_portraits.py executes the original full painter and transitions
under all eight explicit occupancy masks; all twelve unused-slot rasters match.
The JSON records the brush words before and after the overwrite.

GAU offset 634 selects the pilot highlight style. All eight shipped cockpits use
style 1: the small lamp rectangles at 5fc/60c/61c, coloured 59 when selected and
57 otherwise. Style 0 uses portrait outlines. Native integration had always
drawn outlines; that added 654 incorrect border pixels in the sampled lower view.
Original 3eb3c is the style consumer; the lamp rectangles are distinct from the
portrait's inset interior.

The original front artwork overwrites the overlapping top of the lower artwork
on the shared VGA surface. HERCULES's lower origin is y=197, so its first three
visible rows come from DB0. This is now retained in direct panel rendering too.
The sampled DEMO1 lower frame 420 now differs by 25 RGB pixels rather than 4,109:
13 reference-cursor pixels and twelve lamp/clock-phase pixels. Frame 480 differs
by 110. This is a sampled comparison, not whole-recording image equality.


## Lower-panel refresh ownership

The original MAP and DAMAGE pages keep independent 30-tick deadlines
(3f578, map +149; 3cd28, owner +4ed). MAP starts with blink phase one.
A page selection requests a two-page VGA restore; the map's timed update resumes
after those two paints. DAMAGE still checks its own timer during restoration.
Hidden pages retain their deadlines.

Map pixels also have their own dirty gate (94868). Selecting a wingmate or
changing command text does not immediately redraw contacts. Panning, zooming,
a destination pick, full restoration or the next map deadline does. Treating
every label change as a map redraw incorrectly hides the selected icon early.

capture_hdd_refresh.py executes 274 sequential original states with repeated
and alternating page selections, exact deadline boundaries and irregular clock
steps. The native integrated HDD agrees on both deadlines and blink phase.
The fourteen original assembled-page raster checks also pass. The paused
snapshot capture explicitly uses the constructor blink phase; its retained
phase is not assumed to describe a newly constructed interface.

## Missile-camera ground pass

Original missile page 364f8 calls the ordinary world entry 21008, including
its near-ground attachment pool before scene sorting. The native caller now
passes HERC shadows as well as explosion ground effects, and enables the
original model-bound culling used by that scene entry.

capture_missile_display.py --ground adds five original attachment objects,
using the three valid FLAT shapes, at near, intermediate and cutoff distances.
All 94 complete indexed frames and retained ground positions match; 41 frames
exercise 165 original ground draw calls. Idle and explosion-flash pages correctly
leave those positions untouched. This supplements the existing 94 missile
camera/tracker cases without changing their reference data.

## HDD subject indicator and initial clock phase

The lower display's small indicator uses the authored rectangle at GAU +4fc.
Full painter 3cc39 fills it with palette index 59 or 57 from owner byte +4dc,
initialized to one at 3ca9a. Damage-subject cycling at 3d620 changes that byte
according to the selected actor's player flag (+9d). It retains that choice
when returning to MAP. The native renderer had omitted this rectangle entirely.
The original fourteen-page HDD fixture now includes it and verifies the change.

Clock data byte 94b56 starts at one in the executable. Both initial VGA pages
receive full clock paints before timed updates. The component clock fixture
deliberately clears this byte; its zero phase is now an explicit fixture input.
The live constructor uses the original initialized phase and both page paints.
A separate replay tool consumes original 43621 timer reads and 79a14 HMI elapsed
inputs, asserting rather than assigning the original clock and TTM state.
