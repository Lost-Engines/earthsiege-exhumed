# Explosion and debris creation

`check_effect_creation.py` independently checks 1,152 original explosion constructors and 256 debris bursts across 64 random seeds. Resources, pools, geometry instances, light setup, sound requests and launch methods execute unchanged. `capture_effect_updates.py` captures 126 traces / 3,046 updates with primary cells, secondary cells and light intensities together; it checks that updates do not change the shared RNG. Native C++ agrees with all retained cases. Particle motion, pool ownership and mixed lifetimes now have the additional comparisons below. Additional original composition captures are documented below; live audio mixing and complete mission replay are documented in MUSIC.md and RUNTIME.md.

EXPLOS.DAT contains 18 records of 44 bytes: model root, animation cell, texture bank, countdown period, secondary-model flag, light mode, twelve intensity words, a 32-bit light distance, sound selector and an alternate object-kind flag. Light modes 0/1/2 mean absent, ordinary, and distance-gated (`0x5d2c`). Object kind is 2 normally or 8 when the final flag is nonzero; its later consumers remain to be named. Nine texture banks are loaded separately.

An explosion reserves its object before drawing randomness. Successful creation consumes one full signed-word random value as its roll angle, with pitch and heading zero. It starts its selected animation cell at zero and its countdown at the definition period. Initial light intensity is the first full intensity word; subsequent frames use the low byte. Sound number is the authored selector plus 10. Optional secondary geometry and light construction consume no extra random draws at this boundary.

The primary countdown subtracts the signed-word frame ratio and clamps negative results to zero. Expiry advances the selected cell modulo its cycle length. A wrap to zero, or a definition without a cell, finishes the effect. Otherwise the light changes, the secondary cell advances modulo its own count (five for the supplied secondary model), and the original period is restored. Countdown overshoot is discarded. Destruction follows elsewhere; the final updater does not itself clear the light.

## Original light-table overlap

Definitions 16 and 17 animate through thirteen frames but reserve only twelve light-intensity words. Frame 12 reads the low byte of the following 20,000-unit distance field: **32**. The native captures confirm this brief final light value after the two preceding zero-intensity frames. C++ reproduces the overlap with an explicit field access, without reading outside an array.

## Debris bursts

DEBRIS.DAT contains four groups. Its formerly labelled `mode` is an exclusive random upper bound on particle count. Each group contains model/weight pairs; their signed-word sum is the model-choice bound. The original weighted selection keeps equality in the preceding bucket (`weight < choice`), including zero selecting the first entry.

Each particle draws its model choice, then an elevation in `[-10000, 14000)`, then a full-word heading. Launch speed is 400; the original Q14 cosine table and rounding produce the three signed-word velocity components. Particles start at the supplied position, with only heading set. These calls share the damage generator, so replacing them with unrelated visual randomness would change later component choices in an authentic reconstruction.

## Debris motion and object lifetime

`check_debris_motion.py` independently matches 960 original trajectories / 41,576
updates through `0x64b8`. Pitch advances by 1,500 angle units; vertical velocity
loses 50; horizontal velocity loses its rounded Q10 product with 50. Position
then advances by the resulting velocity. The flat Z=0 plane supplies collision,
independently of scenery height fields. A below-ground step clamps Z to zero and
reverses vertical speed with rounded 450/1024 retention. A rebound below 100
retires the object. All velocity/angle/position wrapping is retained. Four
frame-ratio inputs, including zero, confirm that these operations are **per
update**, without the time scaling used by many other consumers.

`check_object_pool.py` matches 2,400 original operations at capacities 1, 3, 40 and
150. Allocation takes the free-list head and inserts at the active-list head;
release inserts the slot at the free head. Queued releases retain allocation
until collection and are reclaimed in queue order. The ordinary list traversal
is newest first, but `0x63a20`, used by the simulation effect pass, walks **oldest
first**. Both traversal orders have original-code checks. Object destructors are
an explicit callback boundary in this generic pool probe. Duplicate queue entries
and the original twenty-entry deferred queue overflow are excluded.

## Combined live effects

`capture_effect_world.py` retains 1,620 complete mixed effect frames: nine explicit
180-frame schedules at three frame ratios and three random states. Original
factories, geometry instances, lights, model destructors and all pool reclamation
execute. Native C++ owns matching live models, cell states, movement, retirement,
slot reuse and complete shared random state. These are isolated effect schedules,
not a complete actor/mission replay or a pixel comparison of effect drawing.

The explosion pool has 40 objects and debris 150. The effect-light controller
pool created by `0x55b8` has only **three** objects; this is separate from the
lighting manager's twenty physical source slots. If all three controllers are
occupied, another explosion is created without its light. Failed explosion
allocation occurs before drawing randomness. The combined captures exercise
light exhaustion and subsequent slot reuse.

The original debris burst calls its launch routine even when allocation returns
null. C++ preserves the 150-object capacity and burst random draws but safely
omits surplus particles instead of dereferencing null. This deliberately replaces the original null dereference with a bounded result.
Secondary explosion geometry and the shared flat-object pool are integrated.
The later lifetime/queue comparisons below cover their interactions.

## Beam ribbons and shared projectile lifetime

