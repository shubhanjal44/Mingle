import { Link } from 'react-router-dom';
import { BookOpen, Users, Award, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Tej India
          </h1>
          <p className="text-3xl md:text-4xl font-semibold mb-4 text-slate-700">
            सीखो और सिखाओ
          </p>
          <p className="text-xl md:text-2xl text-slate-600 mb-12">
            Trade Skills, Not Money
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/register" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
              Get Started <ArrowRight size={20} />
            </Link>
            <Link to="/login" className="btn-outline text-lg px-8 py-4">
              Sign In
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="card-glass">
              <BookOpen className="w-12 h-12 text-primary-600 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Learn New Skills</h3>
              <p className="text-slate-600">
                Discover thousands of skills from talented individuals in your community
              </p>
            </div>

            <div className="card-glass">
              <Users className="w-12 h-12 text-secondary-600 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Share Your Expertise</h3>
              <p className="text-slate-600">
                Teach what you know and help others grow while earning Tej Coins
              </p>
            </div>

            <div className="card-glass">
              <Award className="w-12 h-12 text-primary-600 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Earn Badges</h3>
              <p className="text-slate-600">
                Complete swaps and earn badges to showcase your expertise
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
