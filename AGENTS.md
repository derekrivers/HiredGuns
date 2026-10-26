# Hired Guns operating rules

Build a browser revival with four simultaneous local players, one mercenary/view each; retain fewer-player team control. One complete original level is the fallback before campaign expansion.

- Preserve existing work. Use codex/<task> branches and isolated worktrees for concurrent edits. Only the coordinator merges.
- Keep original archives, assembly, maps, decoded assets, sound and artwork out of commits and CI artifacts. Local import output belongs in .local/. Public tests use synthetic data. Inspect the staged file list before every commit.
- Keep simulation independent of DOM/rendering, integer and fixed-step, with explicit RNG state. Do not claim original parity without reference evidence. Preserve unknown source fields and report unsupported mechanics.
- Do not enable campaign travel from the editor graph: reconstructed Locations CRC df31 differs from archived runtime CRC 5c21. Establish a matching baseline first.
- Run npm run check and relevant browser checks. Every PR needs independent agent review against its current commit, passing relevant CI and resolution of blocking findings. Respect repository protections and external approval requirements.
- Do not describe imports as playable levels, simulated pads as physical playtests, or a prompt as scheduled future work.
- Model policy: implementation/review gpt-6.1-sol medium; binary-format/simulation/save reviews high. Routine work may use gpt-6-luna low. Bounded gpt-6-astra high consultation only after evidence-based failed Sol attempts. No recursive delegation. Normally one worker; reserve review capacity.
- Two repair attempts without new evidence, then reassess. Record model/attempts/outputs; mark token usage unavailable unless actually measured.
- Keep STATUS.md current and concise. Do not purchase services, change visibility/protections, or publish original content.
