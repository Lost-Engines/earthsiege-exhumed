A HERC brought down by leg shots can be worth more than one killed through the cockpit. Earthsiege makes that a practical concern: the enemy's surviving weapons might equip your next HERC, and its remaining metal might pay for your repairs. Where a shot lands matters both now and after the mission.

*Metaltech: Earthsiege* is Dynamix's 1994 simulation of walking combat machines, or HERCs. Its battles use a surprisingly detailed network of armour sections, internal equipment, weapon mounts and movement controllers. A machine can lose its ability to walk while retaining most of its body. A gun can be destroyed with its shoulder, or knocked loose as a separate object. A damaged sensor array can make the cockpit instruments flicker.

This article follows those connections through the original **base CD simulator**. The examples come from its data and executable instructions, run in controlled captures. The diagrams explain the relationships; the pixel images come from the original drawing routines. The [technical notes](../research/combat-article/) include the addresses, capture conditions and newly checked edge cases.

## A HERC has several kinds of structure

The visible model has an animation hierarchy: moving a torso carries its shoulders and mounted weapons with it. Combat needs two more sets of relationships.

An **armour section** describes a place that can be hit. It has its own capacity, a set of internal components behind it, and a link to the model's damaged appearance. An **attachment parent** says which other section carries it. These relationships overlap, but serve different purposes.

The Samson's left upper leg, lower leg and foot are separate armour sections. Each protects the same left leg actuator. Their attachment links form a chain from upper leg to lower leg to foot.

<figure>
<a href="../combat/leg-links.svg"><img src="../combat/leg-links.svg" width="800" height="530" loading="lazy" alt="Samson upper leg carries the lower leg and foot; all three armour sections protect one shared left leg actuator"></a>
<figcaption>Original Samson damage links, drawn as a diagram. The shared actuator explains why a foot hit can stop a machine whose upper leg still looks intact.</figcaption>
</figure>

The ordinary body layout reserves nineteen armour sections and twelve internal components. Mounted weapons add their own armour and internal capacities to the same system. Not every chassis uses every entry. A biped has no rear pair of legs, for example, while a quadruped can use the rear-leg slots.

The internal names come from the game's own interface strings: leg and arm actuators, sensor array, engine, hydraulics, gyroscope, life support and pilot. Those names are useful, but they do not imply that every component has a separate physical simulation. The consequences have to be traced through the code that reads their condition.

Each component stores accumulated damage. Zero means undamaged; **-1 marks destruction**. Presence is tracked separately. That distinction lets the game retain an upper leg on the model after the actuator shared with its foot has failed.

## From a shot to a damaged component

A projectile carries separate values for shield damage, armour damage and the fraction assigned to an explosion's area effect. Its path is tested against the world and actors. For a HERC, the main stages are:

<figure>
<a href="../combat/hit-pipeline.svg"><img src="../combat/hit-pipeline.svg" width="800" height="395" loading="lazy" alt="Hit geometry leads to shield absorption, section armour, internal component selection, attachment removal and gameplay consequences"></a>
<figcaption>A simplified route through the HERC impact code. Area damage can send additional sections through the armour and internal-component stages.</figcaption>
</figure>

### Collision follows the articulated body

The collision data attaches groups of hit volumes to model parts. Their positions follow the HERC's current transforms, so a turning torso and its weapons bring their hit volumes with them. Missing sections are excluded. The engine tests these authored volumes rather than intersecting every visible polygon.

The volume test is economical. In the shot's coordinate system, the estimate of lateral distance is the larger of `|X|` and `|Z|`, plus half the smaller. A constant value traces an octagon. Entry depth is also approximated with linear arithmetic, avoiding a square root.

<figure>
<a href="../combat/collision-shape.svg"><img src="../combat/collision-shape.svg" width="800" height="395" loading="lazy" alt="An octagonal hit-test boundary compared with a circular boundary of the same radius"></a>
<figcaption>The solid boundary is the original lateral-distance approximation. The circle is a comparison guide. These are collision calculations, not visible armour polygons.</figcaption>
</figure>

This makes hit detection cheap enough to use repeatedly across an animated machine. It also explains why faithfully rebuilding the collision shapes as mathematical spheres would change some marginal hits.

### Shields are an all-or-nothing gate for the armour field

