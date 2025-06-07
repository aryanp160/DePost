
import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Navigation } from '@/components/Navigation';
import { PostFeed } from '@/components/PostFeed';
import { GoogleAuth } from '@/components/GoogleAuth';
import { IPFSKeysSetup } from '@/components/IPFSKeysSetup';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit3, Feather } from 'lucide-react';
import { getUserData } from '@/lib/userService';

import { AestheticBackground } from '@/components/AestheticBackground.jsx'; // 1. Import the new component
import '@/styles/AestheticBackground.css'; // 2. Import the CSS




const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [hasIPFSKeys, setHasIPFSKeys] = useState(false);
  const [refreshFeed, setRefreshFeed] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const userData = await getUserData(user);
          const hasKeys = !!(userData?.k && userData?.s);
          setHasIPFSKeys(hasKeys);
          
          // If no keys in Firebase, check localStorage for migration
          if (!hasKeys) {
            const apiKey = localStorage.getItem('pinata_api_key');
            const secret = localStorage.getItem('pinata_secret');
            setHasIPFSKeys(!!(apiKey && secret));
          }
        } catch (error) {
          console.error('Error checking IPFS keys:', error);
          // Fallback to localStorage
          const apiKey = localStorage.getItem('pinata_api_key');
          const secret = localStorage.getItem('pinata_secret');
          setHasIPFSKeys(!!(apiKey && secret));
        }
      } else {
        setHasIPFSKeys(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleIPFSKeysSubmitted = (apiKey: string, secret: string) => {
    setHasIPFSKeys(true);
    console.log('IPFS keys configured');
  };

  const handlePostCreated = () => {
    // Trigger feed refresh by updating the key
    setRefreshFeed(prev => prev + 1);
  };

  const isFullySetup = user && hasIPFSKeys;

  return (
    <div className="min-h-screen bg-background relative">
      <AestheticBackground />
      <Navigation
        user={user}
        onUserChange={setUser}
      />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-display font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4 tracking-tight">
            DePost
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            Decentralized social platform powered by Avalanche
          </p>
        </div>

        {isFullySetup ? (
          <div className="space-y-8">
            {/* Compose Button Card */}
            <Card className="border-2 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 cursor-pointer group" onClick={() => navigate('/create-post')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-white font-display font-bold text-lg">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="bg-muted/50 rounded-full px-4 py-3 text-muted-foreground hover:bg-muted/70 transition-colors cursor-text font-medium">
                      What's happening on the decentralized web?
                    </div>
                  </div>
                  
                  <Button
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-full px-6 group-hover:scale-105 transition-transform duration-200 font-display font-semibold"
                  >
                    <Feather className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                </div>
              </CardContent>
            </Card>

            <PostFeed 
              key={refreshFeed}
              userEmail={user.email || undefined} 
            />

            {/* Floating Action Button */}
            <FloatingActionButton />
          </div>
        ) : (
          <div className="space-y-8">
            {!user && (
              <div className="text-center py-8">
                <h2 className="text-3xl font-display font-semibold mb-4">Welcome to DePost</h2>
                <p className="text-muted-foreground mb-6 font-medium text-lg">
                  Sign in with Google to get started
                </p>
                <GoogleAuth user={user} onUserChange={setUser} />
              </div>
            )}

            {user && !hasIPFSKeys && (
              <div className="py-8">
                <IPFSKeysSetup onKeysSubmitted={handleIPFSKeysSubmitted} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
