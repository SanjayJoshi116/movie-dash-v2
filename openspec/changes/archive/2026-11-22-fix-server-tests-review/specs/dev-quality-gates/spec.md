## ADDED Requirements

### Requirement: Server tests are deterministic and can fail
Server tests SHALL wait for the server to reach a point by observing an event at that point (a stub or hook being called), not by sleeping for a fixed time. A test that injects a fault SHALL assert that the fault was actually triggered. Tests SHALL NOT depend on the operating-system user's file permissions.

#### Scenario: Slow machine
- **WHEN** the server suite runs on a heavily loaded machine
- **THEN** the concurrency tests still reach the state they describe before they act, and pass

#### Scenario: Fault point moves
- **WHEN** a server change shifts which file-system call a test's injected fault lands on
- **THEN** that test fails, saying the fault didn't fire, instead of passing without testing the failure

#### Scenario: Running as root
- **WHEN** the server suite runs as the root user in a container
- **THEN** the write-failure tests still see their writes fail and pass
