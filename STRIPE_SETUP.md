# Stripe Connect Dashboard - Setup Guide

## Getting Your Stripe API Key

To use this dashboard, you need a Stripe API key. Follow these steps:

### 1. Create or Log into Your Stripe Account
- Go to [https://stripe.com](https://stripe.com)
- Sign up for a new account or log into your existing account

### 2. Get Your API Key
1. Navigate to the Stripe Dashboard
2. Click on **Developers** in the top navigation
3. Click on **API keys** in the left sidebar
4. You'll see two types of keys:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)

### 3. Use the Secret Key
- For this application, you need the **Secret key** (sk_...)
- Click "Reveal test key" to see your test key
- Copy the key that starts with `sk_test_...`

### 4. Test vs Live Keys
- **Test keys** (sk_test_...): Use for development and testing
- **Live keys** (sk_live_...): Use for production (requires account activation)

## Using the Dashboard

### Authentication
1. Open the application
2. Paste your Stripe secret key in the "Stripe API Key" field
3. Click "Connect to Stripe"

### Features

#### Payouts Tab
- **Create Payout**: Schedule a new payout to your bank account
  - Enter amount (in dollars, e.g., 100.00)
  - Select currency (default: USD)
  - Add optional description
- **View Payouts**: See all recent payouts with status
- **Cancel Payout**: Cancel pending payouts

#### Bank Accounts Tab
- **Add Bank Account**: Connect a new bank account
  - Enter account number
  - Enter routing number (for US banks)
  - Enter account holder name
  - Select account holder type (individual/company)
- **Manage Accounts**: View all connected bank accounts
- **Set Default**: Set a bank account as default for payouts
- **Delete Account**: Remove a bank account

#### Profile Tab
- **Update Business Profile**: Edit your business information
  - Business name
  - Website URL
  - Support phone number
  - Support email
- **View Current Profile**: See your current business information

## Security Notes

- Your API key is stored **locally** in your browser
- The key is **never sent to our servers**
- All API calls go directly from your browser to Stripe
- Clear your browser data to remove the stored key

## Troubleshooting

### "Invalid API key" Error
- Ensure you're using the **Secret key** (starts with `sk_`)
- Check that you copied the entire key
- Verify the key is for the correct environment (test/live)

### "Insufficient balance" Error
- This occurs when trying to create a payout with insufficient funds
- Check your Stripe balance in the Stripe Dashboard

### Bank Account Errors
- Ensure routing and account numbers are correct
- Bank accounts must be in supported countries
- Account must be verified for live mode

## API Endpoints Used

- `GET /api/stripe/account` - Retrieve account information
- `GET /api/stripe/payouts` - List all payouts
- `POST /api/stripe/payouts` - Create a new payout
- `POST /api/stripe/payouts/{id}/cancel` - Cancel a payout
- `GET /api/stripe/bank-accounts` - List bank accounts
- `POST /api/stripe/bank-accounts` - Add a bank account
- `DELETE /api/stripe/bank-accounts/{id}` - Remove a bank account
- `POST /api/stripe/bank-accounts/{id}/default` - Set default account
- `PUT /api/stripe/profile` - Update business profile

## Support

For Stripe-specific issues, visit:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
