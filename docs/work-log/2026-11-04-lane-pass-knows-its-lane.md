## 2026-11-04 — Normie's review lane skips every review because it mistakes itself for a second reviewer: tell a lane's pass how to know it is the lane (#67)

The review instructions said "don't review while the scheduled reviewer is running", so that two reviewers never overwrite each other's verdict. But they never told the scheduled reviewer how to recognise itself. Its first run on the Mini saw "the scheduled reviewer is running", decided that was someone else, and stood down. Left alone, it would never have reviewed anything.

The scheduler already leaves a name tag on every run it starts: a setting called `LOOP_RUNNER_PID`. The review and build instructions now say to check it first. If the tag is there, this run is the scheduled one and should get on with the work. If it is missing, someone started the run by hand, and that run steps aside while the scheduled one is switched on.
