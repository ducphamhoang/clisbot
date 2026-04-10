# Delay And Stability Are Primary Product Metrics

## Summary

For this project, delay and stability are the two most important metrics.

## Why This Matters

This product is a routed agent runtime for real chat surfaces.

That means users judge it first by:

- how quickly the bot responds
- whether it behaves reliably across fresh turns, follow-ups, retries, and recovery paths

Feature breadth, formatting polish, and secondary controls matter less if the routed runtime feels slow or drifts.

## Practical Consequences

When evaluating changes, prioritize:

1. reducing fresh-turn latency
2. reducing follow-up latency
3. preventing duplicate runs, stuck processing indicators, and session drift
4. preserving correct thread routing and resume behavior under failure

Do not count an optimization as a win if it improves speed by making runtime behavior less stable.

Do not count a stability mechanism as complete if it preserves correctness but leaves user-visible delay unnecessarily high.

## Reusable Rule

For runtime and channel work in this repo:

- treat delay and stability as the primary acceptance criteria
- preserve comparable audit measurements so later runs can prove improvement or regression
- prefer improvements that lower latency by removing fixed waits or coarse polling rather than by hiding the delay from the user
