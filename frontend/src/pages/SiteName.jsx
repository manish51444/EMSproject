import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SiteName = () => {
  const [siteName, setSiteName] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const navigate = useNavigate();

  const handleSiteNameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setSiteName(value);
    // Simulate availability check
    setIsAvailable(value.length >= 3);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAvailable) {
      toast.error('Please enter a valid site name');
      return;
    }
    localStorage.setItem('siteName', siteName);
    navigate('/work-type');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 bg-primary-600 rounded flex items-center justify-center mr-2">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EMS</h1>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Let's name your site</h2>
          <p className="text-gray-600">
            Your site name is part of your EMS URL. Most people use their team or company name.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 mb-2">
              Your site
            </label>
            <div className="flex items-center">
              <input
                id="siteName"
                type="text"
                required
                value={siteName}
                onChange={handleSiteNameChange}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-600"
                placeholder="intosoft"
              />
              <div className="px-4 py-3 bg-gray-50 border-2 border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                .atlassian.net
              </div>
              {isAvailable && (
                <div className="ml-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              This site name is just a suggestion. Feel free to change to something your team will
              recognize.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default SiteName;

