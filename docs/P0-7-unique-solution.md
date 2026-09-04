# P0-7 Unique Solution

A candidate is valid only when its region map satisfies the singleton limit and orthogonal connectivity rules, and the base solver finds exactly one solution under the row, column, region, and 8-neighbor constraints.

The validator requests a solution-count cap of 2 so it can distinguish zero, unique, and multiple solutions without enumerating unnecessary solutions.
