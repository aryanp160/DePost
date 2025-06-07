
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Key, Eye, EyeOff } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { getUserData, updateIPFSKeys } from '@/lib/userService';

interface IPFSKeysSetupProps {
  onKeysSubmitted: (apiKey: string, secret: string) => void;
}

export const IPFSKeysSetup = ({ onKeysSubmitted }: IPFSKeysSetupProps) => {
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Check if keys are already stored in Firebase
  useEffect(() => {
    const checkExistingKeys = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userData = await getUserData(user);
          if (userData?.k && userData?.s) {
            onKeysSubmitted(userData.k, userData.s);
          }
        } catch (error) {
          console.error('Error checking existing keys:', error);
          // Fallback to localStorage check
          const storedApiKey = localStorage.getItem('pinata_api_key');
          const storedSecret = localStorage.getItem('pinata_secret');
          if (storedApiKey && storedSecret) {
            onKeysSubmitted(storedApiKey, storedSecret);
          }
        }
      }
    };

    checkExistingKeys();
  }, [onKeysSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim() || !secret.trim()) {
      toast({
        title: "Missing credentials",
        description: "Please provide both API key and secret",
        variant: "destructive"
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in first",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Store keys in Firebase
      await updateIPFSKeys(user, apiKey, secret);
      
      // Clear localStorage after successful migration
      localStorage.removeItem('pinata_api_key');
      localStorage.removeItem('pinata_secret');
      
      onKeysSubmitted(apiKey, secret);
      
      toast({
        title: "IPFS keys saved!",
        description: "Your Pinata credentials have been securely stored.",
      });
    } catch (error) {
      console.error('Error saving IPFS keys:', error);
      toast({
        title: "Failed to save keys",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-purple-500/20">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
          <Key className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl">Setup IPFS Storage</CardTitle>
        <p className="text-muted-foreground">
          Enter your Pinata API credentials to enable decentralized post storage
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="apiKey">Pinata API Key</Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Pinata API key"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="secret">Pinata Secret</Label>
            <div className="relative">
              <Input
                id="secret"
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter your Pinata secret"
                className="mt-1 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save IPFS Keys'}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Don't have Pinata keys?</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Get free API credentials from Pinata to store your posts on IPFS.
          </p>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href="https://pinata.cloud" target="_blank" rel="noopener noreferrer">
              Get Pinata Keys
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
