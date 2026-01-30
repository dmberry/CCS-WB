# IPL-V File Format Specification

## Overview

IPL-V (Information Processing Language V) is one of the earliest list processing programming languages, developed in the 1950s by Allen Newell, Cliff Shaw, and Herbert Simon at RAND Corporation and Carnegie Mellon University. The format represents assembly-like code for the JOHNNIAC computer, using a fixed-field punched card layout.

## Historical Context

- **Developed**: 1956-1958
- **Purpose**: Early AI research (Logic Theorist, General Problem Solver)
- **Significance**: Precursor to LISP, pioneered list processing and symbolic computation
- **Architecture**: Operated on linked list structures in memory

## File Format Structure

IPL-V uses a nine-field structure with fixed column positions inherited from 80-column punched card format.

### Field Layout

| Field | Columns | Width | Description |
|-------|---------|-------|-------------|
| **comments1** | 1-8 | 8 chars | Initial comment, label, or subroutine address |
| **type** | 9-13 | 5 chars | Operation type or comment continuation |
| **name** | 14-40 | 27 chars | Descriptive name/comment for human readers |
| **sign** | 41-45 | 5 chars | Address/label reference (e.g., "M54", "9-0") |
| **pq** | 46-50 | 5 chars | Primary operation code |
| **symb** | 51-55 | 5 chars | Secondary operation/link code |
| **link** | 56-60 | 5 chars | Additional linking information |
| **comments2** | 61-70 | 10 chars | Variable definitions and annotations |
| **id** | 71-80 | 10 chars | Unique line identifier |

### Column Position Reference

```
         1         2         3         4         5         6         7         8
12345678901234567890123456789012345678901234567890123456789012345678901234567890
[cmnt1 ][type][----name-----------------][sign][pq ][symb][link][--comments2][--id---]
```

## Field Descriptions

### 1. comments1 (Columns 1-8)

**Purpose**: Labels, subroutine addresses, or initial documentation

**Examples**:
- `     M54` - Main routine identifier
- `     9-100` - Subroutine label/address
- `        ` - Blank for continuation lines

**Usage**: Entry points for subroutines use this field for addressing

### 2. type (Columns 9-13)

**Purpose**: Operation type classification or comment continuation

**Examples**:
- ` ADD ` - Operation descriptor
- `00 SU` - Continuation of label from comments1
- `     ` - Blank when not needed

### 3. name (Columns 14-40)

**Purpose**: Human-readable description of operation

**Examples**:
- `TOTAL EXPRESSION (0) TO      `
- `SUBPROCESS, ADD SEGMENT (1)  `
- `TEST IF SIMPLE VARIABLE.     `

**Note**: This field can span multiple lines for complex descriptions. Register/variable references in parentheses indicate operands (e.g., `(0)`, `(1)`).

### 4. sign (Columns 41-45)

**Purpose**: Address or label reference for branching/linking

**Examples**:
- `  M54` - Reference to routine M54
- `  9-0` - Reference to address 9-0
- ` 9-100` - Subroutine address
- `     ` - Blank when no reference needed

### 5. pq (Columns 46-50)

**Purpose**: Primary operation code (the actual instruction)

**Examples**:
- `40W0 ` - Write operation to word 0
- `00J81` - Jump instruction
- `709-0` - Conditional operation
- `04J43` - Jump with condition code 43

**Format**: 
- First 2 digits: Operation class
- Next 1-2 characters: Operation modifier
- Last 1-2 characters: Operand or address

### 6. symb (Columns 51-55)

**Purpose**: Secondary operation code or symbolic link

**Examples**:
- `J30  ` - Jump to label 30
- `J33  ` - Jump to label 33
- `     ` - Blank when not needed

**Note**: Often contains jump targets or procedure exit points

### 7. link (Columns 56-60)

**Purpose**: Additional linking information or extended operands

**Examples**:
- Usually blank in the provided sample
- May contain chaining information for complex operations

### 8. comments2 (Columns 61-70)

**Purpose**: Variable definitions, register assignments, and annotations

**Examples**:
- `1W0=THMNAM` - Word 0 register assigned to THMNAM
- `1W1=MAP   ` - Word 1 register assigned to MAP
- `(0)=MEX   ` - Operand 0 refers to MEX

**Format**: Typically `register=name` or `(operand)=name`

### 9. id (Columns 71-80)

**Purpose**: Unique line identifier for source control and referencing

**Examples**:
- `M054R000` - Module 054, line 000
- `M054R010` - Module 054, line 010

**Format**: Usually `M[module][type][line]` where:
- `M` - Prefix indicating main code
- Three digits - Module number
- `R` - Record type
- Three digits - Sequential line number

## Parsing Guidelines

### Reading an IPL-V File

1. **Fixed-Width Reading**: Always read by column position, not by whitespace-delimited fields
2. **Line-by-Line Processing**: Each line is an independent record
3. **Context Sensitivity**: Some fields are only meaningful in context of the operation type

### Example Parsing Code (Python)

```python
def parse_iplv_line(line):
    """Parse a single line of IPL-V format"""
    # Ensure line is padded to 80 characters
    line = line.ljust(80)
    
    return {
        'comments1': line[0:8].rstrip(),
        'type': line[8:13].rstrip(),
        'name': line[13:40].rstrip(),
        'sign': line[40:45].rstrip(),
        'pq': line[45:50].rstrip(),
        'symb': line[50:55].rstrip(),
        'link': line[55:60].rstrip(),
        'comments2': line[60:70].rstrip(),
        'id': line[70:80].rstrip()
    }

def parse_iplv_file(filepath):
    """Parse an entire IPL-V file"""
    with open(filepath, 'r') as f:
        return [parse_iplv_line(line) for line in f]
```

