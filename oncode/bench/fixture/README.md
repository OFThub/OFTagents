# bench-fixture

Throwaway project used by `oncode/scripts/bench.mjs`. It exists so both arms of the
benchmark face the same realistic codebase: a small API with an auth module, some
unrelated modules to make unscoped exploration cost something, and one planted bug.

Run the tests: `node --test test/`
