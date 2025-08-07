import { Link } from 'react-router-dom';
import { ArrowRightIcon, SparklesIcon, CogIcon, BoltIcon, CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function ModernLanding() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const featuresInView = useInView(featuresRef, { once: true });
  const controls = useAnimation();

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
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: SparklesIcon,
      title: 'AI Generation',
      description: 'Describe your workflow in plain English and watch AI generate the complete n8n automation.',
      gradient: 'from-purple-500 to-pink-500',
      stats: '10k+ workflows created'
    },
    {
      icon: CogIcon,
      title: 'Auto Deployment',
      description: 'Workflows are automatically validated, deployed, and configured in your n8n instance.',
      gradient: 'from-blue-500 to-cyan-500',
      stats: '99.9% uptime'
    },
    {
      icon: BoltIcon,
      title: 'Real-time Testing',
      description: 'Test your workflows instantly with built-in validation and error handling.',
      gradient: 'from-orange-500 to-yellow-500',
      stats: '<100ms response'
    }
  ];

  const testimonials = [
    { name: 'Sarah Chen', role: 'CTO @ TechCorp', text: 'Clixen transformed our automation workflow. What used to take weeks now takes hours.' },
    { name: 'Mike Johnson', role: 'DevOps Lead', text: 'The AI-powered generation is mind-blowing. It understands context better than any tool I\'ve used.' },
    { name: 'Elena Rodriguez', role: 'Product Manager', text: 'Finally, a tool that bridges the gap between business requirements and technical implementation.' }
  ];

  const pricingPlans = [
    { name: 'Starter', price: '$0', features: ['5 workflows/month', 'Basic AI assistance', 'Community support'], cta: 'Start Free' },
    { name: 'Pro', price: '$49', features: ['Unlimited workflows', 'Advanced AI models', 'Priority support', 'Custom integrations'], cta: 'Go Pro', popular: true },
    { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Dedicated account manager', 'Custom AI training', 'SLA guarantee'], cta: 'Contact Sales' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-purple-900/10 via-transparent to-pink-900/10"></div>
        {/* Gradient orbs */}
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/10' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-xl font-bold font-mono flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span>clixen<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">.ai</span></span>
            </motion.div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Testimonials</a>
              <Link
                to="/auth"
                className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
              >
                Get Started
              </Link>
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Link
                to="/auth"
                className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full text-sm font-medium"
              >
                Start
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm text-gray-300">Trusted by 10,000+ developers</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            Build Workflows with
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient">
              AI Magic
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            Transform natural language into powerful n8n automation workflows. 
            Deploy, test, and scale your automation pipelines with enterprise-grade AI assistance.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4"
          >
            <Link
              to="/auth"
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
            >
              <span>Start Building Now</span>
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group px-8 py-4 border border-white/20 rounded-full font-medium hover:bg-white/5 hover:border-white/40 transition-all duration-300 flex items-center space-x-2"
            >
              <span>Watch Demo</span>
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <ChevronRightIcon className="w-4 h-4" />
              </div>
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto"
          >
            {[
              { value: '50K+', label: 'Workflows Created' },
              { value: '99.9%', label: 'Uptime' },
              { value: '<100ms', label: 'Response Time' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={featuresInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Powerful Features for 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> Modern Teams</span>
            </h2>
            <p className="text-gray-400 text-lg">Everything you need to automate your workflows at scale</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: index * 0.2 }}
                  whileHover={{ y: -10, transition: { duration: 0.2 } }}
                  className={`relative p-8 rounded-2xl border ${
                    currentFeature === index 
                      ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-pink-500/10' 
                      : 'border-white/10 bg-white/5'
                  } backdrop-blur-sm transition-all duration-500 cursor-pointer group`}
                  onClick={() => setCurrentFeature(index)}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} p-3 mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-full h-full text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 mb-4 leading-relaxed">{feature.description}</p>
                  <div className="text-sm text-purple-400 font-medium">{feature.stats}</div>
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 pointer-events-none" />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Loved by Developers Worldwide</h2>
          <p className="text-gray-400 text-lg">See what our users are saying</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-white/10"
            >
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-4 italic">"{testimonial.text}"</p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 text-lg">Choose the plan that fits your needs</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10 }}
              className={`relative p-8 rounded-2xl ${
                plan.popular 
                  ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500' 
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                </div>
              )}
              
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="text-4xl font-bold mb-6">
                {plan.price}
                {plan.price !== 'Custom' && <span className="text-lg text-gray-400">/month</span>}
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start space-x-3">
                    <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link
                to="/auth"
                className={`block text-center py-3 px-6 rounded-full font-medium transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/25'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative border-t border-white/10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl font-bold mb-6">
              Ready to Transform Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> Workflow?</span>
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Join thousands of developers who are already building the future of automation with Clixen AI.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/auth"
                className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
              >
                <span>Start Your Free Trial</span>
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <button className="px-8 py-4 text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                <span>Schedule a Demo</span>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex justify-center items-center space-x-8 opacity-50">
              <div className="text-sm text-gray-400">Trusted by</div>
              {['Google', 'Microsoft', 'Amazon', 'Meta'].map((company, i) => (
                <div key={i} className="text-gray-400 font-semibold">{company}</div>
              ))}
            </div>
          </motion.div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 via-transparent to-transparent pointer-events-none" />
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold">clixen.ai</span>
              </div>
              <p className="text-gray-400 text-sm">Building the future of workflow automation with AI.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">&copy; 2025 Clixen AI. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              {['Twitter', 'GitHub', 'LinkedIn'].map((social, i) => (
                <a key={i} href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}