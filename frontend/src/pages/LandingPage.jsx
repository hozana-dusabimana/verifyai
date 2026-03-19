import { useState, useEffect } from 'react';
import { Search, Activity, Users, Building, ShieldAlert, ArrowRight, CheckCircle2, Zap, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { analyticsAPI } from '../services/api';

const LandingPage = () => {
  const [platformStats, setPlatformStats] = useState(null);

  useEffect(() => {
    analyticsAPI.getPlatformStats()
      .then(res => setPlatformStats(res.data.data))
      .catch(() => {});
  }, []);

  const formatCount = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K+`;
    return n.toString();
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-32 text-center lg:px-8">
        <div className="mx-auto max-w-4xl glass p-12 rounded-3xl relative z-10">
          <div className="absolute top-0 right-0 p-4 opacity-10 blur-[80px]">
             <div className="w-64 h-64 bg-brand-400 rounded-full" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-blue-600">
            Truth. Detected.
          </h1>
          <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            VerifyAI is the advanced AI-powered fake news detection system. We help journalists, governments, and citizens identify misinformation before it spreads.
          </p>
          
          <div className="mt-10 max-w-xl mx-auto flex sm:flex-row flex-col gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-4 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm shadow-sm transition-all"
                placeholder="Paste an article URL or headline..."
              />
            </div>
            <button className="flex-none px-6 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group">
              Analyze Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {/* Live Stats Ticker */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 border-t border-slate-200/60 pt-8">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-500"/> {platformStats ? formatCount(platformStats.total_articles_analyzed) : '—'}
              </span>
              <span className="text-sm font-medium text-slate-500">Articles Analyzed</span>
            </div>
            <div className="w-px h-12 bg-slate-200/60 hidden sm:block" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500"/> {platformStats ? `${platformStats.detection_accuracy}%` : '—'}
              </span>
              <span className="text-sm font-medium text-slate-500">Detection Accuracy</span>
            </div>
            <div className="w-px h-12 bg-slate-200/60 hidden sm:block" />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500"/> {platformStats ? `~${platformStats.average_analysis_time}s` : '—'}
              </span>
              <span className="text-sm font-medium text-slate-500">Avg. Analysis Time</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-white/50" id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-base font-bold text-brand-600 tracking-wide uppercase">Process</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Verification in 3 simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Submit Content",
                desc: "Paste text, URL, or upload a document directly to the platform.",
                color: "bg-blue-100 text-blue-600"
              },
              {
                step: "02",
                title: "AI Analysis",
                desc: "Our ensemble ML pipeline uses NLP and DistilBERT to scrutinize the sentiment, tone, and facts.",
                color: "bg-brand-100 text-brand-600"
              },
              {
                step: "03",
                title: "Review Results",
                desc: "Get an actionable credibility score alongside plain-language explanations of any flagged content.",
                color: "bg-emerald-100 text-emerald-600"
              }
            ].map((s, idx) => (
              <div key={idx} className="relative glass p-8 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl mb-6 ${s.color}`}>
                  {s.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{s.title}</h3>
                <p className="text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
         <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl leading-8 font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Built for everyone seeking the truth
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Journalists", icon: <Users className="w-8 h-8"/>, desc: "Fast-track fact-checking during breaking news with automated analysis." },
                { title: "Governments", icon: <Building className="w-8 h-8"/>, desc: "Monitor state-sponsored disinformation and protect public trust." },
                { title: "Citizens", icon: <ShieldAlert className="w-8 h-8"/>, desc: "Verify articles from social media before sharing with your network." }
              ].map((c, idx) => (
                <div key={idx} className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-brand-200 transition-all cursor-default">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-blue-50 flex items-center justify-center text-brand-600 mb-6">
                    {c.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{c.title}</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
         </div>
      </section>

      {/* Pricing / Access Tiers */}
      <section className="py-24 bg-slate-900 text-white rounded-[3rem] mx-4 mb-8" id="pricing">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <h2 className="text-base font-bold text-brand-400 tracking-wide uppercase">Pricing</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight sm:text-4xl mb-16">
              Start verifying today
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
              {[
                { name: "Citizen", price: "Free", desc: "Perfect for personal use.", limits: "20 analyses / hour" },
                { name: "Pro", price: "$49/mo", desc: "For independent journalists.", limits: "200 analyses / hour", popular: true },
                { name: "Enterprise", price: "Custom", desc: "For newsrooms and gov.", limits: "Unlimited + API access" }
              ].map((tier, idx) => (
                <div key={idx} className={`relative p-8 rounded-3xl border ${tier.popular ? 'border-brand-500 bg-slate-800' : 'border-slate-700 bg-slate-800/50'}`}>
                  {tier.popular && <div className="absolute top-0 right-6 translate-y-[-50%] bg-brand-500 text-white px-3 py-1 rounded-full text-xs font-bold font-tracking-wide uppercase">Most Popular</div>}
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-slate-400 mb-6 h-12">{tier.desc}</p>
                  <div className="text-4xl font-extrabold mb-8">{tier.price}</div>
                  <ul className="mb-8 space-y-4 text-slate-300">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-400"/> {tier.limits}</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-400"/> Ensemble ML Pipeline</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-400"/> Detailed Explainability</li>
                  </ul>
                  <Link to="/register" className={`block text-center w-full py-3 rounded-xl font-bold transition-all ${tier.popular ? 'bg-brand-500 hover:bg-brand-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
                    Get Started
                  </Link>
                </div>
              ))}
            </div>
        </div>
      </section>

      {/* About Us */}
      <section className="py-24 bg-brand-50" id="about">
         <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <h2 className="text-base font-bold text-brand-600 tracking-wide uppercase">About Us</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Our Mission
            </p>
            <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              At VerifyAI, we believe in a world where truth prevails. Our team of leading researchers, software engineers, and journalists collaborate to stay one step ahead of synthetic media and coordinated disinformation campaigns. We are an independent organization committed to building transparent, unbiased AI tools for the public good.
            </p>
         </div>
      </section>

      {/* Contact Us */}
      <section className="py-24 bg-white" id="contact">
         <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
            <h2 className="text-base font-bold text-brand-600 tracking-wide uppercase">Contact Us</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-slate-900 sm:text-4xl mb-8">
              Get in Touch
            </p>
            <div className="glass p-10 rounded-3xl text-left border border-slate-200 shadow-sm max-w-xl mx-auto">
               <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Name</label>
                    <input type="text" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 bg-slate-50" placeholder="Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                    <input type="email" className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 bg-slate-50" placeholder="jane@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Message</label>
                    <textarea className="w-full h-32 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 bg-slate-50 resize-none" placeholder="How can we help you?"></textarea>
                  </div>
                  <button type="button" className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors">
                     Send Message
                  </button>
               </form>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            <span className="font-bold text-lg text-slate-900">VerifyAI</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500 font-medium">
            <a href="#" className="hover:text-brand-600">About</a>
            <a href="#" className="hover:text-brand-600">Documentation</a>
            <a href="#" className="hover:text-brand-600">Contact</a>
            <a href="#" className="hover:text-brand-600">Privacy Policy</a>
            <a href="#" className="hover:text-brand-600">Terms of Service</a>
          </div>
          <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} VerifyAI Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
