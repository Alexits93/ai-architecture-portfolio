# CRITICAL PR CREATION RULE (DETERMINISTIC SAFEGUARD)

Whenever you are tasked with creating a Pull Request (`gh pr create`):
1. You MUST read the `.github/PULL_REQUEST_TEMPLATE.md` file.
2. You MUST use the exact content from that template for your PR description.
3. You MUST check the required boxes (e.g. `[x] Tests passed`) and provide the required issue linkage.
4. DO NOT use the `--body` flag with a simple one-liner. Either use a temporary file or heredoc to construct the full PR body mirroring the template.

Failure to follow this rule will break the `pr-lint.yml` CI pipeline.
