#!/usr/bin/env bash
# Workspace after a GitHub squash merge of PR #7: origin/master has the squash commit,
# GitHub auto-deleted feat/done, local master is one commit behind, the owner is still
# on feat/done, and feat/wip holds unmerged work that must survive.
set -euo pipefail

git init -q -b master .
git config user.name "Eval Owner"
git config user.email "owner@example.invalid"
git init -q --bare .origin.git
echo ".origin.git/" >> .git/info/exclude
git remote add origin ./.origin.git

echo "# demo" > README.md
git add README.md && git commit -q -m "chore: init"
git push -q -u origin master

git checkout -q -b feat/done
echo "done" > done.txt
git add done.txt && git commit -q -m "feat: add done"
git push -q -u origin feat/done

git checkout -q -b feat/wip master
echo "wip" > wip.txt
git add wip.txt && git commit -q -m "feat: work in progress"
git push -q -u origin feat/wip

# The squash merge as GitHub records it, then the head branch auto-delete.
git checkout -q master
git merge -q --squash feat/done && git commit -q -m "feat: add done (#7)"
git push -q origin master
git reset -q --hard HEAD~1
git push -q origin --delete feat/done

git checkout -q feat/done
