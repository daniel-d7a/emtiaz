# 01: Plan Catalog, Public Plans Endpoint & Teacher Landing Pricing

**What to build:** Seed the four teacher plans (`Free`, `Early Bird`, `Pro`, `Ultimate`) and platform billing flags (`yearlyPlanDiscountEnabled`, `referralPlanSlug`, `referralGiftDays`), add the user's `Country` (`OM` | `EG`) to signup/profile so phone numbers validate against Oman or Egypt and currency defaults to `OMR` or `EGP`, expose the public plans endpoint, and render live public plans (`Free` and `Early Bird` at launch) with an `OMR / EGP` currency switcher and WhatsApp CTA on the teacher marketing landing page.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Database seeds the four `Plan` rows (`free`: 10 students / 1 GB, public; `early-bird`: 500 students / 100 GB / 30 trial days at 5 OMR / 300 EGP, public; `pro`: 50 students / 10 GB at 10→7 OMR / 500→300 EGP, hidden; `ultimate`: 200 students / 50 GB at 25→20 OMR / 1500→1000 EGP, hidden) and adds `yearlyPlanDiscountEnabled = false` to global settings.
- [x] User signup and profile support `country` (`OM` | `EG`), validating phone numbers for Oman (`+968`) or Egypt (`+20`) and resolving the user's currency (`OMR` vs. `EGP`).
- [x] Public plans endpoint returns only `isPublic = true` plans ordered by `displayOrder`, along with `yearlyPlanDiscountEnabled` and `supportWhatsapp`.
- [x] Teacher marketing landing page renders live public plans in Arabic and English with an `OMR / EGP` currency toggle and pre-filled WhatsApp CTA (`supportWhatsapp`), and removes any student-paid pricing claims.
- [x] Integration and smoke tests verify seeded plan data, public plan filtering, and Oman/Egypt phone + currency resolution.
