# Evidence behind the public investigation

This guide refers to files in the `earthsiege-reverse` research workspace. Selected Markdown notes are copied into `content/research/` and rendered on the site. Original input media and executable captures are not bundled here.

| Public subject | Primary project evidence | Boundary |
|---|---|---|
| Game identity, 1994, Dynamix/Sierra, HERC combat and salvage | Supplied Earthsiege manual, in-game credits/text; `docs/ANALYSIS_STATUS.md` | The introduction is a description of the original game, not a license claim. |
| 2,484 archive members | `docs/ANALYSIS_STATUS.md`, archive catalogue | Count of the inspected installation, not every release. |
| 44 model resources, 401 top-level shapes, names and equipment | `docs/MODEL_BROWSER.md`; `analysis/models/catalogue.js`, `assemblies.js`, runtime bindings | Distinguish HERC distance detail from separate building/scenery variants. Names follow manual and in-game strings. |
| Animation, aiming, damage | `docs/MODEL_BROWSER.md`, original fixed-point/controller captures, browser locomotion/damage data | WebGL pixels differ from the original software rasterizer; damage is a captured outcome. |
| Launch compilation, terrain and equipment | `docs/MISSION_LAUNCH.md`; `analysis/missions/launches/*` | Fresh-history starting hangar examples; one context and two random states per mission on this site. |
| Buildings and listening-post objectives | `docs/SCENERY_BROWSER.md`; B0_C3_2A handoffs and constructed actors | All constructed groups shown, including waiting ones. |
| Urban variant 5 | `docs/SCENERY_BROWSER.md`, `launch-scenery-check.json`, original-renderer capture | 19 placements in ZONE1500, including B0_C5_00; not a C7 placement. |
| Northern “Jö” arrangement | `docs/SCENERY_BROWSER.md`, ZONE1161 placements | Visible arrangement; interpretation and attribution are unproven. |
| SM_ESC50 test prose | `docs/SCENERY_BROWSER.md`, original GO text-interpreter comparisons | Strongly suggests a retained test; not selected by the supplied game tables. |
| Alt movement, Ctrl heading, Alt+Ctrl digits | `docs/CHEATS_AND_DEVELOPMENT.md`, original handler 0x11050 and controlled execution | No separate enable guard in the verified branches. No claim of global historical priority. |
| `-eggplant`, `-B1000000` | `docs/COMMAND_LINE.md`, executed GO/DBSIM/PLAYFLIC parsers | Internal launch flag and movie buffer; neither is a cheat. |
| HMI, FM/PCM, 120 Hz, encounter selection | `docs/MUSIC.md`, native scheduler/FM/PCM captures and music-selection comparisons | Chip emulation and host mix; no exact analogue-hardware claim. |
| All 24 skies | `analysis/worlds/environment/browser.js` and original-renderer captures | Fixed camera/seed; excerpted motion. Panorama is an unwrapped strip. |
| 114 exact frames out of 120; radar repair | `docs/PIXEL_FIDELITY.md` | Defined sampled recordings; six frames/230 pixels involved original invalid matrix references. Not universal fidelity certification. |
| C++, resource system, DOS extender, READFLIC ancestry | `docs/BUILD_EVIDENCE.md`, `docs/COMMAND_LINE.md` | Exact compiler unestablished; different components have different origins. |

The site contains no independent new historical claim derived only from a web cheat list. Its substantive findings are grounded in the supplied data and original program execution. The public text marks interpretations explicitly.
