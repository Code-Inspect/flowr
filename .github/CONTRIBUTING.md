# How to Contribute

First of all: **Thank You for Every Contribution!**

On this page, you can find some guidelines and tips on how to contribute to *flowR*. If you have any questions or problems, feel free to open a [new issue](https://github.com/flowr-analysis/flowr/issues/new/choose) or email me directly at <florian.sihler@uni-ulm.de>.

- [How to Contribute](#how-to-contribute)
  - [Obtaining the Source Code](#obtaining-the-source-code)
    - [Git-LFS Usage](#git-lfs-usage)
    - [Cloning the Repository](#cloning-the-repository)
  - [Git-Hooks](#git-hooks)
  - [Commits and Commit Messages](#commits-and-commit-messages)
    - [Commit Types](#commit-types)
    - [Commit Scopes](#commit-scopes)
    - [Commit Subject](#commit-subject)
    - [Commit Body](#commit-body)
    - [Examples](#examples)
  - [Coding Style and ToDo Comments](#coding-style-and-todo-comments)
  - [Releases](#releases)

## Obtaining the Source Code

If you found a small typo or want to fix a minor wording problem, you can use GitHub's web interface to edit the file directly (e.g., to edit the main readme file, you can use [this link](https://github.com/flowr-analysis/flowr/edit/main/README.md)). In case you have never contributed to a project before or you are unsure how git works, [GitHub's guide][github-guide] is a good place to start.

### Git-LFS Usage

We use [git-lfs](https://git-lfs.github.com/) to store large file blobs (like images). While most of *flowR* works perfectly fine without it, if you want to work with the wiki or add a big file, please make sure you have it installed using the instructions on the [git-lfs website](https://git-lfs.com/). If you have a copy of the repository already, `git lfs pull` should be enough to retrieve all files stored using the large file storage.

### Cloning the Repository

To clone the repository, you can use the following command:

```shell
git clone https://github.com/flowr-analysis/flowr.git
```

If you prefer ssh, you can use the following command:

```shell
git clone git@github.com:flowr-analysis/flowr.git
```

For more information on how to clone and work with a repository, please see [GitHub's guide][github-guide].

## Git-Hooks

Before you commit, please enable the project-specific git-hooks by running:

```shell
git config --local core.hooksPath .githooks/
```

Experience showed that this should be done, even when an app like [Github Desktop](https://desktop.github.com/) installs the hooks for you.
<details>
<summary> Test if the installation was successful </summary>

After running the command, try the fulling dry run of a push to see if the hooks are working:

```shell
git push --dry-run
```

The output should be either an error that `npm` could not be found (if you have not setup that yet), or something like this (it can be that there is an initial copy stage if the working tree is deemd to be unclean):

```text
Linting project (local mode)...

> flowr@1.3.1 lint-local
> npm run lint -- --rule "no-warning-comments: off"

...
```

</details>

If you have any questions, refer to the [wiki](https://github.com/flowr-analysis/flowr/wiki) or just email me at: <florian.sihler@uni-ulm.de>.

## Commits and Commit Messages

We prioritize smaller commits over big-bang patches. Besides, we only enforce a basic message format for the commits.

With [#521](https://github.com/flowr-analysis/flowr/pull/521), we follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), configured by the [.github/.commitlintrc.json](https://github.com/flowr-analysis/flowr/blob/main/.github/.commitlintrc.json) and enforced by our [git-hooks](#git-hooks).<a href="#note1" id="note1ref"><sup>&lt;1&gt;</sup></a> In general, these commits have the following shape:

```text
<type>(<scope(s)>): <subject>

[<body>]
```

### Commit Types

We support the following commit types:

| name                                   | description                                                                                        |
| :------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `build`                                | Changes that affect the build system or external dependencies (e.g., npm).                         |
| `ci`, `ci-fix`                         | Updates or fixes the continuous integration (ci) pipeline of *flowR*.                                                       |
| `doc`/`docs`, `doc-fix`/`docs-fix`     | Changes that only affect documentation.                                                            |
| `feat`, `feat-fix`                     | Introduces a new feature.                                                                          |
| `perf`                                 | Improves performance.                                                                              |
| `refactor`                             | Represents a refactoring of existing code.                                                         |
| `test`/`tests`, `test-fix`/`tests-fix` | Introduces new or modifies existing tests.                                                         |
| `dep`                                  | Regards the explicit update of dependencies (or the addition of new dependencies.                  |
| `lint`, `lint-fix`                     | Adapts or updates linter-issues.                                                                   |
| `wip`                                  | *Use this only in combination with another type*. It marks the commit to be unfinished.            |
| `meta`                                 | *Use this only if none of the other categories apply*. Explain the details in your commit message. |

Although we have done that earlier, we do no longer allow more than one type (as enforced by [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)). If you think you require more, please separate the commits. However, does that mean that you have to separate, for example, `feat` and `test` commits? No! Tests should be an inherent part of a feature, and thus, should be included in the same commit. The `test` type signals that the commit is focused on tests (e.g., to add or refine tests for an existing feature).

Similarly, we no longer allow skipping the ci with a prefix like `[ci skip]`. If you suspect the ci to fail, it should!

### Commit Scopes

Currently we do not really enforce rules on the scope as, at least for the time being, we do not see a benefit in having to update the allowed scopes all the time. However, they have to be in [kebab-case](https://www.theserverside.com/definition/Kebab-case), and we strongly suggest you use a scope (and stay consistent with it).

### Commit Subject

The subject of your commit should be a terse, not-too-long (maximum of 42 characters) and not-too-short (minimum of 6 characters) although we only warn if you roam outside of these bounds.

Use the (optional) [body](#commit-body) to explain the details of your commit.

### Commit Body

The body is optional, but feel free to use it to describe your commit in more detail.

### Examples

With this, the artificial message represents the addition of a new feature:

> `feat: Support for branching in dataflow`

With scopes, it could look like this:

> `feat(dataflow): Support branching`

## Coding Style and ToDo Comments

All the basic style conventions are defined inside the `package.json` (with the help of the `eslint` package). Please make sure to adhere to them.

As indicated by [#238](https://github.com/flowr-analysis/flowr/issues/238) I decided to forbid `TODO`, `FIXME`, and `XXX` comments in code in favor of explicit *issues* directly on GitHub. Please do not try to get around that rule.

For more information on the linter, how to call it (and automatically deal with some of the issues raised),
please refer to the [Test](https://github.com/flowr-analysis/flowr/wiki/Linting-and-Testing) wiki page.

## Releases

Releases are to be scheduled by the administrators of the repository. Please do not try to create a release yourself.

-----
<a id="note1" href="#note1ref">&lt;1&gt;</a>: If you have already worked with *flowR* before, do not forget to update your dependencies!

[github-guide]: https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project
