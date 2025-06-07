
import React from 'react';
import { GoogleAuth } from '@/components/GoogleAuth';
import { Button } from '@/components/ui/button';
import { User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User as FirebaseUser } from 'firebase/auth';

interface NavigationProps {
  user?: FirebaseUser | null;
  onUserChange?: (user: FirebaseUser | null) => void;
  children?: React.ReactNode;
}

export const Navigation = ({ 
  user, 
  onUserChange,
  children 
}: NavigationProps) => {
  const navigate = useNavigate();

  return (
    <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            DePost
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Profile</span>
            </Button>
          )}
          
          {user && onUserChange && (
            <GoogleAuth user={user} onUserChange={onUserChange} />
          )}
          
          {children}
        </div>
      </div>
    </nav>
  );
};
