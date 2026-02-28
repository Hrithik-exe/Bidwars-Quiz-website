# Implementation Plan

## Bug 1: Wheel Text Horizontal Instead of Radial

- [x] 1. Write bug condition exploration test for text readability
  - **Property 1: Fault Condition** - Wheel Text Horizontal Rotation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate text appears horizontal instead of radially aligned
  - **Scoped PBT Approach**: Scope the property to wheel rendering with any number of segments
  - Test that wheel segment text has rotate(90deg) transform on UNFIXED code
  - Test that text should be radially aligned (rotate(0deg) or no rotation) for readability
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "text transform includes rotate(90deg) making text perpendicular to segment")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1_

- [x] 2. Write preservation property tests for text readability fix (BEFORE implementing fix)
  - **Property 2: Preservation** - Wheel Spinning and Selection Mechanics
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for wheel spinning animation, timing, easing, and topic selection
  - Write property-based tests capturing observed spinning behavior patterns
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1_

- [x] 3. Fix wheel text rotation in CSS

  - [x] 3.1 Implement the text rotation fix
    - Open `bidding-quiz/styles.css` and locate `.wheel-segment-text` class (line ~1000)
    - Change transform from `translateX(-50%) rotate(90deg)` to `translateX(-50%) rotate(0deg)` or simply `translateX(-50%)`
    - This removes the 90-degree rotation that makes text horizontal
    - Text will now align radially with the segment direction
    - _Bug_Condition: isBugCondition(input, 'text-readability') where textTransform includes rotate(90deg)_
    - _Expected_Behavior: textIsRadiallyAligned(result) AND NOT result.textTransform.includes('rotate(90deg)')_
    - _Preservation: Wheel spinning animation, timing, easing, and topic selection must remain unchanged_
    - _Requirements: 2.1, 3.1_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Wheel Text Radial Alignment
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Wheel Spinning Mechanics
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm wheel spinning, animation, and topic selection still work correctly

- [x] 4. Checkpoint - Ensure text readability tests pass
  - Ensure all tests for Bug 1 pass, ask the user if questions arise

## Bug 2: Unequal Wheel Segments Due to Hardcoded Angles

- [x] 5. Write bug condition exploration test for unequal segments
  - **Property 1: Fault Condition** - Hardcoded 36-Degree Angles
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate segments use hardcoded 36-degree spacing
  - **Scoped PBT Approach**: Scope the property to wheel rendering with segment counts != 10
  - Test that wheel segments use `index * 36` rotation on UNFIXED code
  - Test that segments should use `index * (360 / segmentCount)` for equal spacing
  - Run test on UNFIXED code with 8 segments (should show 36-degree spacing instead of 45 degrees)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "8 segments use 36-degree spacing causing overlap/gaps instead of 45 degrees")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.2_

- [x] 6. Write preservation property tests for segment angle fix (BEFORE implementing fix)
  - **Property 2: Preservation** - Wheel Rendering and Animation
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for wheel rendering, spinning animation, and visual appearance
  - Write property-based tests capturing observed rendering behavior patterns
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1_

- [x] 7. Fix wheel segment angle calculation

  - [x] 7.1 Implement the dynamic angle calculation
    - Open `bidding-quiz/js/wheel.js` and locate the `render()` method (line 138-176)
    - Line 151: Change `style="transform: rotate(${index * 36}deg)"` to `style="transform: rotate(${index * (360 / TOPICS.length)}deg)"`
    - Locate `renderWithUsedTopics()` method (line 207): Apply same fix to replace hardcoded `index * 36`
    - Locate `renderWithPlayerNames()` method: Check and fix any hardcoded angle calculations
    - This ensures equal segments for any number of topics or players
    - _Bug_Condition: isBugCondition(input, 'unequal-segments') where angleCalculation == 'index * 36' AND segmentCount != 10_
    - _Expected_Behavior: segment.angle == (360 / segmentCount) * segment.index for all segments_
    - _Preservation: Wheel spinning animation, timing, and topic selection must remain unchanged_
    - _Requirements: 2.2, 3.1_

  - [x] 7.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Equal Wheel Segments
    - **IMPORTANT**: Re-run the SAME test from task 5 - do NOT write a new test
    - The test from task 5 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 5
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.2_

  - [x] 7.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Wheel Rendering
    - **IMPORTANT**: Re-run the SAME tests from task 6 - do NOT write new tests
    - Run preservation property tests from step 6
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm wheel rendering and animation still work correctly

- [x] 8. Checkpoint - Ensure segment angle tests pass
  - Ensure all tests for Bug 2 pass, ask the user if questions arise

## Bug 3: Admin Controls Not Appearing for Room Creators

