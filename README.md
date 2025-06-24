# SigbladFilum Official Documentation v1.0

## 📊 Options

* Name: **SigbladFilum**
* Type: Spreadsheet-based programming language
* Starting Position: **A1** cell
* Lightweight, similar to esoteric languages
* State Storage: No variables, cells hold values

---
## SigbladFilum Philosophy

SigbladFilum is a spreadsheet-based programming language composed solely of cell-based commands and explicit control flow, without complex abstractions or variable concepts.
This language is based on the following six philosophies:

1. **Simplicity First**
   - Exclude complex syntax.
   - One command per cell, with explicitly specified flow.

2. **Intuitive Execution Flow**
   - The execution order follows what is written in the cells.
   - A flow that can be traced by eye is paramount.

3. **The Cell is Everything**
   - SigbladFilum has no separate structures like variables, memory, or output areas.
   - All storage, output, and state representation are done directly through cells.
   - A single cell is at once code, value, record, and result.

4. **Executed Cells are the Past**
   - Execution proceeds and moves on without initialization.
   - Even after execution ends, the current state of all cells is preserved.

5. **What You See Is All There Is**
   - There are no hidden logics or implicit rules.
   - Everything must be specified in the cells.

6. **Creativity from Simplicity**
   - **Within an extremely simplified environment**, users combine cells to create innovative flows and results.
   - SigbladFilum does not allow for complexity, but its very simplicity is the starting point for infinite possibilities.

---

## ✨ Language Syntax

In **SigbladFilum**, each cell contains a single command, and most commands specify the next cell to execute, creating a linked structure. By default, cells are not editable during execution.

The exact command format is:

```
<command(arguments)> [next_cell]
```

---

## ⚖️ Basic Command Specification

| Command  | Format | Description |
|-----------|--------|--------|
| `change` | `change(cell, "value") [next]`<br>`change(cell1, cell2) [next]` | Write a value to a cell / Copy another cell's value. |
| `if`     | `if(cell) [true_loc], [false_loc]` | If the cell's expression evaluates to true, go to [true_loc]; otherwise, go to [false_loc]. |
| `goto`   | `goto [cell]` | Unconditionally jump to the specified cell. |
| `input`  | `input(cell) [next]` | Makes the cell available for user input. |
| `wait`   | `wait(milliseconds) [next]` | Wait for the specified time (ms) before moving to the next cell. |
| `end`    | `end` | Terminate the program. |

## ⚖️ Basic Operation Specification

SigbladFilum uses a simple expression-based syntax to perform basic operations within cells. Operations are mainly used in the arguments of `change` and `if` commands, following these forms and rules.

### 📌 Supported Operators List

| Operator | Description | Example |
|--------|--------------------|------------------------------|
| `+`    | Number addition / String concatenation | `A1 + 5`, `"Hi" + B1`       |
| `-`    | Number subtraction | `10 - A2`                    |
| `*`    | Number multiplication / String repetition | `A1 * 3`, `"*"` `*` `4`     |
| `/`    | Integer division (floor) | `A1 / 2`                     |
| `=`    | Value comparison (equal) | `A1 = "5"`                   |
| `!=`   | Value comparison (not equal) | `A1 != B1`                   |
| `<`    | Comparison (less than) | `A1 < 10`                    |
| `>`    | Comparison (greater than) | `B2 > A3`                    |

---

### ⚠️ Data Type Rules for Operations

- `+`
  - Number + Number → Addition
  - If a string is involved → String concatenation (`"Hi" + 3` → `"Hi3"`)

- `-`, `/`
  - Only possible with Number + Number.
  - **Error occurs** if a string is included.

- `*`
  - Number × Number → Multiplication
  - String × Number → String repetition
    (e.g., `"a" * 3` → `"aaa"`)
  - Other combinations **cause an error**.

- Comparison (`=`, `!=`, `<`, `>`)
  - Can compare both numbers and strings.
  - `"5" = 5` is **false**.
  - `"a" < "b"` is a lexicographical comparison.

---


### ➖ Expression Structure Limitation

To maintain its philosophy of simplicity, SigbladFilum allows **only one operation at a time**.

- ✅ Allowed examples:
  - `5 + 3`
  - `B2 - B5`
  - `"*" * 5`

- ❌ Not allowed:
  - `3 + 5 + B2`
  - `B4 - B5 / 2`
  - `(A1 + A2) * 3`

Therefore, **all expressions must contain only a single binary operator (`+, -, *, /, =, !=, <, >`)**, and do not support nested calculations, order of operations, or parentheses.

If complex calculations are needed, you must **sequentially store intermediate results in separate cells**, breaking down the steps across multiple cells.

---

### 🛑 Error Handling Rules

- Execution **stops immediately** if any of the following occurs during an operation:
  - Reference to an undefined cell.
  - Invalid operator combination (e.g., `"a" - 1`).
  - Syntax error.
- The program halts, and subsequent cells are not executed.
- Error messages can be displayed in the external UI but are not saved to the sheet.


## 🧪 Examples

> The tables below show only the commands recorded in the **initial sheet**. The cell containing the final result is described in the example explanation. Cells whose values change during the process are not included in the table.

### Example 1 – Value Copy

|     | A                                   | B | C |
|-----|-------------------------------------|---|---|
| 1   | `change(B1, "Hello") [A2]`         |   |   |
| 2   | `change(A1, B1) [A3]`               |   |   |
| 3   | `end`                               |   |   |

*Result in cell `A1` after execution ⇒ `Hello`*

---

### Example 2 – Conditional Branch

|     | A                                        | B | C |
|-----|------------------------------------------|---|---|
| 1   | `if(B3) [A2], [A3]`                      |   |   |
| 2   | `change(C1, "True") [A4]`                |   |   |
| 3   | `change(C1, "False") [A4]`               | `B1 = 4` |
| 4   | `end`                                    |   |   |

*Before running, enter a `desired number` in cell `B1`. Check the result in cell `C1` after execution.*

---

### Example 3 – Print 5 stars by repeating 5 times

|     | A                                              | B | C |
|-----|------------------------------------------------|---|---|
| 1   | `change(B2, "5") [A2]`                        |   |   |
| 2   | `change(B3, "B2 = 0") [A3]`                   |   |   |
| 3   | `change(B4, B1 + "*") [A4]`                   |   |   |
| 4   | `if(B3) [A6], [A5]`                            |   |   |
| 5   | `change(B1, B4) [A7]`                          |   |   |
| 6   | `end`                                          |   |   |
| 7   | `change(B2, B2 - 1) [A3]`                      |   |   |

*Before running, enter `5` in cell `B2` (counter) and an empty string in cell `B1` (output target). Result in cell `B1` after execution ⇒ `*****`*



### Example 4 – Wait 1 second after input, then output; terminate on `quit`

|     | A                                                    | B | C |
|-----|------------------------------------------------------|---|---|
| 1   | `input(B1) [A2]`                                     |   |   |
| 2   | `change(B3, "B1 = "quit"") [A3]`                |   |   |
| 3   | `if(B3) [A7], [A4]`                                  |   |   |
| 4   | `wait(1000) [A5]`                                    |   |   |
| 5   | `change(C1, B1) [A6]`                                |   |   |
| 6   | `goto [A1]`                                          |   |   |
| 7   | `end`                                                |   |   |

*If the user enters a string other than `quit`, it is copied to cell `C1` after 1 second. If `quit` is entered, the program terminates.* 