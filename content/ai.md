Earthsiege is Dynamix's 1994 mech simulation. You command a squad of walking war machines called HERCs against the Cybrids, and each encounter involves more decisions than you can see through the cockpit.

A Cybrid spots your squad, turns its torso, and starts shooting. A second machine joins it. One circles away while the other keeps coming. After a few hits, one of them withdraws.

From the cockpit, those movements arrive as a single encounter. Inside Earthsiege, several systems contribute to it: perception, group orders, target ranking, combat strategy, weapon selection and locomotion. Each keeps some state between updates. A HERC can know about an opponent without choosing it, choose it without being able to fire, or keep moving on an instruction prepared during the preceding update.

The original executable retains names for twenty HERC behaviour states, including *patrolling*, *flanking*, *facing off*, *skirting*, *ramming* and *fleeing*. Those names gave us a useful starting point. Following their callbacks showed how the decisions fit together.

## Orders give the encounter a purpose

Each HERC belongs to a group. The group has an order, and that order supplies the initial behaviour: search and destroy, patrol, guard, travel, ram, or wait. The player-controlled machine enters its own player state. Flyers have a separate set of seven states and their own movement routines.

A patrol is not automatically a roaming attack force. Its engagement rules depend on the group order and the individual command. A follower without an individual patrol command can follow its leader instead of selecting an opponent independently. Search-and-destroy behaviour checks whether a prospective target matches the group's assigned actor or group objective.

That distinction matters on a mission with something specific to protect or destroy. There may be several enemies within reach, but a group's purpose can restrict which encounter it begins. The mission author supplies that purpose; the combat routines decide how to carry it out.

<figure><img src="../articles/ai-decisions.svg" width="800" height="560" alt="Orders and perception feed target selection, then combat strategy, movement and weapon controls"><figcaption>A guide to the decision layers. This diagram groups related routines; their actual updates are interleaved with the rest of the simulation.</figcaption></figure>

Starting a behaviour resets its private scratch state and countdown. A small stagger is added using a shared counter, which advances by thirteen and contributes its low four bits. Actors consequently enter with different countdowns. This spreads their reconsideration times without giving every machine a separate clock.

