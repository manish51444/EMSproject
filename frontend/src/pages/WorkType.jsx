import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const workTypes = [
  'Software development',
  'Product management',
  'Marketing',
  'Design',
  'Project management',
  'Operations',
  'IT support',
  'Human resources',
  'Customer service',
  'Legal',
  'Finance',
  'Sales',
  'Data science',
  'Other',
];

const WorkType = () => {
  const [selectedType, setSelectedType] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedType) {
      toast.error('Please select a work type');
      return;
    }
    localStorage.setItem('workType', selectedType);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-end mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center mr-2">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-sm font-medium text-gray-700">EMS</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">What kind of work do you do?</h2>
          <p className="text-gray-600">
            This helps us suggest templates that help your team do their best work.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {workTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                  selectedType === type
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => navigate('/site-name')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkType;

