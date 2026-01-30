# Git Stash (2007)

## Historical Context

This is the original `git-stash.sh` shell script written by Nanako Shiraishi in June 2007, committed to the Git project as `f2c66ed196d1d1410d014e4ee3e2b585936101f5`.

## Feminist Computing History

This code represents a significant moment in feminist computing history. Lines 24-48 of the original script were written by Nanako Shiraishi in June 2007, in response to repeated interruptions from her boss. The commit message she left documents this context directly.

From that moment on, programmers who are interrupted during their work have been able to "freeze" their code, solve the external problem, and then return to their work without risking the loss of any changes. The interruption—a universal experience in software labor, but particularly documented in studies of women's workplace experiences—led to the creation of `git stash`, a tool designed to handle exactly this problem.

Lines 24-48 contain the `save_stash()` function, which captures the material conditions of software labor: the need to set aside unfinished work, preserve state across interruptions, and resume later. This is not merely a technical solution but an encoding of workplace power dynamics and the fragmented attention economy of programming labor.

This fragment reminds us that source code is immaterial but not abstract. It is also an example of how programmers write programs not only to solve others' problems, but also to improve the quality of their own lives; by sharing their work as free software, they help millions of other programmers in the same condition.

## Technical Significance

This small script adds a new functionality (the stash command) to the Git environment, which is probably the most used collaborative version control system. The stash command simply saves a temporary copy of the code being written without having to declare it as final (as in the git commit command) or before sharing it with others (as in the push command).

The `git-stash` command solved a universal programmer problem:
- Quickly save uncommitted changes without creating a commit
- Switch contexts (branches, tasks) cleanly
- Restore work later without losing progress
- Handle workplace interruptions without losing work

Before `git stash`, developers had to either:
- Create temporary commits (cluttering history)
- Manually backup files (error-prone)
- Risk losing work when switching branches

## Critical Code Studies Value

This code rewards analysis through multiple lenses:

**Labor Studies**: Code as artifact of workplace interruption and context switching costs

**Feminist Technology Studies**: Early female contributor to Git; gendered patterns of interruption; tool design emerging from lived experience

**Infrastructure Studies**: How version control systems encode assumptions about workflow and attention management

**Software Studies**: The command's design philosophy—temporary storage, stack-based operations, automatic cleanup

## About Nanako Shiraishi

One of the early contributors to the Git project during its foundational years (2006-2008), Shiraishi contributed numerous improvements to Git's core functionality during a period when the project was rapidly evolving from Linus Torvalds's initial design.

We can learn much from this commit: she's one of the first women to contribute to the project; she likely lived in Japan; she cared enough about this script to contribute on a Saturday afternoon. We have the exact time and context of the action of writing the code, but we do not know anything else about the author, apart from the name and an e-mail address. We can't go beyond that point: we are left with our questions and with the legacy of someone who was once interrupted by her boss.

The original stash script has long disappeared from Git's codebase (replaced by more sophisticated implementations), yet commit f2c66ed196d1d1410d014e4ee3e2b585936101f5 will always lead us right back to Shiraishi's contribution.

## Source

- **Original Commit**: f2c66ed196d1d1410d014e4ee3e2b585936101f5
- **Date**: June 2007
- **Repository**: https://github.com/git/git
- **Language**: Shell script (Bash)
- **Lines of Code**: ~150

## Suggested Annotations

When analyzing this code, consider:

1. The `save_stash()` function's structure—how it captures multiple states (index, working tree, base commit)
2. Variable naming choices and their semantic meaning
3. Error handling patterns and what failures are anticipated
4. The merge strategy used to restore stashed changes
5. How the tool conceptualizes "work in progress"
6. The temporal assumptions embedded in the stash metaphor
