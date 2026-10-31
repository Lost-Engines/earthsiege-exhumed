# Model browser identities and equipment

The browser groups human HERCs, Cybrid HERCs and flyers, Buildings (including wrecks),
terrain/scenery, weapons/projectiles and effects. Names are searchable alongside
resource filenames. Human chassis follow the manual's progression; this describes
the chassis family, not the allegiance of every mission actor using it.

| Resource | Display name | Resource | Display name |
|---|---|---|---|
| ROADRUNN | Roadrunner | MONGOOSE | Mongoose |
| GUNSLING | Outlaw | SCORPION | Stingray |
| RAPTOR | Raptor | MIRIMAC | Mirimac |
| TOMAHAWK | Tomahawk | RAMSES | Ramses |
| PATRIOT | Patriot | ACHILLES | Achilles |
| PANTHER | Rhino | APOLLO | Hyperion |
| HERCULES | Samson | BULLDOG | Pitbull |
| COLOSSUS | Colossus | SPIDER | Arachnitron |

These names and their chassis order come from `simvol0/str/STRINGS0.STR`, group
19, and the original HERC definition order. The supplied manual confirms the
human progression on printed pages 50–53 and selected enemies on pages 54–55.
`SKIMMER` is **Buzzard** in the manual and **LANDSKIMMER** in the in-game status
text (group 21); both names are retained. PANTHER is Rhino, not a second Patriot.
The other Cybrid names are established in-game labels rather than inferred lore.

HERC top-level roots are distance-detail models, with root 0 the highest detail;
there are seven for most HERCs and five for Arachnitron. Their lower-detail roots
share the full-detail animation bindings. Scenery, building and weapon roots
instead select different objects/templates. Nested detail groups are a separate
level of selection. Building names come from STRINGS0 group 20 and BASES.DAT's
static/animated/wreck indices. **Buildings** exposes all 42 roots from its seven
resource files directly in the left-hand list, each with its own name and
thumbnail. This includes side-specific models, wrecks and retained shell copies;
resource names distinguish them. Searches match the individual building names,
and links retain the selected root. HERC LODs remain grouped by chassis.

Every one of the 401 roots has a static thumbnail, rendered by the shared viewer
at a fixed angle, default pose and representative loadout. Both thumbnails and the main viewer's default angle are rotated 90° to the right
from the earlier view, as requested. Thumbnail rendering does not change the
interactive camera after it has been moved. PNGs avoid allocating hundreds
of WebGL contexts during ordinary browsing. Regenerate with
`tools/render_model_thumbnails.py`.

## Terrain and building colours

The terrain sets use shaded polygons rather than bitmap textures. Their shared
material 14 initially contains only a placeholder colour; the running game
binds it to the environment's WLD colour range. The browser now installs those
near-distance ramps, including the building-class bindings, rather than showing
flat beige terrain. Automatic palette selection chooses the matching desert,
temperate, ice or urban environment. Manual palette overrides remain available.
All building and terrain thumbnails have been regenerated. See
[Scenery browser notes](SCENERY_BROWSER.md) for original addresses and verification.

## Mission lighting

Choose **Day**, **Dusk** or **Night** in Lighting to preview the original mission
colours. Environment chooses desert, temperate, ice or urban; Automatic follows
the terrain model and otherwise uses desert. Normal/low visibility and Shading
distance use the game's original distance bands. The camera, model size and
chosen detail level stay fixed so colours can be compared directly. The
original directional and full-bright inspection modes are retained. As in the
original renderer, distance haze affects shaded polygon ramps but does not fade
textured faces; textures still respond to the selected palette and lighting.

