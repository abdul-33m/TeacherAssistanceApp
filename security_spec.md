# GradeCraft Firestore Security Specification

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every document belongs to a single authenticated, email-verified teacher (`request.auth.uid`) stored under `/users/{userId}/...`. No user can read, list, create, update, or delete any document belonging to another user.
2. **PII Protection**: `/users/{userId}` contains teacher email and profile details. `allow list` on `/users` is explicitly denied (`false`), and `allow get` requires `request.auth.uid == userId && request.auth.token.email_verified == true`.
3. **Parent Gate & Atomicity**: Every subcollection document under `/users/{userId}` requires `existsAfter(/databases/$(database)/documents/users/$(userId))` on create/update and must store an immutable `ownerId` matching `request.auth.uid`.
4. **Temporal Integrity**: `createdAt` and `updatedAt` must strictly equal `request.time` on creation; `createdAt` is immutable on update and `updatedAt` must equal `request.time`.
5. **Path & Payload Bounding**: All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars). Every string field has an explicit `.size()` bound, every array has a `.size()` bound and element-type guard, and every write enforces exact allowed keys (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update).

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Cross-Tenant Read/Write**: Signed-in user `uid_attacker` attempts `get` or `create` at `/users/uid_victim/students/s_6a_01`.
2. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create `/users/{uid}/classes/6A`.
3. **PII Enumeration (`list`)**: Signed-in user attempts `list` on `/users` collection.
4. **Identity Spoofing on Create**: User `uid_a` creates `/users/uid_a/students/s1` with `ownerId: "uid_b"`.
5. **Ghost / Shadow Field Injection**: User creates a `Student` doc including an unexpected `isAdmin: true` or `role: "superadmin"` field.
6. **Ghost Field on Update**: User updates `Student` name while sneaking in `extraField: "injected"`.
7. **Immutable Owner Reassignment**: User attempts to update `ownerId` on an existing `ClassGroup` document.
8. **Forged Timestamp on Create**: User sends a client-generated `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
9. **ID Poisoning**: User attempts to create `/users/{uid}/students/<2KB string>` or ID with invalid characters (`../evil`).
10. **Denial-of-Wallet Oversized String**: User writes a 100KB string into `Student.name` or `Assignment.title`.
11. **Unbounded Array Exhaustion**: User writes 500 elements into `UserProfile.academicYears` or `LessonPlan.objectives`.
12. **Orphan Subcollection Write**: User creates `/users/{uid}/classes/6A` when `/users/{uid}` parent profile does not exist and is not created in the same batch (`existsAfter` fails).
