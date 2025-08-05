import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useRef } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Cog, 
  Zap, 
  Check, 
  ChevronRight,
  Play,
  Users,
  TrendingUp,
  Shield
} from 'lucide-react';

export default function StandardLanding() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const featuresInView = useInView(featuresRef, { once: true });

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Generation',
      description: 'Describe your workflow in plain English and watch AI generate the complete automation.',
      gradient: 'from-purple-600 to-pink-600',
      stats: '10k+ workflows created'
    },
    {
      icon: Cog,
      title: 'Auto Deployment',
      description: 'Workflows are automatically validated, deployed, and configured in your n8n instance.',
      gradient: 'from-blue-600 to-cyan-600',
      stats: '99.9% uptime'
    },
    {
      icon: Zap,
      title: 'Real-time Testing',
      description: 'Test your workflows instantly with real data and get immediate feedback on performance.',
      gradient: 'from-green-600 to-emerald-600',
      stats: '<200ms response time'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Product Manager at TechCorp',
      content: 'Clixen has revolutionized how we handle our workflow automation. What used to take hours now takes minutes.',
      avatar: '👩‍💼'
    },
    {
      name: 'Marcus Rodriguez',
      role: 'CTO at StartupXYZ',
      content: 'The AI-powered generation is incredibly accurate. It understands exactly what we need and delivers.',
      avatar: '👨‍💻'
    },
    {
      name: 'Emily Watson',
      role: 'Operations Lead at ScaleUp',
      content: 'Our team productivity increased by 300% after implementing Clixen into our daily workflow.',
      avatar: '👩‍🔬'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '50,000+', icon: Users },
    { label: 'Workflows Created', value: '1M+', icon: Zap },
    { label: 'Time Saved', value: '10M+ hrs', icon: TrendingUp },
    { label: 'Uptime', value: '99.9%', icon: Shield }
  ];

  return (
    <div className="bg-white">
      {/* Header */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-lg border-b border-gray-200' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                clixen<span className="text-gray-500">.ai</span>
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">
                Testimonials
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </a>
            </nav>
            
            <div className="flex items-center gap-4">
              <Link
                to="/auth"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Workflow Automation
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Build Workflows with
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {' '}Natural Language
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform your ideas into powerful n8n automations using AI. 
              No coding required – just describe what you want, and watch it come to life.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/auth"
                className="bg-black text-white px-8 py-4 rounded-xl font-medium hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 text-lg"
              >
                Start Building
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Play className="w-5 h-5" />
                </div>
                Watch Demo
              </button>
            </div>
            
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Free plan available
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Setup in 2 minutes
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <stat.icon className="w-6 h-6 text-gray-700" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to automate
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features that make workflow automation accessible to everyone
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                <div className="text-sm text-gray-500 font-medium">{feature.stats}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by teams worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what our users are saying about Clixen
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-white rounded-2xl p-8 border border-gray-200"
              >
                <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-gray-600 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to automate your workflows?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join thousands of teams who have already transformed their productivity with Clixen.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-medium hover:bg-gray-800 transition-all duration-200 text-lg"
          >
            Get Started for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                clixen<span className="text-gray-500">.ai</span>
              </span>
            </div>
            <div className="flex items-center gap-8 text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-500">
            <p>&copy; 2025 Clixen AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
