import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkDomain } from '../services/api';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [suggestedOrgName, setSuggestedOrgName] = useState('');
  const [existingOrg, setExistingOrg] = useState(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const extractDomain = (email) => {
    const parts = email.split('@');
    return parts.length > 1 ? parts[1] : null;
  };

  const extractOrgNameFromDomain = (domain) => {
    if (!domain) return '';
    const parts = domain.split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  };

  const handleEmailChange = async (e) => {
    const value = e.target.value;
    setEmail(value);
    const valid = validateEmail(value);
    setIsValid(valid);

    if (valid) {
      const domain = extractDomain(value);
      if (domain) {
        const orgName = extractOrgNameFromDomain(domain);
        setSuggestedOrgName(orgName);
        
        // Check if organization exists for this domain
        setCheckingDomain(true);
        try {
          const response = await checkDomain(domain);
          if (response.data.exists) {
            setExistingOrg(response.data.organization);
          } else {
            setExistingOrg(null);
          }
        } catch (error) {
          setExistingOrg(null);
        } finally {
          setCheckingDomain(false);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Store email and navigate to register
    localStorage.setItem('signupEmail', email);
    if (suggestedOrgName) {
      localStorage.setItem('suggestedOrgName', suggestedOrgName);
      localStorage.setItem('suggestedDomain', extractDomain(email));
    }
    if (existingOrg) {
      localStorage.setItem('existingOrg', JSON.stringify(existingOrg));
    }
    navigate('/register');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 bg-primary-600 rounded flex items-center justify-center mr-2">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EMS</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Get started with EMS</h2>
        
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Work Email
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="you@company.com"
                value={email}
                onChange={handleEmailChange}
              />
              {isValid && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Find teammates, plus keep work and life separate by using your work email.
            </p>
            
            {existingOrg && (
              <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <p className="text-sm text-primary-800 flex items-center">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Organization "{existingOrg.name}" exists for this domain. 
                  You'll be able to join it during registration.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={checkingDomain}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkingDomain ? 'Checking...' : 'Continue'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have EMS?{' '}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;