A state name and the status shown in the cockpit are also separate things. Commands can override the displayed status while the underlying controller continues to run. Reading the caption alone would give an incomplete account of what a wingmate is doing. [Controller records and order selection](../research/controllers/#entry-and-order-selection)

## Seeing an enemy and telling the others

Earthsiege keeps an awareness entry for each observer and target. Recognition can come from that entry or, under a separate range test, from a shared sighting flag. The larger perception pass refreshes contacts, asks for visibility, shares sightings and invalidates contacts that no longer qualify.

Visibility has its own cache. That avoids asking the collision system the same question on every decision. Distance and view direction then narrow the eligible contacts. The mission's visibility setting selects a contact range of 60,000 or 30,000 internal world units. These are the program's coordinate units; the diagrams below retain them rather than inventing a conversion to metres.

Sharing a sighting has a revealing detail. Once a source reports an opposing target, the routine visits active actors on the source's side. For each recipient it measures the distance **from that recipient to the enemy**. Below 120,000, it sets the recipient's awareness entry. Below 50,000, it also raises an alert flag on the target and can fire a recipient's eligible trigger. A group still waiting for activation is skipped.

<div class="interactive-figure" id="contact-example">
<figure><img src="../articles/ai-sharing.svg" width="800" height="330" alt="Contact sharing has a closer alert boundary at 50,000 and an awareness boundary at 120,000 world units"><figcaption>Range is measured to the reported enemy. Both comparisons exclude the boundary itself.</figcaption></figure>
<div class="figure-controls" id="contact-controls" hidden><label for="contact-distance">Recipient's distance to enemy</label><select id="contact-distance"><option value="49999">49,999</option><option value="50000">50,000</option><option value="119999">119,999</option><option value="120000">120,000</option></select><label><input type="checkbox" id="contact-waiting"> Group waiting for activation</label></div>
<p class="article-readout" id="contact-result" aria-live="polite">At 49,999 units, a recipient in an active group gains awareness. The closer alert and eligible trigger path also runs.</p>
<p class="example-note">An illustration of the verified sharing helper. The source has already reported an enemy; this does not simulate the earlier sighting or visibility tests. Awareness starts clear, and the recipient's trigger is eligible and unlatched.</p>
</div>

The trigger can clear or increment a mission counter. Recognition therefore connects the AI to authored mission events. A discovery can have consequences beyond adding an icon to the display.

There are original inconsistencies here too. One visibility-cache helper checks a timer on the target, then writes the refreshed delay to the observer. We kept those two owners distinct in the reconstruction because changing them alters when visibility is recalculated and when random numbers are consumed. [Perception and contact sharing](../research/perception/)

## Picking an opponent

The target selector first rejects unsuitable candidates: friendly actors, dead or removed actors, and contacts the observer does not recognise. Other restrictions come from the mission, group objective and selection mode.

It then assigns a priority class. With the relevant mode enabled, a search-and-destroy group's objective can outrank other candidates. Usable targets outrank disabled ones within that class. Only after these distinctions does the numeric score settle the choice.

The score considers alignment with the observer's heading and gives distance a stronger influence inside 25,000 units. Integer multipliers adjust it for retaliation, a passive opponent, an opponent already fighting someone else, and actor kind. HERCs receive a stronger kind multiplier than flyers or buildings. Some selection modes suppress particular preferences.

Usually, the score is also divided among attackers already assigned to that target. This gives the machines a reason to distribute attention. It is still a local scoring rule: each actor evaluates its candidates using the current attacker counts. Equal scores retain the earlier candidate in the active roster, so list order settles a tie.

Relative strength adds uncertainty. A HERC compares combat ratings after adding `random_value & 1000`. The ampersand matters. A bit mask permits only 64 distinct offsets between zero and 1,000; a remainder operation would produce a different set. Replacing it with a conventional random integer from zero to 999 changes the decisions.

The random draw is part of the result even when a different factor ultimately decides the target. A reconstruction can choose the correct opponent and still leave the generator in the wrong state for the next decision. Our comparisons check both. [Eligibility, ranking and the original multiplier tables](../research/perception/#target-eligibility-and-ranking)

## Getting into position

Combat strategy chooses among several ways to deal with a target. A HERC opponent can lead to attacking, facing off or flanking; buildings and flyers have dedicated attack states. Facing off uses a preferred range band from 16,000 to 35,000 units. Fleeing remembers a threat and periodically chooses a direction. Guarding works around an anchor, and driving an intruder away has its own movement calculation.

The movement routines prepare speed and steering requests. The locomotion system later turns those requests into an animated gait and world displacement. As described in the [damage and physics article](../combat/#damage-changes-how-the-machine-moves), the walking animation itself supplies the change in root position.

Ordinary navigation is fairly economical. Route following aims for the next authored point and advances when the horizontal distance is below 10,000 units. A route loops when its final entry references the same point object as its first. Two independent points with identical coordinates do not establish that loop.

Formation following rotates a member's assigned offset with the leader. Close to the required position, it stops and aligns. While catching a moving leader, it combines the leader's speed with the follower's longitudinal and lateral errors. A large heading disagreement can request reverse and a hard turn. This gives a machine that has fallen out of formation a different response from one already walking alongside its leader.

<figure><img src="../articles/ai-navigation.svg" width="800" height="470" alt="A HERC tests two diagonal paths ahead of its body, while a follower aims for an offset rotated with its leader"><figcaption>Two navigation mechanisms, drawn schematically. Formation following supplies a destination relative to the leader; avoidance tests the immediate space ahead.</figcaption></figure>

Avoidance casts two diagonal probes ahead of the body, checks scenery and fixed ground objects, and considers nearby actors. The clearances influence which way to turn; negative clearance stops movement. An obstruction can send the HERC into a skirting state, which remembers an offset and periodically checks whether it can resume.

Ramming bypasses ordinary avoidance through a control flag. Its bursts also make two additional physical movement calls. That makes it important to reproduce the behaviour's call order: treating it as ordinary pursuit with a different speed would lose part of what it does. [Navigation, formations and avoidance](../research/controllers/#navigation-and-obstacle-avoidance)

## Choosing a weapon and placing the shot

Having a target does not establish that a weapon is ready. The weapon-choice routine considers the bank, range, readiness, seeker requirements and shield scoring. Aiming has another set of conditions.

Between 5,000 inclusive and 20,000 exclusive, a selected HERC component can supply the aim point. Outside that band, the routine uses the HERC's camera node. Buildings and flyers use their authored target offsets. The turret then tracks the desired direction with a limited response, while individual mounted weapons converge from their own positions.

The fire-control routine leads a moving target using the selected projectile speed. Ordinary weapons require pitch and yaw errors within a narrow interval. Seeker-bearing weapons bypass that particular angular gate. Difficulty also supplies an aim-error allowance; the campaign path selects the entry whose added error is zero.

Two mistakes in this area survived into the examined release. The component selector checks which parts exist on the target, but scores damage fractions belonging to the observer. Its choice therefore cannot be described as reliably seeking the enemy's most damaged component.

The shield estimate has a different mismatch. The weapon selector passes a front-or-rear Boolean to a method expecting an angle. Both zero and one fall in the front-shield interval, so a HERC attacker reads the front shield even from behind. The actual hit uses a separate, correctly oriented absorption test.

This mattered in a recorded fight. With front and rear charges of 65 and 362, substituting the rear value changed a weapon score from 1,326 to 309. That changed the selected projectile speed, then the lead calculation, then the torso movement. A seemingly helpful correction had started a different fight. [Weapon selection and the shield-query mismatch](../research/controllers/#original-ai-shield-query-mismatch)

## Knowing when to leave

Combat strength combines chassis value, surviving armour, weapon ratings and penalties for damaged internals. An ammunition weapon contributes only while at least one eighth of its magazine remains. That particular assessment does not ask whether the weapon is charging, waiting to refire or disabled; other routines handle readiness for an actual shot.

The retreat calculation adds escalating penalties as important internal components pass damage thresholds. It also considers how many attackers are assigned and their strength. The resulting caution bands affect whether the HERC continues the engagement.

Context still matters. An incapacitated HERC facing an undefended building can abandon that target and return to its orders. Against other targets, it flees. A single universal health percentage would miss that distinction.

These decisions acquire their visible timing from the update order. The controller wrapper advances motion before preparing the next decision. Existing controls move the machine; newly calculated controls apply on the following dispatch. State changes, aim, weapon readiness and movement consequently belong to a sequence that must be preserved.

## Following the decisions in the code

The [controller notes](../research/controllers/) identify the original callbacks and their checks. The [perception notes](../research/perception/) cover contact sharing and target ranking. Controlled original-code runs check thousands of movement, target, weapon and retreat decisions, including their random-state changes. Recorded missions then exercise those systems together; the [reconstruction article](../reconstruction/) explains that comparison.

This account follows the base CD simulator. The diagrams isolate particular decisions and the contact control illustrates one verified helper. For the machines and their authored movements, [open the model gallery](../models/).