Mission presets select their matching palette automatically. A subsequent
advanced palette override is allowed and labeled. Standalone resources without
a verified gameplay class get palette changes only; HERCs, mounted weapons,
flyers, buildings and terrain have the verified class bindings. Thumbnails stay
in their fixed default lighting. [Lighting notes](LIGHTING.md#mission-condition-presets-in-the-model-browser)
document the original settings, preserved limits and native comparisons.

## Loadouts and missile arrays

The editor supports all sixteen HERC chassis. Human defaults come from
`SM_INIT.DAT` and `CAR_INIT.DAT`. Additional examples, including Cybrid loadouts,
come from actual original-code actor-construction captures under the documented
zero-counter fixture. Duplicate equipment arrangements are combined; source
mission names are retained. There are 125 distinct preset entries in this export.
These are examples, not an assertion of a single universal enemy loadout.

Human hardpoint choices use the weapon IDs in the shell's CFG diagram groups.
Original GO `0x22086` confirms all 810 combinations of chassis, hardpoint and
weapon ID, including rejected combinations. Inventory amounts and campaign
unlocks are deliberately outside the geometry editor. Cybrid chassis have no
player-hangar compatibility table: their captured presets are authentic, while
custom combinations offer unrestricted geometry inspection.

Equipment arrays are indexed by **GL byte 23**, not mount-record order. External
orientation 0/1/2/3 selects the weapon's upper/lower/left/right template and
side-offset adjustment. Orientation 4 is internal and produces no separate
weapon mesh. Thus selecting an internal missile array can leave the exterior
unchanged. Array capacities 6/8/10 share geometry, as do their guidance choices.
Some starting loadouts also leave array-capable hardpoints empty.

Bare chassis now hides the original external attachment placeholders, matching
the runtime's empty-node replacement. A separate **Stored mesh** option retains
those placeholders for research. Internal mount IDs are not removed; they may
coincide with ordinary body geometry or with another external mount's identifier.
Original `0xc31c`, `0xbd70` and `0xb916` verify 891 offered/preset arrangements,
1,191 constructed weapons and 953 external offsets. See
`analysis/models/editable-loadout-checks.json` and `tools/check_model_loadouts.py`.

## Speckling and preview scope

The extra stipple was a **browser shader bug**, not a deliberate lighting effect.
Material identifiers, flat palette colours and texture-lighting rows were passed
as interpolated floating values and truncated back to integers. Roundoff changed
some pixels to the preceding colour or lighting row. In an isolated face test,
15,573 of 155,141 face pixels incorrectly used palette entry 72 instead of 73.
Flat shader attributes eliminate those wrong pixels. Only Gouraud palette-index
shading and texture coordinates interpolate. Original camouflage and the
quantized lighting palettes remain visible.

Resource decoding, articulated transforms, animation channels, texture bindings
and lighting arithmetic have extensive comparisons with original code. This
browser still uses WebGL triangles and a depth buffer, while the native renderer
separately reproduces the original software spans and painter order. The browser
is an asset inspector, not the complete game renderer: dynamic effect lights,
secondary smoke, detached-part motion, collisions and full combat are outside its
current preview. Damage captures originate with the starting loadouts; editing
equipment changes the visible attachments, not the captured damage simulation.
The four retained weapon model families now have explicit normal/low-memory and mounted/detached bindings. Root 6 in each is not selected by any supplied weapon definition; its intended identity remains unproven. The native game implements attachment, animation and combat consumers; see [the current analysis audit](ANALYSIS_STATUS.md).

`check_model_browser.py` exercises names, ordering, all sixteen chassis, empty
mounts, custom arrays, retained edits across LOD changes, scenery selection and
the flat-colour shader regression. Both direct-file and HTTP browsing are checked.

## Stable animation framing

The camera now fits the selected root's intact default pose once. Changing
animation frames, blending poses, rotating the actor, removing weapons or
showing damage no longer recalculates the camera centre or distance. User orbit
and zoom remain available. Previously the camera followed every frame's bounding
box: extending a leg could zoom the whole HERC out, and a changing bounds centre
could hide its local body movement. Pitbull sequence 4 exposed this clearly.

This fixes inspection-camera motion; it does not replace the animation with an
invented slide. Authored body/limb translations remain visible against a fixed
camera. Accumulated ground movement is a separate channel consumed by the game
controller (ANIMATION.md and LOCOMOTION.md); ordinary model playback defaults to the gait in place. Apply world movement exposes accumulated displacement against a fixed grid; Fit travelled path reframes only on request. Exact destination-frame requests are also available.

## Textured faces, decals and static controls

The bent stripes on the enemy gun tower and listening post were a browser
mapping artifact. The original maps a whole polygon with screen-space columns;
the viewer previously split it into independently interpolated GPU triangles.
On a tapered face this introduced a conspicuous kink at the diagonal. The
shared browser renderer now calculates texture coordinates from the projected
polygon's two span boundaries. This applies to the 1,830 textured quads and 13
textured triangles in the supplied resources, including the mission view.

The browser still uses continuous WebGL fragment coordinates and its own
coverage/depth rules, not the original integer-rounded VGA spans. Near-plane
crossing faces retain interpolated coordinates as a fallback. Consequently this
removes the triangle seam without claiming pixel-identical software rendering.
The independent integer mapper and native C++ renderer retain their separate
original-raster comparisons in [RENDERING.md](RENDERING.md).

The HERC hangar's “11” texture is coplanar with its support face. A small depth
priority for textured surfaces prevents the checker/flickering conflict caused
by the inspector's depth buffer; the original painter layers it cleanly.
The regression samples 108 interior decal points across twelve camera angles.
Original reference images and corrected browser views are retained in
`analysis/models/texture-comparison/`; `tools/capture_building_textures.py`
reproduces the original captures. The bright original comparison uses the
original mapper with uniform ambient inspection lighting; it is not a DOSBox
screenshot or a different texture.

Playback, reverse, frame, blend and speed controls are hidden for a static
selected pose. A model with only one skeletal sequence selects it automatically
and hides the redundant sequence dropdown. Cell-based effects retain their
functional playback control without showing an irrelevant skeletal frame 0/0.
Models with multiple sequences keep the selector, and choosing an animated
sequence restores its controls. All 401 thumbnails have been refreshed.

## Normal and low-memory weapon resources

Startup `0x59350` sets `0xbda98` when available memory is below 3,950,000 bytes
(0x3c45b0). The measured amount comes from the original memory allocator;
this is not installed system RAM. `0xbc60` selects mounted MECHWPNS/MWPNSB;
`0xbf48` selects detached MECHWPN2/MWPN2B and omits WPNTEX in low-memory mode.
The alternatives are untextured models, not a different game version.

`check_weapon_resource_usage.py` executes both loaders and checks all 17 weapon
definitions. Their four orientation indices select 32 of 33 mounted shapes;
the third index selects 14 of 15 detached shapes. Root 6 is the sole unselected
shape in all four files. Both selection consumers (`0xbd70`, `0xb968`) index
through those definitions. This bounds the unused finding to the supplied
weapon system; no guessed weapon name is assigned to that retained shape.
