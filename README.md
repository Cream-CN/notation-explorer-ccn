#NE-CCN README FILE
MY EMAIL: creamgoogologycn@outlook.com
QQ GROUP: 778469244

CHANGELOG VERSION 1.2
- ADD DBMS
- ADD OTHER PPS VERSION
- Optimization of legal issues and licensing structures have been carried out.

CHANGELOG VERSION 1.1
- Restored badges removed from upstream
- Optimized badge display
- Updated CSS

CHANGELOG VERSION TEST 1.0
- CREATE THIS Repo. FORKED FROM hypcos/notation-explorer
- ADD SOME UNDOED NOTATION

----------------------------------------------------------------------------------------------------------
FORKED FROM: hypcos/notation-explorer
CODE FROM: hypcos/notation-explorer, smilelee-lyx/notation-explorer, projectcf/notation-explorer
NE (CREAM-CN)

Usage: Same as hypcos/notation-explorer

Specification

Full Specification for Operations Between Functions

This specification defines the interface contract for each notation object in the registry, as well as how the framework (framework.js) uses these functions to build expression trees, perform fundamental sequence expansion, and display tooltips. Adhering to this specification ensures that new notations integrate seamlessly with the UI and logic.

Registry Entry Structure

Each notation is registered via register.push({ ... }). The object contains the following fields:
id (string, required): Unique identifier, also used as the Vue component name (id + '-list').
name (string, required): Display name shown on the tab.
display (function, required): Converts an expression to an HTML string (may contain <sup> and other tags) for display.
able (function, required): Determines whether an expression is a limit ordinal (i.e., needs expansion).
compare (function, required): Compares two expressions, returning -1 (less than), 0 (equal), or 1 (greater than).
FS (function, required): Fundamental sequence expansion function, returns the n-th term (n is a non-negative integer).
FSalter (function, optional): Alternative expansion method, signature identical to FS, typically used when the Shift key is held.
init (function, required): Returns the initial dataset (list) used to build the root node.
semiable (function, optional): Determines whether an expression is a semi-limit, used only in expand_tier for additional control.

Detailed Contract for Each Function

2.1 display(expr) -> string
Purpose: Renders an expression as a readable HTML string.
Contract:
- For the special value Infinity (pseudo-limit), typically displays as 'Limit'.
- May contain HTML tags but should not include interactive elements.
- Output should be stable and unique; when used as a cache key, the same expression must always produce the same string.

2.2 able(expr) -> boolean
Purpose: Determines whether expr is a limit (its fundamental sequence is strictly increasing and FS(expr, 0) is less than expr).
Contract:
- Returns true only when the framework should allow expansion of that node.
- Non-limits (successors, 0, etc.) return false.
- Infinity is generally treated as a limit and returns true.

2.3 compare(a, b) -> -1 | 0 | 1
Purpose: Total order comparison of two expressions.
Contract:
- Must satisfy transitivity and antisymmetry.
- Return -1 means a < b, 0 means equal, 1 means a > b.
- Infinity should be treated as the maximum element (greater than any non-infinite expression).
- Used in FSbounded to find the first FS term greater than low[0].

2.4 FS(expr, n) -> expr
Purpose: Computes the n-th fundamental sequence element of expression expr (n is a non-negative integer).
Contract:
- If expr is not a limit (able returns false), behavior is undefined (should not be called).
- Must satisfy fundamental sequence properties: FS(expr, n) is strictly less than expr, and monotonically increases as n increases.
- For Infinity, should return the n-th term of its canonical limit sequence.
- Return type must be consistent with the type defined in init, and comparable via compare.
- The framework typically caches results by expression string, but implementers may manage internal caching themselves.

2.5 FSalter(expr, n) -> expr (optional)
Purpose: Alternative fundamental sequence expansion, typically used in "full expansion" mode.
Contract:
- Signature is exactly the same as FS.
- When the user clicks expand while holding the Shift key, the framework will call FSalter if it exists.
- Typical difference: FS may return a truncated expression (removing the last element), while FSalter returns the full expansion.
- If not provided, FS will be used in all scenarios.

2.6 init() -> [ item, item, ... ]
Purpose: Returns the initial list of expressions as the root nodes for this notation.
Contract:
- Each item is an object: { expr, low, subitems }.
- expr: the expression value.
- low: an array (usually only low[0] is used) that serves as the lower bound for FSbounded; must be strictly less than expr.
- subitems: initially empty, dynamically populated by the framework.
- The list is sorted in ascending order (according to compare), and typically includes Infinity (limit) and 0 (or the minimum element).