A HERC has front and rear shield charge. The shot's origin, transformed into the HERC's local coordinates, selects which half takes the hit. The chosen half absorbs as much of the packet's shield damage as it can.

If it absorbs the entire amount, the body is protected. If any shield damage remains, the engine tests the articulated body and applies the packet's **separate armour damage**. It does not reduce that armour field in proportion to the shield energy already spent.

<div class="interactive-figure" id="shield-example">
<div class="combat-readout" id="shield-readout" aria-live="polite"><strong>60 shield charge: body protected.</strong><p>This incoming packet carries 60 shield damage and 360 armour damage. At 59 shield charge, the same body hit applies all 360 armour damage.</p></div>
<div class="figure-controls" id="shield-controls" hidden><label for="shield-charge">Shield charge before impact</label><input id="shield-charge" type="range" min="0" max="100" value="60"><output id="shield-value" for="shield-charge">60</output></div>
<p class="combat-caption">101 captures of the original impact routine, with real Samson hit geometry. The attacker avoids the difficulty multiplier, splash is zero and the ray intersects the body.</p>
</div>

Try moving the charge between 59 and 60. The abrupt change is the original behavior. A shield-volume intersection alone does not guarantee body damage: a ray can still pass between the limbs after penetrating the shield.

### Armour overflow chooses an internal component

Armour absorbs damage until exhausted. The excess then enters a weighted choice among the section's surviving internal components. The weights are selection probabilities, not instructions to divide every hit among several systems.

For the Samson's front cockpit, the weights are 30 for the sensor array, 40 for the gyroscope and 10 for the pilot. With all three alive, that gives probabilities of 37.5%, 50% and 12.5%. The pilot has only 50 capacity, compared with 700 for each of the other two.

<figure>
<a href="../combat/internal-choice.svg"><img src="../combat/internal-choice.svg" width="800" height="375" loading="lazy" alt="Front cockpit overflow chooses sensor array, gyroscope or pilot with weights 30, 40 and 10"></a>
<figcaption>One choice receives the available overflow. If that component is destroyed and damage remains, the game chooses again from the survivors.</figcaption>
</figure>

A large penetrating hit can therefore destroy several internals in succession. A smaller one may kill the pilot while leaving substantial capacity elsewhere. HERC survival cannot be described by adding all the capacities into one health bar.

## What falls off with what?

Exhausting armour does not immediately remove a section. While its internals survive, the model can switch to its damaged appearance. If its dependencies are exhausted and the section permits removal, the engine marks it absent, destroys the remaining dependent internals and switches its model cell to the removed state.

It then queues the sections whose attachment parent is the one just removed. Each of those can carry more children. The queue is processed as a stack, so the exact order is deterministic. Presence checks prevent repeated removal, including a cycle in the Samson's front/rear cockpit links.

<div class="interactive-figure" id="damage-example">
<figure class="pixel-figure">
<img id="damage-image" src="../combat/intact.png" width="320" height="200" alt="Original rendering of an intact armed Samson">
<figcaption id="damage-caption">Intact Samson with its original starting equipment. Select a hit to compare the surviving sections and weapons.</figcaption>
</figure>
<div class="figure-controls" id="damage-controls" hidden><label for="damage-state">Damage state</label><select id="damage-state"><option value="intact">Intact</option><option value="armour">Left shoulder armour exhausted</option><option value="shoulder">Left shoulder destroyed</option><option value="upper-leg">Left upper leg destroyed</option><option value="foot">Left foot destroyed</option><option value="cockpit">Cockpit destroyed</option></select></div>
<div class="combat-readout" id="damage-details" aria-live="polite">All eight equipped weapons remain enabled.</div>
<p class="combat-caption">Original damage states and original model drawing. The standing pose is held fixed to expose missing parts; these images precede the collapse animation and omit live smoke and debris.</p>
</div>

On this Samson loadout, destroying the left shoulder also removes two weapon sections. Their runtime weapon objects are disabled and their mounted geometry disappears. The connection comes from each mount's equipment slot and attachment parent; it is not inferred from which gun happens to look closest to the shoulder.

Destroying the upper leg removes the lower leg and foot. Destroying only the foot does not work back up that attachment chain. It does, however, destroy the actuator shared by all three sections. The result is an immobile machine with a largely visible leg.

