# Project progress

Plan: docs/project-plan.md. Scope: the final project requirements, including customer accounts/search/reservations/saved itineraries, admin-only trip and customer management, and all SDD sections.

Pre-flight: server User.role and active status feed API authorization and Angular token roles. Public MVC controllers consume the same JSON API. Reservation snapshots store the booked price/date independently of later trip edits. Angular management screens consume the existing customer and reservation endpoints; no direct browser database connection is introduced.

Tasks 1–2: Seven server integration scenarios passed for role separation, search, reservations, snapshots, customer management, ownership, and public CSRF/login forms. Further browser and final-suite checks remain.

Task 2 regression: non-ASCII CSRF input reproduced HTTP 500 due to unequal byte lengths. Restrict submitted tokens to the actual ASCII token format before constant-time comparison. The full server suite passed 32/32 using `node --test --test-concurrency=1 test/*.test.js`.

Task 3: Red browser checks confirmed unguarded anonymous administration and missing location inputs/customer screens. Implemented role-aware Angular guards/login/navigation, ManagementService, CustomerManagementComponent, ReservationManagementComponent, and shared location/category trip fields. Three project flow tests passed after implementation. The phone viewport check then reproduced 457px content on a 375px screen; removing the fixed content padding and narrowing the HBS body passed all four project scenarios.

Task 3 regression: The full browser suite exposed logout staying on the same private route and Cancel allowing a delayed login response when the guard reused the login component. Logout now navigates directly to login; Cancel explicitly unsubscribes the pending request. The full browser rerun passed 11/11.

Task 3 API checks: The final project Postman collection passed 37 requests and 55 assertions, covering customer/admin denial, authenticated trip CRUD, search, owner-only itinerary access, reservation persistence/status, and customer management.

Task 4: Final SDD generated from the Milestone Two document, preserving the course component diagram and revision history. All template sections are filled; current sequence/class diagrams, 16 API entries, UI comparison/test process, and added-trip/edit/update screenshots are included. Render review found excess empty spacing and an association line crossing its caption; regeneration removes them. Final page inspection remains.

Task 5 checks: Full `npm test` passed 34/34, including local admin provisioning and account deactivation. Angular build passed (598.07 kB initial bundle warning; below 1 MB error limit), and Chrome Headless unit tests passed 3/3. Fresh independent review, archive checks and project push remain.

Final review and fix pass: The independent review reproduced stale checkout prices/dates and trip-code renaming bypassing booking protections. Regression tests first failed, then passed after adding owner/count/version-bound ten-minute quotes and immutable trip codes. All three minor findings were also reproduced and fixed: non-finite/fractional-cent prices, route-variant CSRF context, and lost category selection. No Critical findings or deferred review issues remain. Production deployment work remains outside the documented local course scope.

Final verification: 39/39 server integration tests, 41 Postman requests with 60/60 assertions, 12/12 Chrome browser scenarios, and 3/3 Angular unit tests passed. The Angular production build and TypeScript check passed; the 598.80 kB initial bundle and two Bootstrap selector warnings remain documented. Production server dependency audit found zero vulnerabilities. The final SDD has 17 endpoint entries and eight images; all 14 rendered pages were inspected, including the required three SPA screenshots. Source ZIP and remote-branch identity are verified separately during delivery.

Clean archive installation: Both package lockfiles install successfully with Node 20. From the extracted ZIP, the server suite passed 39/39 and Newman passed 60/60 assertions. Angular 18 production dependencies report eight audit advisories (four high/four moderate); the full Angular development toolchain reports 64, including two critical. Newer Angular major versions are needed for the reported production fixes. This deployment limitation is recorded in the README and SDD instead of changing the instructor-recommended major version during the final handoff.
