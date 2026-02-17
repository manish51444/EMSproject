import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, FolderKanban, LayoutGrid, List, Columns, CheckCircle2, XCircle, Loader2, Users } from 'lucide-react';
import { createProject, checkProjectKey, getUsers } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  DEPARTMENTS,
  SALESFORCE_CLOUDS,
  WEB_TECHNOLOGIES,
  MOBILE_TECHNOLOGIES,
} from '../config/departments';

const templates = [
  {
    id: 'kanban',
    name: 'Kanban',
    icon: Columns,
    color: 'bg-orange-500',
    description: 'Manage design projects effectively, visualize tasks, and see team workload.',
    recommended: false,
  },
  {
    id: 'web-design',
    name: 'Web design process',
    icon: LayoutGrid,
    color: 'bg-green-500',
    description: 'Build web pages plus keep designers and developers on the same page.',
    recommended: true,
  },
  {
    id: 'scrum',
    name: 'Scrum',
    icon: List,
    color: 'bg-purple-500',
    description: 'Plan, prioritize, and schedule sprints using scrum framework.',
    recommended: false,
  },
];

const CreateProject = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: 'Landing Page',
    key: 'LP',
    template: 'web-design',
    projectType: 'team-managed',
    access: 'open',
    department: '',
    technologies: [],
    clouds: [],
    members: [],
  });
  const [showMore, setShowMore] = useState(false);
  const [orgUsers, setOrgUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [keyValidation, setKeyValidation] = useState({
    checking: false,
    exists: false,
    message: '',
  });
  const navigate = useNavigate();
  const keyCheckTimeoutRef = useRef(null);

  // Auto-populate department for managers
  useEffect(() => {
    if (user?.role === 'manager' && user?.department) {
      // Handle both array and single department value
      const userDept = Array.isArray(user.department) && user.department.length > 0
        ? user.department[0] // Use first department if multiple
        : user.department;
      setFormData((prev) => ({
        ...prev,
        department: userDept,
      }));
    }
  }, [user]);

  // Fetch org users when "Show more" is expanded (for team member picker)
  useEffect(() => {
    if (!showMore) return;
    let cancelled = false;
    setLoadingUsers(true);
    getUsers()
      .then((res) => {
        if (!cancelled) setOrgUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load team members');
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => { cancelled = true; };
  }, [showMore]);

  // Check project key availability
  const validateProjectKey = async (key) => {
    if (!key || key.length < 2) {
      setKeyValidation({ checking: false, exists: false, message: '' });
      return;
    }

    // Clear previous timeout
    if (keyCheckTimeoutRef.current) {
      clearTimeout(keyCheckTimeoutRef.current);
    }

    // Set checking state
    setKeyValidation({ checking: true, exists: false, message: '' });

    // Debounce the API call
    keyCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await checkProjectKey(key);
        setKeyValidation({
          checking: false,
          exists: response.data.exists,
          message: response.data.exists ? response.data.message : '',
        });
      } catch (error) {
        setKeyValidation({
          checking: false,
          exists: false,
          message: '',
        });
      }
    }, 500); // 500ms debounce
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (keyCheckTimeoutRef.current) {
        clearTimeout(keyCheckTimeoutRef.current);
      }
    };
  }, []);

  // Get available options based on selected department
  const getAvailableOptions = () => {
    if (formData.department === DEPARTMENTS.SALESFORCE) {
      return SALESFORCE_CLOUDS;
    } else if (formData.department === DEPARTMENTS.WEB_DEVELOPMENT) {
      return WEB_TECHNOLOGIES;
    } else if (formData.department === DEPARTMENTS.MOBILE_DEVELOPMENT) {
      return MOBILE_TECHNOLOGIES;
    }
    return [];
  };

  const handleDepartmentChange = (department) => {
    setFormData({
      ...formData,
      department,
      technologies: [],
      clouds: [],
    });
  };

  const handleOptionToggle = (option) => {
    if (formData.department === DEPARTMENTS.SALESFORCE) {
      const updatedClouds = formData.clouds.includes(option)
        ? formData.clouds.filter((c) => c !== option)
        : [...formData.clouds, option];
      setFormData({ ...formData, clouds: updatedClouds });
    } else {
      const updatedTechs = formData.technologies.includes(option)
        ? formData.technologies.filter((t) => t !== option)
        : [...formData.technologies, option];
      setFormData({ ...formData, technologies: updatedTechs });
    }
  };

  const handleMemberToggle = (userId) => {
    const id = userId.toString();
    setFormData((prev) => ({
      ...prev,
      members: prev.members.includes(id)
        ? prev.members.filter((m) => m !== id)
        : [...prev.members, id],
    }));
  };

  const selectedTemplate = templates.find((t) => t.id === formData.template);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.department) {
      toast.error('Please select a department');
      return;
    }

    if (formData.department === DEPARTMENTS.SALESFORCE && formData.clouds.length === 0) {
      toast.error('Please select at least one Salesforce Cloud');
      return;
    }

    if (
      (formData.department === DEPARTMENTS.WEB_DEVELOPMENT ||
        formData.department === DEPARTMENTS.MOBILE_DEVELOPMENT) &&
      formData.technologies.length === 0
    ) {
      toast.error('Please select at least one technology');
      return;
    }

    if (keyValidation.exists) {
      toast.error('Project key already exists. Please choose a different key.');
      return;
    }

    if (keyValidation.checking) {
      toast.error('Please wait while we check the project key availability.');
      return;
    }

    try {
      const projectData = {
        name: formData.name,
        key: formData.key,
        description: `Project created with ${selectedTemplate?.name} template`,
        department: formData.department,
      };

      if (formData.department === DEPARTMENTS.SALESFORCE) {
        projectData.clouds = formData.clouds;
      } else {
        projectData.technologies = formData.technologies;
      }

      if (formData.members && formData.members.length > 0) {
        projectData.members = formData.members;
      }

      const response = await createProject(projectData);
      toast.success('Project created successfully');
      navigate(`/projects/${response.data._id}/board`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create project');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/projects')}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
          >
            <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
            Back to projects
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create project</h1>
            <p className="text-gray-600 mb-6">
              Explore what's possible when you collaborate with your team. Edit project details
              anytime in project settings.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Required fields are marked with an asterisk *
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Try a team name, project goal, milestone..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Template</label>
                  <button
                    type="button"
                    className="text-sm text-primary-600 hover:underline"
                    onClick={() => navigate('/projects/templates')}
                  >
                    More templates
                  </button>
                </div>
                <div className="space-y-3">
                  {templates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <div
                        key={template.id}
                        onClick={() => setFormData({ ...formData, template: template.id })}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          formData.template === template.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`${template.color} p-2 rounded`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium text-gray-900">{template.name}</h3>
                                {template.recommended && (
                                  <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                                    RECOMMENDED
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowMore(!showMore)}
                  className="text-sm text-primary-600 hover:underline flex items-center"
                >
                  {showMore ? (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-4 h-4 mr-1" />
                      Show more
                    </>
                  )}
                </button>

                {showMore && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project type
                      </label>
                      <select
                        value={formData.projectType}
                        onChange={(e) =>
                          setFormData({ ...formData, projectType: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="team-managed">Team-managed</option>
                        <option value="company-managed">Company-managed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={formData.key}
                          onChange={(e) => {
                            const newKey = e.target.value.toUpperCase().slice(0, 10);
                            setFormData({
                              ...formData,
                              key: newKey,
                            });
                            validateProjectKey(newKey);
                          }}
                          className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
                            keyValidation.exists
                              ? 'border-red-300 focus:ring-red-500'
                              : formData.key.length >= 2 && !keyValidation.checking && !keyValidation.exists
                              ? 'border-green-300 focus:ring-green-500'
                              : 'border-gray-300 focus:ring-primary-500'
                          }`}
                          maxLength={10}
                          pattern="[A-Z0-9]+"
                          title="Project key must contain only uppercase letters and numbers"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {keyValidation.checking ? (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                          ) : keyValidation.exists ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : formData.key.length >= 2 ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : null}
                        </div>
                      </div>
                      {keyValidation.exists && (
                        <p className="mt-1 text-sm text-red-600">{keyValidation.message}</p>
                      )}
                      {formData.key.length >= 2 && !keyValidation.checking && !keyValidation.exists && (
                        <p className="mt-1 text-sm text-green-600">Project key is available</p>
                      )}
                      {formData.key.length > 0 && formData.key.length < 2 && (
                        <p className="mt-1 text-sm text-gray-500">Project key must be at least 2 characters</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department *
                        {user?.role === 'manager' && user?.department && (
                          <span className="ml-2 text-xs text-gray-500 font-normal">
                            (Auto-filled from your profile)
                          </span>
                        )}
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) => handleDepartmentChange(e.target.value)}
                        disabled={user?.role === 'manager' && user?.department}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          user?.role === 'manager' && user?.department
                            ? 'bg-gray-100 cursor-not-allowed'
                            : ''
                        }`}
                        required
                      >
                        <option value="">Select Department</option>
                        <option value={DEPARTMENTS.SALESFORCE}>Salesforce</option>
                        <option value={DEPARTMENTS.WEB_DEVELOPMENT}>Web Development</option>
                        <option value={DEPARTMENTS.MOBILE_DEVELOPMENT}>Mobile Development</option>
                      </select>
                    </div>

                    {/* Technology/Cloud Selection */}
                    {formData.department && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {formData.department === DEPARTMENTS.SALESFORCE
                              ? 'Salesforce Clouds *'
                              : 'Technologies *'}
                          </label>
                          {formData.department === DEPARTMENTS.SALESFORCE && (
                            <span className="text-xs text-gray-500">
                              {formData.clouds.length} of {SALESFORCE_CLOUDS.length} selected
                            </span>
                          )}
                          {formData.department !== DEPARTMENTS.SALESFORCE && (
                            <span className="text-xs text-gray-500">
                              {formData.technologies.length} selected
                            </span>
                          )}
                        </div>
                        <div className={`space-y-2 border border-gray-300 rounded-lg p-3 ${
                          formData.department === DEPARTMENTS.SALESFORCE 
                            ? 'max-h-64' 
                            : 'max-h-48'
                        } overflow-y-auto bg-gray-50`}>
                          {getAvailableOptions().length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No options available
                            </p>
                          ) : (
                            getAvailableOptions().map((option) => {
                              const isSelected =
                                formData.department === DEPARTMENTS.SALESFORCE
                                  ? formData.clouds.includes(option)
                                  : formData.technologies.includes(option);
                              return (
                                <label
                                  key={option}
                                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'bg-primary-50 border border-primary-200' 
                                      : 'hover:bg-white'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleOptionToggle(option)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <span className={`text-sm ${
                                    isSelected ? 'text-primary-900 font-medium' : 'text-gray-700'
                                  }`}>
                                    {option}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                        {formData.department === DEPARTMENTS.SALESFORCE && (
                          <>
                            {formData.clouds.length === 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                Please select at least one Salesforce Cloud
                              </p>
                            )}
                            {formData.clouds.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Selected: {formData.clouds.join(', ')}
                              </p>
                            )}
                          </>
                        )}
                        {formData.department !== DEPARTMENTS.SALESFORCE &&
                          formData.technologies.length === 0 && (
                            <p className="text-xs text-red-600 mt-1">
                              Please select at least one technology
                            </p>
                          )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Access</label>
                      <select
                        value={formData.access}
                        onChange={(e) => setFormData({ ...formData, access: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="open">Open</option>
                        <option value="limited">Limited</option>
                        <option value="private">Private</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Users className="w-4 h-4" />
                        Assign team members
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Select users to add as project members. You are automatically the project lead.
                      </p>
                      {loadingUsers ? (
                        <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading team members…
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50 space-y-2">
                          {orgUsers
                            .filter((u) => u._id !== user?.id && u._id !== user?._id)
                            .map((u) => {
                              const uid = u._id?.toString?.() ?? u._id;
                              const isSelected = formData.members.includes(uid);
                              return (
                                <label
                                  key={uid}
                                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                                    isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-white'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleMemberToggle(uid)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {u.name || u.email || 'Unknown'}
                                    {u.role && (
                                      <span className="ml-2 text-xs text-gray-500">({u.role})</span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          {orgUsers.filter((u) => u._id !== user?.id && u._id !== user?._id).length === 0 && !loadingUsers && (
                            <p className="text-sm text-gray-500 py-2">No other users in your organization.</p>
                          )}
                        </div>
                      )}
                      {formData.members.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.members.length} member{formData.members.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>

          <div className="hidden lg:block relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg opacity-20 blur-3xl" />
            </div>
            <div className="relative bg-white rounded-lg shadow-lg p-6 mt-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Untitled project</h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <div
                    key={num}
                    className="flex items-center space-x-3 p-2 bg-gray-50 rounded"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary-500" />
                    <span className="text-sm text-gray-700">KEY-{num}</span>
                    <div className="flex-1 h-1 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">Team-managed project</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;