Death and immobility are distinct states. Losing at least half the leg actuators disables movement: one leg on a biped, two on a quadruped. Destruction of either cockpit section, or death of the pilot, is fatal. A disabled HERC proceeds into its authored collapse sequence; reaching the collapse event adds damage and plays the associated sound. The screenshots hold that later animation still so the section changes remain comparable.

## Damage changes how the machine moves

The most interesting link between animation and physics is that **the walking animation supplies the HERC's displacement**. The controller chooses and advances a movement sequence, calculates the change in its root position, rotates that change into the world, and moves the actor.

The animation is consequently part of locomotion. Replacing it with feet moving underneath a separately integrated velocity would lose the relationship between the authored gait, transitions and distance travelled.

Leg damage sets two movement penalties. A damage fraction greater than 128/256 sets the lighter penalty; at least 193/256 sets the heavier one. These are approximately half and three quarters of capacity. Quadrupeds combine the condition of their front and rear pairs for partial impairment. The flags remain set once damage has established them.

| Condition | Requested movement rate passed to the controller |
| --- | --- |
| Healthy | Chassis-limited request |
| Light leg damage | Request × 750/1024, about 73% |
| Heavy leg damage | Request × 400/1024, about 39% |
| Disabled | Movement and steering requests suppressed |

These are multipliers on the requested rate, not promises about kilometres per hour. Acceleration, gait selection and transition animations still intervene.

<figure>
<a href="../combat/movement.svg"><img src="../combat/movement.svg" width="800" height="440" loading="lazy" alt="Three original Samson movement traces, showing much less travel under light and heavy leg damage"></a>
<figcaption>The same requested speed and 100 controller updates in three controlled original-code runs. The healthy Samson travels 24,288 native units; light and heavy leg damage reduce that to 9,183 and 5,060. This finite interval includes acceleration and gait transitions.</figcaption>
</figure>

Body steering, torso rotation and weapon elevation have their own rates, acceleration and limits. Some operations advance per simulation update; others use a fixed-point frame-time ratio. That mixture is why reproducing a nominal frame rate alone is insufficient to recover the original motion.

The gyroscope and hydraulics participate in damage, assessment and salvage, but the movement routines do not turn their health into an extra modern balance simulation. The explicit locomotion penalties above come from the leg actuators. Similarly, the aimed torso and elevation routines use their authored controller parameters; we have not found a separate gradual arm-damage multiplier on aiming speed.

A small player-specific detail helps make a collapse less jarring: on disabling the player's HERC, the engine aligns the chassis yaw to the current view and clears the torso angle. The cockpit keeps looking in the same direction as the body enters its disabled pose.

## Engines, sensors and the power budget

The interface calls internal component 5 the **engine**. In the runtime it controls power generation. At a frame ratio of 256, a healthy engine generates 15 units per update. Light damage reduces that to 9, and heavy damage to 3, through rounded fixed-point factors of 600/1024 and 200/1024.

That power feeds a shared reserve. Weapon capacitors receive their allocation first, with the player's selected slot given priority; shield charging then uses the returned budget. Fast charge can make other capacitors discharge into the budget. Losing engine output can therefore leave both weapons and shields competing for a much smaller supply.

The charging routines use per-update limits: ordinary capacitors can gain up to 20 units, fast charge up to 60, and shields up to 4. Those are allocation limits, not guarantees that the reserve can provide that much. Front/rear shield redistribution has its own limit of 65 units per update, so changing the requested balance is not an instantaneous transfer.

### A reactor that remembers its first serious injury

There is an unexpected condition around the engine damage check. It only runs while **both** the light and heavy engine-damage flags are clear. Once either is set, later hits skip the classification.

We checked this with the original instructions on a Samson whose engine capacity is 700:

| Supplied damage history | Latched state | Generation at ratio 256 |
| --- | --- | --- |
| Undamaged | Healthy | 15 |
| 400, then 600, then destroyed | Light | 9 |
| 600 directly from undamaged | Heavy | 3 |

The same final damage can thus produce different power output, depending on the path taken. This capture supplies the internal damage directly and then runs the consequence check; it isolates the rule without depending on a lucky series of penetrating shots. The executable establishes the behavior, but does not explain whether the one-time classification was deliberate.

### Sensor damage reaches the cockpit

