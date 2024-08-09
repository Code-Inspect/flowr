There are several ways to use *flowR*.
You can download and build it from source, download the accompanying docker image, or use its Visual Studio Code extension.

<!-- TOC -->
- [🗒️ Using the Visual Studio Code Extension](#️-using-the-visual-studio-code-extension)
- [🐳️ Using the Docker Image](#️-using-the-docker-image)
- [⚒️ Building From Scratch](#️-building-from-scratch)
- [📜 Developing for *flowR*](#-developing-for-flowr)
<!-- TOC -->

## 🗒️ Using the Visual Studio Code Extension

The easiest way to use *flowR* is to install the [Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=code-inspect.vscode-flowr). Please check out the marketplace entry for more information.

## 🐳️ Using the Docker Image

You can get the image from [docker hub](https://hub.docker.com/r/eagleoutice/flowr) by running:

```shell
docker pull eagleoutice/flowr
```

Afterward, you can test if the installation was successful by running the following (currently, there is no helper script for that):

```shell
docker run -it --rm flowr
```

This should drop you into *flowR*'s read-evaluate-print loop.
Enter `:help` to receive more information and `:quit` to leave.
Please remember, that you have to link external directories to make them available within the running container:

## ⚒️ Building From Scratch

To use *flowR*, you need [*R*](https://www.r-project.org/) installed and on your path.
Although there are several ways to do so, there is nothing wrong with installing&nbsp;R with the help of your favorite package manager or directly from the [website](https://cloud.r-project.org/).<a href="#note1" id="note1ref"><sup>&lt;1&gt;</sup></a>
For 🪟&nbsp;Windows, see [here](https://www.hanss.info/sebastian/post/rtools-path/) for an explanation on how to add [*R*](https://www.r-project.org/) to your path variable.

Furthermore, you need the [node package manager](https://www.npmjs.com/) (for Linux, we recommend using [nvm](https://github.com/nvm-sh/nvm)).

After cloning the repository,<a href="#note2" id="note2ref"><sup>&lt;2&gt;</sup></a> you can install the dependencies with:

```shell
npm i
```

After that, you should be fine! You may test *flowR*'s command-line interface by running the following from the `cli` directory:

```shell
npm run slicer -- --criterion "12@product" test/testfiles/example.R
```

The output should look similar to this:

```R
product <- 1
N <- 10
for(i in 1:(N-1)) product <- product * i
cat("Product:", product, "\n")
```

At the time of writing this, there is currently no page for frequently encountered errors. So just [message me](mailto:florian.sihler@uni-ulm.de) in case of problems.

## 📜 Developing for *flowR*

If you want to develop for *flowR*, see the [core](https://github.com/flowr-analysis/flowr/wiki/Core) wiki page.
For details on *how* to contribute, please refer to the [CONTRIBUTING.md](https://github.com/flowr-analysis/flowr/blob/main/.github/CONTRIBUTING.md) in the repository.

-----
<a id="note1" href="#note1ref">&lt;1&gt;</a>: Currently, *flowR* is only tested with R versions `4.x`.

<a id="note2" href="#note2ref">&lt;2&gt;</a>: We use
[git-lfs](https://git-lfs.com/) to store larger files, especially for the wiki pages. So if you want to work on these parts, make sure to have it set-up (see the [CONTRIBUTING.md](https://github.com/flowr-analysis/flowr/blob/main/.github/CONTRIBUTING.md) in the repository for more information).
