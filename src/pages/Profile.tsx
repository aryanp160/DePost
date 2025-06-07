import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User as UserIcon, Key, Eye, EyeOff, Save, Settings } from 'lucide-react';
import { getUserData, updateUsername, updateIPFSKeys } from '@/lib/userService';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setIsLoading(true);
        try {
          const userData = await getUserData(user);
          setUsername(userData?.u || user.email?.split('@')[0] || 'User');
          setApiKey(userData?.k || '');
          setSecret(userData?.s || '');
        } catch (error) {
          console.error('Error loading user data:', error);
          // Fallback to localStorage for migration
          const storedUsername = localStorage.getItem(`username_${user.uid}`) || user.email?.split('@')[0] || 'User';
          const storedApiKey = localStorage.getItem('pinata_api_key') || '';
          const storedSecret = localStorage.getItem('pinata_secret') || '';
          setUsername(storedUsername);
          setApiKey(storedApiKey);
          setSecret(storedSecret);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;

    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Update username
      await updateUsername(user, username.trim());

      // Update IPFS credentials if provided
      if (apiKey.trim() && secret.trim()) {
        await updateIPFSKeys(user, apiKey.trim(), secret.trim());
      }

      // Clear localStorage after successful migration
      localStorage.removeItem(`username_${user.uid}`);
      localStorage.removeItem('pinata_api_key');
      localStorage.removeItem('pinata_secret');

      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearIPFS = async () => {
    if (!user) return;

    try {
      await updateIPFSKeys(user, '', '');
      setApiKey('');
      setSecret('');
      toast({
        title: "IPFS credentials cleared",
        description: "Your IPFS credentials have been removed",
      });
    } catch (error) {
      console.error('Error clearing IPFS credentials:', error);
      toast({
        title: "Failed to clear credentials",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <h1 className="text-2xl font-display font-bold mb-4">Please sign in to view your profile</h1>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} onUserChange={setUser} />
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <h1 className="text-2xl font-display font-bold mb-4">Loading profile...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onUserChange={setUser} />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2 tracking-tight">
            Profile Settings
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            Customize your DePost experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="border-2 border-purple-500/20 hover:border-purple-500/40 transition-colors">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="font-display font-semibold">Profile Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" className="font-display font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1 font-medium">Email cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="username" className="font-display font-medium">Display Name</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your display name"
                  maxLength={50}
                  className="font-sans"
                />
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  This name will appear on your posts
                </p>
              </div>
            </CardContent>
          </Card>

          {/* IPFS Configuration */}
          <Card className="border-2 border-blue-500/20 hover:border-blue-500/40 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Key className="h-4 w-4 text-white" />
                  </div>
                  <CardTitle className="font-display font-semibold">IPFS Configuration</CardTitle>
                </div>
                {(apiKey || secret) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearIPFS}
                    className="text-destructive hover:text-destructive font-display font-medium"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="apiKey" className="font-display font-medium">Pinata API Key</Label>
                <Input
                  id="apiKey"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Pinata API key"
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="secret" className="font-display font-medium">Pinata Secret</Label>
                <div className="relative">
                  <Input
                    id="secret"
                    type={showSecret ? "text" : "password"}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter your Pinata secret"
                    className="pr-10 font-mono"
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

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-display font-semibold mb-2 flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Need Pinata credentials?
                </h4>
                <p className="text-sm text-muted-foreground mb-3 font-medium">
                  Get free API credentials from Pinata to store your posts on IPFS.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="font-display font-medium"
                >
                  <a href="https://pinata.cloud" target="_blank" rel="noopener noreferrer">
                    Get Pinata Keys
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Card className="border-2 border-green-500/20">
            <CardContent className="pt-6">
              <Button
                onClick={handleUpdateProfile}
                disabled={isUpdating}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 font-display font-semibold"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Updating...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