- [x] 9. Write bug condition exploration test for admin controls
  - **Property 1: Fault Condition** - Missing Admin Controls for Existing Admins
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate admin controls don't appear when isAdmin is true
  - **Scoped PBT Approach**: Scope the property to game interface rendering where isAdmin === true
  - Test that admin controls are NOT visible on UNFIXED code when isAdmin is true
  - Test that admin controls SHOULD be visible when isAdmin is true
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "isAdmin is true but admin controls are not displayed")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.3_

- [x] 10. Write preservation property tests for admin controls fix (BEFORE implementing fix)
  - **Property 2: Preservation** - Admin Login Flow for Non-Admins
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-admin users (isAdmin === false)
  - Write property-based tests capturing observed admin login form display and authentication flow
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.2, 3.4_

- [x] 11. Fix admin controls display logic

  - [x] 11.1 Implement the else block for admin controls
    - Open `bidding-quiz/js/app.js` and locate `_renderGameInterface()` method (line 195-270)
    - Find the if block that checks `!this.isAdmin` (around lines 238-252)
    - After the closing brace on line 252, add an else block:
      ```javascript
      } else {
        // User is already admin - show admin controls immediately
        this._showAdminControls();
      }
      ```
    - This ensures existing admins see controls automatically without requiring login
    - _Bug_Condition: isBugCondition(input, 'admin-controls') where isAdmin === true AND adminControlsVisible === false_
    - _Expected_Behavior: adminControlsVisible(result) when isAdmin is true_
    - _Preservation: Admin login form display and authentication flow for non-admin users must remain unchanged_
    - _Requirements: 2.3, 3.2, 3.4_

  - [x] 11.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Admin Controls Auto-Display
    - **IMPORTANT**: Re-run the SAME test from task 9 - do NOT write a new test
    - The test from task 9 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 9
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.3_

  - [x] 11.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Admin Login Flow
    - **IMPORTANT**: Re-run the SAME tests from task 10 - do NOT write new tests
    - Run preservation property tests from step 10
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm non-admin users still see login form and authentication works correctly

- [x] 12. Checkpoint - Ensure admin controls tests pass
  - Ensure all tests for Bug 3 pass, ask the user if questions arise

## Bug 4: Incorrect Indentation on Line 252

- [x] 13. Write bug condition exploration test for indentation
  - **Property 1: Fault Condition** - Incorrect Indentation Spacing
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate line 252 has 10 spaces instead of 6
  - **Scoped PBT Approach**: Scope the property to line 252 in app.js
  - Test that line 252 has 10 spaces of indentation on UNFIXED code
  - Test that line 252 should have 6 spaces to match code block structure
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "line 252 has 10 spaces instead of 6 spaces")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.4_

- [x] 14. Write preservation property tests for indentation fix (BEFORE implementing fix)
  - **Property 2: Preservation** - JavaScript Execution
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for all JavaScript execution in app.js
  - Write property-based tests capturing observed execution behavior
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.5_

- [x] 15. Fix indentation on line 252

  - [x] 15.1 Implement the indentation correction
    - Open `bidding-quiz/js/app.js` and locate line 252
    - Change the closing brace indentation from 10 spaces to 6 spaces
    - Line 252: `          }` (10 spaces) should become `      }` (6 spaces)
    - This matches the indentation of the if statement opening
    - _Bug_Condition: isBugCondition(input, 'indentation') where lineNumber == 252 AND indentationSpaces == 10_
    - _Expected_Behavior: indentationSpaces == 6 on line 252_
    - _Preservation: All JavaScript execution and functionality must remain unchanged_
    - _Requirements: 2.4, 3.5_

  - [x] 15.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Indentation
    - **IMPORTANT**: Re-run the SAME test from task 13 - do NOT write a new test
    - The test from task 13 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 13
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.4_

  - [x] 15.3 Verify preservation tests still pass
    - **Property 2: Preservation** - JavaScript Execution
    - **IMPORTANT**: Re-run the SAME tests from task 14 - do NOT write new tests
    - Run preservation property tests from step 14
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all code in app.js executes correctly after indentation fix

- [x] 16. Checkpoint - Ensure indentation tests pass
  - Ensure all tests for Bug 4 pass, ask the user if questions arise

## Final Integration Testing

- [x] 17. Run full integration tests
  - Test full game flow with wheel spinning after text alignment fix
  - Test admin creating room and seeing controls immediately without login
  - Test non-admin joining room and using admin login flow
  - Test wheel with different numbers of players and topics to verify equal segments
  - Test that all admin controls work after adding else block
  - Verify all four bugs are fixed and no regressions introduced

- [x] 18. Final checkpoint - All tests pass
  - Ensure all tests pass across all four bug fixes
  - Ask the user if questions arise or if ready to proceed with implementation
