
import React, { useState } from 'react';
import { signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogIn, LogOut } from 'lucide-react';

interface GoogleAuthProps {
  onUserChange: (user: User | null) => void;
  user: User | null;
}

export const GoogleAuth = ({ onUserChange, user }: GoogleAuthProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onUserChange(result.user);
      toast({
        title: "Successfully signed in",
        description: `Welcome, ${result.user.displayName}!`,
      });
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({
        title: "Sign-in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onUserChange(null);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      console.error('Sign-out error:', error);
      toast({
        title: "Sign-out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={user.photoURL || ''}
          alt={user.displayName || 'User'}
          className="w-8 h-8 rounded-full"
        />
        <span className="text-sm text-muted-foreground">
          {user.displayName}
        </span>
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      variant="outline"
      className="flex items-center gap-2"
    >
      <LogIn className="h-4 w-4" />
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  );
};