### Example Parsing Code (AWK)

```bash
awk '{
    printf "comments1: [%s]\n", substr($0, 1, 8)
    printf "type:      [%s]\n", substr($0, 9, 5)
    printf "name:      [%s]\n", substr($0, 14, 27)
    printf "sign:      [%s]\n", substr($0, 41, 5)
    printf "pq:        [%s]\n", substr($0, 46, 5)
    printf "symb:      [%s]\n", substr($0, 51, 5)
    printf "link:      [%s]\n", substr($0, 56, 5)
    printf "comments2: [%s]\n", substr($0, 61, 10)
    printf "id:        [%s]\n", substr($0, 71, 10)
    printf "\n"
}' file.iplv
```

## Semantic Interpretation

### Operation Codes (pq field)

IPL-V operations manipulate list structures. Common patterns:

- **00Jxx**: Jump operations (conditional/unconditional)
- **xxWx**: Write to word/register operations
- **xxHx**: Hold/store operations
- **xxPx**: Test/predicate operations
- **70x**: Conditional operations (often paired with jump targets)

### Register References

- **1W0, 1W1, 1W2**: Word registers (temporary storage)
- **Comments2 field**: Documents what each register holds (e.g., `1W0=THMNAM`)

### Addressing Modes

- **Numeric labels**: `9-0`, `9-100`, `9-102` mark subroutine entry points
- **Symbolic labels**: `J30`, `J33` are jump targets within routines
- **Module references**: `M54` refers to module/routine 54

### Control Flow

Lines are processed sequentially unless:
- A jump operation (`00Jxx`) redirects execution
- A conditional (`70x-xxx`) branches based on test results
- A subroutine call transfers control to a label

## Common Patterns

### Subroutine Declaration

```
     9-100 SUBPROCESS, ADD SEGMENT (1)    9-100 04J43         1W0=THMNAMM054R070
                       TO MAP (0).              20W1          1W1=MAP   M054R080
```

- **comments1**: `9-100` declares the subroutine address
- **name**: Describes the subroutine purpose
- **sign**: Repeats address for clarity
- **pq**: Entry operation code
- **comments2**: Register assignments

### Conditional Branch

```
     TEST IF SIMPLE VARIABLE.                   00P8                    M054R100
        IF NO, CONTINUE DOWN MAP.               709-102                 M054R110
        IF YES, ADD THNAME.                     11W1                    M054R120
```

- **Line 1**: Test operation (`00P8`)
- **Line 2**: Conditional jump if test fails (`709-102`)
- **Line 3**: Operation if test succeeds (`11W1`)

### Jump and Return

```
     INSERT NAME AND QUIT.                      00J64   J33             M054R170
```

- **pq**: `00J64` - Jump operation
- **symb**: `J33` - Target label (return point)

## Processing Recommendations

### Data Structure Representation

Consider representing parsed IPL-V code as:

1. **Sequential list**: Preserves original line order
2. **Symbol table**: Maps labels to line numbers
3. **Control flow graph**: Shows branching relationships
4. **AST**: Abstract syntax tree for semantic analysis

### Validation Checks

When parsing IPL-V files, validate:

1. **Line length**: Should be ≤80 characters
2. **ID uniqueness**: Each line ID should be unique
3. **Label references**: All jumps should target defined labels
4. **Register consistency**: Check register assignments match usage

### Common Errors

- **Off-by-one errors**: Remember column positions are 1-indexed
- **Trailing whitespace**: Don't strip whitespace before parsing
- **Empty fields**: Distinguish between blank and missing fields
- **Multi-line comments**: Name field may span multiple lines contextually

## Example Interpretation

Let's interpret these lines:

```
     M54 ADD TOTAL EXPRESSION (0) TO      M54   40W0                    M054R000
        MAP OF TRUE EXPRESSIONS (1).            60W0          1W0=THMNAMM054R010
```

**Line 1 breakdown**:
- **Purpose**: Entry point for routine M54
- **Operation**: Write expression (0) using operation `40W0`
- **Target**: Reference to M54
- **Effect**: Initialize adding expression to map

**Line 2 breakdown**:
- **Purpose**: Continuation of operation description
- **Operation**: Write to word 0 using operation `60W0`
- **Documentation**: Register W0 holds THMNAM (the name)
- **Effect**: Store the map reference in register

## Tools and Utilities

### Suggested Processing Tools

1. **Text editors**: Fixed-width font essential (Courier, Monaco)
2. **Column rulers**: Display at positions 8, 13, 40, 45, 50, 55, 60, 70, 80
3. **Syntax highlighting**: Custom rules for operation codes and labels
4. **Diff tools**: Column-aware diff for comparing versions

### Conversion Utilities

When converting IPL-V to modern formats:

- Preserve column structure in intermediate representations
- Document register allocation and usage
- Map operation codes to semantic operations
- Track control flow through labels and jumps

## Further Reading

- Newell, A., Shaw, J.C., and Simon, H.A. (1957). "Empirical Explorations of the Logic Theory Machine"
- Newell, A., and Shaw, J.C. (1957). "Programming the Logic Theory Machine"
- Newell, A., Tonge, F.M., et al. (1961). "Information Processing Language-V Manual"

## Notes on This Format

This documentation is based on analysis of the M54 module sample. Different IPL-V implementations or periods may have slight variations in:

- Column positions (particularly for later fields)
- Operation code mnemonics
- Comment conventions
- Label formats

Always verify format assumptions against the specific IPL-V variant being processed.