`capture_beam_effects.py` executes the original beam constructor, lifetime and
full scenery rendering for 52 defined cases. All six subtypes now match C++
geometry, random state and complete VGA output. Widths are 60, 30, 120, 20, 25
and 30; palette indices are 10, 102, 10, 88, 88 and 88. Ordinary beams have two
ribbons; both end vertically even though the second begins horizontally. ELF
uses one strip, a signed short normalization factor and three positive 0–127
random coordinate offsets for every pair after the first. Its face table supports
20 segments. The original fill reverses projected zero-area polygons before
viewport clipping; this matters for edge-on ribbons.

`capture_projectile_world.py` adds 540 combined bullet/rocket/beam frames from
the original shared 160-slot pool. Constructors, motion, cells, virtual expiry,
destruction and reuse execute; hit results are controlled at the world boundary.
All live states, update/retirement orders, launch slots and RNG now match C++.
A missile's animation clock at +0x57 is not initialized by its constructor. It
retains the previous slot value, including through bullet occupancy; beams reset
that same clock to zero. This is represented explicitly in native ownership.
Fresh zeroed allocation and cross-kind reuse are both covered.

## Persistent attached smoke

`capture_persistent_effects.py` follows original construction, attachment,
emission, puff animation and retirement in 18 cases: two supplied families,
frame ratios 64/256/450, and owner-centre/offset/articulated-part attachments.
It independently matches **113,400 puff updates**, including moving owners.
[Captures and playback](../analysis/models/persistent-effects/index.html) retain
all original outputs and controlled composition frames.

Controller pool `0x66ec` has 20 slots. `0x69ec` records the owner, optional local
short-vector offset and optional part ID. `0x6b28` transforms this through the
part and owner matrices before constructing a puff. The timer starts at zero;
expiry resets it to 200, emits once and decrements the count. The signed Q8
frame ratio is subtracted, with overshoot discarded. Thus ratio 256 emits once
per update, while ratio 64 emits every fourth update. These are countdown
units, not an unconditional 200 ms period.

HERC damage `0x9cd4` requests family 0 (200 emissions); building destruction
`0x2df8` requests family 1 (500). The first root is `family*4 + (secondary RNG&3)`;
subsequent roots cycle deterministically through that family's four shapes.
Only construction draws randomness. The table also retains a third count, 1000,
but SMOKE.DTS supplies only eight roots: family 2 accesses beyond them. Neither
identified caller selects it. It is an unsupported retained table entry, not
an undiscovered valid smoke variant.

`0x6664` creates the 200-slot puff pool and loads SMOKE.DTS/DBA. Puff constructor
`0x6704` starts cell zero and timer 200. `0x693c` adds its stored velocity once
per update, advances the nine-frame cell on timer expiry, and retires on wrap.
The constructor **does not initialize velocity**. All fresh slots in the actual
DOSBox snapshot are zero; a sentinel reuse probe confirms preservation. No
invented wind was added. Puffs update before emitters in `0x59700`, so a newly
emitted puff first advances on the next simulation pass. Deferred destructors
and collectors return every captured controller/puff to its pool.

## Detached weapon bodies and complete environment composition

`0xb968` disables a mounted weapon and removes its visible model. Repeating it
has no further effect. A physical body is created only when requested and the
mount is external (orientation below 4). Its template is the weapon definition's
third orientation index (+0x26), taken from **MECHWPN2**, or **MWPN2B** in low-memory
mode. Its initial transform comes from the actual articulated hardpoint. Launch
speed is 400, directed outward from the owner, with the mount's elevation.
Thereafter it shares the 150-slot debris pool and `0x64b8` physics above.

`capture_detached_weapons.py` checks 64 detach cases over eight equipped slots,
four headings and physical/nonphysical removal; 808 trajectory updates match an
independent calculation through retirement. Neither generator advances during
this path. Sixty additional original frames compose walking, attached smoke,
three weapon detachments and all background layers. This is a controlled
interaction capture, not a complete AI/mission replay. The GIF samples every
second nominal 100 ms step. Explosion/dynamic-light scenery composition remains
covered separately by `capture_effect_render.py` and `capture_effect_lighting.py`.


### Native integration comparison

`capture_persistent_native.py` retains complete original smoke pool states and
actual detachment inputs for C++ comparison: 12,906 frames / 113,400 puff states,
28 physical external-mount cases and 808 trajectory updates. The native mission
now consumes smoke and ejection requests directly. Puffs and emitters retain
original pool sizes, update order and deferred reclamation; the secondary RNG is
shared with cockpit/audio consumers. Original owner/part transforms are retained
as fixture inputs, separately from emitted positions, avoiding self-confirming
attachment tests. See `earthsiege-cpp/tests/persistent_effects_test.cpp`.

## Deferred-queue overflow in an authored mission

B0_C5_70 retires 40 explosions and 40 secondary flat objects together. The original
20-pointer queues overwrite their own counts at offset +80. The native pending
vector already avoids this corruption; a controlled original-code probe extends
only pending storage and retains the original FIFO collector and pool limits.
This is a documented departure from corrupted DOS memory, not an unexplained RNG
difference. See [MISSION_FIDELITY.md](MISSION_FIDELITY.md).