The sensor array drives the failure state of several displays. Mild damage can produce intermittent failures. Worse damage changes the balance between working and failed periods. The failure controller schedules windows on the UI clock, toggles state at random intervals and requests an electrical-failure sound when a display fails.

It uses the separate UI random stream. The controller also has an odd boundary: its severity-3 case forces failure, while the fully destroyed severity-4 case still takes the timed branch. The [display notes](../research/multifunction-displays/) retain the exact thresholds and original composed-frame checks.

The manual says damaged weapons may recharge more slowly. In the capacitor routine we traced, the direct charging limits remain 20 or 60 until the weapon is disabled; there is no input for its fractional damage. Reduced engine supply can slow charging, while destruction or detachment takes the weapon offline. Those are the mechanisms established by these code paths.

## Why different weapons feel different

The separate shield and armour fields give weapons very different jobs. Automatic cannons have relatively low shield damage and high armour damage. Lasers favor shields. EMP pulses are particularly shield-heavy, while ordinary particle beams have equal base damage to both.

Energy weapon damage also depends on how the firing routine uses charge. A laser spends a fixed amount per shot. EMP and particle-beam weapons discharge their accumulated charge into a pulse. ELF runs through a spin-up sequence, then emits repeated beams while held and ready.

The following values describe individual emitted projectiles or beam calls **before the attacker-side difficulty adjustment**. EMP and particle-beam examples use the maximum requested charge of 1,200. They are comparisons of payloads, not damage per second.

| Weapon | Shield damage | Armour damage | Emission used here |
| --- | ---: | ---: | --- |
| ATC 20 | 60 | 360 | One ordinary projectile |
| ATC 35 | 120 | 480 | One ordinary projectile |
| ATC 50 | 180 | 600 | One ordinary projectile |
| Laser 100 | 117 | 47 | Fixed charge 80 |
| Laser 200 | 176 | 94 | Fixed charge 100 |
| Laser 300 | 234 | 141 | Fixed charge 120 |
| ELF | 176 | 234 | Beam power 1,200 |
| EMP | 2,344 | 469 | Pulse charge 1,200 |
| Particle beam | 1,172 | 1,172 | Pulse charge 1,200 |
| Ordinary missile | 400 | 1,600 | One missile; includes area-damage allocation |

The stored coefficients can be misleading on their own. Laser 100's table entry says 1,500 shield and 600 armour damage, but its fixed shot charge is 80. The projectile code multiplies by `80/1024` with rounding, giving 117 and 47. Comparing raw table entries would badly overstate its individual shot.

The missile array sizes use a shared family of payloads; guidance changes how they arrive. Radar and other homing modes have acquisition conditions, whereas electro-optical guidance takes steering from the player while the control is held. Releasing an EO missile clears its target and guidance state. It does not turn into an ordinary target-seeking missile.

Beams perform an immediate ray query. Bullets and missiles travel through the world over subsequent updates. Missiles accelerate from their launch speed and limit their steering correction before frame-time scaling. The game's ECM and target-emission states feed acquisition and guidance, rather than being extra damage types.

There are heavier weapon definitions elsewhere in the catalogue, and a grenade path with data and controls but a no-op creation function in this simulator. A definition in a file is not enough to establish a working weapon.

### Explosions are selective

An ordinary missile assigns 500/1024 of its armour payload to area damage. The direct component receives the remainder. The area pass then visits present sections in order, makes a roughly one-half random admission test and applies distance falloff within a radius of 500 native units.

Even a distant section consumes that random test before the distance rejection. Nearby sections do not all receive a guaranteed copy of the blast damage. The area pass uses authored collision bindings for each section's position, which need not be the centre of its visible mesh.

Difficulty introduces another asymmetry: the impact consumer scales damage from attacker side 0 by one of four Q10 factors, 2,800, 2,000, 1,400 or 1,000. It does not apply those multipliers indiscriminately to every projectile in the world.

## Guns that break loose

Weapon destruction through the attachment chain disables the mounted weapon. A separate **knock-off** path can remove a weapon before its combined armour/internal condition has reached complete destruction.

That test happens when an impact changes the weapon's damage band, subject to a chassis permission flag. The random threshold is about 3% for side 0 and 10% for the other side. The probability applies at that qualifying transition, not to every frame or every tiny hit.

