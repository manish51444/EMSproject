import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DEPARTMENTS,
} from '../config/departments';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'developer',
    department: '',
    organizationName: '',
    organizationDomain: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [existingOrg, setExistingOrg] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const extractDomain = (email) => {
    const parts = email.split('@');
    return parts.length > 1 ? parts[1] : null;
  };

  useEffect(() => {
    const signupEmail = localStorage.getItem('signupEmail');
    const suggestedOrgName = localStorage.getItem('suggestedOrgName');
    const suggestedDomain = localStorage.getItem('suggestedDomain');
    const existingOrgData = localStorage.getItem('existingOrg');
    
    if (signupEmail) {
      setFormData(prev => ({ ...prev, email: signupEmail }));
    }
    
    if (suggestedOrgName) {
      setFormData(prev => ({ 
        ...prev, 
        organizationName: suggestedOrgName,
        organizationDomain: suggestedDomain || extractDomain(signupEmail),
      }));
    }
    
    if (existingOrgData) {
      try {
        const org = JSON.parse(existingOrgData);
        setExistingOrg(org);
      } catch (error) {
        console.error('Failed to parse existing org data:', error);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Validate department only for developers (managers can work across departments)
    if (formData.role === 'developer' && !formData.department) {
      toast.error('Please select a department');
      return;
    }

    // Validate organization name
    if (!formData.organizationName || formData.organizationName.trim().length === 0) {
      toast.error('Organization name is required');
      return;
    }

    setIsLoading(true);
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      department: formData.department || null,
      organizationName: formData.organizationName.trim(),
      organizationDomain: formData.organizationDomain || null,
    });

    setIsLoading(false);

    if (result.success) {
      // Clear localStorage
      localStorage.removeItem('signupEmail');
      localStorage.removeItem('suggestedOrgName');
      localStorage.removeItem('suggestedDomain');
      localStorage.removeItem('existingOrg');
      
      // Redirect to reset password page with token
      if (result.data?.resetToken) {
        navigate(`/reset-password/${result.data.resetToken}`);
      } else {
        // Fallback: show message to check email
        toast.success('Registration successful! Please check your email to set your password.');
        navigate('/login');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input mt-1"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input mt-1"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                Organization Name *
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                className="input mt-1"
                value={formData.organizationName}
                onChange={(e) =>
                  setFormData({ ...formData, organizationName: e.target.value })
                }
                placeholder="Your Company Name"
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be your organization's unique name
              </p>
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="input mt-1"
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setFormData({
                    ...formData,
                    role: newRole,
                    // Clear department if not developer or manager
                    department: (newRole === 'developer' || newRole === 'manager') ? formData.department : '',
                  });
                }}
              >
                <option value="developer">Developer</option>
                <option value="manager">Manager</option>
                <option value="project_manager">Project Manager</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {/* Department Selection - Required for Developer, Optional for Manager */}
            {formData.role === 'developer' && (
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <select
                  id="department"
                  name="department"
                  className="input mt-1"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="">Select Department</option>
                  <option value={DEPARTMENTS.SALESFORCE}>Salesforce</option>
                  <option value={DEPARTMENTS.WEB_DEVELOPMENT}>Web Development</option>
                  <option value={DEPARTMENTS.MOBILE_DEVELOPMENT}>Mobile Development</option>
                </select>
              </div>
            )}

            {formData.role === 'manager' && (
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department (Optional)
                </label>
                <select
                  id="department"
                  name="department"
                  className="input mt-1"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  <option value="">No Department (Can assign to anyone)</option>
                  <option value={DEPARTMENTS.SALESFORCE}>Salesforce</option>
                  <option value={DEPARTMENTS.WEB_DEVELOPMENT}>Web Development</option>
                  <option value={DEPARTMENTS.MOBILE_DEVELOPMENT}>Mobile Development</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Managers without a department can assign tasks to anyone across all departments
                </p>
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input mt-1 pr-10"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="input mt-1 pr-10"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;

