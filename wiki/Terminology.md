Based on the explanations in my [master's thesis](http://dx.doi.org/10.18725/OPARU-50107), this page collects the definitions for terms which are of interest in the context of *flowR*.

<!-- TOC -->
- [Program Slicing](#program-slicing)
  - [Slicing Criterion](#slicing-criterion)
  - [Program Slice](#program-slice)
  - [Slicing Direction](#slicing-direction)
    - [Backward Slice](#backward-slice)
    - [Forward Slice](#forward-slice)
  - [Information Used for Slicing](#information-used-for-slicing)
    - [Static](#static)
    - [Dynamic](#dynamic)
<!-- TOC -->

## Program Slicing

For more information on different slicing variants, refer to Section&nbsp;2.1.3 of my [master's thesis](http://dx.doi.org/10.18725/OPARU-50107).

<details>
<summary>Overview of the classification used within the thesis</summary>
<img src="img/slice-classification.png" alt="feature diagram of thesis classification" width="300px">
</details>

### Slicing Criterion

A slicing criterion describes the location of a single variable or several variables of interest to slice for.
Weiser originally defined it as a combination of a line number and a set of variables of the program [(Weiser, 1984)](https://doi.org/10.1109/TSE.1984.5010248). *flowR* allows for three different formats:

| format          | example      | description                                                                                                                                                     |
|:----------------|:-------------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `line@variable` | `12@product` | the classical format but only for a single variable. The example `12@product` slices for the first occurrence of a variable with the name `product` in line 12. |
| `line:column`   | `12:5`       | a single variable or point in the program that starts at the given point.                                                                                       |
| `$id`           | `$42`        | this criteria is probably best used internally and refers to the unique id assigned by *flowR*                                                                  |

Furthermore, slicing criteria can be joined by the use of a `;`-semicolon. `10@sum;12@product` refers to the first occurrence of `sum` in line 10 and the first occurrence of `product` in line 12 as two variables to be used for slicing.

### Program Slice

Based on a slicing criterion and a program, a program slice is a subset of the program that either

1. might influence the values of the variables specified by the slicing criterion [backward slice](#backward-slice), or
2. might be influenced by the values of the variables specified by the slicing criterion [forward slice](#forward-slice).

There are many ways to slice a program. In other words, a slice is not unique - the complete program is always valid.
However, as this is rarely useful, we are interested in minimal slices, i.e., slices that are as small as possible.<a href="#note1" id="note1ref"><sup>&lt;1&gt;</sup></a>

To exemplify the term, let's look at a concrete example with the following code:

```R
z <- 3

if(x > 4) {
    y <- x
} else {
    y <- -x
}

x <- y
print(x + z)
```

Let's slice for the last definition of `x` in line 9 (`x <- y`).

- the smallest [backward slice](#backward-slice) is:

    ```R
    if(x > 4) {
        y <- x
    } else {
        y <- -x
    }

    x <- y
    ```

    It does not contain `z <- 3` as it is not necessary to define `x` in the last line, however it includes the if's condition, as it decides the active branch and hence the active definition for `y` in the definition.
    If `x <- y` itself is to be included in the slice depends on the program slicer. *flowR* includes it.

- the smallest [forward slice](#forward-slice) is:

    ```R
    print(x + z)
    ```

  It contains all statements affected by the definition of `x`. *flowR* does not support forward slicing in its current form.

### Slicing Direction

#### Backward Slice

Based on a [slicing criterion](#slicing-criterion) and a program, a backward slice is a subset of the program that might influence the values of the variables of the [slicing criterion](#slicing-criterion).
See the explanation of [program slices](#program-slice) for an example.

#### Forward Slice

Based on a [slicing criterion](#slicing-criterion) and a program, a forward slice is a subset of the program that might be influenced by the [slicing criterion](#slicing-criterion).
See the explanation of [program slices](#program-slice) for an example.

### Information Used for Slicing

#### Static

In contrast to a [dynamic slicer](#dynamic), the static slicer only relies on the source code of the input program, as well as other statically extractable information like the control-flow graph and the dataflow graph to calculate the program slice.
*flowR* uses static information.

#### Dynamic

In contrast to a [static slicer](#static), the dynamic slicer retrieves the execution trace of a program for a given input and uses it to calculate the program slice.

*flowR* is currently not using dynamic information.

-----
<a id="note1" href="#note1ref">&lt;1&gt;</a>: Finding statement minimal slices has been stated to be impossible by Weiser with a simple reduction to the halting problem [(Weiser, 1984)](https://doi.org/10.1109/TSE.1984.5010248).
