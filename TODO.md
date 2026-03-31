# Supabase Integration & Testing Plan - FitoPro V1

## Status: In Progress ✅

### 1. Create TODO.md [COMPLETED]
- [x] Generated this file with steps

### 2. Backup original index.html [COMPLETED]
- [x] Created index-original.html

### 3. Add Supabase client to index.html [COMPLETED]
- [x] Import Supabase JS v2 via CDN
- [x] Initialize client with provided URL/key

### 4. Update auth functions [PENDING]
- Replace localStorage with real Supabase auth
- Add Google OAuth setup
- Handle auth state changes

### 5. Add data sync [PENDING]
- Users table: profile data
- Workouts table: custom plans
- History table: session logs
- Records table: PRs

### 6. Test flows [PENDING]
- Register new account
- Login/logout
- Save profile/workouts
- Verify data in Supabase dashboard
- Error handling/toasts

### 7. Cleanup & final tests [PENDING]
- Remove console.logs
- Test all app flows with Supabase
- attempt_completion

**Provided Supabase Details:**
- URL: https://ektgqepurlifendrlenj.supabase.co
- Publishable Key: sb_publishable_ODlrM4QhMbLHYrgEft4Sjg_yrQSA_bm  
- Secret Key: [REDACTED - stored securely, not in repo]
