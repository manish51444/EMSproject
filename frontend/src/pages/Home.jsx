import { Link, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, CheckCircle2, Lock, Users, BarChart3 } from 'lucide-react';

const Home = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0e2b3d] to-[#1a3f52] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src="/Logo.png" alt="EMS" className="w-10 h-10 object-contain mr-3" />
              <h1 className="text-3xl font-bold">EMS</h1>
            </div>
            <div className="flex gap-4">
              <Link
                to="/login"
                className="px-6 py-2 text-white border border-white rounded-lg hover:bg-white hover:text-[#0e2b3d] transition-colors inline-block"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-6 py-2 bg-[#1cca9b] text-white rounded-lg hover:bg-[#18b58a] transition-colors font-medium flex items-center gap-2 inline-flex"
              >
                Get Started <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-5xl font-bold text-[#0e2b3d] mb-6">
              Project Management Made Simple
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              EMS helps teams collaborate, track issues, and manage projects with ease. Built for teams of all sizes.
            </p>
            <div className="flex gap-4">
              <Link
                to="/signup"
                className="px-8 py-3 bg-[#1cca9b] text-white rounded-lg hover:bg-[#18b58a] transition-colors font-medium flex items-center gap-2 inline-flex"
              >
                Sign Up for Free <ArrowRight size={20} />
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 border-2 border-[#1cca9b] text-[#1cca9b] rounded-lg hover:bg-[#f0fdf9] transition-colors font-medium inline-block"
              >
                Sign In
              </Link>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1cca9b] to-[#18b58a] rounded-lg p-8 text-white">
            <div className="aspect-square flex items-center justify-center">
              <div className="w-48 h-48 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <BarChart3 size={80} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-[#0e2b3d] mb-12">
            Powerful Features for Your Team
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Users className="w-12 h-12 text-[#1cca9b] mb-4" />
              <h4 className="text-xl font-bold text-[#0e2b3d] mb-2">Team Collaboration</h4>
              <p className="text-gray-600">
                Seamlessly collaborate with your team in real-time. Share updates, comments, and files in one place.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Lock className="w-12 h-12 text-[#1cca9b] mb-4" />
              <h4 className="text-xl font-bold text-[#0e2b3d] mb-2">Secure & Reliable</h4>
              <p className="text-gray-600">
                Enterprise-grade security with encrypted data and regular backups to keep your information safe.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <BarChart3 className="w-12 h-12 text-[#1cca9b] mb-4" />
              <h4 className="text-xl font-bold text-[#0e2b3d] mb-2">Analytics & Reports</h4>
              <p className="text-gray-600">
                Get insights into your team's progress with detailed analytics and customizable reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h3 className="text-3xl font-bold text-center text-[#0e2b3d] mb-12">
          Get Started in 3 Steps
        </h3>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-[#1cca9b] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
              1
            </div>
            <h4 className="text-xl font-bold text-[#0e2b3d] mb-2">Sign Up</h4>
            <p className="text-gray-600">
              Create your account and organization with just your email address. It takes less than a minute.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-[#1cca9b] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
              2
            </div>
            <h4 className="text-xl font-bold text-[#0e2b3d] mb-2">Invite Your Team</h4>
            <p className="text-gray-600">
              Add team members and assign them roles. Manage who can access what projects.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-[#1cca9b] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
              3
            </div>
            <h4 className="text-xl font-bold text-[#0e2b3d] mb-2">Start Collaborating</h4>
            <p className="text-gray-600">
              Create projects, track issues, and collaborate with your team in real-time.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#1cca9b] to-[#18b58a] text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h3 className="text-4xl font-bold mb-6">Ready to get started?</h3>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of teams already using EMS to manage their projects and collaborate better.
          </p>
          <Link
            to="/signup"
            className="px-8 py-3 bg-white text-[#1cca9b] rounded-lg hover:bg-gray-100 transition-colors font-bold text-lg inline-block"
          >
            Create Your Account Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0e2b3d] text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link to="/" className="flex items-center mb-4 hover:opacity-80">
                <img src="/Logo.png" alt="EMS" className="w-8 h-8 object-contain mr-2" />
                <h4 className="font-bold">EMS</h4>
              </Link>
              <p className="text-gray-400 text-sm">Project management made simple.</p>
            </div>
            <div>
              <h5 className="font-bold mb-4">Product</h5>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/features" className="cursor-pointer hover:text-white">Features</Link></li>
                <li><Link to="/pricing" className="cursor-pointer hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Company</h5>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/about" className="cursor-pointer hover:text-white">About</Link></li>
                <li><Link to="/contact" className="cursor-pointer hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">Legal</h5>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/privacy" className="cursor-pointer hover:text-white">Privacy</Link></li>
                <li><Link to="/terms" className="cursor-pointer hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 EMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
