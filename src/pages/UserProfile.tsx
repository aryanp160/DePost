
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Navigation } from '@/components/Navigation';
import { PostFeed } from '@/components/PostFeed';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, User as UserIcon, Calendar } from 'lucide-react';

const UserProfile = () => {
  const { userEmail } = useParams<{ userEmail: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} onUserChange={setUser} />
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <div className="animate-pulse">
            <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-4"></div>
            <div className="h-8 bg-muted rounded w-48 mx-auto mb-2"></div>
            <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} onUserChange={setUser} />
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const displayName = userEmail.split('@')[0];
  const decodedEmail = decodeURIComponent(userEmail);

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onUserChange={setUser} />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Button 
          onClick={() => navigate('/')} 
          variant="ghost" 
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Feed
        </Button>

        {/* Profile Header */}
        <Card className="mb-8 border-2 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <UserIcon className="h-10 w-10 text-white" />
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  {displayName}
                </h1>
                <p className="text-muted-foreground font-mono text-sm mb-2">
                  {decodedEmail}
                </p>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>DePost User</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts and Replies Feed */}
        <PostFeed 
          userEmail={user?.email || undefined}
          authorFilter={decodedEmail}
        />
      </div>
    </div>
  );
};

export default UserProfile;
