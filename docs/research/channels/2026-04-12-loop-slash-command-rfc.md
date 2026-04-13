# RFC: `/loop`

## Goal

Support three clear loop modes at the channel slash-command layer:

- interval mode
- wall-clock schedule mode
- times mode

The command must also support slash-style loop bodies such as `/codereview`.

## Syntax Grammar

```text
/loop <interval>
/loop <interval> [--force] [<prompt>]
/loop <prompt> every <number> <unit>
/loop <prompt> every <number> <unit> [--force]
/loop <prompt> every <compact-duration>
/loop <prompt> every <compact-duration> [--force]
/loop every day at <HH:MM> [<prompt>]
/loop every weekday at <HH:MM> [<prompt>]
/loop every <mon|tue|wed|thu|fri|sat|sun> at <HH:MM> [<prompt>]
/loop <times> <prompt>
/loop <times> <slash-command>
/loop <prompt> <times> times
/loop status
/loop cancel
/loop cancel <id>
/loop cancel --all
/loop cancel --all --app
```

## Parsing Priority

1. If the command is `status`, parse loop status.
2. Else if the command starts with `cancel`, parse loop cancellation plus `--all` or `--app`.
3. Else if the command matches `every day|weekday|<dow> at <HH:MM>`, parse wall-clock schedule mode.
4. Else if the first token is a compact duration such as `5m`, parse interval mode.
5. Else if the first token is a bare integer such as `3`, parse times mode.
6. Else if the tail matches `every <compact-duration>`, parse interval mode.
7. Else if the tail matches `every <number> <unit>`, parse interval mode.
8. Else if the tail matches `<number> times`, parse times mode.
9. Else reject the command because no interval, count, or schedule was provided.
10. If the interval, count, or schedule is valid but no prompt remains after parsing, resolve the prompt from `LOOP.md`.

## Ambiguity Rules

- `3m` always means interval
- `3` always means times
- `every 1m` always means interval
- `every 3 minutes` always means interval
- `every day at 07:00` always means wall-clock schedule
- `every weekday at 07:00` always means wall-clock schedule
- `every mon at 09:00` always means wall-clock schedule
- `3 times` always means times
- `--force` is only valid for interval mode
- in leading interval syntax, `--force` must come immediately after the interval token
- in `every ...` syntax, `--force` must come immediately after the interval clause
- if a prompt should begin with a bare number, the user must quote it or add a clarifying word before it

## Semantics

- `/loop 5m X` means run `X` now, then every 5 minutes
- `/loop every day at 07:00 X` means run `X` at the next 07:00 and then every day at 07:00 in the resolved timezone
- `/loop every weekday at 07:00 X` means run `X` on weekdays only
- `/loop every mon at 09:00 X` means run `X` every Monday at 09:00
- `/loop 3 X` means run `X` exactly 3 times, then stop
- `/loop 3 /codereview` means run `/codereview` exactly 3 times as prompt text
- `/loop 5m` means maintenance loop every 5 minutes
- `/loop 3` means maintenance loop for 3 iterations
- `/loop status` means show active loops for the current session
- `/loop cancel --all` means cancel all active loops for the current session
- `/loop cancel --all --app` means cancel all active loops across the whole app
- times mode has no extra delay between iterations in this slice
- wall-clock schedules resolve timezone from route override first, then `control.loop.defaultTimezone`, then host timezone
- the effective timezone is frozen onto the created loop record so future config changes do not silently shift existing jobs

## Maintenance Prompt

When the user does not provide a prompt, clisbot loads `LOOP.md` from the routed agent workspace.

If `LOOP.md` is missing, fail with a direct remediation message instead of guessing.

## Queue Semantics

- times mode reserves all iterations immediately in the session queue
- a later `/queue ...` message must stay behind those reserved times iterations
- interval mode only attempts one run when each interval arrives
- if the session is already busy when the interval arrives, that interval tick is skipped
- skipped ticks still consume one attempt from the loop budget so the scheduler stays bounded
- if a normal queued message already exists before the next interval fires, that queued message runs first
- interval loop state is persisted in session storage and restored on restart
- if the next scheduled run is already overdue at restart time, clisbot schedules it immediately once after restore rather than replaying every missed tick

## Expected Outputs

### Success

- times mode:
  - `Started loop for 3 iterations.`
  - `prompt: custom` or `prompt: LOOP.md`
  - `Runs are queued immediately in order.`
- interval mode:
  - `Started loop <id> every 5m.`
  - `prompt: custom` or `prompt: LOOP.md`
  - `maxRuns: <N>`
  - `activeLoops.session: <N>`
  - `activeLoops.global: <N>`
  - `cancel: /loop cancel <id>`
  - `The first run starts now.`
- wall-clock mode:
  - `Started loop <id> every day at 07:00.`
  - `prompt: custom` or `prompt: LOOP.md`
  - `timezone: <TZ>`
  - `maxRuns: <N>`
  - `activeLoops.session: <N>`
  - `activeLoops.global: <N>`
  - `cancel: /loop cancel <id>`
  - `The first run is scheduled for <ISO>.`
- loop status:
  - `Active loops`
  - one line per loop with id, interval, remaining runs, next run time, and prompt summary
- loop cancel:
  - `Cancelled loop <id>.`
  - or `Cancelled <N> active loops for this session.`

### Error Messages

- invalid count:
  - `Loop count must be a positive integer.`
- missing interval, count, or schedule:
  - `Loop requires an interval, count, or schedule. Try /loop 5m check CI, /loop 3 check CI, /loop every day at 07:00 check CI, or /loop 3 for maintenance mode.`
- interval too short:
  - `Loop interval must be at least 1m.`
- interval below force threshold:
  - `Loop intervals below 5m require --force.`
- misplaced force flag:
  - `For interval loops, --force must appear immediately after the interval, for example /loop 1m --force check CI.`
  - `For every ... interval loops, --force must appear at the end, for example /loop check CI every 1m --force.`
- invalid interval clause:
  - `Loop interval must be a positive duration.`
- invalid wall-clock time:
  - `Loop wall-clock time must use HH:MM in 24-hour format.`
- unsupported interval unit:
  - `Loop interval must use a supported unit such as seconds, minutes, or hours.`
- above max:
  - `Loop count exceeds the configured max of <N>.`
- active loop ceiling:
  - `Active loop count exceeds the configured max of <N>. Cancel an existing loop first.`
- missing maintenance prompt:
  - `No loop prompt was provided and LOOP.md was not found in <workspace>. Create LOOP.md there if you want maintenance loops.`
- empty maintenance prompt:
  - `LOOP.md is empty in <workspace>.`

## Test Focus

- parse each supported form
- reject zero or negative counts
- reject above configured max
- reject intervals below `1m`
- reject intervals below `5m` without `--force`
- reject misplaced `--force`
- times mode queues all iterations immediately
- interval mode starts once immediately, persists state, and keeps the configured interval
- wall-clock mode computes the next matching local time, persists timezone-aware state, and restores after restart
- maintenance mode reads `LOOP.md`
- missing `LOOP.md` fails clearly
- `/loop status` shows active loops
- `/loop cancel` cancels the targeted loop or session loops
