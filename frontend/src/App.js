import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('stripe_api_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  
  // Payout form
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutCurrency, setPayoutCurrency] = useState('usd');
  const [payoutDescription, setPayoutDescription] = useState('');
  
  // Bank account form
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountHolderType, setAccountHolderType] = useState('individual');
  
  // Profile form
  const [businessName, setBusinessName] = useState('');
  const [businessUrl, setBusinessUrl] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');

  const axiosConfig = {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  };

  const handleLogin = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Stripe API key');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/stripe/account`, axiosConfig);
      setAccount(response.data);
      setIsAuthenticated(true);
      localStorage.setItem('stripe_api_key', apiKey);
      toast.success('Connected to Stripe successfully!');
      
      // Load initial data
      loadPayouts();
      loadBankAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid API key');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setApiKey('');
    setIsAuthenticated(false);
    setAccount(null);
    localStorage.removeItem('stripe_api_key');
    toast.success('Logged out successfully');
  };

  const loadPayouts = async () => {
    try {
      const response = await axios.get(`${API}/stripe/payouts`, axiosConfig);
      setPayouts(response.data.data);
    } catch (error) {
      console.error('Error loading payouts:', error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const response = await axios.get(`${API}/stripe/bank-accounts`, axiosConfig);
      setBankAccounts(response.data.data);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const handleCreatePayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/stripe/payouts`, {
        amount: parseFloat(payoutAmount),
        currency: payoutCurrency,
        description: payoutDescription
      }, axiosConfig);
      
      toast.success('Payout created successfully!');
      setPayoutAmount('');
      setPayoutDescription('');
      loadPayouts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payout');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayout = async (payoutId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/stripe/payouts/${payoutId}/cancel`, {}, axiosConfig);
      toast.success('Payout cancelled successfully!');
      loadPayouts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel payout');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBankAccount = async () => {
    if (!accountNumber || !routingNumber || !accountHolderName) {
      toast.error('Please fill in all bank account fields');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/stripe/bank-accounts`, {
        account_number: accountNumber,
        routing_number: routingNumber,
        account_holder_name: accountHolderName,
        account_holder_type: accountHolderType
      }, axiosConfig);
      
      toast.success('Bank account added successfully!');
      setAccountNumber('');
      setRoutingNumber('');
      setAccountHolderName('');
      loadBankAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBankAccount = async (bankAccountId) => {
    setLoading(true);
    try {
      await axios.delete(`${API}/stripe/bank-accounts/${bankAccountId}`, axiosConfig);
      toast.success('Bank account deleted successfully!');
      loadBankAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultBankAccount = async (bankAccountId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/stripe/bank-accounts/${bankAccountId}/default`, {}, axiosConfig);
      toast.success('Default bank account set successfully!');
      loadBankAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to set default bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    const updates = {};
    if (businessName) updates.business_name = businessName;
    if (businessUrl) updates.url = businessUrl;
    if (supportPhone) updates.support_phone = supportPhone;
    if (supportEmail) updates.support_email = supportEmail;
    
    if (Object.keys(updates).length === 0) {
      toast.error('Please fill in at least one field to update');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(`${API}/stripe/profile`, updates, axiosConfig);
      toast.success('Profile updated successfully!');
      // Reload account data
      const response = await axios.get(`${API}/stripe/account`, axiosConfig);
      setAccount(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      paid: 'default',
      pending: 'secondary',
      in_transit: 'secondary',
      canceled: 'destructive',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-3">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Stripe Connect Dashboard</CardTitle>
            <CardDescription className="text-center">
              Enter your Stripe API key to manage payouts, bank accounts, and profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Stripe API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk_test_..." 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                data-testid="api-key-input"
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              data-testid="login-button"
            >
              {loading ? 'Connecting...' : 'Connect to Stripe'}
            </Button>
            <p className="text-xs text-center text-gray-500 mt-4">
              Your API key is stored locally and never sent to our servers
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Stripe Connect Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Manage your payouts, bank accounts, and business profile</p>
            </div>
            <Button 
              onClick={handleLogout} 
              variant="outline"
              data-testid="logout-button"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Account Overview */}
        {account && (
          <Card className="mb-6 shadow-lg border-0" data-testid="account-overview">
            <CardHeader>
              <CardTitle>Account Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Account ID</p>
                  <p className="font-semibold" data-testid="account-id">{account.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold" data-testid="account-email">{account.email || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="flex gap-2 mt-1">
                    {account.charges_enabled ? (
                      <Badge className="bg-green-100 text-green-800">Charges Enabled</Badge>
                    ) : (
                      <Badge variant="destructive">Charges Disabled</Badge>
                    )}
                    {account.payouts_enabled ? (
                      <Badge className="bg-green-100 text-green-800">Payouts Enabled</Badge>
                    ) : (
                      <Badge variant="destructive">Payouts Disabled</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="payouts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="payouts" data-testid="payouts-tab">Payouts</TabsTrigger>
            <TabsTrigger value="bank-accounts" data-testid="bank-accounts-tab">Bank Accounts</TabsTrigger>
            <TabsTrigger value="profile" data-testid="profile-tab">Profile</TabsTrigger>
          </TabsList>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Create Payout</CardTitle>
                <CardDescription>Schedule a new payout to your bank account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payoutAmount">Amount</Label>
                    <Input
                      id="payoutAmount"
                      type="number"
                      step="0.01"
                      placeholder="100.00"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      data-testid="payout-amount-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payoutCurrency">Currency</Label>
                    <Input
                      id="payoutCurrency"
                      type="text"
                      value={payoutCurrency}
                      onChange={(e) => setPayoutCurrency(e.target.value)}
                      data-testid="payout-currency-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payoutDescription">Description (optional)</Label>
                  <Input
                    id="payoutDescription"
                    placeholder="Monthly payout"
                    value={payoutDescription}
                    onChange={(e) => setPayoutDescription(e.target.value)}
                    data-testid="payout-description-input"
                  />
                </div>
                <Button 
                  onClick={handleCreatePayout} 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  data-testid="create-payout-button"
                >
                  {loading ? 'Creating...' : 'Create Payout'}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Recent Payouts</CardTitle>
                <CardDescription>View and manage your payout history</CardDescription>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No payouts found</p>
                ) : (
                  <div className="space-y-4">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid={`payout-${payout.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold text-lg">
                                ${payout.amount.toFixed(2)} {payout.currency.toUpperCase()}
                              </p>
                              {getStatusBadge(payout.status)}
                            </div>
                            <p className="text-sm text-gray-600">{payout.description || 'No description'}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>Arrival: {formatDate(payout.arrival_date)}</span>
                              <span>Created: {formatDate(payout.created)}</span>
                            </div>
                          </div>
                          {payout.status === 'pending' && (
                            <Button 
                              onClick={() => handleCancelPayout(payout.id)} 
                              variant="destructive" 
                              size="sm"
                              disabled={loading}
                              data-testid={`cancel-payout-${payout.id}`}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Accounts Tab */}
          <TabsContent value="bank-accounts" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Add Bank Account</CardTitle>
                <CardDescription>Add a new bank account for payouts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      type="text"
                      placeholder="000123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      data-testid="account-number-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="routingNumber">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      type="text"
                      placeholder="110000000"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      data-testid="routing-number-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    placeholder="John Doe"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    data-testid="account-holder-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolderType">Account Holder Type</Label>
                  <select
                    id="accountHolderType"
                    className="w-full px-3 py-2 border rounded-md"
                    value={accountHolderType}
                    onChange={(e) => setAccountHolderType(e.target.value)}
                    data-testid="account-holder-type-select"
                  >
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                  </select>
                </div>
                <Button 
                  onClick={handleAddBankAccount} 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  data-testid="add-bank-account-button"
                >
                  {loading ? 'Adding...' : 'Add Bank Account'}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Your Bank Accounts</CardTitle>
                <CardDescription>Manage your connected bank accounts</CardDescription>
              </CardHeader>
              <CardContent>
                {bankAccounts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No bank accounts found</p>
                ) : (
                  <div className="space-y-4">
                    {bankAccounts.map((account) => (
                      <div key={account.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow" data-testid={`bank-account-${account.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold text-lg">
                                {account.bank_name || 'Bank Account'} ****{account.last4}
                              </p>
                              {account.default_for_currency && (
                                <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                              )}
                              {getStatusBadge(account.status)}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Holder: {account.account_holder_name}</p>
                              <p>Country: {account.country} | Currency: {account.currency.toUpperCase()}</p>
                              {account.routing_number && <p>Routing: {account.routing_number}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {!account.default_for_currency && (
                              <Button 
                                onClick={() => handleSetDefaultBankAccount(account.id)} 
                                variant="outline" 
                                size="sm"
                                disabled={loading}
                                data-testid={`set-default-${account.id}`}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button 
                              onClick={() => handleDeleteBankAccount(account.id)} 
                              variant="destructive" 
                              size="sm"
                              disabled={loading}
                              data-testid={`delete-bank-account-${account.id}`}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {account?.type === 'standard' && (
              <Card className="shadow-lg border-0 bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-yellow-800">Note for Standard Accounts</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Standard Stripe accounts cannot update business profiles via API. Please visit the{' '}
                        <a 
                          href="https://dashboard.stripe.com/settings/business" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline font-medium hover:text-yellow-900"
                        >
                          Stripe Dashboard
                        </a> to update your business information.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Update Business Profile</CardTitle>
                <CardDescription>Update your business information {account?.type === 'standard' && '(Connect Accounts only)'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Acme Corporation"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    data-testid="business-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessUrl">Website URL</Label>
                  <Input
                    id="businessUrl"
                    type="url"
                    placeholder="https://example.com"
                    value={businessUrl}
                    onChange={(e) => setBusinessUrl(e.target.value)}
                    data-testid="business-url-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input
                    id="supportPhone"
                    type="tel"
                    placeholder="+1234567890"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    data-testid="support-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    placeholder="support@example.com"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    data-testid="support-email-input"
                  />
                </div>
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  data-testid="update-profile-button"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>

            {/* Current Profile Info */}
            {account?.business_profile && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle>Current Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {account.business_profile.name && (
                      <div>
                        <p className="text-sm text-gray-500">Business Name</p>
                        <p className="font-semibold">{account.business_profile.name}</p>
                      </div>
                    )}
                    {account.business_profile.url && (
                      <div>
                        <p className="text-sm text-gray-500">Website</p>
                        <p className="font-semibold">{account.business_profile.url}</p>
                      </div>
                    )}
                    {account.business_profile.support_phone && (
                      <div>
                        <p className="text-sm text-gray-500">Support Phone</p>
                        <p className="font-semibold">{account.business_profile.support_phone}</p>
                      </div>
                    )}
                    {account.business_profile.support_email && (
                      <div>
                        <p className="text-sm text-gray-500">Support Email</p>
                        <p className="font-semibold">{account.business_profile.support_email}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;