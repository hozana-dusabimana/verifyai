---
name: deploy-workflow
description: How changes ship for VerifyAI — push to GitHub, CI deploys, verify on live (do not run/test locally)
metadata:
  type: feedback
---

The user ships VerifyAI by pushing to GitHub; a CI/CD pipeline then builds and deploys automatically. Verification happens against the **live deployed site**, not locally.

**Why:** The local XAMPP/Windows box is not the run target — the server is. Starting local MySQL, running migrations locally, or building/serving locally is wasted effort and unwanted.

**How to apply:** Implement code → commit → push to GitHub. Do NOT start local services (MySQL/Redis), run `manage.py migrate`, or `npm run dev` locally to "verify". Migrations run on the server as part of deploy. After pushing, check the live deployment to confirm behavior.