When successful, the weapon goes offline, its mounted geometry disappears, and an externally mounted weapon can be instantiated as a separate moving model at the hardpoint. The runtime selects the physical weapon mesh from the weapon definitions. These are recognisable guns, not just generic fragments.

<figure>
<a href="../combat/weapon-flight.svg"><img src="../combat/weapon-flight.svg" width="800" height="435" loading="lazy" alt="An original detached weapon trajectory rising, falling, bouncing and eventually retiring"></a>
<figcaption>One captured weapon ejection. The dots mark original simulation updates, with horizontal distance measured from the release point. The graph is explanatory; it does not assign an assumed frame rate.</figcaption>
</figure>

The detached weapon uses the debris motion routine. Each update adds 1,500 angle units of tumble, subtracts 50 from vertical velocity, and reduces each horizontal velocity component by a rounded `50/1024` of itself. Position then advances by the resulting velocity.

Ground contact is the flat plane at Z=0. The object is moved onto that plane and its vertical velocity is reversed at about 44% strength, using 450/1024. A rebound below 100 retires it. The routine does not apply the frame-time ratio, so these are per-update quantities.

This is a small ballistic effect system. The ordinary body-section removal path changes model cells and emits authored explosions and debris. It does not turn every lost limb into a freely simulated rigid body with joints and mass tensors.

Knocked-off enemy weapons are recorded for salvage when the event occurs. Their saved condition is calculated from the pre-removal damage grade with a different formula from the end-of-mission weapon test. The recovery record is distinct from the short-lived piece of geometry bouncing across the ground.

## Ramming and the ground beneath you

Walking collision uses another set of approximations. Actor contact compares a fast three-dimensional distance with the sum of actor radii. Scenery uses a height table over a grid; wider queries inspect a bounding square of cells. The moving-actor obstruction query does not perform a detailed foot-to-triangle ground simulation.

On an obstructed move, the controller restores the earlier placement, clears throttle, reverses and clamps movement, then retries. A second obstruction stops it. AI recovery timers can force a temporary forward or reverse request while the controller tries to escape the obstruction.

Ramming damage depends on the two HERCs' forward motion and chassis weight. The other machine's velocity is expressed along the rammer's forward direction; a weighted relative value is then scaled by 300/1024. Above the impact threshold, the same resulting magnitude is sent to both bodies as radial damage, with radius 1,200.

That captures useful gameplay distinctions between a heavy advancing HERC and a stationary or retreating opponent. It does not conserve momentum through a general two-body solver. The rollback, recovery controls and damage event are the machinery the original game actually uses.

## Turning a wreck into salvage

The campaign collects eligible opposing HERCs that are dead or disabled. An exclusion flag removes some actors from recovery, including certain pre-damaged mission actors. Leaving a healthy enemy standing does not award the value that the salvage calculator could assign to its parts.

Recoverable weapons and hull material are calculated separately. A weapon qualifies in the ordinary end-of-mission pass if its combined armour/internal damage is **strictly below one half**. Its condition is saved as an integer percentage. At exactly half damage it fails that test.

Hull recovery adds weighted contributions from the first nineteen armour sections and twelve internals. Armour must still be present, and a component must have a nonnegative damage value **below 150**. For an eligible component, the contribution is its salvage weight multiplied by the fraction of capacity remaining, with integer truncation.

That last eligibility rule produces a remarkable discontinuity.

<div class="interactive-figure" id="salvage-example">
<figure><img id="salvage-chart" src="../combat/salvage.svg" width="800" height="425" loading="lazy" alt="Original salvage contribution drops from 1,925 to zero when accumulated damage changes from 149 to 150"><figcaption>A controlled Samson left upper leg, with all other parts unchanged. This isolates valuation; collection still requires an eligible disabled or dead enemy.</figcaption></figure>
<div class="figure-controls" id="salvage-controls" hidden><label for="salvage-damage">Accumulated armour damage</label><input id="salvage-damage" type="range" min="0" max="200" value="149"><output id="salvage-value" for="salvage-damage">149</output></div>
<div class="combat-readout" id="salvage-readout" aria-live="polite"><strong>149 damage: contribution 1,925.</strong><p>The section retains 3,851 of its 4,000 armour points. At 150 damage, its salvage contribution becomes zero.</p></div>
</div>

