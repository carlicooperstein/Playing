'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Users, Radio, Sparkles, Headphones, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [particles, setParticles] = useState<Array<{x: number, y: number}>>([]);

  useEffect(() => {
    setIsLoaded(true);
    // Generate particle positions after component mounts (client-side only)
    if (typeof window !== 'undefined') {
      const newParticles = Array.from({ length: 20 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
      }));
      setParticles(newParticles);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/10 rounded-full"
            initial={{ 
              x: particle.x,
              y: particle.y,
            }}
            animate={{
              x: particle.x + (Math.random() - 0.5) * 200,
              y: particle.y + (Math.random() - 0.5) * 200,
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-4xl w-full"
      >
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl"
          >
            <Headphones className="w-12 h-12 text-white" />
          </motion.div>
          
          <h1 className="text-6xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-pink-200">
            Will's Silent Disco Party!
          </h1>
          
          <p className="text-xl text-purple-200 mb-8">
            Party in the park with your own AirPods • Perfect sync • No noise complaints
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/admin">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg">
                <Radio className="mr-2 h-5 w-5" />
                Start as DJ
              </Button>
            </Link>
            
            <Link href="/join">
              <Button size="lg" variant="outline" className="border-purple-300 text-purple-100 hover:bg-purple-800/50">
                <Users className="mr-2 h-5 w-5" />
                Join Party
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/10 backdrop-blur-md border-purple-300/20 hover:bg-white/20 transition-colors">
              <CardHeader>
                <Music className="w-8 h-8 text-purple-300 mb-2" />
                <CardTitle className="text-white">Spotify Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-purple-200">
                  Upload your playlists directly from Spotify. Full control over the vibe.
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-white/10 backdrop-blur-md border-purple-300/20 hover:bg-white/20 transition-colors">
              <CardHeader>
                <QrCode className="w-8 h-8 text-purple-300 mb-2" />
                <CardTitle className="text-white">Instant Join</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-purple-200">
                  Guests scan QR code or enter room code. No app download needed.
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-white/10 backdrop-blur-md border-purple-300/20 hover:bg-white/20 transition-colors">
              <CardHeader>
                <Sparkles className="w-8 h-8 text-purple-300 mb-2" />
                <CardTitle className="text-white">Perfect Sync</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-purple-200">
                  Everyone hears the same beat at the same time. Dance together, silently.
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* How it Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-8">How It Works</h2>
          <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                1
              </div>
              <p className="text-purple-200">DJ creates room</p>
            </div>
            <div className="hidden md:block text-purple-400">→</div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                2
              </div>
              <p className="text-purple-200">Guests join via QR/code</p>
            </div>
            <div className="hidden md:block text-purple-400">→</div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                3
              </div>
              <p className="text-purple-200">Everyone vibes together</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}




