# Guided testbed

The default page follows Setup → Choose and start a test → Live test display.
Load ready-to-play Training43 test verifies the configured local originals, applies
the selected team and arms a full-ammo isolated authored encounter. It opens
paused with focus on Start mission. Manual map setup remains expandable under
Setup; known-source dropdowns and team selection remain in Local character roster /
team preparation. Originals are never included in the build.

Combat controls sit beside their labeled results on desktop and immediately above
the views on narrow screens. F fires once per press while running, T changes the
dummy/miss target while running or paused, R resets the authored loadout while
paused, and Esc pauses. Start/Pause is the button for resuming. Readiness explains
pause, cooldown, empty magazine and unavailable-session restrictions. Ammo, target,
dummy health, last damage, shots and outcome are visible without expanding JSON.
Observed actions show ammo and dummy-health before/after values. This presentation
is transient, never persisted, and clears on session installation, retry, restore
or inventory reconstruction. Restored current values are not presented as newly
observed actions. Source arithmetic and authored dummy policy are unchanged.

Scenario buttons remain visible, including selected-team dry-fall practice after
team setup. Each viewport retains its live position, fitness, pending fall,
weight, incapacitation and controller labels. Scenario selection focuses Start;
Tab/Enter operate normal buttons, selects and expandable sections. Inventory &
equipment provides all four current inventory forms. Team source state, raw
encounter state and source/prototype details are in labeled Advanced diagnostics.
Save/load checkpoint remains directly available below the display.

This is a presentation change. It does not add firing animation, enemy behavior,
source actor combat, item-ground interaction, dynamic doors or original-level
completion. The accepted ground and button transition cores are not connected by
this packet. Independent exact-head review, current CI and automatic review are
required before release.

Regression coverage: public keyboard hierarchy and 320/375/1440 widths; opt-in
production one-click setup, firing/target/cooldown/empty/reset, restore without
false action history, and access to inventory/known sources. Existing encounter,
inventory, preset, session, selected-fall and extraction flows remain covered.
Private screenshots and source configuration stay under ignored `.local/`.