2.7 semiable(expr) -> boolean (optional)
Purpose: Determines whether an expression is a "semi-limit".
Contract:
- If not provided, defaults to returning false.
- In expand_tier, if semiable(expr) is true, even if able is false, one expansion may be performed (provided compare(FS(expr, 0), low[0]) > 0).
- Used for terms that are not limits but still allow special expansion.

Expansion Flow (Collaboration Between Functions)

The framework's expansion logic is located in the Vue component methods in framework.js.

3.1 User Interaction Triggers
- Mouse hover: Triggers recalculate, displaying the FS sequence.
- Mouse click (press): Triggers expand, generating child nodes based on the current tier and extra_FS.

3.2 recalculate Flow
1. Checks able(expr); if not a limit, no action.
2. Determines which FS function to use: if event.shiftKey and FSalter exists, use FSalter; otherwise use FS.
3. For n = 0 to FS_shown (UI-controlled value), compute FS(expr, n), convert to HTML via display, and show in the tooltip.

3.3 expand Flow (Core)
The framework performs one expansion, inserting new nodes into subitems.
a) Expanding "extra" items (extra_FS)
- If extra_FS > 0, repeatedly call FSbounded (see below), inserting results at the front of item.subitems, and update item.low[0] to the latest term.
- Purpose: Before the main expansion, advance to a term sufficiently close to the limit, reducing the number of levels.
b) Tiered Expansion (tier)
- Based on the tier value (0~8, etc.), recursively execute expand_tier:
  - If the current item is expandable (able is true, or semiable allows it), call FSbounded to obtain the first "meaningful" expansion term (i.e., compare(FS(expr, n), low[0]) > 0).
  - Generate a new node and insert it after the current item (or within its children, depending on the tier).
  - Decrement tier and recursively process the new node (if tier > 0).
- Expansion results are displayed in the list via display.

3.4 FSbounded Helper Function (Framework Internal)
FSbounded = function(FS, compare, seq, low) {
    let n = 0;
    loop:
        res = FS(seq, n);
        if (compare(res, low[0]) > 0) return res;
        else n++, continue loop;
}
Purpose: Finds the first FS term greater than low[0], ensuring the new expansion term is the "meaningful" minimal term.
When n is small, it may return a value equal to or less than low[0]; the function automatically increments n until the condition is satisfied.

Caching and Performance Considerations
- The framework does not enforce caching of results, but implementers may use internal data structures (e.g., a data object) to store already-computed FS sequences for improved repeated access performance.
- FS and FSalter should be as pure as possible (same input yields same output) so that the framework's display-string-based caching mechanism works effectively.
- If expressions include Infinity, ensure FS(Infinity, n) returns a limit sequence consistent with the one defined in init.

Initialization and Item Structure Example
Example of the item structure returned by init:
   [
      { 
        expr: [[Infinity]], low: [[]], subitems: [] },
      { expr: [], low: [[]], subitems: [] }
   ]
- expr: the current expression (any type, but must be handled by display, compare, FS, etc.).
- low: an array, usually only low[0] is used; must be an expression strictly less than expr.
- subitems: child items dynamically populated by the framework (recursive structure).
Important constraint: all expression comparisons must go through the compare function, and compare must be consistent with the string produced by display (for cache keys).

Error Handling and Edge Cases
- If able(expr) is true but FS returns a term not less than expr (violating the fundamental sequence property), FSbounded may loop indefinitely. Implementers must guarantee the property holds.
- If FSalter is not provided, the framework will use FS as a fallback.
- The semiable use case is special; implementers should consult the notation's definition carefully and provide it only when necessary.

Checklist for Developing a New Notation
- The script should be placed in the Notation directory.
- Determine the data type: choose the internal representation for expressions (array, number, string, etc.).
- Implement compare: ensure a total order consistent with the mathematical definition.
- Implement display: produce clear HTML representation.
- Implement able: correctly identify limits.
- Implement FS: compute the fundamental sequence; consider whether FSalter is needed (if two expansion modes are desired).
- Implement init: define the root nodes (including limit, zero, etc.).
- Optionally implement semiable: if the notation has a semi-limit concept.
- Test: verify that FS(expr, n) is monotonically increasing and less than expr, and that FSbounded terminates.
- Register: include the new script file in index.html.