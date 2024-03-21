***This wiki page is currently under construction***

This wiki page should give the in-depth explanation of the inner workings of *flowR*. To avoid duplication it may often contain links to the internal code documentation (located here: <https://code-inspect.github.io/flowr/doc/>).

<!-- TOC -->
- [The Slicing Process](#the-slicing-process)
  - [The Steps](#the-steps)
    - [Step 1: Parsing the R Code](#step-1-parsing-the-r-code)
    - [Step 2: Normalizing the AST](#step-2-normalizing-the-ast)
    - [Step 3: Dataflow Analysis on the Normalized AST](#step-3-dataflow-analysis-on-the-normalized-ast)
    - [Step 4: Slicing on the Dataflow Graph](#step-4-slicing-on-the-dataflow-graph)
    - [Step 5: Reconstruct the R Code](#step-5-reconstruct-the-r-code)
<!-- TOC -->

## The Slicing Process

All slicing steps are defined in [src/core/steps.ts](https://github.com/Code-Inspect/flowr/blob/main/src/core/steps.ts). This is the core definition of all steps executed by the [`SteppingSlicer`](https://github.com/Code-Inspect/flowr/blob/main/src/core/slicer.ts) (refer to the [interface](https://github.com/Code-Inspect/flowr/wiki/Interface) wiki page for more information on how to use the stepping slicer).

If you want to execute a single step (for whatever reason) there are two ways to do that:

1. Use the `SteppingSlicer` with its `SteppingSlicer::hasNextStep` and `SteppingSlicer::nextStep` methods. This is the recommended way as it executes all required steps before your step of interest as well.
2. Calling `executeSingleSubStep(<step name>, <remaining arguments>)` which only executes the given step (it is up to you to provide the correct arguments).

### The Steps

#### Step 1: Parsing the R Code

#### Step 2: Normalizing the AST

#### Step 3: Dataflow Analysis on the Normalized AST

#### Step 4: Slicing on the Dataflow Graph

#### Step 5: Reconstruct the R Code
