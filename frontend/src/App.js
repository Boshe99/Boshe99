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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-black dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
        <Card className="w-full max-w-md shadow-2xl border-0 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-black dark:from-gray-700 dark:via-gray-600 dark:to-gray-800 flex items-center justify-center shadow-2xl border-2 border-yellow-400">
                  <svg className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-yellow-400 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                  <svg className="h-3 w-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl text-center font-black tracking-tight dark:text-white">
              <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">BLACK MAMBA</span>
            </CardTitle>
            <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Stripe Management System</p>
            <CardDescription className="text-center dark:text-gray-400">
              Enter your Stripe API key to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="dark:text-gray-300">Stripe API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk_test_..." 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                data-testid="api-key-input"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-800 text-black font-bold shadow-lg"
              data-testid="login-button"
            >
              {loading ? 'Connecting...' : 'Sign In'}
            </Button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
              🔒 Your API key is stored locally and never sent to our servers
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-black dark:to-gray-900 transition-colors duration-300">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-black dark:from-gray-700 dark:via-gray-600 dark:to-gray-800 flex items-center justify-center shadow-lg border-2 border-yellow-400">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">BLACK MAMBA</span>
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Stripe Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              <Button 
                onClick={handleLogout} 
                variant="outline"
                data-testid="logout-button"
                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Account Overview */}
        {account && (
          <Card className="mb-6 shadow-lg border-0 dark:bg-gray-800 dark:border-gray-700" data-testid="account-overview">
            <CardHeader>
              <CardTitle className="dark:text-white">Account Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Account ID</p>
                  <p className="font-semibold dark:text-white" data-testid="account-id">{account.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-semibold dark:text-white" data-testid="account-email">{account.email || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <div className="flex gap-2 mt-1">
                    {account.charges_enabled ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Charges Enabled</Badge>
                    ) : (
                      <Badge variant="destructive">Charges Disabled</Badge>
                    )}
                    {account.payouts_enabled ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Payouts Enabled</Badge>
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
          <TabsList className="grid w-full grid-cols-3 lg:w-auto dark:bg-gray-800 dark:border-gray-700">
            <TabsTrigger value="payouts" data-testid="payouts-tab" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-yellow-400">Payouts</TabsTrigger>
            <TabsTrigger value="bank-accounts" data-testid="bank-accounts-tab" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-yellow-400">Bank Accounts</TabsTrigger>
            <TabsTrigger value="profile" data-testid="profile-tab" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-yellow-400">Profile</TabsTrigger>
          </TabsList>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-6">
            <Card className="shadow-lg border-0 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Create Payout</CardTitle>
                <CardDescription className="dark:text-gray-400">Schedule a new payout to your bank account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payoutAmount" className="dark:text-gray-300">Amount</Label>
                    <Input
                      id="payoutAmount"
                      type="number"
                      step="0.01"
                      placeholder="100.00"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      data-testid="payout-amount-input"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payoutCurrency" className="dark:text-gray-300">Currency</Label>
                    <Input
                      id="payoutCurrency"
                      type="text"
                      value={payoutCurrency}
                      onChange={(e) => setPayoutCurrency(e.target.value)}
                      data-testid="payout-currency-input"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payoutDescription" className="dark:text-gray-300">Description (optional)</Label>
                  <Input
                    id="payoutDescription"
                    placeholder="Monthly payout"
                    value={payoutDescription}
                    onChange={(e) => setPayoutDescription(e.target.value)}
                    data-testid="payout-description-input"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <Button 
                  onClick={handleCreatePayout} 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-800 text-black font-bold"
                  data-testid="create-payout-button"
                >
                  {loading ? 'Creating...' : 'Create Payout'}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Recent Payouts</CardTitle>
                <CardDescription className="dark:text-gray-400">View and manage your payout history</CardDescription>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">No payouts found</p>
                ) : (
                  <div className="space-y-4">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow dark:bg-gray-750" data-testid={`payout-${payout.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold text-lg dark:text-white">
                                ${payout.amount.toFixed(2)} {payout.currency.toUpperCase()}
                              </p>
                              {getStatusBadge(payout.status)}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{payout.description || 'No description'}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
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
            <Card className="shadow-lg border-0 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Add Bank Account</CardTitle>
                <CardDescription className="dark:text-gray-400">Add a new bank account for payouts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber" className="dark:text-gray-300">Account Number</Label>
                    <Input
                      id="accountNumber"
                      type="text"
                      placeholder="000123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      data-testid="account-number-input"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="routingNumber" className="dark:text-gray-300">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      type="text"
                      placeholder="110000000"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      data-testid="routing-number-input"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName" className="dark:text-gray-300">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    placeholder="John Doe"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    data-testid="account-holder-name-input"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolderType" className="dark:text-gray-300">Account Holder Type</Label>
                  <select
                    id="accountHolderType"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  className="w-full bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-800 text-black font-bold"
                  data-testid="add-bank-account-button"
                >
                  {loading ? 'Adding...' : 'Add Bank Account'}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Your Bank Accounts</CardTitle>
                <CardDescription className="dark:text-gray-400">Manage your connected bank accounts</CardDescription>
              </CardHeader>
              <CardContent>
                {bankAccounts.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">No bank accounts found</p>
                ) : (
                  <div className="space-y-4">
                    {bankAccounts.map((account) => (
                      <div key={account.id} className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow dark:bg-gray-750" data-testid={`bank-account-${account.id}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-semibold text-lg dark:text-white">
                                {account.bank_name || 'Bank Account'} ****{account.last4}
                              </p>
                              {account.default_for_currency && (
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Default</Badge>
                              )}
                              {getStatusBadge(account.status)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
                                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
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
              <Card className="shadow-lg border-0 bg-yellow-50 border-yellow-200 dark:bg-yellow-900 dark:bg-opacity-20 dark:border-yellow-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-yellow-800 dark:text-yellow-400">Note for Standard Accounts</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Standard Stripe accounts cannot update business profiles via API. Please visit the{' '}
                        <a 
                          href="https://dashboard.stripe.com/settings/business" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline font-medium hover:text-yellow-900 dark:hover:text-yellow-200"
                        >
                          Stripe Dashboard
                        </a> to update your business information.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="shadow-lg border-0 dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Update Business Profile</CardTitle>
                <CardDescription className="dark:text-gray-400">Update your business information {account?.type === 'standard' && '(Connect Accounts only)'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="dark:text-gray-300">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Acme Corporation"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    data-testid="business-name-input"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessUrl" className="dark:text-gray-300">Website URL</Label>
                  <Input
                    id="businessUrl"
                    type="url"
                    placeholder="https://example.com"
                    value={businessUrl}
                    onChange={(e) => setBusinessUrl(e.target.value)}
                    data-testid="business-url-input"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportPhone" className="dark:text-gray-300">Support Phone</Label>
                  <Input
                    id="supportPhone"
                    type="tel"
                    placeholder="+1234567890"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    data-testid="support-phone-input"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail" className="dark:text-gray-300">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    placeholder="support@example.com"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    data-testid="support-email-input"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 hover:from-yellow-600 hover:via-yellow-700 hover:to-yellow-800 text-black font-bold"
                  data-testid="update-profile-button"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>

            {/* Current Profile Info */}
            {account?.business_profile && (
              <Card className="shadow-lg border-0 dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">Current Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {account.business_profile.name && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Business Name</p>
                        <p className="font-semibold dark:text-white">{account.business_profile.name}</p>
                      </div>
                    )}
                    {account.business_profile.url && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Website</p>
                        <p className="font-semibold dark:text-white">{account.business_profile.url}</p>
                      </div>
                    )}
                    {account.business_profile.support_phone && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Support Phone</p>
                        <p className="font-semibold dark:text-white">{account.business_profile.support_phone}</p>
                      </div>
                    )}
                    {account.business_profile.support_email && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Support Email</p>
                        <p className="font-semibold dark:text-white">{account.business_profile.support_email}</p>
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