# Security & Multi-Tenancy Implementation Design
## Project: ERM-Ziswaf

This document outlines the architecture for securing the Multi-LAZ platform, implementing strict data isolation, and encrypting sensitive information properly.

### 1. Security Architecture Overview

The system will move from a "Trust All" model (where `laz_id` is passed openly in the URL) to a **Token-Based Authentication** model.

*   **Authentication**: Custom API Token scheme.
*   **Authorization**: Context-based isolation. A LAZ can only access resources linked to their Token.
*   **Encryption**: AES-256-GCM for sensitive text fields (Risk Descriptions, specific financial details).

### 2. Authentication Flow (The "Register" Process)

Instead of hardcoding LAZ IDs, we will introduce an onboarding flow:

#### A. Registration (`POST /api/auth/register`)
A generic `LazPartner` doesn't just "exist" openly. It must be registered to get credentials.
*   **Request**:
    ```json
    { "name": "LAZ Al-Falah", "scale": "Provinsi", "description": "Mitra Baru" }
    ```
*   **Backend Action**:
    1.  Insert into `laz_partners`.
    2.  Generate a secure random string: `laz_token_...` (32 chars).
    3.  Hash this token (bcrypt/argon2) and store the **hash** in `laz_partners` table (column `api_token_hash`).
    4.  **Return** the raw token to the user *once*.
*   **Response**:
    ```json
    { "laz_id": 5, "api_token": "laz_token_abc123xyz...", "message": "Save this token safely. It will not be shown again." }
    ```

#### B. Authenticated Requests
*   **Client Header**:
    `X-LAZ-Token: laz_token_abc123xyz...`
*   **Middleware (`AuthMiddleware`)**:
    1.  Intercepts request.
    2.  Reads `X-LAZ-Token`.
    3.  Looks up which LAZ matches this token hash.
    4.  **Crucial**: Sets `laz_id` in the Request Context (not query param).
    5.  Passes to handler.
*   **Handler**:
    `lazID := r.Context().Value("laz_id").(int)`
    *The handler NEVER reads `?laz_id=` from the URL anymore for secure operations.*

### 3. Data Encryption (AES-256)

Certain fields are deemed "Confidential" (Rahasia). We will encrypt them at the application level before saving to the DB, and decrypt them upon retrieval for the authorized owner.

*   **Algorithm**: AES-256-GCM (Galois/Counter Mode) - provides confidentiality and integrity.
*   **Key**: A Master Encryption Key (MEK) stored in Environment Variable (`APP_AES_KEY`).
    *   *Note: In production, this would be a KMS-derived key per user, but for this implementation, a global environment key is sufficient.*
*   **Target Fields**:
    *   `Risk.Description` -> Stored as Base64 encoded ciphertext.
    *   `Zis.OperationalFunds` -> (Optional, if financial privacy is required).
*   **Flow**:
    *   **Write**: `Plaintext` -> `Encrypt(Plaintext, Key)` -> `Ciphertext (Base64)` -> `DB`.
    *   **Read**: `DB` -> `Ciphertext` -> `Decrypt(Ciphertext, Key)` -> `Plaintext` -> `JSON Response`.

### 4. Database Schema Changes

#### Table: `laz_partners`
| Column | Type | New/Existing | Purpose |
| :--- | :--- | :--- | :--- |
| `api_token_hash` | VARCHAR(255) | **NEW** | Stores the hashed authentication token. |

#### Table: `risks`
| Column | Type | Changes |
| :--- | :--- | :--- |
| `description` | TEXT | Content changes from Plaintext to `AES:<IV>:<Ciphertext>` (Base64). |

### 5. Developer Implementation Guide

#### Step 1: Crypto Utils (`backend/utils/crypto.go`)
Create helper functions:
*   `Encrypt(text string, key string) (string, error)`
*   `Decrypt(cryptoText string, key string) (string, error)`
*   `HashToken(token string) (string, error)`
*   `CheckToken(token, hash string) bool`

#### Step 2: Auth Middleware (`backend/middleware/auth.go`)
Create logic to intercept `http.Handler`, validate header, look up `laz_partners`, and inject `laz_id` into context.

#### Step 3: Update Handlers
Refactor `CreateRisk`, `GetRisks`:
*   Remove `getLazID(r)` which looks at URL.
*   Use `getAuthLazID(r)` which looks at Context.
*   Apply `Encrypt()` before DB Insert.
*   Apply `Decrypt()` after DB Select.

### 6. Frontend Implications
*   **Login/Register View**: A new screen for the LAZ Admin to "Login" (Enter their Token) or "Register".
*   **Token Storage**: Frontend stores the token in `localStorage` or `sessionStorage`.
*   **API Calls**: All `fetch` calls must append the header:
    ```javascript
    headers: {
        'Content-Type': 'application/json',
        'X-LAZ-Token': storedToken
    }
    ```

---
**Status**: Ready for Implementation.