The cutoff compares an accumulated damage word with literal 150. It is not a percentage. At 149 damage this section still contributes 1,925 of its initial 2,000 salvage weight. One more point removes that whole contribution, even though 96.25% of its armour remains.

After the contributions are added, the chassis profile supplies a value multiplier. Complete destruction of the front cockpit section halves that multiplier. Mission collection applies a further factor of 2,500/1024 to the recovered hull value; a separate mission counter can add another material award.

The practical case for shooting legs is therefore strong. It can disable an enemy while preserving its weapons and much of its recoverable body. Blanket damage across many surviving sections can be surprisingly costly because of the absolute cutoff. A cockpit kill also risks the hull-value penalty.

The result returns to the campaign alongside the squad's condition records. Armour, internal systems and equipment carry their remaining percentages into repairs. The money-like resource in the service bay is recovered material: spending it on today's repairs competes with building a better HERC over later missions.

### The enemy notices its condition too

Damage feeds the AI's assessment of a fight. Its combat rating combines chassis value, surviving armour and weapon ratings, with penalties for heavily damaged internals. An ammunition weapon contributes to this assessment only while its magazine is at least one eighth full.

Retreat decisions add penalties for damage to the leg actuators, sensor array, engine, hydraulics and gyroscope, then consider the number and strength of attackers. Some components therefore matter to a pilot's decision to keep fighting even when they have no dedicated handling penalty.

## Combat and effects share more than a screen

An explosion has an authored model, animation cells, a sound and light settings. Debris groups supply weighted choices of fragments. Attached smoke has an emitter lifetime and a separate puff pool. These effects are created at specific points in the damage sequence.

Some of their constructors draw from the **same random stream as internal damage allocation**. Creating an explosion can change the next random number used to choose an internal component. Smoke variants and cockpit failures use a separate stream, but it would still be incorrect to remove all visual effects from a test and expect the subsequent battle state to match.

This matters when validating a reconstruction. A deterministic combat test has to preserve the original order of damage, removal, effect creation and random draws. We run those paths together for complete impact captures, and label boundaries explicitly when a smaller test isolates a single routine.

There is another ordering surprise in the outer hit loop. Actors are visited in their stored order; a successful hit applies damage immediately and then shortens the remaining ray. With a farther HERC listed before an aligned nearer one, both can lose shield charge. Reversing the list can leave only the nearer one hit. Original geometry and shield calls confirm this behavior. Sorting all candidates by distance before applying damage would change it.

These details help explain the game's character. Its combat comes from a set of tightly connected, inexpensive systems: authored movement, approximate hit volumes, weighted internals, attachment cascades and a persistent economy of damaged parts. Following one shot through them reveals much more than a damage number.

## Evidence and further reading

The article's examples use the October 1994 base CD simulator. Exact constants and edge cases should not be assumed for every demo or later build without a matching check. The [simulator comparison](../research/simulator-versions/) covers the executable families separately.

The broader validation includes 5,106 original damage updates across the eight playable chassis, 2,304 complete HERC impact captures, 5,114 return/salvage states and 14,400 instrument-failure updates. For this article we additionally captured 101 shield-threshold cases, 201 salvage values, three controlled movement traces and the engine-damage history test. Each comparison has the scope described in its linked notes.

- [Damage and component removal](../research/damage/): capacities, weighted allocation, hit volumes, removal and knock-off rules.
- [Weapons and power](../research/weapons/): charge, discharge, guidance, shield allocation and hit dispatch.
- [Locomotion](../research/locomotion/) and [collision](../research/collision/): root motion, impaired controls, obstruction and ramming.
- [Persistent effects](../research/effects/): explosion, smoke, debris and detached-weapon lifetimes.
- [Campaign and results](../research/campaign/): salvage eligibility, returned conditions, repairs and construction.
- [Cockpit displays](../research/multifunction-displays/) and [AI controllers](../research/controllers/): failures, threat assessment and reactions.
- [Article capture notes](../research/combat-article/) and [asset provenance](../combat/provenance.json): controlled inputs and original executable identity.

To inspect the physical assemblies, open the [Samson in the model gallery](../models/?root=0#simvol0%2Fdts%2FHERCULES.DTS). The companion article, [How Earthsiege draws a frame](../graphics/), follows its geometry all the way to the VGA framebuffer.
