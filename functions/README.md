# Paystack withdrawal worker

This Cloud Function initiates a Paystack Transfer only after an administrator changes a withdrawal request from `pending` to `approved` on the AgroPlug dashboard.

## Deploy

1. Install the function dependencies:

   ```powershell
   cd functions
   npm install
   cd ..
   ```

2. Store the Paystack **secret** key securely. Do not add it to a HTML or JavaScript file:

   ```powershell
   firebase functions:secrets:set PAYSTACK_SECRET_KEY
   ```

3. Deploy the worker and Firestore rules:

   ```powershell
   firebase deploy --only functions,firestore:rules
   ```

4. Copy the deployed `paystackTransferWebhook` URL into Paystack Dashboard → Settings → API Keys & Webhooks. Enable the `transfer.success` and `transfer.failed` webhook events.

The farmer must save their Paystack bank code, bank account number, and account name in Profile before requesting a withdrawal.
