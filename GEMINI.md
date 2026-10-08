# CRITICAL PR CREATION RULE (DETERMINISTIC SAFEGUARD)

Whenever you are tasked with creating a Pull Request:
1. You MUST read the `.github/PULL_REQUEST_TEMPLATE.md` file.
2. You MUST use the exact content from that template for your PR description.
3. You MUST check the required boxes (e.g. `[x] Tests passed`) and provide the required issue linkage.
4. Write the PR body to a temporary file (e.g., `pr-body.md`).
5. You MUST use the deterministic safeguard script: `bash .agents/scripts/safe-pr-create.sh pr-body.md`. DO NOT use `gh pr create` directly, as it is blocked by a lifecycle hook.

Failure to follow this rule will break the `pr-lint.yml` CI pipeline.
