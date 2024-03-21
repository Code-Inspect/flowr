window.BENCHMARK_DATA = {
  "lastUpdate": 1710711452844,
  "repoUrl": "https://github.com/Code-Inspect/flowr",
  "entries": {
    "\"artificial\" Benchmark Suite": [
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "20612c4734312e5bbd8963132eb9d25802d2f8a8",
          "message": "Fine tune benchmark plots with new colors, labels, and more (#338)\n\n* ci: cycle colors\r\n\r\n* ci: show commit message name start in benchmarks as well\r\n\r\n* ci-fix: npm script `performance-test` should be able to read arguments :D\r\n\r\n* ci, typo: fix wrong name for uploading of benchmark results\r\n\r\n* ci-fix: add `--` to separatae arguments in `qa.yaml`\r\n\r\n* ci: reset current benchmark data",
          "timestamp": "2023-09-21T01:44:43+02:00",
          "tree_id": "9f4b37285d7d1eb59c97e553f8fd0766c9bb1b06",
          "url": "https://github.com/Code-Inspect/flowr/commit/20612c4734312e5bbd8963132eb9d25802d2f8a8"
        },
        "date": 1695255188267,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 8259.250394318182,
            "unit": "ms",
            "range": 4968.250512363158,
            "extra": "median: 6847.55ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 2117.869953409091,
            "unit": "ms",
            "range": 206.30641574206575,
            "extra": "median: 2061.32ms"
          },
          {
            "name": "Normalize R AST",
            "value": 130.60619313636363,
            "unit": "ms",
            "range": 224.83856303552116,
            "extra": "median: 83.93ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 89.47369154545454,
            "unit": "ms",
            "range": 233.7696346539724,
            "extra": "median: 24.78ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.3299490711368147,
            "unit": "ms",
            "range": 1.788027577151099,
            "extra": "median: 2.02ms"
          },
          {
            "name": "Static slicing",
            "value": 1.6894677939608982,
            "unit": "ms",
            "range": 1.6793862825524892,
            "extra": "median: 1.33ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.6158474940073386,
            "unit": "ms",
            "range": 0.3802273110956727,
            "extra": "median: 0.55ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "20612c4734312e5bbd8963132eb9d25802d2f8a8",
          "message": "Fine tune benchmark plots with new colors, labels, and more (#338)\n\n* ci: cycle colors\r\n\r\n* ci: show commit message name start in benchmarks as well\r\n\r\n* ci-fix: npm script `performance-test` should be able to read arguments :D\r\n\r\n* ci, typo: fix wrong name for uploading of benchmark results\r\n\r\n* ci-fix: add `--` to separatae arguments in `qa.yaml`\r\n\r\n* ci: reset current benchmark data",
          "timestamp": "2023-09-21T01:44:43+02:00",
          "tree_id": "9f4b37285d7d1eb59c97e553f8fd0766c9bb1b06",
          "url": "https://github.com/Code-Inspect/flowr/commit/20612c4734312e5bbd8963132eb9d25802d2f8a8"
        },
        "date": 1695255188267,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 8259.250394318182,
            "unit": "ms",
            "range": 4968.250512363158,
            "extra": "median: 6847.55ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 2117.869953409091,
            "unit": "ms",
            "range": 206.30641574206575,
            "extra": "median: 2061.32ms"
          },
          {
            "name": "Normalize R AST",
            "value": 130.60619313636363,
            "unit": "ms",
            "range": 224.83856303552116,
            "extra": "median: 83.93ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 89.47369154545454,
            "unit": "ms",
            "range": 233.7696346539724,
            "extra": "median: 24.78ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.3299490711368147,
            "unit": "ms",
            "range": 1.788027577151099,
            "extra": "median: 2.02ms"
          },
          {
            "name": "Static slicing",
            "value": 1.6894677939608982,
            "unit": "ms",
            "range": 1.6793862825524892,
            "extra": "median: 1.33ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.6158474940073386,
            "unit": "ms",
            "range": 0.3802273110956727,
            "extra": "median: 0.55ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "89b3e36c8d362f4c841830bc78a39fe17b375027",
          "message": "ci-fix: remove `comment-always` from the `github-action-benchmark` action as it seems to simply duplicate the commit",
          "timestamp": "2023-09-21T07:25:25+02:00",
          "tree_id": "6335e8da9c2187d2a440388c40a1b8b022d8a429",
          "url": "https://github.com/Code-Inspect/flowr/commit/89b3e36c8d362f4c841830bc78a39fe17b375027"
        },
        "date": 1695275825503,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 7643.598797772727,
            "unit": "ms",
            "range": 4672.180717292113,
            "extra": "median: 6283.39ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 1950.7826282272727,
            "unit": "ms",
            "range": 181.21346309768163,
            "extra": "median: 1894.59ms"
          },
          {
            "name": "Normalize R AST",
            "value": 123.43655113636365,
            "unit": "ms",
            "range": 208.31544897169914,
            "extra": "median: 88.70ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 79.20538540909091,
            "unit": "ms",
            "range": 202.11401371887737,
            "extra": "median: 20.75ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.2619200407518827,
            "unit": "ms",
            "range": 1.8408493295930126,
            "extra": "median: 1.94ms"
          },
          {
            "name": "Static slicing",
            "value": 1.66149032726466,
            "unit": "ms",
            "range": 1.749796677838569,
            "extra": "median: 1.30ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5784065275371335,
            "unit": "ms",
            "range": 0.30873223169526165,
            "extra": "median: 0.52ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "05f243e420d0a81a6884f1a65a2003b16af6ef7c",
          "message": "ci-fix: remove summary from the social-science graph to avoid double commit",
          "timestamp": "2023-09-21T09:21:19+02:00",
          "tree_id": "d487002e9ec254edd9cc4b596b0dce914d8cfbbd",
          "url": "https://github.com/Code-Inspect/flowr/commit/05f243e420d0a81a6884f1a65a2003b16af6ef7c"
        },
        "date": 1695282675607,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 7701.254288318182,
            "unit": "ms",
            "range": 4843.336805037895,
            "extra": "median: 6334.48ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 1980.7100336363637,
            "unit": "ms",
            "range": 204.27661173616985,
            "extra": "median: 1917.22ms"
          },
          {
            "name": "Normalize R AST",
            "value": 127.08206213636365,
            "unit": "ms",
            "range": 214.68286944769946,
            "extra": "median: 83.04ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 87.14668454545455,
            "unit": "ms",
            "range": 224.1970949583956,
            "extra": "median: 24.26ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.2628835272066796,
            "unit": "ms",
            "range": 1.6405512494599805,
            "extra": "median: 1.97ms"
          },
          {
            "name": "Static slicing",
            "value": 1.6512188329232425,
            "unit": "ms",
            "range": 1.5427139827025,
            "extra": "median: 1.32ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5902010767995785,
            "unit": "ms",
            "range": 0.29831853381451173,
            "extra": "median: 0.53ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "127bc834a15a16930038f25587b54cb1422c9df4",
          "message": "Merge benchmark commits into one (#340)\n\nci, refactor: merge benchmark commits into one",
          "timestamp": "2023-09-21T12:24:40+02:00",
          "tree_id": "180c8b31c7e6d78169d1bd2523ee0a42008906da",
          "url": "https://github.com/Code-Inspect/flowr/commit/127bc834a15a16930038f25587b54cb1422c9df4"
        },
        "date": 1695293611928,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 7936.898981,
            "unit": "ms",
            "range": 4882.770877200135,
            "extra": "median: 6535.60ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 2033.6461868636363,
            "unit": "ms",
            "range": 196.32852061783728,
            "extra": "median: 1970.69ms"
          },
          {
            "name": "Normalize R AST",
            "value": 128.13887368181818,
            "unit": "ms",
            "range": 217.49327814433346,
            "extra": "median: 82.63ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 88.38316054545454,
            "unit": "ms",
            "range": 228.24481123443803,
            "extra": "median: 25.40ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.3599499137395474,
            "unit": "ms",
            "range": 1.9323431536368794,
            "extra": "median: 2.01ms"
          },
          {
            "name": "Static slicing",
            "value": 1.7389910657246048,
            "unit": "ms",
            "range": 1.8413471961461345,
            "extra": "median: 1.35ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5987547678283729,
            "unit": "ms",
            "range": 0.3109401041906286,
            "extra": "median: 0.54ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "0fda4c49cd9e2b2191a1b15c137cd78cb08f52aa",
          "message": "[release:patch] Update xmldom Dependency and Benchmarking Support",
          "timestamp": "2023-09-24T14:13:29+02:00",
          "tree_id": "4ecc81b2e690ba8ac4f1912756542fa125261a27",
          "url": "https://github.com/Code-Inspect/flowr/commit/0fda4c49cd9e2b2191a1b15c137cd78cb08f52aa"
        },
        "date": 1695559897555,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 7649.1946755,
            "unit": "ms",
            "range": 4652.495107303273,
            "extra": "median: 6285.91ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 1963.4770063636363,
            "unit": "ms",
            "range": 186.957771516333,
            "extra": "median: 1887.73ms"
          },
          {
            "name": "Normalize R AST",
            "value": 124.184728,
            "unit": "ms",
            "range": 212.20536424279288,
            "extra": "median: 80.36ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 78.81278186363636,
            "unit": "ms",
            "range": 201.33742715454252,
            "extra": "median: 22.32ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.26305677172671,
            "unit": "ms",
            "range": 1.7384018182555752,
            "extra": "median: 1.96ms"
          },
          {
            "name": "Static slicing",
            "value": 1.6681850654249957,
            "unit": "ms",
            "range": 1.6413282759277712,
            "extra": "median: 1.31ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5734224558631944,
            "unit": "ms",
            "range": 0.30043278522070765,
            "extra": "median: 0.51ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "77159de13994c94d1a86ebf0db70c0a01067d372",
          "message": "[release:patch] CFG, N-Quads export",
          "timestamp": "2023-10-10T11:16:02+02:00",
          "tree_id": "4760f5664753b99fdb69e3d5675ba0cef3cf1140",
          "url": "https://github.com/Code-Inspect/flowr/commit/77159de13994c94d1a86ebf0db70c0a01067d372"
        },
        "date": 1696931418749,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 4960.836150363636,
            "unit": "ms",
            "range": 6482.0988719721245,
            "extra": "median: 3052.97ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 112.15266804545455,
            "unit": "ms",
            "range": 221.01947121880636,
            "extra": "median: 55.12ms"
          },
          {
            "name": "Normalize R AST",
            "value": 158.9432460909091,
            "unit": "ms",
            "range": 277.454183675945,
            "extra": "median: 109.80ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 107.0013843181818,
            "unit": "ms",
            "range": 282.12362511959634,
            "extra": "median: 28.77ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.7611302354682308,
            "unit": "ms",
            "range": 2.115801393637501,
            "extra": "median: 2.42ms"
          },
          {
            "name": "Static slicing",
            "value": 1.9756198511738667,
            "unit": "ms",
            "range": 1.9789741654051405,
            "extra": "median: 1.59ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.7625824303663716,
            "unit": "ms",
            "range": 0.42406440624519987,
            "extra": "median: 0.67ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "a13ba7d57c8f8ca264630109c56e1906e21c2066",
          "message": "[release:minor] Feature Extraction and CFG Export",
          "timestamp": "2023-10-15T08:56:06+02:00",
          "tree_id": "89e99a6cb66c08dc2c808dd798df9e888c88931c",
          "url": "https://github.com/Code-Inspect/flowr/commit/a13ba7d57c8f8ca264630109c56e1906e21c2066"
        },
        "date": 1697355093950,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5136.292062545455,
            "unit": "ms",
            "range": 6659.167699804035,
            "extra": "median: 3182.83ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 124.09828127272726,
            "unit": "ms",
            "range": 243.70782214857047,
            "extra": "median: 67.59ms"
          },
          {
            "name": "Normalize R AST",
            "value": 160.2237915909091,
            "unit": "ms",
            "range": 278.6105978575149,
            "extra": "median: 101.78ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 108.43437586363636,
            "unit": "ms",
            "range": 284.0057832037362,
            "extra": "median: 27.79ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.8182434778758196,
            "unit": "ms",
            "range": 2.051447335915778,
            "extra": "median: 2.46ms"
          },
          {
            "name": "Static slicing",
            "value": 1.9806726576978653,
            "unit": "ms",
            "range": 1.8433455256061702,
            "extra": "median: 1.62ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.8126920856475652,
            "unit": "ms",
            "range": 0.6147197597624667,
            "extra": "median: 0.70ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "1e9911dfb7b57bba9af2fbc21bb25b7b8a769b63",
          "message": "[release:patch] More Robust Server",
          "timestamp": "2023-10-18T14:31:58+02:00",
          "tree_id": "c4d6e9b11aa00ac6785f02ca584364bfdf5b52ab",
          "url": "https://github.com/Code-Inspect/flowr/commit/1e9911dfb7b57bba9af2fbc21bb25b7b8a769b63"
        },
        "date": 1697634673188,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5224.464815863636,
            "unit": "ms",
            "range": 7092.487714397081,
            "extra": "median: 3051.57ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 116.95115622727273,
            "unit": "ms",
            "range": 243.53206402067616,
            "extra": "median: 51.76ms"
          },
          {
            "name": "Normalize R AST",
            "value": 160.7872227272727,
            "unit": "ms",
            "range": 271.38935329251126,
            "extra": "median: 107.26ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 110.0293535909091,
            "unit": "ms",
            "range": 285.52436127668494,
            "extra": "median: 28.34ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.9764448142291404,
            "unit": "ms",
            "range": 2.325561478272478,
            "extra": "median: 2.58ms"
          },
          {
            "name": "Static slicing",
            "value": 2.1260829411880016,
            "unit": "ms",
            "range": 2.185475853997074,
            "extra": "median: 1.68ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.8235981809008505,
            "unit": "ms",
            "range": 0.4789098297658495,
            "extra": "median: 0.74ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "ef6b5bc18f7145ba61f75b43ed973d5f961ce670",
          "message": "[release:patch] Include character counts in meta statistics",
          "timestamp": "2023-11-02T13:39:16+01:00",
          "tree_id": "48744a8fc8d41b2b0740b8b7b4ccf7b4ca9c388c",
          "url": "https://github.com/Code-Inspect/flowr/commit/ef6b5bc18f7145ba61f75b43ed973d5f961ce670"
        },
        "date": 1698930897537,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3238.0027303636366,
            "unit": "ms",
            "range": 3851.6861391590023,
            "extra": "median: 2102.96ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 67.72076345454545,
            "unit": "ms",
            "range": 135.07026993115434,
            "extra": "median: 33.10ms"
          },
          {
            "name": "Normalize R AST",
            "value": 99.12328140909091,
            "unit": "ms",
            "range": 157.33731741020588,
            "extra": "median: 67.98ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 65.55846731818183,
            "unit": "ms",
            "range": 169.27520217727005,
            "extra": "median: 17.37ms"
          },
          {
            "name": "Total per-slice",
            "value": 1.8734386729647032,
            "unit": "ms",
            "range": 1.3424235755626424,
            "extra": "median: 1.64ms"
          },
          {
            "name": "Static slicing",
            "value": 1.3930558979239522,
            "unit": "ms",
            "range": 1.2493040262670454,
            "extra": "median: 1.13ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.46342775577268414,
            "unit": "ms",
            "range": 0.23858650666759953,
            "extra": "median: 0.42ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "266b087710648b96b1779436aee32a0c47ac80cd",
          "message": "[release:patch] Robustness against encoding errors",
          "timestamp": "2023-11-03T20:54:13+01:00",
          "tree_id": "c245f343a8ef43765a4f36f2aad48763dc77d6b3",
          "url": "https://github.com/Code-Inspect/flowr/commit/266b087710648b96b1779436aee32a0c47ac80cd"
        },
        "date": 1699043092723,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3179.838332181818,
            "unit": "ms",
            "range": 3672.286438980555,
            "extra": "median: 2088.33ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 67.57201345454546,
            "unit": "ms",
            "range": 135.00742353958452,
            "extra": "median: 32.55ms"
          },
          {
            "name": "Normalize R AST",
            "value": 92.62022559090909,
            "unit": "ms",
            "range": 152.11002159362633,
            "extra": "median: 64.46ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 65.08133054545455,
            "unit": "ms",
            "range": 166.00596407178642,
            "extra": "median: 19.44ms"
          },
          {
            "name": "Total per-slice",
            "value": 1.8579071164832888,
            "unit": "ms",
            "range": 1.2960021301432842,
            "extra": "median: 1.63ms"
          },
          {
            "name": "Static slicing",
            "value": 1.3913231260599883,
            "unit": "ms",
            "range": 1.2140789790282374,
            "extra": "median: 1.13ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.44898673756392055,
            "unit": "ms",
            "range": 0.21332097434246836,
            "extra": "median: 0.41ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "243959c2f01ddf928c85ee4905105307971ad19b",
          "message": "[release:patch] Robustify Quad Export Against Cyclic Structures",
          "timestamp": "2023-11-10T18:59:51+01:00",
          "tree_id": "8e5af22f7b39483e95e62308330a5e9e002ba57a",
          "url": "https://github.com/Code-Inspect/flowr/commit/243959c2f01ddf928c85ee4905105307971ad19b"
        },
        "date": 1699640652120,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3190.570812409091,
            "unit": "ms",
            "range": 3747.790963743062,
            "extra": "median: 2088.22ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 68.74045054545455,
            "unit": "ms",
            "range": 132.55959690808635,
            "extra": "median: 33.81ms"
          },
          {
            "name": "Normalize R AST",
            "value": 96.19992009090909,
            "unit": "ms",
            "range": 156.15063334620123,
            "extra": "median: 67.94ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 66.09041786363636,
            "unit": "ms",
            "range": 169.92667998599904,
            "extra": "median: 17.49ms"
          },
          {
            "name": "Total per-slice",
            "value": 1.8411702253695927,
            "unit": "ms",
            "range": 1.267065280512554,
            "extra": "median: 1.64ms"
          },
          {
            "name": "Static slicing",
            "value": 1.3684034386686694,
            "unit": "ms",
            "range": 1.1799623517395228,
            "extra": "median: 1.13ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.4553098527401606,
            "unit": "ms",
            "range": 0.2299566392692304,
            "extra": "median: 0.41ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "c209d78300f23960363beb046efd2b07a0a5531d",
          "message": "[release:patch] Allow Strings as Names for Function Call Arguments",
          "timestamp": "2023-11-22T13:22:53+01:00",
          "tree_id": "a052c400e622d7062e4ff675a07f088883eaccee",
          "url": "https://github.com/Code-Inspect/flowr/commit/c209d78300f23960363beb046efd2b07a0a5531d"
        },
        "date": 1700657318626,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3354.2152301363635,
            "unit": "ms",
            "range": 3860.1297956846133,
            "extra": "median: 2189.09ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 71.48860922727273,
            "unit": "ms",
            "range": 136.54310977165716,
            "extra": "median: 35.79ms"
          },
          {
            "name": "Normalize R AST",
            "value": 95.79139172727274,
            "unit": "ms",
            "range": 152.52195436786488,
            "extra": "median: 64.57ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 66.23299468181818,
            "unit": "ms",
            "range": 170.60548403093352,
            "extra": "median: 19.23ms"
          },
          {
            "name": "Total per-slice",
            "value": 1.8581676256634037,
            "unit": "ms",
            "range": 1.2492897864296644,
            "extra": "median: 1.64ms"
          },
          {
            "name": "Static slicing",
            "value": 1.372047543536089,
            "unit": "ms",
            "range": 1.1480006540491348,
            "extra": "median: 1.13ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.46882655148163743,
            "unit": "ms",
            "range": 0.2603715463019149,
            "extra": "median: 0.41ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "7cef37c8fb8e93c1e22647fa0efed2c1ddcf21a9",
          "message": "[release:patch] Quads With Repeated Edge Types",
          "timestamp": "2023-12-08T15:24:04+01:00",
          "tree_id": "e7a3ab3994be6ef3dfd8e8b13a4957bbfe0242b5",
          "url": "https://github.com/Code-Inspect/flowr/commit/7cef37c8fb8e93c1e22647fa0efed2c1ddcf21a9"
        },
        "date": 1702046952548,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3914.897785181818,
            "unit": "ms",
            "range": 5561.047944408685,
            "extra": "median: 2246.12ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 79.23541877272727,
            "unit": "ms",
            "range": 156.85010382325788,
            "extra": "median: 38.27ms"
          },
          {
            "name": "Normalize R AST",
            "value": 99.36930672727273,
            "unit": "ms",
            "range": 160.20652435903554,
            "extra": "median: 68.56ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 69.87000995454545,
            "unit": "ms",
            "range": 181.50457342713372,
            "extra": "median: 17.65ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.0929919935168906,
            "unit": "ms",
            "range": 1.3580169345320046,
            "extra": "median: 1.90ms"
          },
          {
            "name": "Static slicing",
            "value": 1.418837559285864,
            "unit": "ms",
            "range": 1.2078497990535682,
            "extra": "median: 1.16ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.654821339733212,
            "unit": "ms",
            "range": 0.40929627079838377,
            "extra": "median: 0.64ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "5d9e4d36fce917d72f382c8cc441ce576baf18a6",
          "message": "[release:patch] Using Next in RDF Quads",
          "timestamp": "2023-12-13T13:59:30+01:00",
          "tree_id": "c9aa3c29b811c7d73cc287b2a5f9e89f06951cd9",
          "url": "https://github.com/Code-Inspect/flowr/commit/5d9e4d36fce917d72f382c8cc441ce576baf18a6"
        },
        "date": 1702473792545,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3277.835952,
            "unit": "ms",
            "range": 3650.0375295266645,
            "extra": "median: 2193.31ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 68.49444895454545,
            "unit": "ms",
            "range": 132.01593297444168,
            "extra": "median: 35.37ms"
          },
          {
            "name": "Normalize R AST",
            "value": 95.374054,
            "unit": "ms",
            "range": 152.9260288537938,
            "extra": "median: 68.68ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 65.96892504545454,
            "unit": "ms",
            "range": 170.63963367521657,
            "extra": "median: 17.31ms"
          },
          {
            "name": "Total per-slice",
            "value": 1.849766443616379,
            "unit": "ms",
            "range": 1.2946515240101566,
            "extra": "median: 1.65ms"
          },
          {
            "name": "Static slicing",
            "value": 1.3827639315335498,
            "unit": "ms",
            "range": 1.209711488412065,
            "extra": "median: 1.14ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.44947423548591825,
            "unit": "ms",
            "range": 0.2084265687331651,
            "extra": "median: 0.41ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "c148955f1c3a57e08545baa6a94b58c9124b4613",
          "message": "[release:patch] Demo File for Presentations",
          "timestamp": "2024-01-04T09:31:14+01:00",
          "tree_id": "952d243e0eef028eb0fc52f25ccac831253d9f17",
          "url": "https://github.com/Code-Inspect/flowr/commit/c148955f1c3a57e08545baa6a94b58c9124b4613"
        },
        "date": 1704358481170,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3538.5974304545457,
            "unit": "ms",
            "range": 4581.372160627646,
            "extra": "median: 2184.55ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 77.82700472727274,
            "unit": "ms",
            "range": 149.40207734835903,
            "extra": "median: 39.09ms"
          },
          {
            "name": "Normalize R AST",
            "value": 98.53393954545454,
            "unit": "ms",
            "range": 158.74254778960403,
            "extra": "median: 72.29ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 67.4761410909091,
            "unit": "ms",
            "range": 174.11690488775295,
            "extra": "median: 17.18ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.002858174188422,
            "unit": "ms",
            "range": 1.4075505647469286,
            "extra": "median: 1.73ms"
          },
          {
            "name": "Static slicing",
            "value": 1.4466165340773975,
            "unit": "ms",
            "range": 1.2822227155581158,
            "extra": "median: 1.14ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.535649854171506,
            "unit": "ms",
            "range": 0.31471901439260436,
            "extra": "median: 0.48ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "4b9d841139c45af7a2e50de57bf454b4d98dcd34",
          "message": "[release:patch] Publish NPM to own namespace",
          "timestamp": "2024-01-04T16:44:38+01:00",
          "tree_id": "3af219dac7ab8e8aeff5ce9aaec1f1b45f9d32bb",
          "url": "https://github.com/Code-Inspect/flowr/commit/4b9d841139c45af7a2e50de57bf454b4d98dcd34"
        },
        "date": 1704384536144,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3749.7315675454547,
            "unit": "ms",
            "range": 4970.104297624152,
            "extra": "median: 2282.58ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 77.88396722727273,
            "unit": "ms",
            "range": 149.02292336751995,
            "extra": "median: 39.78ms"
          },
          {
            "name": "Normalize R AST",
            "value": 97.90443504545455,
            "unit": "ms",
            "range": 157.1612919108991,
            "extra": "median: 69.84ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 68.1648949090909,
            "unit": "ms",
            "range": 175.39243709432557,
            "extra": "median: 17.83ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.0183527784925235,
            "unit": "ms",
            "range": 1.3819952574905736,
            "extra": "median: 1.80ms"
          },
          {
            "name": "Static slicing",
            "value": 1.4458811451862046,
            "unit": "ms",
            "range": 1.241781458745927,
            "extra": "median: 1.18ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5536129872832918,
            "unit": "ms",
            "range": 0.3606792109242279,
            "extra": "median: 0.50ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "2e17bd230fd0762e103508098f5fb1fa3d565d46",
          "message": "[release:patch] Update NPM Package Dependencies",
          "timestamp": "2024-01-13T14:09:36+01:00",
          "tree_id": "81a22dece7b6bc2454b2f78cc3dd742fa9b690fa",
          "url": "https://github.com/Code-Inspect/flowr/commit/2e17bd230fd0762e103508098f5fb1fa3d565d46"
        },
        "date": 1705152647474,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3174.886931590909,
            "unit": "ms",
            "range": 4133.82989376954,
            "extra": "median: 1922.24ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 73.759667,
            "unit": "ms",
            "range": 159.73313158842387,
            "extra": "median: 30.94ms"
          },
          {
            "name": "Normalize R AST",
            "value": 97.24624554545454,
            "unit": "ms",
            "range": 157.4974378518514,
            "extra": "median: 73.06ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 66.34398486363636,
            "unit": "ms",
            "range": 170.59395619673015,
            "extra": "median: 17.03ms"
          },
          {
            "name": "Total per-slice",
            "value": 1.9209680083249427,
            "unit": "ms",
            "range": 1.3225392322151348,
            "extra": "median: 1.69ms"
          },
          {
            "name": "Static slicing",
            "value": 1.4057747356611319,
            "unit": "ms",
            "range": 1.2018529713715655,
            "extra": "median: 1.15ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.49751458799773607,
            "unit": "ms",
            "range": 0.2877398660633804,
            "extra": "median: 0.44ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "816c844036b361042c26d2af07b4d092e66b46fb",
          "message": "[release:patch] Drop readlines/promises Dependency",
          "timestamp": "2024-01-15T23:29:47+01:00",
          "tree_id": "2383d566e88ea2e0dbe60dd73f7d7b92b3093407",
          "url": "https://github.com/Code-Inspect/flowr/commit/816c844036b361042c26d2af07b4d092e66b46fb"
        },
        "date": 1705359154980,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 2967.1418025454545,
            "unit": "ms",
            "range": 3618.949366683997,
            "extra": "median: 1927.64ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 69.06575931818182,
            "unit": "ms",
            "range": 145.0290465282857,
            "extra": "median: 30.99ms"
          },
          {
            "name": "Normalize R AST",
            "value": 95.2519069090909,
            "unit": "ms",
            "range": 153.1479590068876,
            "extra": "median: 67.97ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 64.6035405,
            "unit": "ms",
            "range": 167.23909055295272,
            "extra": "median: 16.84ms"
          },
          {
            "name": "Total per-slice",
            "value": 1.8720710902829922,
            "unit": "ms",
            "range": 1.3532400635998951,
            "extra": "median: 1.63ms"
          },
          {
            "name": "Static slicing",
            "value": 1.4122959211773074,
            "unit": "ms",
            "range": 1.281855192577784,
            "extra": "median: 1.13ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.442741380921788,
            "unit": "ms",
            "range": 0.19367073211054742,
            "extra": "median: 0.40ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "d69018e52ccd36d2a4c6749a259bc7347a5c8a5d",
          "message": "[release:patch] npm for WebSocket Server",
          "timestamp": "2024-01-31T15:39:17+01:00",
          "tree_id": "e208ae0ae2bb451ea46ccc05df594033cd4f95bc",
          "url": "https://github.com/Code-Inspect/flowr/commit/d69018e52ccd36d2a4c6749a259bc7347a5c8a5d"
        },
        "date": 1706713170342,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 1511.494083,
            "unit": "ms",
            "range": 3708.3225553463017,
            "extra": "median: 450.67ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 64.46248863636363,
            "unit": "ms",
            "range": 125.66414120100016,
            "extra": "median: 34.34ms"
          },
          {
            "name": "Normalize R AST",
            "value": 94.99519236363636,
            "unit": "ms",
            "range": 152.9376581920758,
            "extra": "median: 66.70ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 65.2556795909091,
            "unit": "ms",
            "range": 167.18441854609554,
            "extra": "median: 17.49ms"
          },
          {
            "name": "Run abstract interpretation",
            "value": 0.03478995454545455,
            "unit": "ms",
            "range": 0.01086253065474186,
            "extra": "median: 0.03ms"
          },
          {
            "name": "Total per-slice",
            "value": 1.8724288794806876,
            "unit": "ms",
            "range": 1.3873679811565907,
            "extra": "median: 1.62ms"
          },
          {
            "name": "Static slicing",
            "value": 1.4074784311593942,
            "unit": "ms",
            "range": 1.3118563756339259,
            "extra": "median: 1.13ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.4524929302663976,
            "unit": "ms",
            "range": 0.22636683004337768,
            "extra": "median: 0.41ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 7728 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026896,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.720988345209971,
            "unit": "#",
            "extra": "std: 0.13987413604166843"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "78da42c867266e8832933ba9bcd2e1bc3951d5f9",
          "message": "[release:patch] Dropping xmlparsedata, Benchmark Re-Runs, and Repl Fixes",
          "timestamp": "2024-03-17T22:21:47+01:00",
          "tree_id": "3f3bb3107a47ce4ffee7f569cb902e0c641dbe60",
          "url": "https://github.com/Code-Inspect/flowr/commit/78da42c867266e8832933ba9bcd2e1bc3951d5f9"
        },
        "date": 1710711451253,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Retrieve AST from R code",
            "value": 328.7877424545454,
            "unit": "ms",
            "range": 0,
            "extra": "median: 328.79ms"
          },
          {
            "name": "Normalize R AST",
            "value": 34.82602604545455,
            "unit": "ms",
            "range": 0,
            "extra": "median: 34.83ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 72.140976,
            "unit": "ms",
            "range": 0,
            "extra": "median: 72.14ms"
          },
          {
            "name": "Total per-file",
            "value": 1761.6346178636363,
            "unit": "ms",
            "range": 0,
            "extra": "median: 1761.63ms"
          },
          {
            "name": "Static slicing",
            "value": 1.4568277437917196,
            "unit": "ms",
            "range": 1.2805075743767247,
            "extra": "median: 1.13ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5308818860863364,
            "unit": "ms",
            "range": 0.3540321314721033,
            "extra": "median: 0.46ms"
          },
          {
            "name": "Total per-slice",
            "value": 2.0031037886510674,
            "unit": "ms",
            "range": 1.3820450513044555,
            "extra": "median: 1.70ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 0,
            "unit": "#",
            "extra": "out of 4158 slices"
          },
          {
            "name": "times hit threshold",
            "value": 0,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.7329390759026897,
            "unit": "#",
            "extra": "std: 0.1494698363920617"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.7209834969577295,
            "unit": "#",
            "extra": "std: 0.13987450018862865"
          }
        ]
      }
    ],
    "\"social-science\" Benchmark Suite": [
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "20612c4734312e5bbd8963132eb9d25802d2f8a8",
          "message": "Fine tune benchmark plots with new colors, labels, and more (#338)\n\n* ci: cycle colors\r\n\r\n* ci: show commit message name start in benchmarks as well\r\n\r\n* ci-fix: npm script `performance-test` should be able to read arguments :D\r\n\r\n* ci, typo: fix wrong name for uploading of benchmark results\r\n\r\n* ci-fix: add `--` to separatae arguments in `qa.yaml`\r\n\r\n* ci: reset current benchmark data",
          "timestamp": "2023-09-21T01:44:43+02:00",
          "tree_id": "9f4b37285d7d1eb59c97e553f8fd0766c9bb1b06",
          "url": "https://github.com/Code-Inspect/flowr/commit/20612c4734312e5bbd8963132eb9d25802d2f8a8"
        },
        "date": 1695255188618,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 10924.603258219999,
            "unit": "ms",
            "range": 8162.605362097769,
            "extra": "median: 7633.67ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 2088.2099376,
            "unit": "ms",
            "range": 95.54303478866264,
            "extra": "median: 2068.94ms"
          },
          {
            "name": "Normalize R AST",
            "value": 149.64170438,
            "unit": "ms",
            "range": 98.76134983441513,
            "extra": "median: 111.52ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 226.55017604,
            "unit": "ms",
            "range": 388.9695823485092,
            "extra": "median: 61.86ms"
          },
          {
            "name": "Total per-slice",
            "value": 11.635431291893523,
            "unit": "ms",
            "range": 19.87223607979893,
            "extra": "median: 8.83ms"
          },
          {
            "name": "Static slicing",
            "value": 10.975662455647656,
            "unit": "ms",
            "range": 19.77659599605963,
            "extra": "median: 8.17ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.6472877066595938,
            "unit": "ms",
            "range": 0.4622639696255693,
            "extra": "median: 0.57ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11160 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8973961730207582,
            "unit": "#",
            "extra": "std: 0.08572960788217562"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8564460343281113,
            "unit": "#",
            "extra": "std: 0.11535970153362557"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "20612c4734312e5bbd8963132eb9d25802d2f8a8",
          "message": "Fine tune benchmark plots with new colors, labels, and more (#338)\n\n* ci: cycle colors\r\n\r\n* ci: show commit message name start in benchmarks as well\r\n\r\n* ci-fix: npm script `performance-test` should be able to read arguments :D\r\n\r\n* ci, typo: fix wrong name for uploading of benchmark results\r\n\r\n* ci-fix: add `--` to separatae arguments in `qa.yaml`\r\n\r\n* ci: reset current benchmark data",
          "timestamp": "2023-09-21T01:44:43+02:00",
          "tree_id": "9f4b37285d7d1eb59c97e553f8fd0766c9bb1b06",
          "url": "https://github.com/Code-Inspect/flowr/commit/20612c4734312e5bbd8963132eb9d25802d2f8a8"
        },
        "date": 1695255188618,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 10924.603258219999,
            "unit": "ms",
            "range": 8162.605362097769,
            "extra": "median: 7633.67ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 2088.2099376,
            "unit": "ms",
            "range": 95.54303478866264,
            "extra": "median: 2068.94ms"
          },
          {
            "name": "Normalize R AST",
            "value": 149.64170438,
            "unit": "ms",
            "range": 98.76134983441513,
            "extra": "median: 111.52ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 226.55017604,
            "unit": "ms",
            "range": 388.9695823485092,
            "extra": "median: 61.86ms"
          },
          {
            "name": "Total per-slice",
            "value": 11.635431291893523,
            "unit": "ms",
            "range": 19.87223607979893,
            "extra": "median: 8.83ms"
          },
          {
            "name": "Static slicing",
            "value": 10.975662455647656,
            "unit": "ms",
            "range": 19.77659599605963,
            "extra": "median: 8.17ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.6472877066595938,
            "unit": "ms",
            "range": 0.4622639696255693,
            "extra": "median: 0.57ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11160 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8973961730207582,
            "unit": "#",
            "extra": "std: 0.08572960788217562"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8564460343281113,
            "unit": "#",
            "extra": "std: 0.11535970153362557"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "89b3e36c8d362f4c841830bc78a39fe17b375027",
          "message": "ci-fix: remove `comment-always` from the `github-action-benchmark` action as it seems to simply duplicate the commit",
          "timestamp": "2023-09-21T07:25:25+02:00",
          "tree_id": "6335e8da9c2187d2a440388c40a1b8b022d8a429",
          "url": "https://github.com/Code-Inspect/flowr/commit/89b3e36c8d362f4c841830bc78a39fe17b375027"
        },
        "date": 1695275827810,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 12382.0425562,
            "unit": "ms",
            "range": 10937.210881769275,
            "extra": "median: 8074.07ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 2181.0724276799997,
            "unit": "ms",
            "range": 169.2241920134575,
            "extra": "median: 2155.55ms"
          },
          {
            "name": "Normalize R AST",
            "value": 162.70584725999998,
            "unit": "ms",
            "range": 104.48717867354124,
            "extra": "median: 120.60ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 265.36491906,
            "unit": "ms",
            "range": 457.034519299341,
            "extra": "median: 72.62ms"
          },
          {
            "name": "Total per-slice",
            "value": 14.216319260016254,
            "unit": "ms",
            "range": 28.825399895907974,
            "extra": "median: 10.45ms"
          },
          {
            "name": "Static slicing",
            "value": 13.477150563559666,
            "unit": "ms",
            "range": 28.641109807359253,
            "extra": "median: 9.70ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.7238279706295041,
            "unit": "ms",
            "range": 0.6926346534572857,
            "extra": "median: 0.61ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11160 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8973961730207582,
            "unit": "#",
            "extra": "std: 0.08572960788217562"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8564460343281113,
            "unit": "#",
            "extra": "std: 0.11535970153362557"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "89b3e36c8d362f4c841830bc78a39fe17b375027",
          "message": "ci-fix: remove `comment-always` from the `github-action-benchmark` action as it seems to simply duplicate the commit",
          "timestamp": "2023-09-21T07:25:25+02:00",
          "tree_id": "6335e8da9c2187d2a440388c40a1b8b022d8a429",
          "url": "https://github.com/Code-Inspect/flowr/commit/89b3e36c8d362f4c841830bc78a39fe17b375027"
        },
        "date": 1695275827810,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 12382.0425562,
            "unit": "ms",
            "range": 10937.210881769275,
            "extra": "median: 8074.07ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 2181.0724276799997,
            "unit": "ms",
            "range": 169.2241920134575,
            "extra": "median: 2155.55ms"
          },
          {
            "name": "Normalize R AST",
            "value": 162.70584725999998,
            "unit": "ms",
            "range": 104.48717867354124,
            "extra": "median: 120.60ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 265.36491906,
            "unit": "ms",
            "range": 457.034519299341,
            "extra": "median: 72.62ms"
          },
          {
            "name": "Total per-slice",
            "value": 14.216319260016254,
            "unit": "ms",
            "range": 28.825399895907974,
            "extra": "median: 10.45ms"
          },
          {
            "name": "Static slicing",
            "value": 13.477150563559666,
            "unit": "ms",
            "range": 28.641109807359253,
            "extra": "median: 9.70ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.7238279706295041,
            "unit": "ms",
            "range": 0.6926346534572857,
            "extra": "median: 0.61ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11160 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8973961730207582,
            "unit": "#",
            "extra": "std: 0.08572960788217562"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8564460343281113,
            "unit": "#",
            "extra": "std: 0.11535970153362557"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "05f243e420d0a81a6884f1a65a2003b16af6ef7c",
          "message": "ci-fix: remove summary from the social-science graph to avoid double commit",
          "timestamp": "2023-09-21T09:21:19+02:00",
          "tree_id": "d487002e9ec254edd9cc4b596b0dce914d8cfbbd",
          "url": "https://github.com/Code-Inspect/flowr/commit/05f243e420d0a81a6884f1a65a2003b16af6ef7c"
        },
        "date": 1695282677149,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 11012.934499219999,
            "unit": "ms",
            "range": 8356.980219831254,
            "extra": "median: 7434.43ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 2090.76284344,
            "unit": "ms",
            "range": 91.0682061646811,
            "extra": "median: 2043.19ms"
          },
          {
            "name": "Normalize R AST",
            "value": 150.86555514,
            "unit": "ms",
            "range": 100.12550139790709,
            "extra": "median: 103.17ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 228.37952908000003,
            "unit": "ms",
            "range": 396.6866418975469,
            "extra": "median: 63.59ms"
          },
          {
            "name": "Total per-slice",
            "value": 11.926297788198108,
            "unit": "ms",
            "range": 20.457314239322763,
            "extra": "median: 9.05ms"
          },
          {
            "name": "Static slicing",
            "value": 11.225140506427664,
            "unit": "ms",
            "range": 20.372524836317524,
            "extra": "median: 8.35ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.6870837834334134,
            "unit": "ms",
            "range": 0.4210237808698608,
            "extra": "median: 0.62ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11160 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8973961730207582,
            "unit": "#",
            "extra": "std: 0.08572960788217562"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8564460343281113,
            "unit": "#",
            "extra": "std: 0.11535970153362557"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "127bc834a15a16930038f25587b54cb1422c9df4",
          "message": "Merge benchmark commits into one (#340)\n\nci, refactor: merge benchmark commits into one",
          "timestamp": "2023-09-21T12:24:40+02:00",
          "tree_id": "180c8b31c7e6d78169d1bd2523ee0a42008906da",
          "url": "https://github.com/Code-Inspect/flowr/commit/127bc834a15a16930038f25587b54cb1422c9df4"
        },
        "date": 1695293613097,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 10353.511371139999,
            "unit": "ms",
            "range": 7945.998317819517,
            "extra": "median: 7004.00ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 1954.34549752,
            "unit": "ms",
            "range": 86.96945974789051,
            "extra": "median: 1910.90ms"
          },
          {
            "name": "Normalize R AST",
            "value": 143.91832563999998,
            "unit": "ms",
            "range": 93.24623858689549,
            "extra": "median: 102.86ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 202.18744424000002,
            "unit": "ms",
            "range": 348.67995633062833,
            "extra": "median: 58.55ms"
          },
          {
            "name": "Total per-slice",
            "value": 11.269991689915706,
            "unit": "ms",
            "range": 19.271245102607832,
            "extra": "median: 8.51ms"
          },
          {
            "name": "Static slicing",
            "value": 10.675190389430906,
            "unit": "ms",
            "range": 19.197254445080794,
            "extra": "median: 7.92ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5808481126288867,
            "unit": "ms",
            "range": 0.37190554764486994,
            "extra": "median: 0.52ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11160 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8973961730207582,
            "unit": "#",
            "extra": "std: 0.08572960788217562"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8564460343281113,
            "unit": "#",
            "extra": "std: 0.11535970153362557"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "0fda4c49cd9e2b2191a1b15c137cd78cb08f52aa",
          "message": "[release:patch] Update xmldom Dependency and Benchmarking Support",
          "timestamp": "2023-09-24T14:13:29+02:00",
          "tree_id": "4ecc81b2e690ba8ac4f1912756542fa125261a27",
          "url": "https://github.com/Code-Inspect/flowr/commit/0fda4c49cd9e2b2191a1b15c137cd78cb08f52aa"
        },
        "date": 1695559899869,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 10167.26307336,
            "unit": "ms",
            "range": 7757.800306249087,
            "extra": "median: 7085.44ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 1922.82903474,
            "unit": "ms",
            "range": 92.0174433869226,
            "extra": "median: 1880.33ms"
          },
          {
            "name": "Normalize R AST",
            "value": 141.65425568,
            "unit": "ms",
            "range": 89.65148388641258,
            "extra": "median: 98.40ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 201.65686672,
            "unit": "ms",
            "range": 343.7900866082758,
            "extra": "median: 58.83ms"
          },
          {
            "name": "Total per-slice",
            "value": 11.122963729868514,
            "unit": "ms",
            "range": 19.02618842149997,
            "extra": "median: 8.40ms"
          },
          {
            "name": "Static slicing",
            "value": 10.547716197918898,
            "unit": "ms",
            "range": 18.9574394872282,
            "extra": "median: 7.82ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5621520540074592,
            "unit": "ms",
            "range": 0.3531758257800486,
            "extra": "median: 0.50ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11160 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8973961730207582,
            "unit": "#",
            "extra": "std: 0.08572960788217562"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8564460343281113,
            "unit": "#",
            "extra": "std: 0.11535970153362557"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "77159de13994c94d1a86ebf0db70c0a01067d372",
          "message": "[release:patch] CFG, N-Quads export",
          "timestamp": "2023-10-10T11:16:02+02:00",
          "tree_id": "4760f5664753b99fdb69e3d5675ba0cef3cf1140",
          "url": "https://github.com/Code-Inspect/flowr/commit/77159de13994c94d1a86ebf0db70c0a01067d372"
        },
        "date": 1696931420717,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 8034.84090942,
            "unit": "ms",
            "range": 9604.625289228263,
            "extra": "median: 4043.53ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 124.82507790000001,
            "unit": "ms",
            "range": 107.9293020348158,
            "extra": "median: 69.31ms"
          },
          {
            "name": "Normalize R AST",
            "value": 179.29568896,
            "unit": "ms",
            "range": 123.44694857133258,
            "extra": "median: 123.87ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 268.54568845999995,
            "unit": "ms",
            "range": 461.57700859286194,
            "extra": "median: 74.02ms"
          },
          {
            "name": "Total per-slice",
            "value": 13.623904308641448,
            "unit": "ms",
            "range": 23.262025184775986,
            "extra": "median: 10.29ms"
          },
          {
            "name": "Static slicing",
            "value": 12.85277434221828,
            "unit": "ms",
            "range": 23.13377314122338,
            "extra": "median: 9.52ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.7582018704904955,
            "unit": "ms",
            "range": 0.488770718926368,
            "extra": "median: 0.66ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11160 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8973961730207582,
            "unit": "#",
            "extra": "std: 0.08572960788217562"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8564460343281113,
            "unit": "#",
            "extra": "std: 0.11535970153362557"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "a13ba7d57c8f8ca264630109c56e1906e21c2066",
          "message": "[release:minor] Feature Extraction and CFG Export",
          "timestamp": "2023-10-15T08:56:06+02:00",
          "tree_id": "89e99a6cb66c08dc2c808dd798df9e888c88931c",
          "url": "https://github.com/Code-Inspect/flowr/commit/a13ba7d57c8f8ca264630109c56e1906e21c2066"
        },
        "date": 1697355095607,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 9217.97168212,
            "unit": "ms",
            "range": 11233.23134490305,
            "extra": "median: 4714.38ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 147.46538397999998,
            "unit": "ms",
            "range": 132.5895147714834,
            "extra": "median: 85.85ms"
          },
          {
            "name": "Normalize R AST",
            "value": 193.47818752,
            "unit": "ms",
            "range": 124.29041849585441,
            "extra": "median: 141.72ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 306.41368989999995,
            "unit": "ms",
            "range": 521.6767922234001,
            "extra": "median: 87.94ms"
          },
          {
            "name": "Total per-slice",
            "value": 16.16594832538752,
            "unit": "ms",
            "range": 26.82605591153744,
            "extra": "median: 11.98ms"
          },
          {
            "name": "Static slicing",
            "value": 15.202546042225746,
            "unit": "ms",
            "range": 26.638722260076488,
            "extra": "median: 11.02ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.9461226541249134,
            "unit": "ms",
            "range": 0.6094339586982859,
            "extra": "median: 0.88ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11316 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8987761232201357,
            "unit": "#",
            "extra": "std: 0.08614052435714427"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8582032343145828,
            "unit": "#",
            "extra": "std: 0.11575735009565753"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "1e9911dfb7b57bba9af2fbc21bb25b7b8a769b63",
          "message": "[release:patch] More Robust Server",
          "timestamp": "2023-10-18T14:31:58+02:00",
          "tree_id": "c4d6e9b11aa00ac6785f02ca584364bfdf5b52ab",
          "url": "https://github.com/Code-Inspect/flowr/commit/1e9911dfb7b57bba9af2fbc21bb25b7b8a769b63"
        },
        "date": 1697634674497,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 9713.11473926,
            "unit": "ms",
            "range": 11773.545244421579,
            "extra": "median: 4974.89ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 156.08280956000002,
            "unit": "ms",
            "range": 149.55703092829685,
            "extra": "median: 83.12ms"
          },
          {
            "name": "Normalize R AST",
            "value": 200.25081626,
            "unit": "ms",
            "range": 129.3982181467671,
            "extra": "median: 146.30ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 320.69478826,
            "unit": "ms",
            "range": 551.2570090540489,
            "extra": "median: 88.87ms"
          },
          {
            "name": "Total per-slice",
            "value": 16.852776720947936,
            "unit": "ms",
            "range": 28.85478957515023,
            "extra": "median: 12.31ms"
          },
          {
            "name": "Static slicing",
            "value": 15.851951991270107,
            "unit": "ms",
            "range": 28.621227875209645,
            "extra": "median: 11.36ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.9823377155343551,
            "unit": "ms",
            "range": 0.5882086964170495,
            "extra": "median: 0.89ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11316 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8987761232201357,
            "unit": "#",
            "extra": "std: 0.08614052435714427"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8582032343145828,
            "unit": "#",
            "extra": "std: 0.11575735009565753"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "ef6b5bc18f7145ba61f75b43ed973d5f961ce670",
          "message": "[release:patch] Include character counts in meta statistics",
          "timestamp": "2023-11-02T13:39:16+01:00",
          "tree_id": "48744a8fc8d41b2b0740b8b7b4ccf7b4ca9c388c",
          "url": "https://github.com/Code-Inspect/flowr/commit/ef6b5bc18f7145ba61f75b43ed973d5f961ce670"
        },
        "date": 1698930900376,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 8783.45502014,
            "unit": "ms",
            "range": 10738.891531340689,
            "extra": "median: 4452.32ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 136.40897754,
            "unit": "ms",
            "range": 126.93000424816188,
            "extra": "median: 66.48ms"
          },
          {
            "name": "Normalize R AST",
            "value": 186.37888664,
            "unit": "ms",
            "range": 124.71433128113007,
            "extra": "median: 137.21ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 289.51431136,
            "unit": "ms",
            "range": 482.3141635134121,
            "extra": "median: 86.46ms"
          },
          {
            "name": "Total per-slice",
            "value": 15.525487126197506,
            "unit": "ms",
            "range": 25.375808817534253,
            "extra": "median: 11.48ms"
          },
          {
            "name": "Static slicing",
            "value": 14.648966841272854,
            "unit": "ms",
            "range": 25.183235462545703,
            "extra": "median: 10.65ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.8578698127083991,
            "unit": "ms",
            "range": 0.6532316473694225,
            "extra": "median: 0.74ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11316 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8987761232201357,
            "unit": "#",
            "extra": "std: 0.08614052435714427"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8582032343145828,
            "unit": "#",
            "extra": "std: 0.11575735009565753"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "266b087710648b96b1779436aee32a0c47ac80cd",
          "message": "[release:patch] Robustness against encoding errors",
          "timestamp": "2023-11-03T20:54:13+01:00",
          "tree_id": "c245f343a8ef43765a4f36f2aad48763dc77d6b3",
          "url": "https://github.com/Code-Inspect/flowr/commit/266b087710648b96b1779436aee32a0c47ac80cd"
        },
        "date": 1699043094505,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 6628.01911806,
            "unit": "ms",
            "range": 7920.64451462989,
            "extra": "median: 3245.55ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 99.94474708,
            "unit": "ms",
            "range": 91.9298826769113,
            "extra": "median: 49.64ms"
          },
          {
            "name": "Normalize R AST",
            "value": 145.95498125999998,
            "unit": "ms",
            "range": 97.05366533791602,
            "extra": "median: 107.15ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 202.67506718,
            "unit": "ms",
            "range": 350.35799969129454,
            "extra": "median: 57.78ms"
          },
          {
            "name": "Total per-slice",
            "value": 11.209356158365976,
            "unit": "ms",
            "range": 19.217066969533313,
            "extra": "median: 8.28ms"
          },
          {
            "name": "Static slicing",
            "value": 10.588980339286781,
            "unit": "ms",
            "range": 19.12716492275005,
            "extra": "median: 7.68ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.6050062891914059,
            "unit": "ms",
            "range": 0.3596537358962295,
            "extra": "median: 0.54ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11316 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8987761232201357,
            "unit": "#",
            "extra": "std: 0.08614052435714427"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8582032343145828,
            "unit": "#",
            "extra": "std: 0.11575735009565753"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "243959c2f01ddf928c85ee4905105307971ad19b",
          "message": "[release:patch] Robustify Quad Export Against Cyclic Structures",
          "timestamp": "2023-11-10T18:59:51+01:00",
          "tree_id": "8e5af22f7b39483e95e62308330a5e9e002ba57a",
          "url": "https://github.com/Code-Inspect/flowr/commit/243959c2f01ddf928c85ee4905105307971ad19b"
        },
        "date": 1699640654242,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5419.399718899999,
            "unit": "ms",
            "range": 6111.491408384184,
            "extra": "median: 2837.80ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 85.22318365999999,
            "unit": "ms",
            "range": 79.41151212889127,
            "extra": "median: 46.48ms"
          },
          {
            "name": "Normalize R AST",
            "value": 113.45254984,
            "unit": "ms",
            "range": 69.72126242848063,
            "extra": "median: 83.08ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 164.38322226,
            "unit": "ms",
            "range": 279.00889908327076,
            "extra": "median: 48.09ms"
          },
          {
            "name": "Total per-slice",
            "value": 8.82827828085479,
            "unit": "ms",
            "range": 14.575511768060265,
            "extra": "median: 6.59ms"
          },
          {
            "name": "Static slicing",
            "value": 8.228727295296194,
            "unit": "ms",
            "range": 14.45423896853327,
            "extra": "median: 6.01ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5898725311439794,
            "unit": "ms",
            "range": 0.30780610835907124,
            "extra": "median: 0.55ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11316 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8987761232201357,
            "unit": "#",
            "extra": "std: 0.08614052435714427"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8582032343145828,
            "unit": "#",
            "extra": "std: 0.11575735009565753"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "c209d78300f23960363beb046efd2b07a0a5531d",
          "message": "[release:patch] Allow Strings as Names for Function Call Arguments",
          "timestamp": "2023-11-22T13:22:53+01:00",
          "tree_id": "a052c400e622d7062e4ff675a07f088883eaccee",
          "url": "https://github.com/Code-Inspect/flowr/commit/c209d78300f23960363beb046efd2b07a0a5531d"
        },
        "date": 1700657321110,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5464.289228619999,
            "unit": "ms",
            "range": 6098.39318648839,
            "extra": "median: 2862.32ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 86.76445109999999,
            "unit": "ms",
            "range": 77.45681339952834,
            "extra": "median: 48.72ms"
          },
          {
            "name": "Normalize R AST",
            "value": 113.78691086,
            "unit": "ms",
            "range": 69.64981912121678,
            "extra": "median: 81.94ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 166.90590034000002,
            "unit": "ms",
            "range": 285.57711744755056,
            "extra": "median: 46.13ms"
          },
          {
            "name": "Total per-slice",
            "value": 8.863963769870134,
            "unit": "ms",
            "range": 14.566635289387673,
            "extra": "median: 6.61ms"
          },
          {
            "name": "Static slicing",
            "value": 8.249822291669334,
            "unit": "ms",
            "range": 14.448470605228648,
            "extra": "median: 6.01ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.6040326772298797,
            "unit": "ms",
            "range": 0.31033593750624766,
            "extra": "median: 0.57ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11321 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.898713819973478,
            "unit": "#",
            "extra": "std: 0.08614825965194707"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8579790415512589,
            "unit": "#",
            "extra": "std: 0.11594939184257376"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "7cef37c8fb8e93c1e22647fa0efed2c1ddcf21a9",
          "message": "[release:patch] Quads With Repeated Edge Types",
          "timestamp": "2023-12-08T15:24:04+01:00",
          "tree_id": "e7a3ab3994be6ef3dfd8e8b13a4957bbfe0242b5",
          "url": "https://github.com/Code-Inspect/flowr/commit/7cef37c8fb8e93c1e22647fa0efed2c1ddcf21a9"
        },
        "date": 1702046953709,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5547.87590246,
            "unit": "ms",
            "range": 5808.9007657238435,
            "extra": "median: 3142.30ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 83.26392776,
            "unit": "ms",
            "range": 74.69286976317407,
            "extra": "median: 48.41ms"
          },
          {
            "name": "Normalize R AST",
            "value": 114.04236388,
            "unit": "ms",
            "range": 68.66664360803951,
            "extra": "median: 82.39ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 165.24087462,
            "unit": "ms",
            "range": 281.0471116203503,
            "extra": "median: 48.28ms"
          },
          {
            "name": "Total per-slice",
            "value": 8.55444112926569,
            "unit": "ms",
            "range": 14.175433877418497,
            "extra": "median: 6.35ms"
          },
          {
            "name": "Static slicing",
            "value": 8.023095687643547,
            "unit": "ms",
            "range": 14.039065545508109,
            "extra": "median: 5.86ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5223300878196391,
            "unit": "ms",
            "range": 0.27511931827473707,
            "extra": "median: 0.46ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11321 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.898713819973478,
            "unit": "#",
            "extra": "std: 0.08614825965194707"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8579790415512589,
            "unit": "#",
            "extra": "std: 0.11594939184257376"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "5d9e4d36fce917d72f382c8cc441ce576baf18a6",
          "message": "[release:patch] Using Next in RDF Quads",
          "timestamp": "2023-12-13T13:59:30+01:00",
          "tree_id": "c9aa3c29b811c7d73cc287b2a5f9e89f06951cd9",
          "url": "https://github.com/Code-Inspect/flowr/commit/5d9e4d36fce917d72f382c8cc441ce576baf18a6"
        },
        "date": 1702473795124,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5495.98474754,
            "unit": "ms",
            "range": 6144.791977946316,
            "extra": "median: 2917.26ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 87.9300398,
            "unit": "ms",
            "range": 82.31171038319312,
            "extra": "median: 47.12ms"
          },
          {
            "name": "Normalize R AST",
            "value": 116.14717965999999,
            "unit": "ms",
            "range": 71.95088143645037,
            "extra": "median: 86.06ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 167.8961487,
            "unit": "ms",
            "range": 286.86269934169644,
            "extra": "median: 48.72ms"
          },
          {
            "name": "Total per-slice",
            "value": 8.831731593745403,
            "unit": "ms",
            "range": 14.580007239439105,
            "extra": "median: 6.58ms"
          },
          {
            "name": "Static slicing",
            "value": 8.226681299611007,
            "unit": "ms",
            "range": 14.452727478186006,
            "extra": "median: 5.98ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5949460157048858,
            "unit": "ms",
            "range": 0.32814023555695415,
            "extra": "median: 0.56ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11321 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.898713819973478,
            "unit": "#",
            "extra": "std: 0.08614825965194707"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8579790415512589,
            "unit": "#",
            "extra": "std: 0.11594939184257376"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "c148955f1c3a57e08545baa6a94b58c9124b4613",
          "message": "[release:patch] Demo File for Presentations",
          "timestamp": "2024-01-04T09:31:14+01:00",
          "tree_id": "952d243e0eef028eb0fc52f25ccac831253d9f17",
          "url": "https://github.com/Code-Inspect/flowr/commit/c148955f1c3a57e08545baa6a94b58c9124b4613"
        },
        "date": 1704358482215,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5299.04631092,
            "unit": "ms",
            "range": 5949.936560017347,
            "extra": "median: 2829.15ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 83.68679132,
            "unit": "ms",
            "range": 73.7801235231147,
            "extra": "median: 45.86ms"
          },
          {
            "name": "Normalize R AST",
            "value": 114.06245784000001,
            "unit": "ms",
            "range": 68.14560113212112,
            "extra": "median: 83.72ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 163.93117192,
            "unit": "ms",
            "range": 280.35389486139917,
            "extra": "median: 45.01ms"
          },
          {
            "name": "Total per-slice",
            "value": 8.620094841233877,
            "unit": "ms",
            "range": 14.21744467164844,
            "extra": "median: 6.41ms"
          },
          {
            "name": "Static slicing",
            "value": 8.074770025618278,
            "unit": "ms",
            "range": 14.080844460663188,
            "extra": "median: 5.91ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.536541978843609,
            "unit": "ms",
            "range": 0.29920637505319564,
            "extra": "median: 0.48ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11321 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.898713819973478,
            "unit": "#",
            "extra": "std: 0.08614825965194707"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8579790415512589,
            "unit": "#",
            "extra": "std: 0.11594939184257376"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "4b9d841139c45af7a2e50de57bf454b4d98dcd34",
          "message": "[release:patch] Publish NPM to own namespace",
          "timestamp": "2024-01-04T16:44:38+01:00",
          "tree_id": "3af219dac7ab8e8aeff5ce9aaec1f1b45f9d32bb",
          "url": "https://github.com/Code-Inspect/flowr/commit/4b9d841139c45af7a2e50de57bf454b4d98dcd34"
        },
        "date": 1704384537083,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5630.90276288,
            "unit": "ms",
            "range": 6189.977079365194,
            "extra": "median: 3025.94ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 88.74249856,
            "unit": "ms",
            "range": 79.36546677463602,
            "extra": "median: 50.12ms"
          },
          {
            "name": "Normalize R AST",
            "value": 115.71117578,
            "unit": "ms",
            "range": 70.51500122311208,
            "extra": "median: 84.48ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 167.23523491999998,
            "unit": "ms",
            "range": 284.0799259585442,
            "extra": "median: 48.06ms"
          },
          {
            "name": "Total per-slice",
            "value": 8.964610417036198,
            "unit": "ms",
            "range": 14.770407700550463,
            "extra": "median: 6.76ms"
          },
          {
            "name": "Static slicing",
            "value": 8.327410223106314,
            "unit": "ms",
            "range": 14.653312758833414,
            "extra": "median: 6.11ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.6271384692131352,
            "unit": "ms",
            "range": 0.2941281386739033,
            "extra": "median: 0.60ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11321 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.898713819973478,
            "unit": "#",
            "extra": "std: 0.08614825965194707"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8579790415512589,
            "unit": "#",
            "extra": "std: 0.11594939184257376"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "2e17bd230fd0762e103508098f5fb1fa3d565d46",
          "message": "[release:patch] Update NPM Package Dependencies",
          "timestamp": "2024-01-13T14:09:36+01:00",
          "tree_id": "81a22dece7b6bc2454b2f78cc3dd742fa9b690fa",
          "url": "https://github.com/Code-Inspect/flowr/commit/2e17bd230fd0762e103508098f5fb1fa3d565d46"
        },
        "date": 1705152648795,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5067.11699072,
            "unit": "ms",
            "range": 6013.966295548738,
            "extra": "median: 2670.34ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 72.89874598,
            "unit": "ms",
            "range": 65.47213185510104,
            "extra": "median: 39.87ms"
          },
          {
            "name": "Normalize R AST",
            "value": 112.63807184000001,
            "unit": "ms",
            "range": 69.0681140265212,
            "extra": "median: 81.00ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 163.4963136,
            "unit": "ms",
            "range": 275.2982409802191,
            "extra": "median: 47.68ms"
          },
          {
            "name": "Total per-slice",
            "value": 8.727472260919003,
            "unit": "ms",
            "range": 14.4602468429054,
            "extra": "median: 6.54ms"
          },
          {
            "name": "Static slicing",
            "value": 8.21931140277668,
            "unit": "ms",
            "range": 14.341926068785162,
            "extra": "median: 6.04ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.4984137426920286,
            "unit": "ms",
            "range": 0.24500938778272444,
            "extra": "median: 0.44ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11321 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.898713819973478,
            "unit": "#",
            "extra": "std: 0.08614825965194707"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8579790415512589,
            "unit": "#",
            "extra": "std: 0.11594939184257376"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "816c844036b361042c26d2af07b4d092e66b46fb",
          "message": "[release:patch] Drop readlines/promises Dependency",
          "timestamp": "2024-01-15T23:29:47+01:00",
          "tree_id": "2383d566e88ea2e0dbe60dd73f7d7b92b3093407",
          "url": "https://github.com/Code-Inspect/flowr/commit/816c844036b361042c26d2af07b4d092e66b46fb"
        },
        "date": 1705359156307,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 5046.89271988,
            "unit": "ms",
            "range": 6042.128928598865,
            "extra": "median: 2559.91ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 73.85860644,
            "unit": "ms",
            "range": 69.28452321715349,
            "extra": "median: 37.89ms"
          },
          {
            "name": "Normalize R AST",
            "value": 114.01183648,
            "unit": "ms",
            "range": 69.33746165288669,
            "extra": "median: 81.81ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 163.82888334,
            "unit": "ms",
            "range": 279.6344141597903,
            "extra": "median: 47.81ms"
          },
          {
            "name": "Total per-slice",
            "value": 8.618077094909866,
            "unit": "ms",
            "range": 14.411839324447698,
            "extra": "median: 6.42ms"
          },
          {
            "name": "Static slicing",
            "value": 8.092352677712956,
            "unit": "ms",
            "range": 14.275084427627904,
            "extra": "median: 5.94ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5170374517553479,
            "unit": "ms",
            "range": 0.28554733887508554,
            "extra": "median: 0.46ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11321 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.898713819973478,
            "unit": "#",
            "extra": "std: 0.08614825965194707"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8579790415512589,
            "unit": "#",
            "extra": "std: 0.11594939184257376"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "EagleoutIce",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "d69018e52ccd36d2a4c6749a259bc7347a5c8a5d",
          "message": "[release:patch] npm for WebSocket Server",
          "timestamp": "2024-01-31T15:39:17+01:00",
          "tree_id": "e208ae0ae2bb451ea46ccc05df594033cd4f95bc",
          "url": "https://github.com/Code-Inspect/flowr/commit/d69018e52ccd36d2a4c6749a259bc7347a5c8a5d"
        },
        "date": 1706713172666,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Total per-file",
            "value": 3566.86774236,
            "unit": "ms",
            "range": 5920.286185213901,
            "extra": "median: 1072.56ms"
          },
          {
            "name": "Retrieve AST from R code",
            "value": 72.22227936,
            "unit": "ms",
            "range": 60.97026629229811,
            "extra": "median: 43.58ms"
          },
          {
            "name": "Normalize R AST",
            "value": 113.02594858,
            "unit": "ms",
            "range": 70.71306906384982,
            "extra": "median: 80.14ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 163.44175874,
            "unit": "ms",
            "range": 276.9623037407309,
            "extra": "median: 48.05ms"
          },
          {
            "name": "Run abstract interpretation",
            "value": 0.06162254,
            "unit": "ms",
            "range": 0.02971958909151336,
            "extra": "median: 0.06ms"
          },
          {
            "name": "Total per-slice",
            "value": 8.599255365044066,
            "unit": "ms",
            "range": 14.312877376595168,
            "extra": "median: 6.34ms"
          },
          {
            "name": "Static slicing",
            "value": 8.071953766135923,
            "unit": "ms",
            "range": 14.188089279803133,
            "extra": "median: 5.84ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.5187709959800451,
            "unit": "ms",
            "range": 0.27627204677573897,
            "extra": "median: 0.46ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 9,
            "unit": "#",
            "extra": "out of 11321 slices"
          },
          {
            "name": "times hit threshold",
            "value": 967,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.898713819973478,
            "unit": "#",
            "extra": "std: 0.08614825965194707"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8579790415512589,
            "unit": "#",
            "extra": "std: 0.11594939184257376"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "committer": {
            "email": "florian.sihler@uni-ulm.de",
            "name": "Florian Sihler",
            "username": "EagleoutIce"
          },
          "distinct": true,
          "id": "78da42c867266e8832933ba9bcd2e1bc3951d5f9",
          "message": "[release:patch] Dropping xmlparsedata, Benchmark Re-Runs, and Repl Fixes",
          "timestamp": "2024-03-17T22:21:47+01:00",
          "tree_id": "3f3bb3107a47ce4ffee7f569cb902e0c641dbe60",
          "url": "https://github.com/Code-Inspect/flowr/commit/78da42c867266e8832933ba9bcd2e1bc3951d5f9"
        },
        "date": 1710711452839,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Retrieve AST from R code",
            "value": 314.59240092,
            "unit": "ms",
            "range": 0,
            "extra": "median: 314.59ms"
          },
          {
            "name": "Normalize R AST",
            "value": 34.330948840000005,
            "unit": "ms",
            "range": 0,
            "extra": "median: 34.33ms"
          },
          {
            "name": "Produce dataflow information",
            "value": 183.7401157,
            "unit": "ms",
            "range": 0,
            "extra": "median: 183.74ms"
          },
          {
            "name": "Total per-file",
            "value": 3711.77919708,
            "unit": "ms",
            "range": 0,
            "extra": "median: 3711.78ms"
          },
          {
            "name": "Static slicing",
            "value": 8.640449953634949,
            "unit": "ms",
            "range": 14.893197269568514,
            "extra": "median: 6.26ms"
          },
          {
            "name": "Reconstruct code",
            "value": 0.49011368492753077,
            "unit": "ms",
            "range": 0.2360399526962079,
            "extra": "median: 0.44ms"
          },
          {
            "name": "Total per-slice",
            "value": 9.139501453399692,
            "unit": "ms",
            "range": 15.009902173338167,
            "extra": "median: 6.75ms"
          },
          {
            "name": "failed to reconstruct/re-parse",
            "value": 7,
            "unit": "#",
            "extra": "out of 988 slices"
          },
          {
            "name": "times hit threshold",
            "value": 298,
            "unit": "#"
          },
          {
            "name": "reduction (characters)",
            "value": 0.8935817303062389,
            "unit": "#",
            "extra": "std: 0.0919375252942165"
          },
          {
            "name": "reduction (normalized tokens)",
            "value": 0.8531248144961375,
            "unit": "#",
            "extra": "std: 0.11962978374069927"
          }
        ]
      }
    ]
  }
}